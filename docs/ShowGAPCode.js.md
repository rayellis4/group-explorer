/* @flow

# ShowGAPCode

The functions in this script file define how Group Explorer displays and lets users interact with
GAP code in the [GroupInfo](./GroupInfo.html.md) page.

```javascript
 */
import * as Library from './Library.js'

export {setup, executeCommands}

/*::
import Group from './Group.js'
*/

/*
 * We give access to live GAP execution online through the Sage Cell Server
 */

// purpose -> code map
// note that the code contains template string expressions which will be expanded
// when the code is wrapped in back tics '`' and eval'd in getCode
const codeForPurpose = new Map/*:: <string, string> */([
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
async function setup (purpose /*: string */, group /*: Group */) {
  const iframeElement = document.getElementById('gap-iframe')

  // load iframe on first time through
  if (iframeElement.contentWindow.GAPCell == null) {
    iframeElement.setAttribute('src', new URL('html/ShowGAPCode.html', window.location.href).href)
    iframeElement.style.maxWidth = window.innerWidth
    iframeElement.style.maxHeight = window.innerHeight

    await new Promise((resolve, reject) => {
      iframeElement.addEventListener('load', () => resolve(), { once: true })
    })
  }

  // get the GAP code to accomplish the purpose for this group and show it in iframeElement
  const code = getCode(purpose, group)
  iframeElement.contentWindow.GAPCell.show(purpose, code)
}

function getCode (purpose /*: string */, group /*: Group */) /*: string */ {
  // converting an arbitrary string to a JS identifier (not injective)
  function toIdent (str) {
    if (!/^[a-zA-Z_]/.test(str)) str = '_' + str
    return str.replace(/[^a-zA-Z0-9_]/g, '')
  }

  const G = toIdent(group.shortName)
  const [ord, idx] = group.gapid.split(',')
  const gpdef = `SmallGroup( ${ord}, ${idx} )`

  const code = ((codeForPurpose.get(purpose) /*: any */) /*: string */)
  const newCode = eval('`' + code.split('\n').map((line) => line.trim()).join('\n') + '`')

  return newCode
}

function executeCommands (gapCommands) {
   return new Promise((resolve, reject) => {
      const iframeElement = document.body.appendChild(document.createElement('iframe'))
      iframeElement.style.display = 'none'

      window.addEventListener('message', (event) => {
         if (new URL(window.location.href).origin != event.origin) {
            return
         }
         if (event.data.input == gapCommands) {
            iframeElement.remove()
            if ('output' in event.data) {
               resolve(event.data.output)
            } else {
               reject(event.data.error)
            }
         }
      })

      iframeElement.setAttribute('src', `./html/ExecuteGAPCommands.html?${encodeURIComponent(gapCommands)}`)
   })
}

export async function getGAPInfo (groupURL) {
   const checkGroup = () => Library.getAllGroups().find((G) => G.URL == groupURL)
   if (checkGroup() != null) {
      const presentation = new URL(groupURL).search.slice(1)
      const gapid = await getGAPId(presentation)

      if (gapid != null) {
         try {
            const printGAPNameCommand = `Print(StructureDescription(SmallGroup(${gapid})))`
            const gapName = await executeCommands(printGAPNameCommand)
            const group = checkGroup()
            if (group != null) {
               group.gapid = gapid
               group.gapname = gapName
               Library.saveGroup(group)
            }
         } catch (_error) { }
      }
   }
}

export async function getGAPId (presentation) {
   const relators = presentation.split(':')[1].split(',')
   const generators = Array.from(
      relators.reduce(
         (generatorSet, relator) => {
            for (const char of relator) {
               generatorSet.add(char.toLowerCase())
            }
            return generatorSet
         }, new Set()))
      .sort()

   let printGAPIdCommand = 'F := FreeGroup(' + generators.map((char) => `"${char}"`).join(',') + ');'
   printGAPIdCommand += ' G := F / ['
      + relators.map((relator) =>
         relator.split('')
            .map((char) => `F.${generators.indexOf(char.toLowerCase()) + 1}` + ((char == char.toUpperCase()) ? '^-1' : ''))
            .join('*'))
         .join(', ')
      + '];'
   printGAPIdCommand += ' Print(IdSmallGroup(G));'

   let result = null
   try {
      const gapIdOutput = await executeCommands(printGAPIdCommand)
      if (gapIdOutput != null) {
         result = gapIdOutput.match(/(\d+)/g).join(',')
      }
   } catch (_error) { }

   return result      
}
