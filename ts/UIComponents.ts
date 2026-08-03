/*

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

import {
   recognizeSelect,
   recognizeContextMenu,
   recognizeDragAndDrop,
   recognizeMoveResize,
} from './Gestures.js'

interface StringLocation {clientX: string, clientY: string}
type ClientLocation = NumberLocation | StringLocation
/*
```
### makeFixedMenu

```javascript
 */
export function makeFixedMenu (element: HTMLElement, callback: (action: string, event: Event) => void ) {
   createMenu(element)
   element.style.position = 'unset'
   element.style.maxHeight = 'unset'
   recognizeSelect(element, (event) => {
      event.stopPropagation()
      const action = (event.target as HTMLElement).closest('[data-action]')?.getAttribute('data-action')
      if (action != null) {
         callback(action, event)
      }
   })
   recognizeContextMenu(element, (event) => {
      event.stopPropagation()
      const action2 = (event.target as HTMLElement).closest('[data-action2]')?.getAttribute('data-action2')
      if (action2 != null) {
         callback(action2, event)
      }
   })
}
/*
```
### makeDetachedMenu

```javascript
 */
export function makeDetachedMenu (html: html, location: ClientLocation): Promise<Maybe<string>> {
   const promise = new Promise<Maybe<string>> ((resolve, reject) => {
      const contentElement = GEUtils.generateElements(html)[0] as HTMLElement
      createMenu(contentElement)
      const rootElement: HTMLElement = makeModal(contentElement, (clickEvent) => {
         if (!contentElement.contains(clickEvent.target as HTMLElement)) {
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
            const actionElement = (event.target as HTMLElement).closest('[data-action]')
            const action = actionElement?.getAttribute('data-action')
            if (actionElement?.classList.contains('detached-submenu') && action != null) {
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
export function makeTooltip (html: html, location: ClientLocation) {
   const tooltipElement = GEUtils.generateElements(html)[0] as HTMLElement
   tooltipElement.classList.add('tooltip')
   const modalElement: HTMLElement = makeModal(tooltipElement, (_ev) => modalElement.remove())
   document.body.append(modalElement)
   makeMoveResizable(tooltipElement)
   positionElement(tooltipElement, location)
}
/*
```
### makeMockSelect

```javascript
 */
export type mockSelectChoiceItem = {value: string, label?: html, selectedLabel?: html}
type mockSelectChoice = {header: html, choices: mockSelectChoice[]} | mockSelectChoiceItem
   

export function makeMockSelect (rootElement: HTMLElement, choices: mockSelectChoice[]): Promise<string> {
   function flatChoices (items: mockSelectChoice[]): mockSelectChoiceItem[] {
      return items.flatMap((item) => 'header' in item ? flatChoices(item.choices) : [item])
   }

   function renderItems (items: mockSelectChoice[]): html {
      return items.map((item: mockSelectChoice) =>
         'header' in item
            ? `<li><details><summary>${item.header}</summary><ul>${renderItems(item.choices)}</ul></details></li>`
            : `<li data-action="makeSelection('${item.value}')">${item.label || item.value}</li>`
      ).join('')
   }

   const formattedChoices = [
      `<ul class="menu scrollable" style="resize: none; min-width: ${rootElement.offsetWidth}px; max-height: 25em">`,
         renderItems(choices),
      '</ul>'
   ].join('')

   function makeSelection (value: string): Maybe<string> {
      const choice = flatChoices(choices).find((c) => c.value == value)
      if (choice != null) {
         rootElement.setAttribute('data-value', value)
         rootElement.innerHTML = choice.selectedLabel || choice.label || choice.value
         return choice.value
      }
   }

   const promise = new Promise<string> ((resolve, reject) => {
      const choiceElement = GEUtils.generateElements(formattedChoices)[0] as HTMLElement
      createMenu(choiceElement)

      const modalElement: HTMLElement = makeModal(choiceElement,
         (_ev) => {
            modalElement.remove(),
            reject()
         })

      choiceElement.style.resize = 'none'  // respected by makeMoveResizable
      makeMoveResizable(choiceElement)
      setActionHandler(choiceElement,
         (action) => {
            const newValue = eval(action)
            modalElement.remove()
            if (newValue == null) {
               reject()
            } else {
               resolve(newValue)
            }
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
export function makeDialog (
   html: html,
   location: ClientLocation,
   modalCallback: (event: Event) => void = (ev) => ev.stopPropagation()
): HTMLElement {
   const dialogElement = GEUtils.generateElements(html)[0] as HTMLElement
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
function makeModal (
   contentElement: HTMLElement,
   clickListener: (event: Event) => void = () => {}
): HTMLElement {
   const modalHTML = `<div class="modal"></div>`
   const modalElement = GEUtils.generateElements(modalHTML)[0] as HTMLElement
   modalElement.appendChild(contentElement)
   modalElement.addEventListener('click', clickListener)
   ;['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'wheel']
      .forEach((eventType) => modalElement.addEventListener(eventType, (ev) => ev.stopPropagation()))

   // Prevent Safari from rescaling browser window on pinch
   modalElement.addEventListener('touchmove',
      (ev) => {
         if ('scale' in ev &&  ev.scale !== 1 && 'touches'in ev && Array.isArray(ev.touches) && ev.touches.length > 1) {
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
function makeMovable (element: HTMLElement) {
   let scrollInProgress: boolean = false
   let displayedSubmenu: Maybe<HTMLElement> = null
   let displayedSubmenuParent: Maybe<HTMLElement> = null

   const scrollKiller = (ev: Event) => ev.preventDefault()

   const modalElement: Maybe<HTMLElement> = element.closest('.modal')
   if (modalElement == null) {
      return
   }
   recognizeDragAndDrop(modalElement,
      (startEvent, previousEvent, endEvent, isDrop) => {
         endEvent.stopPropagation()

         const movingMenu = (startEvent.target as HTMLElement).closest('.menu') as Maybe<HTMLElement>
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
               if (displayedSubmenuParent != null) {
                  displayedSubmenuParent.appendChild(displayedSubmenu)
                  displayedSubmenuParent = null
               }
               displayedSubmenu = null
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
                        modalElement.appendChild(displayedSubmenu)
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
function makeMoveResizable (element: HTMLElement) {
   const disableResize = (element.style.resize == 'none')
   if (!disableResize && !GEUtils.isTouchDevice()) {
      element.insertAdjacentHTML('beforeend', '<div class="resize-handle"></div>')
   }

   recognizeMoveResize(element, moveResizeComponent)

   function moveResizeComponent (
      dx: number,
      dy: number,
      dw: number,
      dh: number,
      _isDrop?: boolean
   ) {
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
export function positionElement (element: HTMLElement,  { clientX, clientY }: ClientLocation) {
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
function positionDetachedSubmenu (menu: HTMLElement, location: ClientLocation) {
   const containingSubmenu: HTMLElement = menu.parentElement?.closest('.menu') as HTMLElement
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
function createMenu (menuElement: HTMLElement): HTMLElement {
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
function setActionHandler (contentElement: HTMLElement, clickHandler: (action: string, event: MouseEvent) => void) {
   contentElement.addEventListener('click', (event) => {
      event.stopPropagation()
      const actionElement = (event.target as HTMLElement).closest('[data-action]') as Maybe<HTMLElement>
      if (actionElement != null && contentElement.contains(actionElement)) {
         clickHandler((actionElement.getAttribute('data-action') as string), event)
      }
   })
}
/*
```
### showSubmenu

```javascript
 */
function showSubmenu (event: MouseEvent) {
   const detachedSubmenu = (event.target as HTMLElement).closest('.detached-submenu') as HTMLElement
   const submenuList = detachedSubmenu.querySelector(':scope > ul') as HTMLElement
   submenuList.classList.toggle('hidden')
   const rootMenu = (event.target as HTMLElement).closest('.root-menu') as HTMLElement
   rootMenu.querySelectorAll('.menu:not(.hidden)')
      .forEach(
         (el) => {
            if (!(el as HTMLElement).contains(submenuList)) {
               (el as HTMLElement).classList.toggle('hidden')
            }
         })
   if (!submenuList.classList.contains('hidden')) {
      positionDetachedSubmenu(submenuList, event)
   }
}
