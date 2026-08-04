/*

# Gesture interpreter

Effort to treat event sequences in a device-independent manner.  Interpretations include:
 * click / tap -- [Select](#select)
 * right click (context menu) / long tap -- [Context menu](#context-menu)
 * drag-and-drop / one-finger drag -- [Drag-and-drop](#drag-and-drop)
 * wheel -- [Zoom](#zoom)
 * two-finger pinch -- [Pinch](#pinch)
```javascript
 */
import * as GEUtils from './GEUtils.js';
import * as THREE from '../lib/externals.js';
const CLICK_TIME = 500; // max time for a short click (ms)
const CLICK_MOVE = 10; // max move for a click (px)
const registeredResets = [];
function register(reset) {
    registeredResets.push(reset);
}
function unregister() { }
function claim(myReset) {
    registeredResets.forEach((reset) => {
        if (reset !== myReset) {
            reset();
        }
    });
}
function resetAll() {
    registeredResets.forEach((reset) => reset());
}
export function recognizeSelect(element, callback) {
    let startEvent = null;
    const reset = () => { startEvent = null; };
    register(reset);
    element.addEventListener('pointerdown', (event) => {
        startEvent = (event.isPrimary && event.button === 0) ? event : null;
    });
    element.addEventListener('click', (event) => {
        if (startEvent != null && isClick(startEvent, event)) {
            claim(reset);
            callback(event);
        }
        startEvent = null;
    });
}
export function recognizeContextMenu(element, callback, options = { returnOnLongTapTimeout: true }) {
    let startEvent = null;
    let lastEvent = null;
    let longTapTimerId = null;
    function reset() {
        startEvent = null;
        lastEvent = null;
        if (longTapTimerId != null) {
            window.clearTimeout(longTapTimerId);
            longTapTimerId = null;
        }
        element.removeEventListener('pointermove', moveHandler);
    }
    register(reset);
    function moveHandler(event) {
        lastEvent = event;
    }
    function longTapTimer() {
        if (startEvent != null
            && lastEvent != null
            && longTapTimerId != null
            && isTrivialMove(startEvent, lastEvent)) {
            claim(reset);
            callback(lastEvent);
        }
        reset();
    }
    element.addEventListener('pointerdown', (event) => {
        if (event.isPrimary && (event.pointerType != 'mouse' || event.button === 2)) {
            startEvent = event;
            lastEvent = event;
            element.addEventListener('pointermove', moveHandler);
            if (options.returnOnLongTapTimeout) {
                longTapTimerId = window.setTimeout(longTapTimer, CLICK_TIME);
            }
        }
    });
    element.addEventListener('pointerup', (event) => {
        if (startEvent != null
            && event.isPrimary
            && ((event.pointerType === 'mouse' && event.button === 2)
                || isLongTap(startEvent, event))) {
            claim(reset);
            callback(event);
        }
        reset();
    });
}
const DEFAULT_RECOGNIZE_DRAG_AND_DROP_OPTIONS = {
    returnOnLongTapTimeout: false,
    rightClick: false
};
export function recognizeDragAndDrop(element, callback, passedOptions = {}) {
    const options = { ...DEFAULT_RECOGNIZE_DRAG_AND_DROP_OPTIONS, ...passedOptions };
    let startEvent = null; // pointerdown event that initiates possible drag-and-drop sequence
    let previousEvent = null; // pointerdown or last pointermove event
    let moveContext = null; // immediate containing .modal element, or document body
    let longTapTimerId = null; // id to cancel longTapTimer
    function reset() {
        startEvent = null;
        previousEvent = null;
        if (moveContext != null) {
            moveContext.removeEventListener('pointermove', moveHandler);
            moveContext = null;
        }
        if (longTapTimerId != null) {
            clearTimeout(longTapTimerId);
            longTapTimerId = null;
        }
    }
    register(reset);
    function moveHandler(event) {
        if (startEvent != null
            && event.isPrimary
            && event.buttons === (options.rightClick ? 2 : 1) // default left mouse button
        ) {
            if (previousEvent != startEvent || !isClick(startEvent, event)) { // is this really a move?
                claim(reset);
                callback(startEvent, previousEvent, event, false);
                previousEvent = event;
                if (longTapTimerId != null) {
                    clearTimeout(longTapTimerId);
                    longTapTimerId = null;
                }
            }
        }
        else {
            reset();
        }
    }
    // invokes callback on long tap
    // (enables client to create drag image, for example)
    function longTapTimer() {
        if (startEvent != null) {
            claim(reset);
            callback(startEvent, previousEvent, startEvent, false);
        }
        longTapTimerId = null;
    }
    function clickStopper(event) {
        event.stopPropagation();
    }
    element.addEventListener('pointerdown', (event) => {
        if (startEvent == null
            && event.isPrimary
            && event.button == (options.rightClick ? 2 : 0) // default left mouse button
            && !element.contains(event.target.closest('input'))
            && !element.contains(event.target.closest('textarea'))) {
            startEvent = event;
            previousEvent = event;
            moveContext = element.closest('.modal') || document.body;
            moveContext.addEventListener('pointermove', moveHandler);
            if (options.returnOnLongTapTimeout) {
                longTapTimerId = window.setTimeout(longTapTimer, CLICK_TIME);
            }
        }
        else {
            reset();
        }
    });
    element.addEventListener('pointerup', (event) => {
        if (startEvent != null && startEvent != previousEvent) { // a move is being processed
            // the pointerup event that ends the drag also causes a click
            // below is a workaround to prevent the click from propagating:
            //    1) add an event listener that grabs the click during the capture phase,
            //       before bubbling phase listeners have a chance
            //    2) launch a timeout function to remove the capture phase listener after a second,
            //       in case the click is not generated for some reason
            element.addEventListener('click', clickStopper, { capture: true, once: true });
            window.setTimeout(() => element.removeEventListener('click', clickStopper, { capture: true }), 1000);
            if (event.isPrimary && event.button === 0) {
                claim(reset);
                callback(startEvent, previousEvent, event, true);
            }
        }
        reset();
    });
}
function recognizePinch(element, callback) {
    let startEvent = null;
    let previousEvent = null;
    function reset() {
        startEvent = null;
        previousEvent = null;
        element.removeEventListener('touchmove', touchMoveHandler);
    }
    register(reset);
    function touchMoveHandler(event) {
        if (event.touches.length == 2) {
            claim(reset);
            callback(startEvent, previousEvent, event, false);
            previousEvent = event;
        }
        else {
            reset();
        }
    }
    element.addEventListener('touchstart', (event) => {
        if (event.touches.length == 2) {
            startEvent = event;
            previousEvent = event;
            element.addEventListener('touchmove', touchMoveHandler);
        }
        else {
            reset();
        }
    });
    element.addEventListener('touchend', (event) => {
        if (startEvent != null) {
            claim(reset);
            callback(startEvent, previousEvent, event, true);
        }
        reset();
    });
}
function recognizeWheel(element, callback) {
    element.addEventListener('wheel', (event) => {
        resetAll();
        callback(event);
    });
}
export function recognizeZoom(element, zoomCallback) {
    // context in which we detect drag, scroll, etc. -- generally a .modal containing the element
    const contextElement = element.closest('.modal') || document.body;
    if (GEUtils.isTouchDevice()) {
        recognizePinch(contextElement, (_startEvent, previousEvent, currentEvent, isFinal) => pinchZoomCallback(zoomCallback, previousEvent, currentEvent, isFinal));
    }
    else {
        recognizeWheel(contextElement, (wheelEvent) => wheelZoomCallback(zoomCallback, wheelEvent));
    }
}
function pinchZoomCallback(zoomCallback, previousEvent, currentEvent, isFinal) {
    const previousTouches = Array.from(previousEvent.touches);
    const currentTouches = (currentEvent.touches.length === 2)
        ? [currentEvent.touches[0], currentEvent.touches[1]]
        : (currentEvent.touches.length === 1)
            ? [currentEvent.touches[0], currentEvent.changedTouches[0]]
            : [currentEvent.changedTouches[0], currentEvent.changedTouches[1]];
    // ensure consistent ordering in touch vectors
    previousTouches.sort((a, b) => a.identifier - b.identifier);
    currentTouches.sort((a, b) => a.identifier - b.identifier);
    function spread(touchArray) {
        return Math.hypot(touchArray[0].clientX - touchArray[1].clientX, touchArray[0].clientY - touchArray[1].clientY);
    }
    const rawScaling = spread(currentTouches) / spread(previousTouches) - 1;
    zoomCallback(rawScaling, isFinal);
}
function wheelZoomCallback(zoomCallback, wheelEvent) {
    if (wheelEvent.target.closest('.scrollable') != null) {
        return;
    }
    const ZOOM_FACTOR = 0.05; // shrink/expand element by 5% per wheel click
    const rawScaling = Math.sign(wheelEvent.deltaY) * ZOOM_FACTOR;
    zoomCallback(rawScaling, true);
}
const resizeCoefficients = [
    { l: 1, t: 1, w: -1, h: -1 }, // quadrant 0
    { l: 0, t: 1, w: 0, h: -1 }, // 1
    { l: 0, t: 1, w: 1, h: -1 }, // 2
    { l: 1, t: 0, w: -1, h: 0 }, // 3
    { l: 1, t: 1, w: 0, h: 0 }, // 4
    { l: 0, t: 0, w: 1, h: 0 }, // 5
    { l: 1, t: 0, w: -1, h: 1 }, // 6
    { l: 0, t: 0, w: 0, h: 1 }, // 7
    { l: 0, t: 0, w: 1, h: 1 } // 8
];
export function recognizeMoveResize(element, callback) {
    // context in which to register drag -- generally a .modal containing the element
    const contextElement = element.closest('.modal') || document.body;
    // save min width/height styling
    const elementStyle = getComputedStyle(element);
    const minElement = new THREE.Vector2(elementStyle.minWidth?.endsWith('px') ? parseFloat(elementStyle.minWidth) : 0, elementStyle.minHeight?.endsWith('px') ? parseFloat(elementStyle.minHeight) : 0);
    if (element.style.resize != 'none') {
        recognizeZoom(contextElement, (scale) => {
            const clientRect = element.getBoundingClientRect();
            const minimumDimension = Math.min(clientRect.width, clientRect.height);
            const minElementSize = Math.min(minElement.width, minElement.height);
            const scaleSign = Math.sign(scale);
            const scaleFactor = scaleSign * Math.min(1 + scaleSign * minElementSize / minimumDimension, Math.abs(scale));
            const sizeChange = new THREE.Vector2(clientRect.width, clientRect.height).multiplyScalar(scaleFactor);
            const limitedSizeChange = limitSizeChange(sizeChange);
            callback(-limitedSizeChange.x / 2, -limitedSizeChange.y / 2, limitedSizeChange.x, limitedSizeChange.y);
        });
    }
    if (GEUtils.isTouchDevice()) {
        recognizeDragAndDrop(contextElement, (startEvent, previousEvent, currentEvent, isDrop) => {
            touchMove(startEvent, previousEvent, currentEvent, isDrop);
        });
        // Coefficients for startTouch, determined on first callback
        let startCoefficient;
        function touchMove(startEvent, previousEvent, currentEvent, isDrop) {
            // Determine screen quadrant startEvent occured in (element is [4]):
            //   0  1  2
            //   3 [4] 5
            //   6  7  8
            if (startEvent == previousEvent) {
                const clientRect = element.getBoundingClientRect();
                const row = startEvent.clientY < clientRect.top ? 0 : (startEvent.clientY > clientRect.bottom ? 2 : 1);
                const col = startEvent.clientX < clientRect.left ? 0 : (startEvent.clientX > clientRect.right ? 2 : 1);
                const quadrant = 3 * row + col;
                startCoefficient = resizeCoefficients[quadrant];
                // Don't drag a scrollable element (let the browser scroll it)
                if (startEvent.target.closest('.scrollable') != null) {
                    startCoefficient = { l: 0, t: 0, w: 0, h: 0 };
                }
            }
            const movement = new THREE.Vector2(currentEvent.clientX - previousEvent.clientX, currentEvent.clientY - previousEvent.clientY);
            const sizeChange = new THREE.Vector2(startCoefficient.w, startCoefficient.h).multiply(movement);
            const limitedSizeChange = limitSizeChange(sizeChange);
            // calculate effective movement from sizeChange adjusted for styling limits
            if (startCoefficient.l != 1 || startCoefficient.t != 1) {
                movement.set((startCoefficient.w == 0) ? 0 : 1 / startCoefficient.w, (startCoefficient.h == 0) ? 0 : 1 / startCoefficient.h).multiply(limitedSizeChange);
            }
            const locationChange = new THREE.Vector2(startCoefficient.l, startCoefficient.t).multiply(movement);
            const movingElement = startEvent.target.closest('.draggable');
            callback(locationChange.x, locationChange.y, limitedSizeChange.width, limitedSizeChange.height, isDrop, movingElement);
        }
    }
    else {
        recognizeDragAndDrop(element, (startEvent, previousEvent, currentEvent, isDrop) => {
            mouseMove(startEvent, previousEvent, currentEvent, isDrop);
        });
        function mouseMove(startEvent, previousEvent, currentEvent, isDrop) {
            // Drag-and-drop over resizeHandle resizes model element; otherwise drag-and-drop moves model element
            const drag = new THREE.Vector2(currentEvent.clientX - previousEvent.clientX, currentEvent.clientY - previousEvent.clientY);
            const resizing = element.querySelector('.resize-handle')?.contains(startEvent.target);
            if (resizing) {
                callback(0, 0, drag.x, drag.y);
            }
            else {
                const movingElement = startEvent.target.closest('.draggable');
                callback(drag.x, drag.y, 0, 0, isDrop, movingElement);
            }
        }
    }
    // adjust sizeChange so that running into min-width/min-height styling limits doesn't move element
    function limitSizeChange(sizeChange) {
        let limitedSizeChange = sizeChange;
        if (sizeChange.x < 0 || sizeChange.y < 0) {
            const { width, height } = element.getBoundingClientRect();
            limitedSizeChange = new THREE.Vector2().set((sizeChange.x < 0) ? Math.max(minElement.width - width, sizeChange.x) : sizeChange.x, (sizeChange.y < 0) ? Math.max(minElement.height - height, sizeChange.y) : sizeChange.y);
        }
        return limitedSizeChange;
    }
}
/*
```
### Utility routines
```javascript
 */
export function isLongTap(startEvent, endEvent) {
    return startEvent.pointerType !== 'mouse' // long tap only used on touch device
        && (endEvent.timeStamp - startEvent.timeStamp) > CLICK_TIME
        && isTrivialMove(startEvent, endEvent);
}
function isClick(startEvent, endEvent) {
    return (endEvent.timeStamp - startEvent.timeStamp) < CLICK_TIME
        && isTrivialMove(startEvent, endEvent);
}
function isTrivialMove(startEvent, endEvent) {
    const dx = endEvent.clientX - startEvent.clientX;
    const dy = endEvent.clientY - startEvent.clientY;
    return Math.hypot(dx, dy) < CLICK_MOVE;
}
//# sourceMappingURL=Gestures.js.map