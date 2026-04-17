/* @flow

# ZmnInfo

A [GroupInfo](./GroupInfo.html.md) component that displays whether a group is isomorphic to the
product group ℤ<sub>m</sub> x ℤ<sub>n</sub> where *m* and *n* are relatively prime, and shows the
reason graphically in a [Sheet](./Sheet.html.md).

```javascript
 */
import * as GEUtils from './GEUtils.js'
import {Group} from './Group.js'
import {IsomorphicGroups} from './IsomorphicGroups.js'
import * as MathUtils from './MathUtils.js'
import * as SheetModel from './SheetModel.js'

export {display}

/*::
import {Group} from './Group.js';

import type {StrategyParameters, Layout, Direction} from './CayleyDiagramView.js';
*/

function display (zmnInfoElementId, group) {
   const zmnInfoElement = document.getElementById(zmnInfoElementId)

   if (!group.isCyclic) {
      zmnInfoElement.remove()
      return
   }

   zmnInfoElement.innerHTML = formatZmnInfo(group)

   GEUtils.createActionHandler(zmnInfoElement, (action) => eval(action))
}

function formatZmnInfo (group) /*: html */ {
   const htmlFragments = [
      `<details>
          <summary>
             <span class="title">ℤ<sub>mn</sub> group</span>
             <span class="summary">${new Set(MathUtils.getFactors(group.order)).size == 2 ? 'yes' : 'no'}</span>
          </summary>`
   ]

    const factors = MathUtils.getFactors(group.order);
    const [m, n, _] =
          factors.reduce( ([fac1, fac2, prev], el) => {
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

function showZmnIsomorphismSheet (group, m /*: groupElement */, n /*: groupElement */) {
   SheetModel.createNewSheet(formatZmnIsomorphismSheet(group, m, n))
}

function formatZmnIsomorphismSheet (group, m /*: groupElement */, n /*: groupElement */) {
    const Z = ( k ) => `ℤ<sub>${k}</sub>`
    const prod = ( A, B ) => `${A} × ${B}`
    const a = group.elementOrders.indexOf( m );
    const b = group.elementOrders.indexOf( n );
    const ab = group.mult( a, b );
    const hmar = 30, vmar = 24, hsep = 20, vsep = 20,
          W = 300, H = W, hdrH = 50, txtH = 100;
    const zmnIsomorphismSheet = [
        {
            className : 'TextElement',
            text : `Illustration of the isomorphism between ${prod(Z(m), Z(n))} and ${Z(m*n)}`,
            x : hmar, y : vmar,
            w : 3*W + 2*hsep, h : hdrH,
            fontSize : '20pt', alignment : 'center'
        },
        {
            // rectangular CD of Z_m x Z_n with arrows for a,b shown
            className : 'CDElement', groupURL : group.URL,
            x : hmar, y : vmar+hdrH+vsep, w : W, h : H,
            arrow_generators : [ {generator: a, color: '#660000'},
                                 {generator: b, color: '#006600'} ],
            strategies : [ {generator: a, layout: 'linear', direction: 'X', nestingLevel: 0},
                           {generator: b, layout: 'linear', direction: 'Y', nestingLevel: 1} ]
        },
        {
            // same as previous, plus arrow for ab
            className : 'CDElement', groupURL : group.URL,
            x : hmar+hsep+W, y : vmar+hdrH+vsep, w : W, h : H,
            arrow_generators : [ {generator: a, color: '#660000'},
                                 {generator: b, color: '#006600'},
                                 {generator: ab, color: '#000066'} ],
            strategies : [ {generator: a, layout: 'linear', direction: 'X', nestingLevel: 0},
                           {generator: b, layout: 'linear', direction: 'Y', nestingLevel: 1} ]
        },
        {
            // circular CD of Z_mn with arrow for ab shown only
            className : 'CDElement', groupURL : group.URL,
            x : hmar+2*hsep+2*W, y : vmar+hdrH+vsep, w : W, h : H,
            arrow_generators : [ {generator: ab, color: '#000066'} ],
            strategies : [ {generator: ab, layout: 'circular', direction: 'XY', nestingLevel: 0} ]
        },
        {
            className : 'TextElement',
            text : `A Cayley diagram of ${prod(Z(m), Z(n))} with generators of order ${m} and ${n} shown in red and green, respectively.`,
            x : hmar, y : vmar+hdrH+H+2*vsep, w : W,
            alignment : 'center'
        },
        {
            className : 'TextElement',
            text : `The same Cayley diagram as on the left, but now with the product of the red and green generators also shown, colored blue.`,
            x : hmar+hsep+W, y : vmar+hdrH+H+2*vsep, w : W,
            alignment : 'center'
        },
        {
            className : 'TextElement',
            text : `The same Cayley diagram as in the middle, but now with the red and green generators removed. The blue generator traverses all ${m*n} nodes, so we can arrange it in a cycle.`,
            x : hmar+2*hsep+2*W, y : vmar+hdrH+H+2*vsep, w : W,
            alignment : 'center'
        }
    ]

    return zmnIsomorphismSheet
}

function showNoZmnIsomorphismSheet (group, m /*: groupElement */, n /*: groupElement */) {
   SheetModel.createNewSheet(formatNoZmnIsomorphismSheet(group, m, n))
}

function formatNoZmnIsomorphismSheet (group, m /*: groupElement */, n /*: groupElement */) {
    // define constants similar to those in showZmnIsomorphismSheet()
    const Z = ( k ) => `ℤ<sub>${k}</sub>`
    const prod = ( A, B ) => `${A} × ${B}`
    const hmar = 30, vmar = 24, hsep = 20, vsep = 20,
          W = 300, H = W, hdrH = 50, txtH = 100;
    // build the group Z_m x Z_n and find it in the group library.
    const elements = Array.from( {length: m * n}, ( _ /*: mixed */, i /*: number */ ) => i );
    const multtable = elements.map( (row /*: number */) => {
        const a1 = Math.floor( row / n );
        const b1 = row % n;
        return elements.map( (col /*: number */) => {
            const a2 = Math.floor( col / n );
            const b2 = col % n;
            return ( a1 + a2 ) % m * n + ( b1 + b2 ) % n;
        } );
    } );
    const tmpgp = Group.fromMulttable(multtable)
    const ZmxZn = ((IsomorphicGroups.find( tmpgp ) /*: any */) /*: Group */);
    // find elements in that group of the needed orders
    const f = ((IsomorphicGroups.isomorphism( tmpgp, ZmxZn ) /*: any */) /*: Array<groupElement> */);
    const a = f[n]; // of order m
    const b = f[1]; // of order n
    // and an element of maximal order, but not among <a>U<b>
    const aorbit = ZmxZn.elementPowers[a];
    const borbit = ZmxZn.elementPowers[b];
    const available = ZmxZn.elements.filter( e =>
                                             !ZmxZn.elementPowers[a].get( e ) && !ZmxZn.elementPowers[b].get( e ) );
    const orders /*: Array<groupElement> */ = available.map( e => ZmxZn.elementOrders[e] );
    const maxOrd = orders.reduce( ( a, b ) => Math.max( a, b ) );
    const maxOrdElt = available.filter( e => ZmxZn.elementOrders[e] == maxOrd )[0];
    // create a sheet based on that group and those elements
    const noZmnIsomorphismSheet = [
        {
            className : 'TextElement',
            text : `Why there is no isomorphism between ${prod(Z(m), Z(n))} and ${Z(m*n)}`,
            x : hmar, y : vmar,
            w : 3*W + 2*hsep, h : hdrH,
            fontSize : '20pt', alignment : 'center'
        },
        {
            // rectangular CD of Z_m x Z_n with arrows for a,b shown
            className : 'CDElement', groupURL : ZmxZn.URL,
            x : hmar, y : vmar+hdrH+vsep, w : W, h : H,
            arrow_generators : [ {generator: a, color: '#660000'},
                                 {generator: b, color: '#006600'} ],
            strategies : [ {generator: a, layout: 'linear', direction: 'X', nestingLevel: 0},
                           {generator: b, layout: 'linear', direction: 'Y', nestingLevel: 1} ]
        },
        {
            // same as previous, plus arrow for maxOrdElt
            className : 'CDElement', groupURL : ZmxZn.URL,
            x : hmar+hsep+W, y : vmar+hdrH+vsep, w : W, h : H,
            arrow_generators : [ {generator: a, color: '#660000'},
                                 {generator: b, color: '#006600'},
                                 {generator: maxOrdElt, color: '#000066'} ],
            strategies : [ {generator: a, layout: 'linear', direction: 'X', nestingLevel: 0},
                           {generator: b, layout: 'linear', direction: 'Y', nestingLevel: 1} ]
        },
        {
            // circular CD of Z_mn with arrow for maxOrdElt shown only
            className : 'CDElement', groupURL : ZmxZn.URL,
            x : hmar+2*hsep+2*W, y : vmar+hdrH+vsep, w : W, h : H,
            arrow_generators : [ {generator: maxOrdElt, color: '#000066'} ],
            strategies : [ {generator: maxOrdElt, layout: 'rotated', direction: 'XY', nestingLevel: 0 },
                           {generator: b, layout: 'linear', direction: 'Y', nestingLevel: 1} ]
        },
        {
            className : 'TextElement',
            text : `A Cayley diagram of ${prod(Z(m), Z(n))} with generators of order ${m} and ${n} shown in red and green, respectively.`,
            x : hmar, y : vmar+hdrH+H+2*vsep, w : W,
            alignment : 'center'
        },
        {
            className : 'TextElement',
            text : `The same Cayley diagram as on the left, but now with the largest-order element of that group also shown, colored blue.`,
            x : hmar+hsep+W, y : vmar+hdrH+H+2*vsep, w : W,
            alignment : 'center'
        },
        {
            className : 'TextElement',
            text : `The same Cayley diagram as in the middle, but now with the red and green generators removed. The blue generator creates ${m*n/maxOrd} cycles, not one.`,
            x : hmar+2*hsep+2*W, y : vmar+hdrH+H+2*vsep, w : W,
            alignment : 'center'
        }
    ]

    return noZmnIsomorphismSheet
}
