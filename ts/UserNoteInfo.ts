/*

# UserNoteInfo

A [GroupInfo](./GroupInfo.html.md) component that displays, creates, edits and saves user-created
notes. These notes are saved in [local
storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), are shared by all
the GE3 pages, and persist across GE3 invocations.

```javascript
 */
import * as GEUtils from './GEUtils.js'
import * as Library from './Library.js'

import type { Group } from './Group.ts'

export function display (userNotesElementId: string, group: Group) {
   const userNotesElement = document.getElementById(userNotesElementId) as HTMLElement
   ;(userNotesElement.querySelector('details') as HTMLElement).insertAdjacentHTML('beforeend',
      `<div id="user-name">
          <details>
             <summary>
                <span class="title">Group name</span>
                <span class="summary" style="display: inline"></span>
             </summary>
             <div id="user-name-edit"></div>
       </div>
       <div id="user-notes">
          <details>
             <summary>
                <span class="title">Notes</span>
                <span class="summary" style="display: inline"></span>
             </summary>
             <div id="user-notes-edit"></div>
          </details>
       </div>`)

   closeNotesDisplay(group)
   closeNameDisplay(group)

   GEUtils.createActionHandler(userNotesElement, (action) => eval(action))
   ;(document.querySelector('#user-name details') as HTMLElement)
      .addEventListener('toggle', (ev) => {
         (ev.newState == 'open') ? openNameDisplay(group) : closeNameDisplay(group)
      })
   ;(document.querySelector('#user-notes details') as HTMLElement)
      .addEventListener('toggle', (ev) => {
         (ev.newState == 'open') ? openNotesDisplay(group) : closeNotesDisplay(group)
      })
}

function openNotesDisplay (group: Group) {
   showNotes(group.userNotes)
   ;(document.getElementById('user-notes-edit') as HTMLElement).innerHTML =
      `<div id="user-notes-display">${group.userNotes}</div>
       <textarea id="user-notes-textarea" style="font-size: 1em; background-color: var(--gray1)"
          placeholder="Enter notes here..." rows="5" cols="80">${group.userNotes}</textarea>
       <br><a href="" data-action="previewNotes()">Display changes</a> as they would appear, without saving them
       <br><a href="" data-action="closeNotesDisplay(group)">Discard changes</a> and close editor
       <br><a href="" data-action="saveNotesEdit(group)">Save changes</a> and close editor
       <br>(Notes are in HTML, not plain text, so
          "&lt;i&gt;H&lt;/i&gt;&lt;sub&gt;2&lt;/sub&gt;" will display as <i>H</i><sub>2</sub>,
          <br>and &lt;br&gt; is used to start a new line, not \\n.)`
}

function closeNotesDisplay (group: Group) {
   showNotes(group.userNotes)
   ;(document.querySelector('#user-notes details') as HTMLDetailsElement).open = false
}

function showNotes (notes: string) {
   ;(document.querySelector('#user-notes span.summary') as HTMLElement).innerHTML =  // FIXME?
      (notes.length != 0) ? notes.slice(0, 80) : '<i>none</i>'
   const userNotesDisplay = document.getElementById('user-notes-display')
   if (userNotesDisplay != null) {
      userNotesDisplay.innerHTML = (notes == null || notes === '') ? '<i>none</i>' : notes
   }
}

function previewNotes () {
   const notes = (document.getElementById('user-notes-edit')?.querySelector('textarea') as HTMLTextAreaElement).value
   showNotes(notes)
}

function saveNotesEdit (group: Group) {
   group.userNotes = (document.getElementById('user-notes-edit')?.querySelector('textarea') as HTMLTextAreaElement).value
   Library.saveGroup(group)
   closeNotesDisplay(group)
}

function openNameDisplay (group: Group) {
   showName(group.customName)
   ;(document.getElementById('user-name-edit') as HTMLElement).innerHTML =
      `<textarea id="user-name-textarea" style="resize: horizontal; font-size: 1em; background-color: var(--gray1)"
          placeholder="Enter custom name" rows="1" cols="40">${group.customName ?? ''}</textarea>
       <br><a href="" data-action="previewName()">Display name</a> as it would appear, without saving it
       <br><a href="" data-action="clearNameEditor()">Clear editor</a> and continue editing
       <br><a href="" data-action="closeNameDisplay(group)">Revert changes</a> and close editor
       <br><a href="" data-action="saveNameEdit(group)">Save custom name</a> and close editor
       <br>(Group name is in HTML, not plain text, so
          "&lt;i&gt;H&lt;/i&gt;&lt;sub&gt;2&lt;/sub&gt;" will display as <i>H</i><sub>2</sub>.)`
}

function closeNameDisplay (group: Group) {
   showName(group.customName)
   ;(document.querySelector('#user-name details') as HTMLDetailsElement).open = false
}

function showName (name: Maybe<string>) {
   (document.querySelector('#user-name span.summary') as HTMLElement).innerHTML = name ?? '<i>no custom name</i>'
}

function clearNameEditor () {
   (document.getElementById('user-name-textarea') as HTMLTextAreaElement).value = ''
   previewName()
}

function previewName () {
   const name = (document.getElementById('user-name-edit')?.querySelector('textarea') as HTMLTextAreaElement).value
   showName((name.length == 0) ? null : name)
}

function saveNameEdit (group: Group) {
   group.customName = (document.getElementById('user-name-edit')?.querySelector('textarea') as HTMLTextAreaElement).value
   Library.saveGroup(group)
   closeNameDisplay(group)

   // Notify dependent display elements when changing the group name
   const representationChangeEvent = new CustomEvent('representationChange', {})
   const allInfoElement = document.getElementById('user-name-edit')?.closest('.all-info') as HTMLElement
   allInfoElement.dispatchEvent(representationChangeEvent)
}
