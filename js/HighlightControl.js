/*
# HighlightControl - Subset and Highlighting Management

HighlightControl is the entry point for the subset/highlighting control panel.
It wires together the [ViewModel](./HighlightControlViewModel.js.md) and
[View](./HighlightControlView.js.md) layers and registers the control with
the visualizer model in the model's `highlightControl` slot.

```js
 */
import { HighlightControlViewModel } from './HighlightControlViewModel.js';
import { HighlightControlView } from './HighlightControlView.js';
/*
```
## AddControl

```js
 */
export function addControl(highlightControlElement, modelProxy) {
    const viewModel = new HighlightControlViewModel(modelProxy); // create ViewModel and connect to Model
    new HighlightControlView(viewModel, highlightControlElement); // create View and connect to ViewModel
}
//# sourceMappingURL=HighlightControl.js.map