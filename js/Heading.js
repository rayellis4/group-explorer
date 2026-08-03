/* @flow

# Heading component

This component displays a consistent heading used by all the GE3 pages.

The module exports the following functions:
 * [display](#display), which initializes the display and sets up the callback to display the menu
 * [setTitle](#settitle), which updates the title in the heading

The menu is displayed by clicking the hamburger symbol <b>≡</b> to the right of the heading.
(This is the unicode math symbol IDENTICAL TO.)

All menus include an ['About GE3' option](#aboutge3).

```javascript
 */
import * as GEUtils from './GEUtils.js';
import * as Settings from './Settings.js';
import { makeDetachedMenu, makeDialog } from './UIComponents.js';
export { display, setTitle };
/*
```
## display
Displays a consistent heading used by all the GE3 pages.
It adds the HTML elements of the heading to the DOM, styles them, and sets the event listener
to display the menu.
```javascript
 */
function display(headingElement /*: HTMLElement */, label /*: html */, menuGenerator /*: () => Array<{label: html, action: () => void}> */) {
    // $FlowFixMe[incompatible-type] -- how to type HTMLElement w/ non-null id, needed for CSS styling
    const headingElementId /*: string */ = headingElement.getAttribute('id');
    const headingHTML = `<style>
             #${headingElementId} {
                background-color: var(--page-header-background);
                font-size: 3rem;
             }
             #heading-wrapper {
                display: flex;
                flex-direction: row;
                transform-origin: top left;
             }
             #heading-label {
                width: fit-content;
                white-space: nowrap;
                margin: 0 auto;
             }
             #heading-menu {
                color: black;
                margin-left: 0.5ch;
                margin-right: 0.5ch;
                margin-top: auto;
                margin-bottom: auto;
             }
          </style>

          <div id="heading-wrapper">
             <div id="heading-label">${label}</div>
             <div id="heading-menu">≡</div>
          </div>`;
    headingElement.insertAdjacentHTML('beforeend', headingHTML);
    // define menu event listener
    const showHeadingMenu = (clickEvent /*: MouseEvent */) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        const menuElements /*: Array<{label: html, action: () => void}> */ = menuGenerator();
        menuElements.push({ label: 'Settings', action: () => Settings.showDialog() });
        menuElements.push({ label: 'About GE3', action: () => aboutGE3() });
        // Assemble option menu elements
        const optionMenu = [
            '<ul>',
            menuElements.map((line, inx) => `<li data-action="${inx}">${line.label}</li>`).join(''),
            '</ul>'
        ].join('');
        makeDetachedMenu(optionMenu, clickEvent)
            .then((action) => { if (action != null && parseInt(action) != null)
            menuElements[parseInt(action)].action(); });
    };
    (document.getElementById('heading-menu') /*:: as any as HTMLElement */)
        .addEventListener('click', (ev) => showHeadingMenu(ev));
    // define resize observer
    const resizeHeading = () => {
        const label = (document.getElementById('heading-label') /*:: as any as HTMLElement */);
        const menu = (document.getElementById('heading-menu') /*:: as any as HTMLElement */);
        const wrapper = (document.getElementById('heading-wrapper') /*:: as any as HTMLElement */);
        const unstyledWidth = label.offsetWidth + 2 * menu.offsetWidth;
        const spaceAvailable = headingElement.offsetWidth;
        if (unstyledWidth > spaceAvailable) {
            const scale = spaceAvailable / unstyledWidth;
            wrapper.style.transform = `scale(${scale})`;
            headingElement.style.height = `${scale * wrapper.offsetHeight}px`;
        }
        else {
            wrapper.style.transform = '';
            headingElement.style.height = '';
        }
    };
    new ResizeObserver(resizeHeading).observe(headingElement);
}
/*
```
## setTitle
Updates the heading title
```javascript
 */
function setTitle(title /*: html */) {
    (document.getElementById('heading-label') /*:: as any as HTMLElement */).innerHTML = title;
}
/*
```
## aboutGE3
Display a banner with GE3 logo, version, project home, and github source info
```javascript
 */
function aboutGE3() {
    const aboutHTML = `<div style="text-align: center; background-color: white; border-radius: var(--border-radius); resize: none">
            <img style="pointer-events: none; border-radius: var(--border-radius); margin-bottom: 1em" src="images/logo.png"/>
            <div>Version: ${GEUtils.version() || 'unknown'}</div>
            <div>Project home: <a href='#'>https://nathancarter.github.io/group-explorer</a></div>
            <div>GitHub source: <a href='#'>https://github.com/nathancarter/group-explorer</a></div>
         <div>
        `;
    const dialogSize = {
        width: 500,
        height: 200
    };
    const location = {
        clientX: (window.innerWidth - dialogSize.width) / 2,
        clientY: (window.innerHeight - dialogSize.height) / 2
    };
    const clickHandler = (clickEvent /*: MouseEvent */) => {
        const anchor = clickEvent.target.closest('a');
        const anchorPage = (anchor) ? anchor.innerHTML : null;
        if (anchorPage != null)
            window.open(anchorPage, '_self');
        aboutDialog.remove();
    };
    const aboutDialog = makeDialog(aboutHTML, location);
    aboutDialog.addEventListener('click', clickHandler);
}
//# sourceMappingURL=Heading.js.map