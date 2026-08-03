/*
# Settings

Manages user settings

```js
 */

import * as Library from './Library.js'
import { makeDialog } from './UIComponents.js'
import * as StoredObjects from './StoredObjects.js'

export type SettingsType = {
   showExtendedLt32?: boolean,
   showExtendedGe32?: boolean,
   showNotable?:      boolean,
   showGenerated?:    boolean,
}

const DEFAULTS: SettingsType = {
   showExtendedLt32: false,
   showExtendedGe32: false,
   showNotable:      false,
   showGenerated:    false,
}

// in-memory cache — authoritative source for this tab
const cache: SettingsType = Object.assign({}, DEFAULTS)

// populate cache from IndexedDB.Settings; called from AutoUpgrade.initialize
export async function loadSettings () {
   const storedSettings = (await StoredObjects.getSettings()) ?? {}
   Object.assign(cache, storedSettings)
}

// listen for settings changes from other tabs and update cache from message
new BroadcastChannel('GE3-channel').addEventListener('message', (ev) => {
   if (ev.data.source !== 'settings') return
   const values = ev.data.values
   if (values != null) Object.assign(cache, values)
})

export function getFilterConfig (): SettingsType {
   return {...cache}
}

async function set (newSettings: SettingsType) {
   Object.assign(cache, newSettings)
   await StoredObjects.saveSettings(cache)
   new BroadcastChannel('GE3-channel').postMessage({source: 'settings', values: {...cache}})
}

export function showDialog () {
   const center = {clientX: window.innerWidth / 2, clientY: window.innerHeight / 2}
   const modal = makeDialog(dialogHTML(), center)

   // initialize checkboxes from current cache — changes held in DOM until Save
   Object.entries(cache).forEach(([key, value]) => {
      const inputElement = modal.querySelector(`#settings-${key}`) as HTMLInputElement
      inputElement.checked = value
   })

   const deleteButton = modal.querySelector('#settings-delete-generated') as HTMLButtonElement
   const updateDeleteButton = () => {
      deleteButton.disabled = !Library.getAllGroups().some((G) => G.library === 'generated')
   }
   updateDeleteButton()
   deleteButton.addEventListener('click', () => {
      if (window.confirm('Delete all generated groups?')) {
         Library.deleteGroups(Library.getAllGroups().filter((G) => G.library === 'generated'))
         updateDeleteButton()
      }
   })

   const cancelSettingsButton = modal.querySelector('#settings-cancel') as HTMLButtonElement
   cancelSettingsButton.addEventListener('click', () => modal.remove())

   const saveSettinggsButton = modal.querySelector('#settings-save') as HTMLButtonElement
   saveSettinggsButton.addEventListener('click', () => {
      const newSettings: SettingsType = {}
      modal.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
         const key = checkbox.id.replace('settings-', '')
         if (key in DEFAULTS) newSettings[key as keyof SettingsType] = (checkbox as HTMLInputElement).checked
      })
      set(newSettings)
      modal.remove()
   })
}

function dialogHTML (): html {
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
               <span style="color: #a00">— order 32 alone has 44 non-abelian groups</span></label>
         </div>
         <div>
            <input type="checkbox" id="settings-showNotable">
            <label for="settings-showNotable">Notable large groups (Tesseract, GL<sub>3</sub>(𝔽<sub>2</sub>), …)
               <span style="color: #a00">— Tesseract can take 20+ seconds to load; the app is working</span></label>
         </div>
         <div>
            <input type="checkbox" id="settings-showGenerated">
            <label for="settings-showGenerated">Generated groups (groups you have defined)</label>
         </div>
         <div><b>Library management</b></div>
         <div>
            <button id="settings-delete-generated" style="width: auto">Delete generated groups</button>
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
