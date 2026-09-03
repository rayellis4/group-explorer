/*

# ZmnInfo

A [GroupInfo](./GroupInfo.html.md) component that displays whether a group is isomorphic to the
product group ℤ<sub>m</sub> x ℤ<sub>n</sub> where *m* and *n* are relatively prime, and shows the
reason graphically in a [Sheet](./Sheet.html.md).

```javascript
 */
import * as GEUtils from './GEUtils.js'
import { Group } from './Group.js'
import * as IsomorphicGroups from './IsomorphicGroups.js'
import * as MathUtils from './MathUtils.js'
import * as SheetModel from './SheetModel.js'

/*::
import type {StrategyParameters, Layout, Direction} from './CayleyDiagramView.js';
*/

export function display (zmnInfoElementId: string, group: Group) {
   const zmnInfoElement = document.getElementById(zmnInfoElementId) as HTMLElement

   if (!group.isCyclic) {
      zmnInfoElement.remove()
      return
   }

   zmnInfoElement.innerHTML = formatZmnInfo(group)

   GEUtils.createActionHandler(zmnInfoElement, (action) => eval(action))
}

function formatZmnInfo (group: Group): html {
   const htmlFragments = [
      `<details>
          <summary>
             <span class="title">ℤ<sub>mn</sub> group</span>
             <span class="summary">${new Set(MathUtils.getFactors(group.order)).size == 2 ? 'yes' : 'no'}</span>
          </summary>`
   ]

    const factors = MathUtils.getFactors(group.order);
    const [m, n, _] =
          factors.reduce<[integer, integer, integer]>( ([fac1, fac2, prev], el) => {
              if (el >= prev) {
                  fac1 *= el;
                  prev = el;
              } else {
                  fac2 *= el;
              }
              return [fac1, fac2, prev];
          }, [1, 1, 0] );
    const isZmn = (factors.length != 1) && (n != 1);
    if (factors.length == 1) {
       htmlFragments.push(
          `<div>A group of the form ℤ<sub>mn</sub> is isomorphic to the product group
             ℤ<sub>m</sub> × ℤ<sub>n</sub> just when <i>m</i> and <i>n</i> are relatively prime.
             In this case, <i>mn</i> = ${group.order}, which gives no possibilities for <i>m</i> and <i>n</i>.</div>
           <div>Thus there is not even a product group  ℤ<sub>m</sub> × ℤ<sub>n</sub>
             to speak of being isomorphic to.  (One of <i>m</i> or <i>n</i>
             would need to be 1, making one factor the trivial group and the other ℤ<sub>mn</sub>.)</div>`)

    } else if (n == 1) {
       const facs = factors.slice(0,-1).join(', ') + ' and ' + factors.slice(-1).toString();
       htmlFragments.push(
          `<div>A group of the form ℤ<sub>mn</sub> is isomorphic to the product group
             ℤ<sub>m</sub> × ℤ<sub>n</sub> just when <i>m</i> and <i>n</i> are relatively prime.
             In this case, the factors of <i>mn</i> are ${facs}, which cannot be divided into
             two non-trivial sets that do not both contain ${factors[0]}.  Thus, there cannot be two relatively prime
             factors of <i>mn</i> since any non-trivial factors must both be divisible by ${factors[0]}.</div>`)
        for (let m = 2; m <= Math.sqrt(group.order); m++) {
           if (group.order % m == 0) {
              const n = group.order / m;
              htmlFragments.push(
                 `<div><a href="" data-action="show${isZmn?'':'No'}ZmnIsomorphismSheet(group, ${m},${n})">Click here</a> to see
                    ${isZmn ? 'an illustration of' : ''} why ℤ<sub>${m * n}</sub> is ${isZmn ? '' : 'not'}
                    isomorphic to ℤ<sub>m</sub> × ℤ<sub>n</sub>.</div>`)
            }
        }
    } else {
       htmlFragments.push(
          `<div>A group of the form ℤ<sub>mn</sub> is isomorphic to the product group
             ℤ<sub>m</sub> × ℤ<sub>n</sub> just when <i>m</i> and <i>n</i> are relatively prime.
             In this case, because ${m} and ${n} are relatively prime, ℤ<sub>${m}</sub> × ℤ<sub>${n}</sub>
             is isomorphic to ℤ<sub>${m*n}</sub>.</div>`,
          `<div><a href="" data-action="show${isZmn?'':'No'}ZmnIsomorphismSheet(group, ${m},${n})">Click here</a> to see
             ${isZmn ? 'an illustration of' : ''} why ℤ<sub>${m * n}</sub> is ${isZmn ? '' : 'not'}
             isomorphic to ℤ<sub>m</sub> × ℤ<sub>n</sub>.</div>`)
    }

   htmlFragments.push('</details>')

   return htmlFragments.join('')
}

function showZmnIsomorphismSheet (group: Group, m: groupElement, n: groupElement) {
    const Z = (k: integer): html => `ℤ<sub>${k}</sub>`
    const prod = (A: html, B: html): html => `${A} × ${B}`
    const a = group.elementOrders.indexOf(m)
    const b = group.elementOrders.indexOf(n)
    const ab = group.mult(a, b)

    const panelWidth = SheetModel.sheetPanelWidth()
    const W = Math.min(
        4 * window.innerHeight / 17,
        (window.innerWidth - panelWidth) / 4  // 3 viz + 2 half-gaps = 4W
    )
    const H = W
    const gap = W / 2
    const totalW = 3 * W + 2 * gap
    const L = (window.innerWidth - panelWidth - totalW) / 2
    const vizY = 0.4 * (window.innerHeight - H)  // center visualizers just above midline
    const titleText = `Illustration of the isomorphism between ${prod(Z(m), Z(n))} and ${Z(m*n)}`

    const sheetElementsAsJSON: SheetModel.SheetElementRequest[] = [
        {
            // rectangular CD of Z_m x Z_n with arrows for a,b shown
            className : 'CDElement', id : 'left', groupURL : group.URL,
            x : L, y : vizY, w : W, h : H,
            arrow_generators : [ {generator: a, color: '#660000'},
                                 {generator: b, color: '#006600'} ],
            strategy_parameters : [ {generator: a, layout: 'linear', direction: 'X', nestingLevel: 0},
                                    {generator: b, layout: 'linear', direction: 'Y', nestingLevel: 1} ]
        },
        {
            // same as previous, plus arrow for ab
            className : 'CDElement', id : 'middle', groupURL : group.URL,
            x : L + W + gap, y : vizY, w : W, h : H,
            arrow_generators : [ {generator: a, color: '#660000'},
                                 {generator: b, color: '#006600'},
                                 {generator: ab, color: '#000066'} ],
            strategy_parameters : [ {generator: a, layout: 'linear', direction: 'X', nestingLevel: 0},
                                    {generator: b, layout: 'linear', direction: 'Y', nestingLevel: 1} ]
        },
        {
            // circular CD of Z_mn with arrow for ab shown only
            className : 'CDElement', id : 'right', groupURL : group.URL,
            x : L + 2 * (W + gap), y : vizY, w : W, h : H,
            arrow_generators : [ {generator: ab, color: '#000066'} ],
            strategy_parameters : [ {generator: ab, layout: 'circular', direction: 'XY', nestingLevel: 0} ]
        },
        {
            className : 'TextElement',
            text : `A Cayley diagram of ${prod(Z(m), Z(n))} with generators of order ${m} and ${n} shown in red and green, respectively.`,
            x : L, y : vizY + H, w : W,
            fontSize : '1.25em', alignment : 'center', opacity : 0, anchor_id : 'left'
        },
        {
            className : 'TextElement',
            text : `The same Cayley diagram as on the left, but now with the product of the red and green generators also shown, colored blue.`,
            x : L + W + gap, y : vizY + H, w : W,
            fontSize : '1.25em', alignment : 'center', opacity : 0, anchor_id : 'middle'
        },
        {
            className : 'TextElement',
            text : `The same Cayley diagram as in the middle, but now with the red and green generators removed. The blue generator traverses all ${m*n} nodes, so we can arrange it in a cycle.`,
            x : L + 2 * (W + gap), y : vizY + H, w : W,
            fontSize : '1.25em', alignment : 'center', opacity : 0, anchor_id : 'right'
        }
    ]

    SheetModel.createNewSheet({title: titleText, elements: sheetElementsAsJSON})
}

function showNoZmnIsomorphismSheet (group: Group, m: groupElement, n: groupElement) {
    // define constants similar to those in showZmnIsomorphismSheet()
    const Z = ( k: integer ): html => `ℤ<sub>${k}</sub>`
    const prod = ( A: html, B: html ): html => `${A} × ${B}`
    const panelWidth = SheetModel.sheetPanelWidth()
    const W = Math.min(
        4 * window.innerHeight / 17,
        (window.innerWidth - panelWidth) / 4  // 3 viz + 2 half-gaps = 4W
    )
    const H = W
    const gap = W / 2
    const totalW = 3 * W + 2 * gap
    const L = (window.innerWidth - panelWidth - totalW) / 2
    const vizY = 0.4 * (window.innerHeight - H)  // center visualizers just above midline
    // build the group Z_m x Z_n and find it in the group library.
    const groupElems = Array.from( {length: m * n}, ( _ : unknown, i: number ) => i );
    const multtable = groupElems.map( (row: number) => {
        const a1 = Math.floor( row / n );
        const b1 = row % n;
        return groupElems.map( (col: number) => {
            const a2 = Math.floor( col / n );
            const b2 = col % n;
            return ( a1 + a2 ) % m * n + ( b1 + b2 ) % n;
        } );
    } );
    const tmpgp = Group.fromMulttable(multtable)
    const ZmxZn = IsomorphicGroups.find( tmpgp ) as Group
    // find elements in that group of the needed orders
    const f = IsomorphicGroups.isomorphism( tmpgp, ZmxZn ) as groupElement[]
    const a = f[n]; // of order m
    const b = f[1]; // of order n
    // and an element of maximal order, but not among <a>U<b>
    const available = ZmxZn.elements.filter( e =>
                                             !ZmxZn.elementPowers[a].get( e ) && !ZmxZn.elementPowers[b].get( e ) );
    const orders: groupElement[] = available.map( e => ZmxZn.elementOrders[e] );
    const maxOrd = orders.reduce<number>((a, b) => Math.max(a, b), Number.MIN_SAFE_INTEGER);
    const maxOrdElt = available.filter( e => ZmxZn.elementOrders[e] == maxOrd )[0];
    // create a sheet based on that group and those elements
    const titleText = `Why there is no isomorphism between ${prod(Z(m), Z(n))} and ${Z(m*n)}`
    const sheetElementsAsJSON: SheetModel.SheetElementRequest[] = [
        {
            // rectangular CD of Z_m x Z_n with arrows for a,b shown
            className : 'CDElement', id : 'left', groupURL : ZmxZn.URL,
            x : L, y : vizY, w : W, h : H,
            arrow_generators : [ {generator: a, color: '#660000'},
                                 {generator: b, color: '#006600'} ],
            strategy_parameters : [ {generator: a, layout: 'linear', direction: 'X', nestingLevel: 0},
                                    {generator: b, layout: 'linear', direction: 'Y', nestingLevel: 1} ]
        },
        {
            // same as previous, plus arrow for maxOrdElt
            className : 'CDElement', id : 'middle', groupURL : ZmxZn.URL,
            x : L + W + gap, y : vizY, w : W, h : H,
            arrow_generators : [ {generator: a, color: '#660000'},
                                 {generator: b, color: '#006600'},
                                 {generator: maxOrdElt, color: '#000066'} ],
            strategy_parameters : [ {generator: a, layout: 'linear', direction: 'X', nestingLevel: 0},
                                    {generator: b, layout: 'linear', direction: 'Y', nestingLevel: 1} ]
        },
        {
            // circular CD of Z_mn with arrow for maxOrdElt shown only
            className : 'CDElement', id : 'right', groupURL : ZmxZn.URL,
            x : L + 2 * (W + gap), y : vizY, w : W, h : H,
            arrow_generators : [ {generator: maxOrdElt, color: '#000066'} ],
            strategy_parameters : [ {generator: maxOrdElt, layout: 'rotated', direction: 'XY', nestingLevel: 0 },
                                    {generator: b, layout: 'linear', direction: 'Y', nestingLevel: 1} ]
        },
        {
            className : 'TextElement',
            text : `A Cayley diagram of ${prod(Z(m), Z(n))} with generators of order ${m} and ${n} shown in red and green, respectively.`,
            x : L, y : vizY + H, w : W,
            fontSize : '1.25em', alignment : 'center', opacity : 0, anchor_id : 'left'
        },
        {
            className : 'TextElement',
            text : `The same Cayley diagram as on the left, but now with the largest-order element of that group also shown, colored blue.`,
            x : L + W + gap, y : vizY + H, w : W,
            fontSize : '1.25em', alignment : 'center', opacity : 0, anchor_id : 'middle'
        },
        {
            className : 'TextElement',
            text : `The same Cayley diagram as in the middle, but now with the red and green generators removed. The blue generator creates ${m*n/maxOrd} cycles, not one.`,
            x : L + 2 * (W + gap), y : vizY + H, w : W,
            fontSize : '1.25em', alignment : 'center', opacity : 0, anchor_id : 'right'
        }
    ]

    SheetModel.createNewSheet({title: titleText, elements: sheetElementsAsJSON})
}
