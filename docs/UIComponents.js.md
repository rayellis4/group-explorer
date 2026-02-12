/* @flow

# UIComponents

User interface components used throughout GE3

makeFixedMenu
makeDetachedMenu
makeTooltip
makeMockSelect
makeSelection
makeDialog
makeModal
makeMovable
makeMoveResizable
positionElement
positionDetachedSubmenu
createMenu
setActionHandler
showSubmenu


```javascript
 */
import * as GEUtils from './GEUtils.js'
import {THREE} from '../lib/externals.js'

import {
   recognizeSelect,
   recognizeContextMenu,
   recognizeDragAndDrop,
   recognizeMoveResize,
} from './Gestures.js'

export {
    positionElement,  // only used in GroupTableUI
    makeFixedMenu,
    makeDetachedMenu,
    makeTooltip,
    makeMockSelect,
    makeDialog
}
/*
```
### makeFixedMenu

```javascript
 */
function makeFixedMenu (element, callback) {
   createMenu(element)
   element.style.position = 'unset'
   element.style.maxHeight = 'unset'
   recognizeSelect(element, (event) => {
      event.stopPropagation()
      const actionElement = event.target.closest('[data-action]')
      const action = actionElement?.getAttribute('data-action')
      callback(action, event)
   })
   recognizeContextMenu(element, (event) => {
      event.stopPropagation()
      const action2Element = event.target.closest('[data-action2]')
      if (element.contains(action2Element)) {
         callback(action2Element.getAttribute('data-action2'), event)
      }
   })
}
/*
```
### makeDetachedMenu

```javascript
 */
function makeDetachedMenu (html, location) {
   const promise = new Promise((resolve, _reject) => {
      const contentElement = GEUtils.generateElements(html)[0]
      createMenu(contentElement)
      const rootElement = makeModal(contentElement, (clickEvent) => {
         if (!contentElement.contains(clickEvent.target)) {
            const displayedSubmenus = [...rootElement.querySelectorAll('.menu:not(.hidden)')]
            if (displayedSubmenus.length > 1) {
               displayedSubmenus[displayedSubmenus.length - 1].classList.toggle('hidden')
            } else {
               rootElement.remove()
               resolve(null)
            }
         }
      })
      makeMovable(contentElement)
      recognizeSelect(contentElement,
         (event) => {
            event.stopPropagation()
            const actionElement = event.target.closest('[data-action]')
            const action = actionElement?.getAttribute('data-action')
            if (actionElement?.classList.contains('detached-submenu')) {
               eval(action)
            } else if (action != null) {
               resolve(action)
               rootElement.remove()
            }
         })
      document.body.append(rootElement)
      positionElement(contentElement, location)
   })
   return promise
}
/*
```
### makeTooltip

```javascript
 */
function makeTooltip (html, location) {
   const tooltipElement = GEUtils.generateElements(html)[0]
   tooltipElement.classList.add('tooltip')
   const modalElement = makeModal(tooltipElement, (_ev) => modalElement.remove())
   document.body.append(tooltipElement.closest('.modal'))
   makeMoveResizable(tooltipElement)
   positionElement(tooltipElement, location)
}
/*
```
### makeMockSelect

```javascript
 */
function makeMockSelect (rootElement, choices) {
   const formattedChoices = [
      `<ul class="menu scrollable" style="resize: none; min-width: ${rootElement.offsetWidth}px; max-height: 25em">`,
      ...choices.map(
         (choice, index) => {
            const label = (typeof choice === 'string') ? choice : choice[1]
            return `<li data-action="makeSelection(${index})">${label}</li>`
         }),
      '</ul>'
   ].join('')

   function makeSelection (index) {
      const choice = choices[index]
      const value = (typeof choice === 'string') ? choice : choice[0]
      const label = (typeof choice === 'string') ? choice : choice[1]

      rootElement.setAttribute('data-value', value)
      rootElement.innerHTML = label
      return value
   }

   const promise = new Promise((resolve, reject) => {
      const choiceElement = GEUtils.generateElements(formattedChoices)[0]
      createMenu(choiceElement)

      const modalElement = makeModal(choiceElement,
         (_ev) => {
            modalElement.remove(),
            reject()
         })

      makeMoveResizable(choiceElement, {disableResize: true})  // not resizable
      setActionHandler(choiceElement,
         (action) => {
            const newValue = eval(action)
            modalElement.remove()
            resolve(newValue)
         })

      document.body.append(modalElement)

      // locate option menu underneath rootElement
      const { left, bottom } = rootElement.getBoundingClientRect()
      const location = { clientX: left, clientY: bottom }
      positionElement(choiceElement, location)
   })

   return promise
}
/*
```
### makeDialog

```javascript
 */
function makeDialog (html, location, modalCallback = (ev) => ev.stopPropagation()) {
   const dialogElement = GEUtils.generateElements(html)[0]
   dialogElement.classList.add('dialog')

   const modalElement = makeModal(dialogElement, modalCallback)
   document.body.append(modalElement)

   makeMoveResizable(dialogElement)
   positionElement(dialogElement, location)

   return modalElement
}
/*
```
### makeModal

```javascript
 */
function makeModal (contentElement, clickListener = () => {}) {
   const modalHTML = `<div class="modal"></div>`
   const modalElement = GEUtils.generateElements(modalHTML)[0]
   modalElement.appendChild(contentElement)
   modalElement.addEventListener('click', clickListener)
   ;['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'wheel']
      .forEach((eventType) => modalElement.addEventListener(eventType, (ev) => ev.stopPropagation()))

   // Prevent Safari from rescaling browser window on pinch
   modalElement.addEventListener('touchmove',
      (ev) => {
         if (ev.scale !== 1 && ev.touches.length > 1) {
            ev.preventDefault()
         }
      },
      {passive: false})

   return modalElement
}
/*
```
### makeMovable

Specialized routine to drag-and-drop pieces of a multi-level detached menu

```javascript
 */
function makeMovable (element) {
   let scrollInProgress = false
   let displayedSubmenu = null
   let displayedSubmenuParent = null

   const scrollKiller = (ev) => ev.preventDefault()

   recognizeDragAndDrop(element.closest('.modal'),
      (startEvent, previousEvent, endEvent, isDrop) => {
         endEvent.stopPropagation()

         const movingMenu = startEvent.target.closest('.menu')
         if (movingMenu == null) {  // pointerdown outside of displayed menu
            return
         }

         if (isDrop) {
            if (!scrollInProgress) {
               movingMenu.removeEventListener('touchmove', scrollKiller)
               const { left, top } = movingMenu.getBoundingClientRect()
               movingMenu.style.left = `${left}px`
               movingMenu.style.top = `${top}px`
               movingMenu.style.transform = ''
            }
            if (displayedSubmenu != null) {
               displayedSubmenuParent.appendChild(displayedSubmenu)
               displayedSubmenu = null
               displayedSubmenuParent = null
            }
         } else {
            if (startEvent == previousEvent) {
               // on touch devices can be hard to tell the difference between a drag and a scroll
               // if a drag starts within 40px of the right side of the (menu) element pretend it's a scroll and don't drag
               const movingMenuBox = movingMenu.getBoundingClientRect()
               scrollInProgress = GEUtils.isTouchDevice()
                  && (startEvent.clientX > movingMenuBox.right - 40)
                  && (startEvent.clientX < movingMenuBox.right)
                  && (startEvent.clientY > movingMenuBox.top)
                  && (startEvent.clientY < movingMenuBox.bottom)

               if (!scrollInProgress) {
                  // applying a transform to an element that's displaying a detached submenu will move both elements;
                  // so temporarily attach the detached submenu to the ancestor .modal element, then restore it on drop
                  if (movingMenu.classList.contains('root-menu')) {
                     displayedSubmenu = movingMenu.querySelector('.detached-submenu > .menu:not(.hidden)')
                     if (displayedSubmenu != null) {
                        displayedSubmenuParent = displayedSubmenu.parentElement
                        element.closest('.modal').appendChild(displayedSubmenu)
                     }
                  } else {
                     movingMenu.addEventListener('touchmove', scrollKiller)
                  }
               }
            }
            if (!scrollInProgress) {
               const dx = endEvent.clientX - startEvent.clientX
               const dy = endEvent.clientY - startEvent.clientY
               movingMenu.style.transform = `translate(${dx}px, ${dy}px)`
            }
         }
      })
}
/*
```
### makeMoveResizable

Generic routine to move and resize elements on mouse or touch devices.

```javascript
 */
function makeMoveResizable (element) {
   const disableResize = (element.style.resize == 'none')
   if (!disableResize && !GEUtils.isTouchDevice()) {
      element.insertAdjacentHTML('beforeend', '<div class="resize-handle"></div>')
   }

   recognizeMoveResize(element, moveResizeComponent)

   function moveResizeComponent (dx, dy, dw, dh, _isDrop) {
      const {left, top, width, height} = element.getBoundingClientRect()
      element.style.left = `${left + dx}px`
      element.style.top = `${top + dy}px`
      element.style.width = `${width + dw}px`
      element.style.height = `${height + dh}px`
   }
}
/*
```
### positionElement

```javascript
 */
function positionElement (element /*: HTMLElement */,  { clientX, clientY } /*: eventLocation */) {
   // set horizontal position to remain within body
   const elementWidth = element.getBoundingClientRect().width
   element.style.left = (typeof clientX == 'string')
      ? clientX
      : (clientX + elementWidth < document.body.offsetWidth)
         ? `${clientX}px`
         : `${document.body.offsetWidth - elementWidth}px`

   // set vertical position event with desired location
   element.style.top = (typeof clientY == 'string')
      ? clientY
      :`${clientY}px`
}
/*
```
### positionDetachedSubmenu

Position submenu at right end of parent menu if there's room, else on left end

```javascript
 */
function positionDetachedSubmenu (menu, location) {
   const containingSubmenu = menu.parentElement.closest('.menu')
   const containingBox = containingSubmenu.getBoundingClientRect()

   menu.style.left = (containingBox.right + menu.offsetWidth < window.innerWidth)
      ? `${containingBox.right}px`
      : `${containingBox.left - menu.offsetWidth}px`

   menu.style.top = `${location.clientY}px`
}
/*
```
### createMenu

```javascript
 */
function createMenu (menuElement) {
   menuElement.classList.add('root-menu')
   menuElement.classList.add('menu')

   menuElement.querySelectorAll('.detached-submenu').forEach((el) => {
      el.setAttribute('data-action', 'showSubmenu(event)')
      el.children[0].insertAdjacentHTML('beforebegin', '<span class="menu-detached-arrow">▸</span>')
      el.querySelectorAll(':scope > ul').forEach((ul) => {
         ul.classList.add('menu')
         ul.classList.add('hidden')
      })
   })

   return menuElement
}
/*
```
### setActionHandler

```javascript
 */
function setActionHandler (contentElement, clickHandler) {
   contentElement.addEventListener('click', (event) => {
      event.stopPropagation()
      const actionElement = event.target.closest('[data-action]')
      if (contentElement.contains(actionElement)) {
         clickHandler(actionElement.getAttribute('data-action'), event)
      }
   })
}
/*
```
### showSubmenu1

```javascript
 */
function showSubmenu (event) {
   const submenu = event.target.closest('.detached-submenu').querySelector(':scope > ul')
   submenu.classList.toggle('hidden')
   event.target.closest('.root-menu').querySelectorAll('.menu:not(.hidden)').forEach(
      (el) => {
         if (!el.contains(submenu)) {
            el.classList.toggle('hidden')
         }
      })
   if (!submenu.classList.contains('hidden')) {
      positionDetachedSubmenu(submenu, event)
   }
}
