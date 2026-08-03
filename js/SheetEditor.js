/* @flow

# SheetEditor
 * receive initial data from Sheet and return asynchronously
 * implements broadcastChange function to return data to Sheet

```javascript
 */
import * as StoredObjects from './StoredObjects.js';
import * as Log from './Log.js';
export { broadcastChange, getInitialData, enableChangeBroadcast, listenForSheetUpdates };
let broadcastChange = () => { };
let lastJsonString; // module-level so listenForSheetUpdates can set it to suppress echo-back
async function getInitialData() {
    const { elementId, json } = await StoredObjects.getPassedJSON();
    if (Log.isActive('debug')) {
        Log.debug(`initial data retrieved for element ${elementId}: ${JSON.stringify(json)}`);
    }
    return { elementId: elementId, json: json };
}
/*
```
## Change broadcast
When a Sheet spawns an editor to modify one of the visualizers being displayed, the
changes in the editor are broadcast back to the Sheet using the `window.postMessage()`
function. Since ability to function as an editor is common across the visualizers, it
has been abstracted here.

`enableChangeBroadcast` is passed a function that takes no arguments and generates JSON.
`changeBroadcaster` compares current JSON with the previous broadcast and posts if changed.

`listenForSheetUpdates` sets up the reverse path: Sheet→Editor updates. It calls `fromJSONCallback`
when the Sheet posts a change, and updates `lastJsonString` to prevent the editor echoing it back.
```javascript
*/
function enableChangeBroadcast(jsonGenerator) {
    broadcastChange = function changeBroadcaster() {
        const { elementId, json: currentJson } = jsonGenerator();
        const currentJsonString = JSON.stringify(currentJson);
        if (currentJsonString != lastJsonString) {
            lastJsonString = currentJsonString;
            const msg = { source: 'editor', elementId, json: currentJson };
            Log.debug(`message posted for ${elementId}: ${currentJsonString}`);
            window.opener?.postMessage(msg, new URL(window.location.href).origin);
        }
    };
}
function listenForSheetUpdates(fromJSONCallback) {
    window.addEventListener('message', (event) => {
        if (event.data?.source !== 'sheet')
            return;
        const { json } = event.data;
        fromJSONCallback(json);
        lastJsonString = JSON.stringify(json); // prevent echo-back on next broadcastChange()
    });
}
//# sourceMappingURL=SheetEditor.js.map