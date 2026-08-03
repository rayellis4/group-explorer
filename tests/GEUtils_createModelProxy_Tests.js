import {createModelProxy} from '../js/GEUtils.js'

describe('createModelProxy tests', function () {

   describe('plain object proxying (regression)', function () {

      it('notifies subscriber when property is set', function (done) {
         const proxy = createModelProxy({x: 0})
         let initialized = false
         proxy.$subscribe({
            update (field, value) {
               if (!initialized) return
               expect(field).to.equal('x')
               expect(value).to.equal(42)
               done()
            }
         }, 'x')
         initialized = true
         proxy.x = 42
      })

      it('does not notify when setting an unknown property', function (done) {
         const proxy = createModelProxy({x: 0})
         let initialized = false
         let notified = false
         proxy.$subscribe({
            update () { if (initialized) notified = true }
         }, 'x')
         initialized = true
         proxy.y = 99  // unknown property — should not notify
         setTimeout(() => {
            expect(notified).to.be.false
            done()
         }, 10)
      })
      
      it('does not notify subscriber after unsubscribing', function (done) {
         const proxy = createModelProxy({x: 0})
         const timeoutId = setTimeout(() => { expect(timeoutId).to.exist; done() }, 0)
         const subscriber = { update (field, value) {
            expect(timeoutId).to.be.undefined
            cancelTimeout(timeoutId)
            done()
         } }
         proxy.$subscribe( subscriber, 'x')
         proxy.$unsubscribe( subscriber, 'x')
         proxy.x = 42
      })
   })

   describe('Map-valued field proxying', function () {

      it('notifies subscriber when Map.set is called', function (done) {
         const proxy = createModelProxy({elements: new Map()})
         let initialized = false
         proxy.$subscribe({
            update (field, value) {
               if (!initialized) return
               expect(field).to.equal('elements')
               expect(value.key).to.equal('a')
               expect(value.map.get('a')).to.equal(1)
               done()
            }
         }, 'elements')
         initialized = true
         proxy.elements.set('a', 1)
      })

      it('notifies subscriber when Map.delete is called', function (done) {
         const proxy = createModelProxy({elements: new Map([['a', 1]])})
         let initialized = false
         proxy.$subscribe({
            update (field, value) {
               if (!initialized) return
               expect(field).to.equal('elements')
               expect(value.key).to.equal('a')
               expect(value.map.has('a')).to.be.false
               done()
            }
         }, 'elements')
         initialized = true
         proxy.elements.delete('a')
      })

      it('notifies subscriber when Map.clear is called', function (done) {
         const proxy = createModelProxy({elements: new Map([['a', 1], ['b', 2]])})
         let initialized = false
         proxy.$subscribe({
            update (field, value) {
               if (!initialized) return
               expect(field).to.equal('elements')
               expect(value.map.size).to.equal(0)
               done()
            }
         }, 'elements')
         initialized = true
         proxy.elements.clear()
      })

      it('returns the same proxied Map on repeated access (cache)', function () {
         const proxy = createModelProxy({elements: new Map()})
         expect(proxy.elements).to.equal(proxy.elements)
      })

      it('non-mutating Map methods work correctly through proxy', function () {
         const proxy = createModelProxy({elements: new Map([['a', 1], ['b', 2]])})
         expect(proxy.elements.get('a')).to.equal(1)
         expect(proxy.elements.has('b')).to.be.true
         expect(proxy.elements.has('c')).to.be.false
         expect(proxy.elements.size).to.equal(2)
         const keys = []
         proxy.elements.forEach((_v, k) => keys.push(k))
         expect(keys).to.deep.equal(['a', 'b'])
      })

      it('invalidates proxy cache when Map field is replaced', function () {
         const proxy = createModelProxy({elements: new Map()})
         const first = proxy.elements
         proxy.elements = new Map()
         const second = proxy.elements
         expect(second).to.not.equal(first)
      })

   })

})
