const logLevels = { debug: 0, info: 1, warn: 2, err: 3, none: 4 };
const logFunctions = [console.log, console.info, console.warn, console.error];
let logLevel;
let alertLevel;
let alertsRemaining = 3; // number of alerts remaining before we quit showing them
// initialize logLevel, alertLevel from URL
setLogLevel(new URL(window.location.href).searchParams.get('log') || 'warn');
setAlertLevel(new URL(window.location.href).searchParams.get('alert') || 'err');
function setLogLevel(levelString) {
    if (logLevels[levelString] != null) {
        logLevel = logLevels[levelString];
    }
}
function setAlertLevel(levelString) {
    if (logLevels[levelString] != null) {
        alertLevel = logLevels[levelString];
    }
}
export function isActive(levelString) {
    return logLevels[levelString] >= logLevel;
}
export function debug(...args) {
    log('debug', args);
}
export function info(...args) {
    log('info', args);
}
export function warn(...args) {
    log('warn', args);
}
export function err(...args) {
    log('err', args);
}
function log(levelString, args) {
    const level = logLevels[levelString];
    const needsLog = isActive(levelString);
    const needsAlert = level >= alertLevel && alertsRemaining > 0;
    if (needsLog || needsAlert) {
        const resolved = (args.length === 1 && typeof args[0] === 'function') ? [args[0]()] : args;
        if (needsLog)
            logFunctions[level](...resolved);
        if (needsAlert) {
            alertsRemaining--;
            alert(resolved);
        }
    }
}
/*
```
 */
//# sourceMappingURL=Log.js.map