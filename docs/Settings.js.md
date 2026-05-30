// @flow

import * as Library from './Library.js'
import {makeDialog} from './UIComponents.js'
import * as StoredObjects from './StoredObjects.js'

export {allVisibleGroups, get, loadSettings, showDialog}

/*::
type SettingsKey = 'showExtendedLt32' | 'showExtendedGe32' | 'showNotable' | 'showGenerated'
*/

const DEFAULTS /*: {[SettingsKey]: boolean} */ = {
   showExtendedLt32: false,
   showExtendedGe32: false,
   showNotable:      false,
   showGenerated:    false,
}

// in-memory cache — authoritative source for this tab
const cache /*: {[SettingsKey]: boolean} */ = Object.assign({}, DEFAULTS)

// populate cache from IndexedDB on load
async function loadSettings () {
   const storedSettings = await StoredObjects.getSettings()
   console.log(storedSettings)
   Object.assign(cache, storedSettings, DEFAULTS)
}

// listen for settings changes from other tabs and update cache from message
new BroadcastChannel('GE3-channel').addEventListener('message', (ev) => {
   if (ev.data.source !== 'settings') return
   const values = ev.data.values
   if (values != null) Object.assign(cache, values)
})

function get (key /*: SettingsKey */) /*: boolean */ {
   return cache[key]
}

function allVisibleGroups () /*: Array<any> */ {
   const groupVisibility /*: {[string]: 'shown' | 'hidden'} */ = cache.groupVisibility ?? {}
   return Library.getAllGroups().filter((group) => {
      const override = groupVisibility[group.URL]
      if (override != null) return override === 'shown'
      const lib = group.library
      if (lib == null)                         return true
      if (lib === 'fgb' || lib === 'extended') return group.order < 32 ? cache.showExtendedLt32 : cache.showExtendedGe32
      if (lib === 'notable')                   return cache.showNotable
      if (lib === 'generated')                 return cache.showGenerated
      return true
   })
}

async function set (key /*: SettingsKey */, value /*: boolean */) {
   cache[key] = value
   await StoredObjects.saveSettings(cache)
   new BroadcastChannel('GE3-channel').postMessage({source: 'settings', changed: [key], values: {[key]: value}})
}

function showDialog () {
   const center = {clientX: window.innerWidth / 2, clientY: window.innerHeight / 2}
   const modal = makeDialog(dialogHTML(), center)

   // initialize checkboxes from current cache — changes held locally until Save
   Object.keys(DEFAULTS).forEach((key) => {
      modal.querySelector(`#settings-${key}`).checked = get((key /*: any */))
   })

   modal.querySelector('#settings-cancel').addEventListener('click', () => modal.remove())

   modal.querySelector('#settings-save').addEventListener('click', () => {
      modal.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
         const key = checkbox.id.replace('settings-', '')
         set((key /*: any */), checkbox.checked)
      })
      modal.remove()
   })
}

function dialogHTML () /*: string */ {
   return `
      <div id="settings-dialog" class="sheet-editor box stack-03em" style="resize: none">
         <div><b>Settings</b></div>
         <div><b>Group universe</b></div>
         <div style="opacity: 0.5">
            <input type="checkbox" checked disabled>
            <label>Default library, all groups of order ≤ 21, plus a few interesting groups outside that range (e.g., S<sub>4</sub>, A<sub>5</sub>)</label>
         </div>
         <div>
            <input type="checkbox" id="settings-showExtendedLt32">
            <label for="settings-showExtendedLt32">Non-abelian groups, order 22–31</label>
         </div>
         <div>
            <input type="checkbox" id="settings-showExtendedGe32">
            <label for="settings-showExtendedGe32">Non-abelian groups, order 32–40
               <span style="color: #a00">— order 32 alone has 51 groups</span></label>
         </div>
         <div>
            <input type="checkbox" id="settings-showNotable">
            <label for="settings-showNotable">Notable large groups (Tesseract, GL<sub>3</sub>(𝔽<sub>2</sub>), …)</label>
         </div>
         <div>
            <input type="checkbox" id="settings-showGenerated">
            <label for="settings-showGenerated">Generated groups (groups you have defined)</label>
         </div>
         <div class="flex-h" style="justify-content: space-evenly">
            <button id="settings-cancel">Cancel</button>
            <button id="settings-save">Save</button>
         </div>
         <style>
            #settings-dialog {
               font-size: 1.25em;
               min-width: 28em;
            }
            #settings-dialog button {
               width: 8ch;
               margin: 0 0.5ch;
               background-image: var(--light-gradient);
            }
         </style>
      </div>`
}
