/*
# Sheet

Assembles Sheet html page

```js
 */
import { ControlPanel } from './ControlPanel.js';
import { createModelProxy } from './GEUtils.js';
import * as Heading from './Heading.js';
import { SheetModel, loadPassedSheet } from './SheetModel.js';
import { SheetViewModel } from './SheetViewModel.js';
import { View as SheetView } from './SheetView.js';
import * as SheetViewUI from './SheetViewUI.js';
import * as SheetControl from './SheetControl.js';
export async function load() {
    insertHTML();
    document.body.addEventListener('contextmenu', (ev) => ev.preventDefault());
    // Create Header
    Heading.display(document.getElementById('heading'), 'Group Explorer Sheet', () => [
        { label: 'Group Library', action: () => window.open('GroupExplorer.html') },
        { label: 'New Sheet', action: () => window.open('Sheet.html') },
        { label: '<hr>', action: () => { } },
        { label: 'Sheet Help', action: () => window.open('help/rf-um-sheetwindow/index.html') }
    ]);
    // initialize Sheet components
    const sheetModel = createModelProxy(new SheetModel());
    const sheetViewModel = new SheetViewModel(sheetModel);
    const graphicElement = document.getElementById('graphic');
    new SheetView(sheetViewModel, graphicElement);
    SheetViewUI.init(sheetViewModel, graphicElement);
    // Create Control Panel
    const controlPanelElement = document.getElementById('control-panel');
    ControlPanel.addPanel(controlPanelElement);
    // Initialize Sheet Control
    const sheetControlElement = document.getElementById('sheet-control');
    SheetControl.addControl(sheetControlElement, sheetModel, sheetViewModel);
    // check for passedSheet in URL, load it if present
    const invokeParameters = new URL(window.location.href).searchParams;
    if (invokeParameters.get('passedSheet') != null) {
        loadPassedSheet(sheetModel)
            .then((title) => {
            if (title != null)
                Heading.setTitle(title);
        });
    }
}
function insertHTML() {
    document.body.classList.add('flex-v');
    document.body.insertAdjacentHTML('beforeend', `<style>
       button {
          background-image: var(--light-gradient);
       }

       .highlighted, .choice:hover {
          background-color: var(--list-highlight);
       }

       #graphic {
          z-index: 0;
          background-color: var(--sheet-background);
       }

       .editor {
          display: none;
          position: fixed;
          background-color: white;
       }

       #linking-dialog {
          background-color: white;
          z-index: 1000;
          width: 8em;
          padding: 0.5em;
          font-size: x-large;
          box-shadow: var(--large-shadow);
       }

       #linking-indicator > button {
          font-size: large;
          height: auto;
          display: block;
          margin:1em auto 0;
          width: 7em;
       }

       .outlined {
          outline: 2px dotted #AA0000;
          outline-offset: 10px;
       }
      </style>
      <div id="heading"></div>
      <div id="display" class="position:relative stretch">
         <div id="graphic" class="position:absolute fill-v fill-h"></div>
         <div id="control-panel" class="position:absolute flex-h">
            <div id="sheet-control" class="box stack-15em"></div>
         </div>
      </div>`);
}
//# sourceMappingURL=Sheet.js.map