/* @flow

# ShowGAPCode

The functions in this script file define how Group Explorer displays and lets users interact with
GAP code in the [GroupInfo](./GroupInfo.html.md) page.

```javascript
 */
import { parseFormattedPresentation } from './DefiningRelations.js';
export { setup, resolveGAPInfo };
/*::
import {Group} from './Group.js'
*/
/*
 * We give access to live GAP execution online through the Sage Cell Server
 */
// purpose -> code map
// note that the code contains template string expressions which will be expanded
// when the code is wrapped in back tics '`' and eval'd in getCode
const codeForPurpose = new Map /*:: <string, string> */([
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
]);
// executed in parent context: setup iframe in wrapper, invoke iframe routine to show code
async function setup(purpose /*: string */, group /*: Group */) {
    const iframeElement = ((document.getElementById('gap-iframe') /*: any */) /*: HTMLIFrameElement */);
    // load iframe on first time through
    if (iframeElement.contentWindow.GAPCell == null) {
        iframeElement.setAttribute('src', new URL('html/ShowGAPCode.html', window.location.href).href);
        iframeElement.style.maxWidth = window.innerWidth;
        iframeElement.style.maxHeight = window.innerHeight;
        await new Promise((resolve, reject) => {
            iframeElement.addEventListener('load', () => resolve(), { once: true });
        });
    }
    // get the GAP code to accomplish the purpose for this group and show it in iframeElement
    const code = getCode(purpose, group);
    iframeElement.contentWindow.GAPCell.show(purpose, code);
}
function getCode(purpose /*: string */, group /*: Group */) {
    // converting an arbitrary string to a JS identifier (not injective)
    function toIdent(str /*: string */) {
        if (!/^[a-zA-Z_]/.test(str))
            str = '_' + str;
        return str.replace(/[^a-zA-Z0-9_]/g, '');
    }
    const G = toIdent(group.shortName);
    const [ord, idx] = group.gapid?.split(',') || [-1, -1];
    const gpdef = `SmallGroup( ${ord}, ${idx} )`;
    const code = ((codeForPurpose.get(purpose) /*: any */) /*: string */);
    const newCode = eval('`' + code.split('\n').map((line) => line.trim()).join('\n') + '`');
    return newCode;
}
function executeCommands(gapCommands /*: string */) {
    return new Promise((resolve, reject) => {
        const iframeElement = document.body.appendChild(document.createElement('iframe'));
        iframeElement.style.display = 'none';
        window.addEventListener('message', (event) => {
            if (new URL(window.location.href).origin != event.origin) {
                return;
            }
            if (event.data.input == gapCommands) {
                iframeElement.remove();
                if ('output' in event.data) {
                    resolve(event.data.output);
                }
                else {
                    reject(event.data.error);
                }
            }
        });
        iframeElement.setAttribute('src', `./html/ExecuteGAPCommands.html?${encodeURIComponent(gapCommands)}`);
    });
}
// pending queue for microbatch GAP resolution
const pendingResolutions /*: Array<{presentation: string, resolve: Function, reject: Function}> */ = [];
let batchScheduled = false;
function resolveGAPInfo(presentation /*: string */) {
    return new Promise((resolve, reject) => {
        pendingResolutions.push({ presentation, resolve, reject });
        if (!batchScheduled) {
            batchScheduled = true;
            window.setTimeout(processBatch, 0);
        }
    });
}
async function processBatch() {
    batchScheduled = false;
    const batch = pendingResolutions.splice(0);
    const gapScript = batch.map(({ presentation }) => {
        const [generators, relators] = parseFormattedPresentation(presentation);
        const freeGroup = `FreeGroup(${generators.map((c) => `"${c}"`).join(',')})`;
        const relations = relators.map((relator) => relator.split('').map((char) => `F.${generators.indexOf(char.toLowerCase()) + 1}` + (char === char.toUpperCase() ? '^-1' : '')).join('*')).join(',');
        return `F := ${freeGroup}; G := F/[${relations}]; id := IdSmallGroup(G); ` +
            `Print(id[1], ",", id[2], "\\t", StructureDescription(SmallGroup(id[1],id[2])), "\\n");`;
    }).join('\n');
    try {
        const output = await executeCommands(gapScript);
        output.trim().split('\n').forEach((line, i) => {
            const [gapid, gapname] = line.split('\t');
            batch[i].resolve({ gapid: gapid.trim(), gapname: gapname.trim() });
        });
    }
    catch (error) {
        batch.forEach(({ reject }) => reject(error));
    }
}
//# sourceMappingURL=ShowGAPCode.js.map