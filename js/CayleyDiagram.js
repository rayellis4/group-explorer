// @flow
import { CayleyDiagramModel } from './CayleyDiagramModel.js';
import * as CayleyDiagramControl from './CayleyDiagramControl.js';
import * as CayleyViewControl from './CayleyViewControl.js';
import { createInteractiveCayleyDiagramView } from './CayleyDiagramView.js';
import { ControlPanel } from './ControlPanel.js';
import { createModelProxy } from './GEUtils.js';
import * as Heading from './Heading.js';
import * as HighlightControl from './HighlightControl.js';
import * as Library from './Library.js';
import * as Log from './Log.js';
import * as SheetEditor from './SheetEditor.js';
export { load };
/*::
   import type {CayleyDiagramJSON} from './js/CayleyDiagramView.js';
   import type {MSG_external} from './js/SheetModel.js';
 */
async function load() {
    insertHTML();
    document.body.addEventListener('contextmenu', (ev) => ev.preventDefault());
    // If this page is editing a sheet...
    const { elementId, json: initialJSON } /*: unknown */ = await (window.location.href.includes('SheetEditor')
        ? SheetEditor.getInitialData()
        : { elementId: null, json: null });
    // Get group, either from page URL or data from Sheet
    const group /*: Group */ = await ((initialJSON?.group_url == null)
        ? Library.loadFromPageURL()
        : Library.getGroupByURL(initialJSON.group_url));
    // Create Header
    Heading.display(document.getElementById('heading'), `Cayley Diagram for ${group.name}`, () => [
        { label: 'Group Info', action: () => window.open(`GroupInfo.html?groupURL=${group.URL}`) },
        { label: 'Group Library', action: () => window.open('GroupExplorer.html') },
        { label: 'New Sheet', action: () => window.open('Sheet.html') },
        { label: '<hr>', action: () => { } },
        { label: 'Cayley Diagram Help', action: () => window.open('help/rf-um-cd-options/index.html') }
    ]);
    const cayleyDiagramModel /*: SubscriptionProxy<CayleyDiagramModel> */ = createModelProxy(new CayleyDiagramModel(group));
    const cayleyDiagramViewModel = createInteractiveCayleyDiagramView(cayleyDiagramModel, {
        container: document.getElementById('graphic')
    });
    // Set up change broadcast (if this page is an editor for a sheet)
    if (window.location.href.includes('SheetEditor')) {
        if (initialJSON != null) {
            cayleyDiagramModel.fromJSON(initialJSON);
        }
        else {
            Log.warn('CayleyDiagram: SheetEditor mode but no initial JSON passed in IndexedDB');
        }
        SheetEditor.enableChangeBroadcast(() => {
            return { elementId: elementId, json: cayleyDiagramModel.toJSON() };
        });
        SheetEditor.listenForSheetUpdates((json) => cayleyDiagramModel.fromJSON(json));
        cayleyDiagramViewModel.resize(); // need to fix initial aspect ratio when editing
        window.setInterval(() => SheetEditor.broadcastChange(), 1000); // There's got to be a better way than polling...
    }
    // Create Control Panel
    const controlPanelElement = document.getElementById('control-panel');
    ControlPanel.addPanel(controlPanelElement);
    // Initialize HighlightControl
    const highlightControlElement = document.getElementById('highlight-control');
    HighlightControl.addControl(highlightControlElement, cayleyDiagramModel);
    // Create view control
    const cayleyViewControlElement = document.getElementById('cayley-view-control');
    CayleyViewControl.addControl(cayleyViewControlElement, cayleyDiagramModel);
    // Create diagram control
    const cayleyDiagramControlElement = document.getElementById('cayley-diagram-control');
    CayleyDiagramControl.addControl(cayleyDiagramControlElement, cayleyDiagramModel);
    // Listen for window resize and resize visualizer
    window.addEventListener('resize', () => cayleyDiagramViewModel.resize());
}
function insertHTML() {
    document.body.classList.add('flex-v');
    document.body.insertAdjacentHTML('beforeend', `<div id="heading"></div>
      <div id="display" class="stretch position:relative fill-h">
         <div id="graphic" class="position:absolute fill-h fill-v"></div>
         <div id="control-panel" class="position:absolute flex-h">
            <div id="highlight-control" data-button="Subsets"></div>
            <div id="cayley-view-control" data-button="View" class="box stack-15em"></div>
            <div id="cayley-diagram-control" data-button="Diagram" class="box stack-15em"></div>
         </div>
      </div>`);
}
//# sourceMappingURL=CayleyDiagram.js.map