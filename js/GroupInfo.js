/*
# GroupInfo

Assembles html page of group information

```js
 */
import * as AbelianInfo from './AbelianInfo.js';
import * as BasicFactInfo from './BasicFactInfo.js';
import * as ClassEquationInfo from './ClassEquationInfo.js';
import * as CyclicInfo from './CyclicInfo.js';
import * as FileDataInfo from './FileDataInfo.js';
import * as GeneratorInfo from './GeneratorInfo.js';
import * as Heading from './Heading.js';
import * as Library from './Library.js';
import * as NamingSchemeInfo from './NamingSchemeInfo.js';
import * as OrderClassInfo from './OrderClassInfo.js';
import * as ShowGAPCode from './ShowGAPCode.js';
import * as SolvableInfo from './SolvableInfo.js';
import * as SubgroupInfo from './SubgroupInfo.js';
import * as UserNoteInfo from './UserNoteInfo.js';
import * as ViewInfo from './ViewInfo.js';
import * as ZmnInfo from './ZmnInfo.js';
export async function load() {
    insertHTML();
    const group = await Library.loadFromPageURL();
    // Create Header
    Heading.display(document.getElementById('heading'), formatHeading(group), () => [
        { label: 'Expand All',
            action: () => document.querySelectorAll('details').forEach((el) => el.setAttribute('open', '1')) },
        { label: 'Collapse All',
            action: () => document.querySelectorAll('details').forEach((el) => el.removeAttribute('open')) },
        { label: '<hr>', action: () => { } },
        { label: 'Group Library', action: () => window.open('GroupExplorer.html') },
        { label: 'New Sheet', action: () => window.open('Sheet.html') },
        { label: '<hr>', action: () => { } },
        { label: 'Group Info Help', action: () => window.open('help/rf-um-groupwindow/index.html') }
    ]);
    [
        ['basic-facts', BasicFactInfo.display],
        ['views', ViewInfo.display],
        ['abelian', AbelianInfo.display],
        ['class-equation', ClassEquationInfo.display],
        ['cyclic-group', CyclicInfo.display],
        ['subgroups', SubgroupInfo.display],
        ['order-classes', OrderClassInfo.display],
        ['solvable', SolvableInfo.display],
        ['zmn', ZmnInfo.display],
        ['generators', GeneratorInfo.display],
        ['default-names', NamingSchemeInfo.displayDefaultNames],
        ['loaded-names', NamingSchemeInfo.displayLoadedNames],
        ['user-names', NamingSchemeInfo.displayUserNames],
        ['customizations', UserNoteInfo.display],
        group.author ? ['file-data', FileDataInfo.display] : ['', () => { }]
    ]
        .forEach(([elementId, displayFunction]) => displayFunction(elementId, group));
    // Register for GAP button clicks
    const computeInGAP = async (ev) => {
        const purpose = ev.target?.getAttribute('data-GAP');
        if (purpose != null)
            await ShowGAPCode.setup(purpose, group);
    };
    const gapButtons = Array.from(document.getElementsByClassName('gap-compute'));
    if (group.gapid.match(/\d,\d/)?.[0] == null) {
        gapButtons.forEach((button) => button.remove());
    }
    else {
        gapButtons.forEach((el) => el.addEventListener('click', (ev) => computeInGAP(ev)));
    }
    ;
    document.querySelector('#content.all-info')
        .addEventListener('representationChange', () => Heading.setTitle(formatHeading(group)));
}
function formatHeading(group) {
    const heading = `${group.name + ((group.phrase == null || group.phrase == "") ? '' : (' - ' + group.phrase))}`;
    return heading;
}
function insertHTML() {
    document.body.insertAdjacentHTML('beforeend', `<style>
        /* Elements */
        body {
           overflow: auto;
           line-height: 1;
        }
        #heading {
           line-height: 1.5;
        }
        table {
           border: none;
           border-collapse: collapse;
        }
        td {
           padding-right: 1ch;
        }
        ul {
           margin-block-start: 0;
           margin-block-end: 0;
           padding-inline-start: 0;
           list-style-type: none;
        }

        /* Layout classes */

        .compact-lines > * + * {
           line-height: 1;
        }

        /* Utility classes */

        .all-info {
           font-size: 1.5em;
           max-width: 80ch;
           margin-left: auto;
           margin-right: auto;
        }

        .indent-children > button,
        .indent-children > div,
        .indent-children > ul {
           margin-inline-start: 6ch;
        }

        div:has(a) {
           line-height: 1.2;
        }
        details > :not(summary) {
           margin-inline-start: 4ch;
           font-size: 1rem;
        }
        details > :has(> details) {
	   font-size: 0.8165em;
        }
        summary > span:not(.title) {
           font-size: 1rem;
        }
        details[open] > summary > span:not(.title) {
           display: none;
           width: unset;
        }
        span.title:has(+ *) {
           display: inline-block;
           width: 8em;
        }

        /* GAP styling */
        button.gap-compute {
           font-size: 0.85rem;
           width: 12em;
           background-color: #efefef;
           background-image: none;
           margin-top: 0.5em;
           margin-left: 4em;
        }

        #gap-iframe {
           position: fixed; /* Stay in place when underlying document is scrolled */
           z-index: 1; /* Sit on top */
           left: 20%;
           top: 20%;
           width: 50em;
           border-style: none;
           display: none;
        }
       </style>`);
    document.body.insertAdjacentHTML('beforeend', `<div id="heading"></div>
       <div id="content" class="all-info stack-08em box">
          <div id="basic-facts"></div>
          <div id="views"></div>
          <div id="computed-properties">
             <details open class="stack-03em"> 
                <summary>Computed properties</summary>
                <div id="abelian"></div>
                <div id="class-equation"></div>
                <div id="cyclic-group"></div>
                <div id="subgroups"></div>
                <div id="order-classes"></div>
                <div id="solvable"></div>
                <div id="zmn"></div>
             </details>
          </div>
          <div id="generators"></div>
          <div id="naming-schemes">
             <details class="stack-03em">
                <summary>Naming schemes</summary>
                <div id="default-names"></div>
                <div id="loaded-names"></div>
                <div id="user-names"></div>
             </details>
          </div>
          <div id="customizations">
             <details class="stack-03em">
                <summary class="title">Customizations</summary>
             </details>
          </div>
          <div id="file-data"></div>
       </div>
       <iframe id="gap-iframe"></iframe>`);
}
//# sourceMappingURL=GroupInfo.js.map