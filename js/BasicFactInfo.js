/*

# BasicFactInfo

A [GroupInfo](./GroupInfo.html.md) component that displays some basic facts about a group, such as
its order and a defining relation.

```javascript
 */
import * as Library from './Library.js';
export function display(basicFactsElementId, group) {
    const basicFactsElement = document.getElementById(basicFactsElementId);
    basicFactsElement.innerHTML = getBasicFactsHTML(basicFactsElementId, group);
    document.querySelector('#content.all-info').addEventListener('representationChange', () => basicFactsElement.innerHTML = getBasicFactsHTML(basicFactsElementId, group));
    // listen for library or settings update
    const channel = new BroadcastChannel('GE3-channel');
    channel.addEventListener('message', async (messageEvent) => {
        const message = messageEvent.data;
        if (message.source === 'library') {
            await Library.loadLibrary();
            const newGroup = Library.getAllGroups().find((G) => G.URL === group.URL);
            if (newGroup != null && newGroup.gapid != null && newGroup.gapid != '' && newGroup.gapid != group.gapid) {
                basicFactsElement.querySelectorAll('tr > td:first-child').forEach((el) => {
                    if (el.textContent === 'GAP ID') {
                        el.parentElement.children[1].textContent = newGroup.gapid;
                    }
                    else if (el.textContent === 'GAP name') {
                        el.parentElement.children[1].textContent = newGroup.gapname ?? null;
                    }
                });
            }
        }
    });
}
function getBasicFactsHTML(basicFactsElementId, group) {
    const basicFacts = [
        { name: 'Order', value: group.order },
        { name: 'GAP name', value: group.gapname },
        { name: 'GAP ID', value: group.gapid },
        { name: 'Other names', value: group.other_names == null ? '' : group.other_names.join(', ') },
        { name: 'Definition', value: group.definition },
        { name: 'Notes', value: group.notes },
        { name: 'More info', value: group.links == null ? '' : group.links.map((link) => `<a href="${link}">${link}</a>`).join(', ') },
    ];
    const basicFactsHTML = [
        `<style>
         #${basicFactsElementId} td:first-child {
            text-align: right;
            white-space: nowrap;
         }
      </style>
      <details open>
         <summary>Basic Facts</summary>
         <table>`,
        ...basicFacts.map(({ name, value }) => (value != null && value != '')
            ? `<tr><td>${name}</td><td ${name == 'Definition' ? 'style="white-space:nowrap"' : ''}>${value}</td></tr>`
            : ''),
        `</table>
         <button class="gap-compute" data-GAP="creating this group">Compute this in GAP</button>
        </details>`
    ].join('');
    return basicFactsHTML;
}
//# sourceMappingURL=BasicFactInfo.js.map