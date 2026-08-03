/*

# FileDataInfo

A [GroupInfo](./GroupInfo.html.md) component that displays information about the file that supplied
the group's definition.

```javascript
 */

import type { Group } from './Group.ts'

export function display (fileDataElementId: string, group: Group) {
   const fileDataElement = document.getElementById(fileDataElementId) as HTMLElement
   fileDataElement.innerHTML =
      `<details>
          <summary>
             <span class="title">File data</span>
          </summary>
          <table>
             <tr><td>Author</td>         <td>${group.author}</td></tr>
             <tr><td>URL</td>            <td>${group.URL}</td></tr>
             <tr><td>Last modified</td>  <td>${group.lastModifiedOnServer}</td></tr>
          </table>
       </details>`
}
