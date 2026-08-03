/* @flow

# ControlPanel

The ControlPanel class manages the control panel for all visualizers:
 * Creates buttons to display configured controllers (if there are multiple controllers)
 * Implements off-screen drag and recovery to hide the control panel


     * Hover over left margin changes cursor, highlights margin
     * Drag panel to right to hide it off-screen
     * Start a leftward drag within ~1cm of the right window border to recover panel from off-screen

The ControlPanel [addPanel](#addpanel) factory method takes a &lt;div&gt; containing
the individual controls and adds buttons, drag elements, and event management to the
control panel. Here is an example, from [Multtable.html](./Multtable.html.md#control-panel)
(ignoring some formatting utility classes):

Given the control panel description:
```html
    <div id="control-panel">
       <div id="highlight-control" data-button="Subsets"></div>
       <div id="table-control" data-button="Table"</div>
    </div>

```
the [ControlPanel](#controlpanel) class generates the following HTML and inserts it into the DOM:
```html
       <div id="control-panel">
          <div id="control-grab-handle"></div>
          <div id="control-grab-indicator"></div>
          <div id="control-contents">
             <div id="control-options">          <!-- button container -->
                <button>Subsets</button>         <!-- button name from data-button attribute -->
                <button>Table</button>
             </div>
             <div id="control-container">
                <div id="highlight-control" data-button="Subsets"></div>
                <div id="table-control" data-button="Table"></div>
             </div>
          </div>
       </div>
```

The `control-grab-handle` element is a transparent &lt;div&gt; to the left of the control panel. It
   remains on-screen, even when the rest of the control panel is hidden. While it is inactive when the
   rest of the control panel is visible, it is active when the rest of the panel is off-screen,
   enabling the user to recover the off-screen panel.
   (See notes on [control panel styling]](#control-panel-styling).)

The `control-grab-indicator` element is a transparent &lt;div&gt; just inside the control panel on
   the left side.  The cursor changes when it passes over the grab indicator, and its background color
   changes, indicating to the user that the control panel can be moved.

```javascript
 */
import { recognizeDragAndDrop } from './Gestures.js';
/*::
import type {DragAndDropCallback} from './Gestures.js'
 */
/*
```
## ControlPanel

This class creates the html structure described [above](#controlpanel).

```javascript
 */
export class ControlPanel {
    controlPanelElement; /*: HTMLElement */
    grabHandle; /*: HTMLElement */
    controlContainer; /*: HTMLElement */
    lastEvent; /*: Event */
    constructor(controlPanel /*: HTMLElement */) {
        this.controlPanelElement = controlPanel;
        const controls = Array.from(this.controlPanelElement.children);
        this.controlPanelElement.insertAdjacentHTML('beforeend', `<div id="control-grab-handle"></div>
          <div id="control-grab-indicator"></div>
          <div id="control-contents" class="flex-v stretch">
             <div id="control-container" class="stretch"></div>
          </div>`);
        this.controlContainer = document.getElementById('control-container');
        this.grabHandle = document.getElementById('control-grab-handle');
        // controllers from 'control-panel' to 'control-container'
        controls.forEach((el) => this.controlContainer.appendChild(el));
        if (controls.length > 1)
            this.addControllers(controls);
        this.controlPanelElement.insertAdjacentHTML('beforeend', controlPanelStyleHTML);
        recognizeDragAndDrop(controlPanel, (start, prev, curr) => this.move(start, prev, curr));
    }
    /*
    ```
    ### addPanel
 
    `addPanel` is the factory method for the `ControlPanel` module.
 
    ```javascript
     */
    static addPanel(controlPanel /*: HTMLElement */) {
        new ControlPanel(controlPanel);
    }
    /*
    ```
    ### Add controllers
    
    Creates buttons to select which controller to show and place them in 'control-options'
    ```javascript
     */
    addControllers(controls /*: Array<HTMLElement> */) {
        const controlContents = (document.getElementById('control-contents') /*:: as any as HTMLElement */);
        controlContents.insertAdjacentHTML('afterbegin', `<div id="control-options" class="flex-h"></div>`);
        const controlOptions = (document.getElementById('control-options') /*:: as any as HTMLElement */);
        controlOptions.innerHTML =
            controls.map((control) => `<button>${control.getAttribute('data-button') || ''}</button>`).join('');
        controlOptions.querySelectorAll('button')
            .forEach((button, index) => button.addEventListener('click', (_ev) => showControl(controls[index])));
        const showControl = (control /*: HTMLElement */) => {
            controls.forEach((ctrl) => ctrl.style.display = (control === ctrl) ? 'block' : 'none');
        };
        showControl(controls[controls.length - 1]); // show the most interesting control?
    }
    /*
    ```
    ### Move
    
    Translate the control panel to the right by the distance from the `previousEvent` to the `currentEvent`, unless
    1. this would position the control panel away from the right side of the display, in which case we expose it completely; or
    2. it would sqeeze the display smaller than its `min-width` styling, in which case we hide it.
    
    The panel is 'hidden' by translating it off the (right) edge of the screen. It is only translated enough to hide
    the `control-container` wrapper, leaving the `control-grab-handle` and on-screen.
    The `pointer-events` style is used to enable/disable event capturing for the `control-grab-handle` as it
    is exposed/hidden (see [CSS styling discussion](#css-styling) above).
    
    A transform is used instead of setting the position and visibiliity with CSS because it's faster.
    ```javascript
     */
    move(_startEvent /*: PointerEvent */, previousEvent /*: PointerEvent */, currentEvent /*: PointerEvent */) {
        const deltaX = currentEvent.clientX - previousEvent.clientX;
        const maxOffset = this.controlContainer.getBoundingClientRect().width - parseInt(getComputedStyle(this.controlContainer).minWidth);
        const panelIsHidden = this.controlContainer.getBoundingClientRect().left >= document.body.getBoundingClientRect().right;
        let currentOffset = this.controlContainer.getBoundingClientRect().right - document.body.getBoundingClientRect().right;
        if (panelIsHidden) { // pulling hidden panel on-screen?
            if (deltaX >= 0) {
                return; // do nothing -- this action would push hidden panel further off-screen
            }
            currentOffset = maxOffset;
            this.grabHandle.style.pointerEvents = 'none';
            this.grabHandle.style.cursor = 'default';
        }
        const newOffset = Math.max(0, currentOffset + deltaX);
        if (newOffset > maxOffset) { // action would make width < min-width, just hide panel
            this.controlPanelElement.style.transform = `translateX(${this.controlContainer.getBoundingClientRect().width}px)`;
            this.grabHandle.style.pointerEvents = 'unset';
            this.grabHandle.style.cursor = 'w-resize';
        }
        else {
            this.controlPanelElement.style.transform = `translateX(${newOffset}px)`;
        }
    }
}
/*
```
### Control panel styling

CSS styling for the elements of the control panel.

Note the `control-grab-handle` styling: `pointer-events` is set to `none` when the control panel
is visible, decoupling it from ui events; when the control panel is hidden off-screen this is
`unset`, so that the lip that remains on-screen will receive events and can be used to drag the
control panel back out of hiding.
```javascript
 */
const controlPanelStyleHTML = `<style>
       #control-panel {
          top: 0;
          right: 0;
          bottom: 0;
          box-shadow: var(--large-shadow);
          touch-action: none;
          font-size: 1.25rem;
          min-width: 20em;  /* keeps width from changing when switching controller, for the average group */
       }
       #control-grab-handle {
          pointer-events: none; /* passes events through to underlying elements; unset when control panel is off-screen */
          background-color: var(--clear);
          width: 1cm;
          margin-left: -1cm; /* places element *outside* of control-panel */
       }
       #control-grab-indicator {
          position: absolute; /* places element on top of #control-contents */
          width: 1ch;
          height: 100%;
          cursor: ew-resize;
          background-color: var(--clear);
       }
       #control-contents {
          overflow-y: hidden;
          background-color: var(--controls-background);
       }
       #control-options {
          padding: 1ch;
          justify-content: space-evenly;
          background-color: var(--control-options-background);
          border-bottom: var(--dark-border);
       }
       #control-options > button {
          font-size: 1em;
       }
       #control-container {
          min-width: 10ch; /* min width of exposed panel before it's moved completely off-screen */
          height: 100%;
          overflow-y: auto;
       }
       #control-container > * {
          height: 100%;
          width: 100%;
       }
       #control-container > * > * > *:not(button) {
          font-size: 0.8em;
       }

       #control-contents button {
          width: 100%;
          margin: 0 0.3em;
          flex-grow: 1;
          flex-shrink: 1;
       }
       #control-contents button:first-child {
          margin-left: 0;
       }
       #control-contents button:last-child {
          margin-right: 0;
       }
      </style>`;
//# sourceMappingURL=ControlPanel.js.map