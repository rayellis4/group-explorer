/* @flow

# UserNoteInfo

A [GroupInfo](./GroupInfo.html.md) component that displays, creates, edits and saves user-created
notes. These notes are saved in [local
storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), are shared by all
the GE3 pages, and persist across GE3 invocations.

```javascript
 */
import * as GEUtils from './GEUtils.js'
import * as Library from './Library.js'

export {display}

function display (userNotesElementId, group) {
   const userNotesElement = document.getElementById(userNotesElementId)
   userNotesElement.innerHTML = 
      `<details>
          <summary>
             <span class="title">User notes</span>
          </summary>
          <div id="user-notes-display"></div>
          <div id="user-notes-edit"></div>
          <div id="user-notes-options"></div>
       </details>`

   restart(group)

   GEUtils.createActionHandler(userNotesElement, (action) => eval(action))
}

function restart (group) {
   showNotes(group.userNotes)
   document.getElementById('user-notes-edit').innerHTML = ''
   const options = '<a href="" data-action="edit(group)">Click to edit notes</a>'
   document.getElementById('user-notes-options').innerHTML = options
}

function showNotes (notes) {
   document.getElementById('user-notes-display').innerHTML = (notes == null || notes === '') ? '<i>none</i>' : notes
}

function edit (group) {
   document.getElementById('user-notes-edit').innerHTML =
      `<textarea id="notes-textarea" rows="5" cols="80" placeholder="Enter notes here...">${group.userNotes}</textarea>
       <br>User notes are in HTML:
       "&lt;i&gt;H&lt;/i&gt;&lt;sub&gt;2&lt;/sub&gt;" will display as <i>H</i><sub>2</sub>.
       <br>Remember to use "&lt;br&gt;" for new line.`
   const options = [
      `<a href="" data-action="preview()">Display changes</a>
       as they would appear, without saving them`,
      `<a href="" data-action="restart(group)">Discard changes</a>
       and close editor`,
      `<a href="" data-action="saveEdit(group)">Save changes</a>
       and close editor`
   ].join('<br>')
   document.getElementById('user-notes-options').innerHTML = options
}

function preview () {
   const notes = document.getElementById('user-notes-edit').querySelector('textarea').value
   showNotes(notes)
}

function saveEdit (group) {
   group.userNotes = document.getElementById('user-notes-edit').querySelector('textarea').value
   Library.saveGroup(group)
   restart(group)
}
