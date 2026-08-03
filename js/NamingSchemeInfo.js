/*

# NamingSchemeInfo

A [GroupInfo](./GroupInfo.html.md) component that displays the element representations available for
the group and allows the user to choose one to be used in future displays. User-defined
representations can be created, edited, stored, deleted, and selected in this component.  Like
[UserNoteInfo](./UserNoteInfo.js.md), these user-defined representations are saved in [local
storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), shared by all GE3
pages, and persist across GE3 invocations.

```javascript
 */
import * as GEUtils from './GEUtils.js';
import * as Library from './Library.js';
export function displayDefaultNames(defaultNamesElementId, group) {
    const defaultNamesElement = document.getElementById(defaultNamesElementId);
    defaultNamesElement.innerHTML = makeDefaultNamesContent(group);
    document.getElementById('content')
        .addEventListener('representationChange', () => defaultNamesElement.innerHTML = makeDefaultNamesContent(group));
}
function makeDefaultNamesContent(group) {
    const htmlFragments = [
        `<details open>
          <summary>
             <span class="title">Default element names</span>
          </summary>
          <span>${group.elements.map((el) => group.representation[el]).join(', ')}</span>
          <div>`,
        (group.representationIsUserDefined)
            ? 'This representation is user-defined; see below.'
            : 'This representation was loaded from the group file.',
        `</div>
       </details>`
    ];
    return htmlFragments.join('');
}
export function displayLoadedNames(loadedNamesElementId, group) {
    const loadedNamesElement = document.getElementById(loadedNamesElementId);
    loadedNamesElement.innerHTML = makeLoadedNamesContent(group, loadedNamesElementId);
    GEUtils.createActionHandler(loadedNamesElement, (action) => eval(action));
    document.getElementById('content')
        .addEventListener('representationChange', () => loadedNamesElement.innerHTML = makeLoadedNamesContent(group, loadedNamesElementId));
}
function makeLoadedNamesContent(group, loadedNamesElementId) {
    const loadedSchemeHTML = (index) => {
        return [
            '<div class="stack-03em">',
            '<table style="line-height: 1">',
            ...group.elements.map((el) => `<tr><td class="text-align:right">${group.representation[el]}</td>
                       <td>=</td>
                       <td>${group.representations[index][el]}</td>
                   </tr>`),
            '</table>',
            `<div>
                <a href="" data-action="setRepresentationByIndex('${loadedNamesElementId}', group, ${index})">Click here</a>
                to make this the default representation
             </div>`,
            '</div>'
        ].join('');
    };
    const htmlFragments = [
        `<details open>
          <summary>
             <span class="title">Loaded naming schemes</span>
          </summary>
          <div class="stack-08em">`,
        group.representations.map((rep, inx) => (group.representation == rep) ? '' : loadedSchemeHTML(inx)).join(''),
        `</div>
       </details>`
    ];
    return htmlFragments.join('');
}
function setRepresentationByIndex(contentElementId, group, index) {
    group.representation = group.representations[index];
    Library.saveGroup(group);
    updateDisplay(contentElementId, group);
}
export function displayUserNames(userNamesElementId, group) {
    updateUserNames(userNamesElementId, group);
    const userNamesElement = document.getElementById(userNamesElementId);
    GEUtils.createActionHandler(userNamesElement, (action) => eval(action));
    document.getElementById('content')
        .addEventListener('representationChange', () => userNamesElement.innerHTML = makeUserNamesContent(group, userNamesElementId));
}
function updateUserNames(userNamesElementId, group) {
    const userNamesElement = document.getElementById(userNamesElementId);
    userNamesElement.innerHTML = makeUserNamesContent(group, userNamesElementId);
}
function makeUserNamesContent(group, userNamesElementId) {
    const htmlFragments = [
        `<details open>
          <summary>
             <span class="title">User-defined naming schemes</span>
          </summary>`
    ];
    if (group.userRepresentations.length == 0) {
        htmlFragments.push('<i>none</i><br>');
    }
    else {
        const userRepresentationHTML = (index) => {
            const options = (group.representation == group.userRepresentations[index])
                ? `The default naming scheme is shown above<br>
               If you wish to edit or remove this representation,
               first make a different representation the default.`
                : `<a href="" data-action="setUserRepresentationByIndex('${userNamesElementId}', group, ${index})">Click here</a>
                  to make this the default representation.
               <br><a href="" data-action="editUserRepresentation('${userNamesElementId}', group, ${index})">Click here</a>
                  to edit this representation.
               <br><a href="" data-action="removeUserRepresentation('${userNamesElementId}', group, ${index})">Click here</a>
                  to remove this representation.`;
            return [
                `<div class="stack-03em" data-user-representation-index="${index}">`,
                '<table>',
                ...group.elements.map((el) => `<tr><td class="text-align:right">${group.representation[el]}</td>
                          <td>=</td>
                          <td>${group.userRepresentations[index][el]}</td>
                      </tr>`),
                '</table>',
                '<div>',
                options,
                '</div>',
                '</div>'
            ].join('');
        };
        htmlFragments.push('<div class="stack-08em">', group.userRepresentations.map((rep, inx) => (rep == null) ? '' : userRepresentationHTML(inx)).join(''), '</div>');
    }
    htmlFragments.push(`<div style="margin-top: 0.3em">
             <a href="" data-action="createUserRepresentation('${userNamesElementId}', group)">Click here</a>
                to add a new representation for this group.
          </div>
       </details>`);
    return htmlFragments.join('');
}
function createUserRepresentation(contentElementId, group) {
    group.userRepresentations.push(group.elements.map((el) => el.toString()));
    Library.saveGroup(group);
    document.getElementById(contentElementId).innerHTML = makeUserNamesContent(group, contentElementId);
}
function setUserRepresentationByIndex(contentElementId, group, index) {
    group.representation = group.userRepresentations[index];
    Library.saveGroup(group);
    updateDisplay(contentElementId, group);
}
function editUserRepresentation(contentElementId, group, index) {
    // replace innerHTML of data-user-representation-index == index div
    const userRepresentationHTML = (index) => [
        '<table>',
        ...group.elements.map((el) => `<tr><td class="text-align:right">${group.representation[el]}</td>
                  <td>=</td>
                  <td>${group.userRepresentations[index][el]}</td>
                  <td style="padding-top: 0">
                     <textarea style="resize: horizontal" placeholder="Enter representation"
                        rows="1" cols="20">${group.userRepresentations[index][el]}</textarea></td>
              </tr>`),
        '</table>',
        '<div>',
        `<br><a href="" data-action="previewEdit('${contentElementId}', ${index})">Display changes</a>
              as they would appear, without saving them.
           <br><a href="" data-action="updateUserNames('${contentElementId}', group)">Discard changes</a>
              and close editor.
           <br><a href="" data-action="saveEdit('${contentElementId}', group, ${index})">Save changes</a>
              and close editor.`,
        '</div>',
    ].join('');
    const userRepresentationElement = document
        .getElementById(contentElementId)
        ?.querySelector(`[data-user-representation-index="${index}"]`);
    userRepresentationElement.innerHTML = userRepresentationHTML(index);
}
function removeUserRepresentation(contentElementId, group, index) {
    group.deleteUserRepresentation(index);
    Library.saveGroup(group);
    document.getElementById(contentElementId).innerHTML = makeUserNamesContent(group, contentElementId);
}
function previewEdit(contentElementId, index) {
    const contentElement = document.getElementById(contentElementId);
    const userRepresentationElements = Array.from(contentElement.querySelectorAll(`[data-user-representation-index="${index}"] tr`))
        .filter((node) => node instanceof HTMLElement);
    userRepresentationElements
        .forEach((el) => el.children[2].innerHTML = el.children[3].children[0].value);
}
function saveEdit(contentElementId, group, index) {
    const contentElement = document.getElementById(contentElementId);
    group.userRepresentations[index] = Array
        .from(contentElement.querySelectorAll(`[data-user-representation-index="${index}"] tr`))
        .map((row) => row.children[3].children[0].value);
    Library.saveGroup(group);
    contentElement.innerHTML = makeUserNamesContent(group, contentElementId);
}
// Notify dependent display elements when changing the default representation
function updateDisplay(contentElementId, group) {
    const representationChangeEvent = new CustomEvent('representationChange', {});
    const allInfoElement = document
        .getElementById(contentElementId)
        ?.closest('.all-info');
    allInfoElement.dispatchEvent(representationChangeEvent);
}
//# sourceMappingURL=NamingSchemeInfo.js.map