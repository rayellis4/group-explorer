/*
## Multi-level Logging

The routines in this class perform simple logging and error reporting functions using console info/warn/error messages and the browser alert. Messages will be logged/alerted if they are at or higher than the current log level. There are five log levels defined: 'debug', 'info', 'warn', 'err', and 'none'. The default log level is 'warn' and the default alert level is 'err'. The log level may be set from the URL, thus:
  <br>&nbsp;&nbsp;&nbsp;&nbsp;http://localhost:8080/group-explorer/Multtable.html?groupURL=./groups/D_4.group&<b>log=info&alert=warn</b>
<br>And it may be set by invoking `Log.setLogLevel(string)` or `Log.setAlertLevel(string)` at the debug console.

```js
 */
type logLevelString = 'debug' | 'info' | 'warn' | 'err' | 'none'

const logLevels: {[key: string]: number} = { debug: 0, info: 1, warn: 2, err: 3, none: 4 }
const logFunctions: Array<(...args: Array<any>) => void> = [console.log, console.info, console.warn, console.error]
let logLevel: number
let alertLevel: number
let alertsRemaining: number = 3 // number of alerts remaining before we quit showing them

// initialize logLevel, alertLevel from URL
setLogLevel(new URL(window.location.href).searchParams.get('log') || 'warn')
setAlertLevel(new URL(window.location.href).searchParams.get('alert') || 'err')

function setLogLevel (levelString: string) {
  if (logLevels[levelString] != null) {
    logLevel = logLevels[levelString]
  }
}

function setAlertLevel (levelString: string) {
  if (logLevels[levelString] != null) {
    alertLevel = logLevels[levelString]
  }
}

export function isActive (levelString: logLevelString): boolean {
  return logLevels[levelString] >= logLevel
}

export function debug (...args: any[]) {
  log('debug', args)
}

export function info (...args: any[]) {
  log('info', args)
}

export function warn (...args: any[]) {
  log('warn', args)
}

export function err (...args: any[]) {
  log('err', args)
}

function log (levelString: logLevelString, args: any[]) {
  const level: number = logLevels[levelString]
  const needsLog = isActive(levelString)
  const needsAlert = level >= alertLevel && alertsRemaining > 0
  if (needsLog || needsAlert) {
    const resolved = (args.length === 1 && typeof args[0] === 'function') ? [args[0]()] : args
    if (needsLog) logFunctions[level](...resolved)
    if (needsAlert) { alertsRemaining--; alert(resolved) }
  }
}
/*
```
 */
