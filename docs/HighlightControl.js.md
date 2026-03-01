/* @flow
# HighlightControl - Subset and Highlighting Management

HighlightControl is the entry point for the subset/highlighting control panel.
It wires together the ViewModel and View layers and registers the control with
the visualizer model via the model's `highlightControl` slot.

```js
 */
import {HighlightControlViewModel} from './HighlightControlViewModel.js'
import {HighlightControlView} from './HighlightControlView.js'
/*::
import type {SubscriptionProxy} from './GEUtils.js'
import {CycleGraphModel} from './CycleGraphModel.js'

type HighlightControlJSON = {
  nextId: number,
  nextSubsetIndex: number,
  highlightedItem: number | void,
  displayItems: Array<any>,
  ...
}
 */
export {addControl}
/*
```
## AddControl

```js
 */
function addControl (
   highlightControlElement /*: HTMLElement */,
   modelProxy /*: SubscriptionProxy<CycleGraphModel> */,
   initialJSON /*: HighlightControlJSON */
) {
   const viewModel = new HighlightControlViewModel(modelProxy)  // create ViewModel and connect to Model
   if (initialJSON != null) {
      viewModel.fromJSON(initialJSON)
   }
   new HighlightControlView(viewModel, highlightControlElement) // create View and connect to ViewModel
}
