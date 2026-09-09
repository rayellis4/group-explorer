// Mocha --require hook: gives Node just enough of a browser to run AutoUpgrade.refreshGroupLibrary()
// once, populating a fake IndexedDB the way a real GroupExplorer.html session would on a version
// bump -- so tests that (like DefiningRelations_Tests.js) call Library.loadLibrary() at module
// scope find a populated library, exactly as tests/UnitTests.html's setup note describes.
//
// A tiny static file server over the repo root is started in-process (see startFileServer below)
// so window.fetch(...) inside Library.updateAllGroups can retrieve the real .group files -- this
// is not mocked data. Set GE3_TEST_SERVER_URL to point at an external server instead.

import 'fake-indexeddb/auto'
import { parseHTML } from 'linkedom'
import { createServer } from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { extname, join, normalize } from 'node:path'

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url))

const CONTENT_TYPES = {
   '.group': 'application/json',
   '.js': 'text/javascript',
   '.json': 'application/json',
   '.html': 'text/html',
   '.css': 'text/css',
}

// Serve REPO_ROOT read-only. Just enough for Library's fetch of .group files: a 200 with a
// Last-Modified header (updateAllGroups reads response.headers.get('last-modified')) or a 404.
function startFileServer () {
   const server = createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
      const filePath = join(REPO_ROOT, normalize(urlPath))
      if (!filePath.startsWith(REPO_ROOT)) { // reject path traversal
         res.writeHead(403).end()
         return
      }
      let stats
      try {
         stats = statSync(filePath)
      } catch {
         res.writeHead(404).end()
         return
      }
      if (!stats.isFile()) {
         res.writeHead(404).end()
         return
      }
      res.writeHead(200, {
         'Content-Type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
         'Last-Modified': stats.mtime.toUTCString(),
      })
      createReadStream(filePath).pipe(res)
   })
   return new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
         server.unref() // don't keep the test process alive on our account
         const { port } = server.address()
         resolve(`http://127.0.0.1:${port}/`)
      })
   })
}

const SERVER_URL = process.env.GE3_TEST_SERVER_URL ?? await startFileServer()

// The browser runs these tests from tests/UnitTests.html, so relative URLs like
// '../groups/Z_4.group' and '../js/Group.js' resolve against .../tests/. Match that base:
// Library.absoluteURL() and getGroupByURL() key the library off `new URL(url, location.href)`,
// and the fetch shim below resolves relative request URLs the same way.
const PAGE_URL = new URL('tests/', SERVER_URL).href

// Node's fetch (unlike the browser's) does not resolve a relative URL against any base -- it
// throws "Failed to parse URL". Wrap it so a relative first arg resolves against PAGE_URL,
// exactly as the browser would against the page location.
const nodeFetch = globalThis.fetch
globalThis.fetch = (resource, init) => {
   if (typeof resource === 'string' && !/^[a-z]+:/i.test(resource)) {
      resource = new URL(resource, PAGE_URL).href
   }
   return nodeFetch(resource, init)
}

// minimal in-memory localStorage -- only used by StoredObjects' one-time v0->v1 migration path
const memoryStorage = new Map()
globalThis.localStorage = {
   getItem: (k) => memoryStorage.get(k) ?? null,
   setItem: (k, v) => memoryStorage.set(k, String(v)),
   removeItem: (k) => memoryStorage.delete(k),
}

const { document: linkedomDocument, Element: LinkedomElement } = parseHTML('<html><body></body></html>')
globalThis.document = linkedomDocument
globalThis.window = globalThis
globalThis.location = new URL(PAGE_URL)

// linkedom has no layout engine, so its getBoundingClientRect() always returns a zero rect.
// Synthesize one from inline left/top/width/height instead -- enough for SheetView_Tests.js,
// which sizes its #graphic element with an inline style. Elements without inline dimensions
// still get a zero rect, exactly as before.
const cssPixels = (value) => {
   const n = parseFloat(value)
   return Number.isFinite(n) ? n : 0
}
LinkedomElement.prototype.getBoundingClientRect = function getBoundingClientRect () {
   const { left, top, width, height } = this.style
   return new globalThis.DOMRect(cssPixels(left), cssPixels(top), cssPixels(width), cssPixels(height))
}

// no-op ResizeObserver -- SheetView.js's init() constructs one at import time; the tests that
// touch it don't depend on resize callbacks firing
globalThis.ResizeObserver = class ResizeObserver {
   observe () {}
   unobserve () {}
   disconnect () {}
}

// minimal DOMRect polyfill -- SheetView.js sets a module-level `graphicRect = new DOMRect(...)`
// at import time, and Node has no Web Geometry Interfaces globals at all
globalThis.DOMRect = class DOMRect {
   constructor (x = 0, y = 0, width = 0, height = 0) {
      this.x = x; this.y = y; this.width = width; this.height = height
      this.top = y; this.left = x; this.right = x + width; this.bottom = y + height
   }
}

// minimal MouseEvent -- linkedom ships Event/CustomEvent but not the UI event subclasses.
// SheetView.fromEvent() does `event instanceof MouseEvent` and reads clientX/clientY.
globalThis.MouseEvent = class MouseEvent extends globalThis.window.Event {
   constructor (type, init = {}) {
      super(type, init)
      this.clientX = init.clientX ?? 0
      this.clientY = init.clientY ?? 0
      this.button = init.button ?? 0
      this.buttons = init.buttons ?? 0
   }
}

// Populate the fake IndexedDB exactly as AutoUpgrade.initialize() does on a version bump: base
// library + generated extended library (order 22-40), persisted. Passing the server root as the
// baseURL makes `groups/X.group` resolve there -- `location` points at tests/ (for the relative
// URLs the test files use), and the two must not be conflated.
const { refreshGroupLibrary } = await import('../../js/AutoUpgrade.js')
await refreshGroupLibrary(SERVER_URL)
