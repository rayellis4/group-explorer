/*
# GE3 stylesheet

Used by all GE3 pages

### Globals

```css
 */
@font-face {  /* GE3 fonts (see ../fonts directory) */
    font-family: "Math";
    src: url("../fonts/GroupExplorer_AMS.woff") format("woff"); /* MathJax_AMS-Regular.woff"); */
    font-weight: normal;
    font-style: normal;
    unicode-range: U+00A0-EF00;
}
@font-face {
    font-family: "Text";
    src: url("../fonts/MathJax_SansSerif-Regular.woff") format("woff");
    font-weight: normal;
    font-style: normal;
}
@font-face {
    font-family: "Text-Bold";
    src: url("../fonts/MathJax_SansSerif-Bold.woff") format("woff");
    font-weight: bold;
    font-style: normal;
}
@font-face {
    font-family: "Text-Italic";
    src: url("../fonts/MathJax_SansSerif-Italic.woff") format("woff");
    font-weight: normal;
    font-style: italic;
}

:root {
    /* gray shades designed to have equal contrast ratios down to 50%.  See
       https://dev.to/finnhvman/grayscale-color-palette-with-equal-contrast-ratios-2pgl
    */
    --gray0:                            hsl(0 0% 100%); /* #FFFFFF */
    --gray1:                            hsl(0 0% 95%); /* #F3F3F3 */
    --gray2:                            hsl(0 0% 87%); /* #DFDFDF */
    --gray3:                            hsl(0 0% 80%); /* #CDCDCD */
    --gray4:                            hsl(0 0% 73%); /* #BBBBBB */
    --gray5:                            hsl(0 0% 67%); /* #ABABAB */
    --gray6:                            hsl(0 0% 61%); /* #9B9B9B */
    --gray7:                            hsl(0 0% 55%); /* #8D8D8D */
    --gray8:                            hsl(0 0% 50%); /* #717171 */
    
    --light-gradient:                   linear-gradient(var(--gray1), var(--gray2));
    --dark-gradient:                    linear-gradient(var(--gray2), var(--gray3));
    --light-border:                     1px solid var(--gray3);
    --dark-border:                      1px solid var(--gray6);
    --black-border:                     1px solid black;
    --large-shadow:                     -6px 6px 12px rgba(0, 0, 0, 0.2);
    --small-shadow:                     -3px 3px 6px rgba(0, 0, 0, 0.1);
    --clear:                            rgba(0, 0, 0, 0);
    
    --border-radius: 0.2em;

    /* main page background colors */
    --multtable-background:             #E5E5E5;
    --cycle-graph-background:           #C8C8E8;
    --cayley-diagram-background:        #E8C8C8;
    --symmetry-object-background:       #C8E8C8;
    --sheet-background:                 #F8F8F8; /* hsl(0 0 97) */

    /* component background colors */
    --page-header-background:           var(--gray4);
    --dialog-header-background:	        var(--gray3);
    --controls-background:              var(--gray1);
    --control-options-background:	var(--gray2);
    --list-highlight:                   rgba(255, 184, 134, 0.6);
    --menu-background:                  var(--gray2);
    --tooltip-background:               #FFFFD6;

    touch-action: none;  /* prevent default page zoom on mobile safari */
}
/*
```
### Element styling

```css
*/
html {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    min-height: 100%;
    min-width: 100%;
    max-width: 100%;
    max-height: 100%;
}
*,
*:after,
*:before {
    font-family: "Math", "Text", "Text-Bold", "Text-Italic";
    box-sizing: inherit;
}
style {
    display: none !important;  /* don't display style elements */
}
body {
    -webkit-touch-callout : none !important;
    overflow: hidden;
    width: 100%;
    height: 100%;
    min-height: 100%;
    min-width: 100%;
    max-width: 100%;
    max-height: 100%;
    line-height: 1.5;
    padding: 0;
    margin: 0;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}
button {
    background-image: var(--dark-gradient);
    border: var(--dark-border);
    font-size: 1.25rem;
    padding: 0.2em;
    color: black;
    box-shadow: var(--small-shadow);
    border-radius: var(--border-radius);
}
button:disabled {
    color: gray;
}
button:focus {
    outline: 0;
}
ul {
    list-style: none;
}
ul > li:not(:has(> ul)):hover {
    background-color: var(--list-highlight);
}
sub, sup {               /* Tune <sub>, <sup> to reflect general math usage */
    font-size: 0.707em;  /* (approximated from LaTeX output) */
    padding-right: 0.07em;
}
sub {
    vertical-align: -0.21em;
}
sup {
    padding-left: 0.1em;
    vertical-align: 0.51em;
}
input[type=range] {
    -webkit-appearance: none;
    width: 90%;
    height: 16px;
    background: transparent;
    margin: 0.25em 5% 0;
    height: 1.5em;
    margin: 0 5%;
}
input[type=range]:focus {
    outline: none;
}
input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    box-shadow: 1px 0px #d3d3d3, -1px 0px #d3d3d3, 0px 1px #d3d3d3, 0px -1px #d3d3d3;
    margin-top: -6px;
}
input[type=range]::-moz-range-thumb {
}
input[type=range]::-ms-thumb {
    margin: 0;
    width: 16px;
    height: 16px;
    border-radius: 8px;
    background: white;
    box-shadow: 1px 0px #d3d3d3, -1px 0px #d3d3d3, 0px 1px #d3d3d3, 0px -1px #d3d3d3;

}
input[type=range]::-webkit-slider-runnable-track {
    background: #c9c9c9;
    height: 4px;
}
input[type=range]::-moz-range-track {
    background: #c9c9c9;
    height: 4px;
}
input[type=range]::-ms-track {
    background: #c9c9c9;
    height: 1px;
}
input[type=radio] {
    margin-left: 2ch;
}
#graphic {
    overflow: hidden;
}
/*
```
### Layout classes

Adapted from [Every Layout](https://every-layout.dev)

Note the 'owl's eye' selector, * + *, meaning 'any element with an immediately preceeding sibling'.
   Applied to a list it is effectively, 'any element in a list except the first'.
   Used here to insert space between items of a list.

```css
*/
.flex-v {
    display: flex;
    flex-direction: column;
}
.flex-h {
    display: flex;
    flex-direction: row;
}
.fill-v {
    height: 100%;
}
.fill-h {
    width: 100%;
}
.stretch {
    flex-grow: 1;
    flex-shrink: 1;
}
.stack-15em > * + * {  /* maybe a better name would be stack-large? */
    margin-top: 1.5em;
}
.stack-08em > * + * {
    margin-top: 0.8em;
}
.stack-03em > * + * {
    margin-top: 0.3em;
}
.box {
    padding: 1ch;
}
.position\:relative {
    position: relative;
}
.position\:absolute {
    position: absolute;
}
/*
```
### Utility classes

```css
*/
.hidden {
   display: none !important;
}
.highlighted {
    background-color: var(--list-highlight);
}
.text-align\:right {
    text-align: right;
}

.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
}

/*
```
#### Resize handle

Mimics common textarea lower-right corner resize handle

```css
*/
.resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 8px;
    height: 8px;
    cursor: se-resize;
    content: url("../images/resizeHandle.png");
}

.menu {
    position: fixed;
    background-color: var(--menu-background);
    width: fit-content;
    margin: 0;
    font-size: 1rem;
    line-height: 1.5;
    padding: 1ch;
    max-height: 35em;
    overflow-y: auto;
}
.menu[style*=height] {
    max-height: unset;
}
.menu.hidden {
    position: unset;
}
.menu li {
    white-space: nowrap;
}
.menu li:not(:has(> ul)):not(:has(> details)):hover,
.menu li:has(> ul.hidden):hover {
    background-color: var(--list-highlight);
}
.menu li > details > ul {
    padding-left: 1ch;
}

.menu-inline-arrow {
    float: left;
    margin-right: 0.5ch;
    line-height: 0.9;
}
.menu-detached-arrow {
    float: right;
    margin-left: 0.8ch;
}

.tooltip {
    position: fixed;
    background-color: var(--tooltip-background);
    border: var(--light-border);
    border-radius: var(--border-radius);
    box-shadow: var(--small-shadow);
    font-size: 1.25rem;
    line-height: 1.2;
    margin: 0;
    padding: 16px;
    overflow: hidden;
}
.tooltip[style*=width] {
    max-width: unset;
}

.dialog {
    position: fixed;
    padding: 1ch;
    background-color: var(--gray1);
    border: var(--light-border);
    border-radius: var(--border-radius);
    box-shadow: var(--large-shadow);
    color: black;
    font-size: 1rem;
    margin: 0;
    white-space: nowrap;
    scrollbar-color: var(--gray3) var(--gray1);
}

.mock-select {
   position: static;
   border: var(--dark-border);
   background-image: var(--dark-gradient);
   box-shadow: var(--small-shadow);
   padding-left: 1ch;
   border-radius: var(--border-radius);
   line-height: 1.4;
}
.mock-select:after {
    content: '⌄';
    margin-left: 1ch;
    float: right;
    font-family: 'Text';
}
