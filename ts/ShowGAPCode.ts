/*

# ShowGAPCode

The functions in this script file define how Group Explorer displays and lets users interact with
GAP code in the [GroupInfo](./GroupInfo.html.md) page.

```javascript
 */
import { parseFormattedPresentation } from './DefiningRelations.js'

import type { Group } from './Group.js'
/*
```
## setup
 Gives access to live GAP execution online through the [Sage Cell Server](https://sagecell.sagemath.org).

 Opens [ShowGAPCode.html](../html/ShowGAPCode.html) in iframe defined in [GroupInfo.ts](./GroupInfo.ts),
 which creates an [embedded Sage cell](https://github.com/sagemath/sagecell/blob/master/doc/embedding.rst)
 that is initialized with code from the `codeForPurpose` map. The results of the GAP computation are discarded.

 N.B.: `codeForPurpose` maps a purpose string to a template literal, which is evaluated in the parent
 [GroupInfo page](./GroupInfo.html) context before being passed to the Sage cell in the iframe.
 */
const codeForPurpose = new Map<string, string>([
  ['creating this group',
   `# In GAP's Small Groups library, of all the groups
    # of order $\{ord}, this one is number $\{idx}:
    $\{G} := $\{gpdef};`],

  ['checking if a group is abelian',
   `# Create the group:
    $\{G} := $\{gpdef};;

    # Ask if it is abelian:
    IsAbelian( $\{G} );`],

  ['computing the numbers in a class equation',
   `# Create the group:
    $\{G} := $\{gpdef};;

    # Get the sizes of all conjugacy classes:
    List( ConjugacyClasses( $\{G} ), Size );`],

  ['checking if a group is cyclic',
   `# Create the group:
    $\{G} := $\{gpdef};;

    # Ask if it is cyclic:
    IsCyclic( $\{G} );`],

  ['getting the list of all subgroups of a group',
   `# Create the group:
    $\{G} := $\{gpdef};;

    # Ask for the list of subgroups:
    AllSubgroups( $\{G} );`],

  ['checking whether a subgroup is normal',
   `# Create the group:
    $\{G} := $\{gpdef};;

    # Pick a random subgroup as an example:
    S := Random( AllSubgroups( $\{G} ) );

    # Ask whether it is normal:
    IsNormal( $\{G}, S );`],

  ['getting the lattice of subgroups of a group',
   `# Create the group:
    $\{G} := $\{gpdef};;

    # Ask for the lattice of subgroups:
    LatticeSubgroups( $\{G} );

    # (See the GAP manual for how to manipulate the resulting object.)`],

  ['checking if a group is simple',
   `# Create the group:
    $\{G} := $\{gpdef};;

    # Ask if it is simple:
    IsSimple( $\{G} );`],

  ['computing how many order classes a group has',
   `# Create the group:
    $\{G} := $\{gpdef};;

    # Compute all element orders and make a set of those results:
    Set( $\{G}, Order );`],

  ['checking if a group is solvable',
   `# Create the group:
    $\{G} := $\{gpdef};;

    # Ask if it is solvable:
    IsSolvable( $\{G} );`]
])

// executed in parent context: setup iframe in wrapper, invoke iframe routine to show code
export async function setup (purpose: string, group: Group) {
  const iframeElement = document.getElementById('gap-iframe') as HTMLIFrameElement

  // load iframe on first time through
  if (!('GAPCell' in (iframeElement.contentWindow as Window))) {
    iframeElement.setAttribute('src', new URL('html/ShowGAPCode.html', window.location.href).href)
    iframeElement.style.maxWidth = window.innerWidth.toString()
    iframeElement.style.maxHeight = window.innerHeight.toString()

    await new Promise<void>((resolve, _reject) => {
      iframeElement.addEventListener('load', () => resolve(), { once: true })
    })
  }

  // get the GAP code to accomplish the purpose for this group and show it in iframeElement
  const code = getCode(purpose, group)
  ;(iframeElement.contentWindow as Window & {GAPCell: {show: (purpose: string, code: string) => void}})
     .GAPCell.show(purpose, code)
}

function getCode (purpose: string, group: Group): string {
  // converting an arbitrary string to a JS identifier (not injective)
  function toIdent (str: string): string  {
    if (!/^[a-zA-Z_]/.test(str)) str = '_' + str
    return str.replace(/[^a-zA-Z0-9_]/g, '')
  }

  const [ord, idx] = group.gapid?.split(',') || [-1, -1]

  // following are referenced in newCode eval, below
  const G = toIdent(group.shortName)
  const gpdef = `SmallGroup( ${ord}, ${idx} )`

  const code = codeForPurpose.get(purpose) as string
  const newCode = eval('`' + code.split('\n').map((line) => line.trim()).join('\n') + '`') as string

  return newCode
}
/*
```
## resolveGAPInfo

Sends message to online GAP server to find gapid, gapname.
Accumulates array of requests to be processed together at the end of the current tick
after the current batch, if any, has completed.

```js
 */

// pending queue for microbatch GAP resolution
const pendingResolutions: Array<{presentation: string, resolve: Function, reject: Function}> = []
let batchScheduled = false

export function resolveGAPInfo (presentation: string): Promise<{gapid: string, gapname: string}> {
   return new Promise((resolve, reject) => {
      pendingResolutions.push({presentation, resolve, reject})
      if (!batchScheduled) {
         batchScheduled = true
         window.setTimeout(processBatch, 0)
      }
   })
}

async function processBatch () {
   batchScheduled = false
   const batch = pendingResolutions.splice(0)

   const gapScript = batch.map(({presentation}) => {
      const [generators, relators] = parseFormattedPresentation(presentation)
      const freeGroup = `FreeGroup(${generators.map((c) => `"${c}"`).join(',')})`
      const relations = relators.map((relator) =>
         relator.split('').map((char) =>
            `F.${generators.indexOf(char.toLowerCase()) + 1}` + (char === char.toUpperCase() ? '^-1' : '')
         ).join('*')
      ).join(',')
      return `F := ${freeGroup}; G := F/[${relations}]; id := IdSmallGroup(G); ` +
             `Print(id[1], ",", id[2], "\\t", StructureDescription(SmallGroup(id[1],id[2])), "\\n");`
   }).join('\n')

   try {
      const output = await executeCommands(gapScript)
      output.trim().split('\n').forEach((line, i) => {
         const [gapid, gapname] = line.split('\t')
         batch[i].resolve({gapid: gapid.trim(), gapname: gapname.trim()})
      })
   } catch (error) {
      batch.forEach(({reject}) => reject(error))
   }
}
/*
```
### executeCommands

 * Runs html/ExecuteGAPCommands.html in hidden iframe
 * Passes GAP commands to execute in query ?? of URL
 * Receive result in GAPCommandResult message
 * Returns result in promise

```js
 */
type GAPCommandResult = {
   input: string,
   output?: string,
   error?: string
}

function executeCommands (gapCommands: string): Promise<string> {
   return new Promise<string>((resolve, reject) => {
      const iframeElement = document.body.appendChild(document.createElement('iframe'))
      iframeElement.style.display = 'none'

      window.addEventListener('message', (event: MessageEvent<GAPCommandResult>) => {
         if (new URL(window.location.href).origin != event.origin) {
            return
         }
         if (event.data.input == gapCommands) {
            iframeElement.remove()
            if ('output' in event.data) {
               resolve(event.data.output!)
            } else {
               reject(event.data.error)
            }
         }
      })

      iframeElement.setAttribute('src', `./html/ExecuteGAPCommands.html?${encodeURIComponent(gapCommands)}`)
   })
}
