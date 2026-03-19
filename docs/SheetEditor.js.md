/* @flow

# SheetEditor
 * receive initial data from Sheet and return asynchronously
 * implements broadcastChange function to return data to Sheet

```javascript
 */
import * as StoredObjects from './StoredObjects.js'
import * as Log from './Log.js'

export {broadcastChange, getInitialData, enableChangeBroadcast}

let broadcastChange = () => {}

async function getInitialData () {
   if (Log.isActive('debug')) {
      const initialData = await StoredObjects.getPassedJSON()
      Log.debug(`initial data retrieved: ${JSON.stringify(initialData)}`)
   }
   return StoredObjects.getPassedJSON()
}
/*
```
## Change broadcast
When a Sheet spawns an editor to modify one of the visualizers being displayed, the
changes in the editor are broadcast back to the Sheet using the `window.postMessage()`
function. Since ability to function as an editor is common across the visualizers, it
has been abstracted here.

`enableChangeBroadcast`is passed a function that takes no arguments and generates JSON.
This would typically be something like`() => MulttableView.toJSON().`From the passed function
a`changeBroadcaster`function is created and returned. This function compares
the current JSON with JSON from the previous invocation and posts the new JSON if there is a change.
```javascript
*/
function enableChangeBroadcast (jsonGenerator) {
   broadcastChange = (function (json_generator) {
      let lastJsonString

      function changeBroadcaster() {
         const currentJson = json_generator()
         const currentJsonString = JSON.stringify(currentJson)
         if (currentJsonString != lastJsonString) {
            lastJsonString = currentJsonString
            const msg = {
               source: 'editor',
               json: currentJson,
            };
            Log.debug(`message posted: ${currentJsonString}`)
            window.opener?.postMessage(msg, new URL(window.location.href).origin)
         }
      }

      return changeBroadcaster
   })(jsonGenerator)
}
