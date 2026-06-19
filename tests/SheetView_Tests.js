// Unit tests for SheetView coordinate conversion functions:
// modelToDisplay, displayToModel, fromEvent

import { THREE } from '../lib/externals.js'
import * as SheetView from '../js/SheetView.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────

// #graphic dimensions used for all tests — chosen to give a non-trivial center
const GW = 600, GH = 400
const CX = GW / 2, CY = GH / 2   // graphic center = zoom pivot = (300, 200)

let graphic

beforeEach(function () {
  document.getElementById('graphic')?.remove()
  graphic = document.createElement('div')
  graphic.id = 'graphic'
  graphic.style.cssText = `position:fixed;left:0;top:0;width:${GW}px;height:${GH}px`
  document.body.appendChild(graphic)
  SheetView.init()
  // init() does not reset zoomFactor; normalize it here
  SheetView.zoom(1 / SheetView.zoomFactor)
})

afterEach(function () {
  graphic.remove()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const EPS = 1e-9

function expectVec (result, x, y, label = '') {
  expect(result.x).to.be.closeTo(x, EPS, `${label} x`)
  expect(result.y).to.be.closeTo(y, EPS, `${label} y`)
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('SheetView coordinate conversions', function () {

  // ── modelToDisplay ─────────────────────────────────────────────────────────
  describe('modelToDisplay', function () {
    it('is identity at zoom=1, pan=(0,0)', function () {
      expectVec(SheetView.modelToDisplay(new THREE.Vector2(100, 50)), 100, 50)
    })

    it('graphic center is the fixed point of zoom', function () {
      SheetView.zoom(2)
      expectVec(SheetView.modelToDisplay(new THREE.Vector2(CX, CY)), CX, CY)
    })

    it('points move away from graphic center when zooming in', function () {
      SheetView.zoom(2)
      // 100px right of center → 200px right of center
      expectVec(SheetView.modelToDisplay(new THREE.Vector2(CX + 100, CY)), CX + 200, CY)
    })

    it('points move toward graphic center when zooming out', function () {
      SheetView.zoom(0.5)
      // 100px right of center → 50px right of center
      expectVec(SheetView.modelToDisplay(new THREE.Vector2(CX + 100, CY)), CX + 50, CY)
    })

    it('pan shifts output by pan amount', function () {
      SheetView.pan(30, -20)
      expectVec(SheetView.modelToDisplay(new THREE.Vector2(100, 50)), 130, 30)
    })

    it('zoom and pan combine correctly', function () {
      SheetView.zoom(2)
      SheetView.pan(10, 20)
      // pt=(CX+50, CY): (50-0)*2+CX + 10 = CX+110; CY+20
      expectVec(SheetView.modelToDisplay(new THREE.Vector2(CX + 50, CY)), CX + 110, CY + 20)
    })

    it('does not mutate the input point', function () {
      const pt = new THREE.Vector2(100, 50)
      SheetView.modelToDisplay(pt)
      expect(pt.x).to.equal(100)
      expect(pt.y).to.equal(50)
    })
  })

  // ── displayToModel ─────────────────────────────────────────────────────────
  describe('displayToModel', function () {
    it('is identity at zoom=1, pan=(0,0)', function () {
      expectVec(SheetView.displayToModel(new THREE.Vector2(100, 50)), 100, 50)
    })

    it('graphic center maps to itself', function () {
      SheetView.zoom(2)
      expectVec(SheetView.displayToModel(new THREE.Vector2(CX, CY)), CX, CY)
    })

    it('does not mutate the input point', function () {
      const pt = new THREE.Vector2(150, 75)
      SheetView.displayToModel(pt)
      expect(pt.x).to.equal(150)
      expect(pt.y).to.equal(75)
    })
  })

  // ── roundtrip ──────────────────────────────────────────────────────────────
  describe('modelToDisplay / displayToModel roundtrip', function () {
    const pts = [[0, 0], [100, 50], [CX, CY], [-200, 300], [1000, -500]]

    it('roundtrip at zoom=1, pan=(0,0)', function () {
      for (const [x, y] of pts) {
        const rt = SheetView.displayToModel(SheetView.modelToDisplay(new THREE.Vector2(x, y)))
        expectVec(rt, x, y, `(${x},${y})`)
      }
    })

    it('roundtrip at zoom=2, pan=(30,-20)', function () {
      SheetView.zoom(2)
      SheetView.pan(30, -20)
      for (const [x, y] of pts) {
        const rt = SheetView.displayToModel(SheetView.modelToDisplay(new THREE.Vector2(x, y)))
        expectVec(rt, x, y, `(${x},${y})`)
      }
    })

    it('roundtrip at zoom=0.5, pan=(-100,50)', function () {
      SheetView.zoom(0.5)
      SheetView.pan(-100, 50)
      for (const [x, y] of pts) {
        const rt = SheetView.displayToModel(SheetView.modelToDisplay(new THREE.Vector2(x, y)))
        expectVec(rt, x, y, `(${x},${y})`)
      }
    })
  })

  // ── fromEvent ──────────────────────────────────────────────────────────────
  describe('fromEvent', function () {
    it('MouseEvent at graphic origin → model (0,0) at identity', function () {
      const ev = new MouseEvent('mousemove', { clientX: 0, clientY: 0 })
      expectVec(SheetView.fromEvent(ev), 0, 0)
    })

    it('MouseEvent at graphic center → model center at identity', function () {
      const ev = new MouseEvent('mousemove', { clientX: CX, clientY: CY })
      expectVec(SheetView.fromEvent(ev), CX, CY)
    })

    it('MouseEvent result matches displayToModel of graphic-relative point', function () {
      SheetView.zoom(2)
      SheetView.pan(30, -20)
      const ev = new MouseEvent('mousemove', { clientX: 150, clientY: 100 })
      const expected = SheetView.displayToModel(new THREE.Vector2(150, 100))
      expectVec(SheetView.fromEvent(ev), expected.x, expected.y)
    })

    if (typeof Touch !== 'undefined') {
      it('single-touch TouchEvent extracts from touches[0]', function () {
        const touch = new Touch({ identifier: 1, target: graphic, clientX: 100, clientY: 75 })
        const ev = new TouchEvent('touchmove', { touches: [touch] })
        const expected = SheetView.displayToModel(new THREE.Vector2(100, 75))
        expectVec(SheetView.fromEvent(ev), expected.x, expected.y)
      })

      it('multi-touch TouchEvent averages touch positions', function () {
        const t1 = new Touch({ identifier: 1, target: graphic, clientX: 100, clientY: 100 })
        const t2 = new Touch({ identifier: 2, target: graphic, clientX: 200, clientY: 200 })
        const ev = new TouchEvent('touchmove', { touches: [t1, t2] })
        const expected = SheetView.displayToModel(new THREE.Vector2(150, 150))
        expectVec(SheetView.fromEvent(ev), expected.x, expected.y)
      })

      it('touchend TouchEvent extracts from changedTouches[0]', function () {
        const touch = new Touch({ identifier: 1, target: graphic, clientX: 80, clientY: 60 })
        const ev = new TouchEvent('touchend', { changedTouches: [touch] })
        const expected = SheetView.displayToModel(new THREE.Vector2(80, 60))
        expectVec(SheetView.fromEvent(ev), expected.x, expected.y)
      })
    }
  })

})
