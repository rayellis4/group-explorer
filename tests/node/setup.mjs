// Mocha --require hook for headless runs: replicates the global `expect` that
// tests/UnitTests.html sets up via a classic <script> tag (`const expect = chai.expect`),
// so the same *_Tests.js files run unmodified under both browser and Node.
import * as chai from 'chai'
globalThis.expect = chai.expect
globalThis.chai = chai

// obj2string: the same display helper tests/UnitTests.html defines inline in a classic <script>,
// used by BitSet_Tests.js / MathUtils_Tests.js et al. to render actual/expected values in
// assertion messages. Kept byte-for-byte in sync with the copy in UnitTests.html.
globalThis.obj2string = function obj2string (arg) {
   switch (typeof (arg)) {
      case 'boolean':
         return arg.toString()
      case 'number':
         return arg.toString()
      case 'string':
         return arg
      case 'object':
         if (Array.isArray(arg)) {
            return '[' + arg.map((n) => n.toString()).join(', ') + ']'
         } else {
            if (Array.isArray(arg.arr)) {
               return `{len: ${arg.len}, arr: [${arg.arr.map((n) => n.toString(16)).join(', ')}]}`
            } else {
               // typed array -- Uint32Array
               return `{len: ${arg.len}, arr: [${Array.from(arg.arr).map((n) => n.toString(16)).join(', ')}]}`
            }
         }
   }
}
