/* @flow

# AutoUpgrade

Handles version synchronization and data migration for GE3 applications. Triggered by
version mismatches between the current web page and the local store, it handles version
upgrades and initial install

When the locally stored version is different from that of the current page, it
 * Loads updated JavaScript files (bypassing cache)
 * Updates group definitions and migrates locally stored data to latest format
 * Update the locally stored version to match the current page

In either case it leaves the group library loaded and ready for synchronous access.

```js
 */
import * as AutoUpgradeManifest from './AutoUpgradeManifest.js'

export {version}
/*
```
### version

Get GE3 version number from <meta> tag in top-level web page
```javascript
 */
function version () /*: ?string */ {
   const metaElement = document.querySelector('meta[name="GE3-GITVersion"]')
   if (metaElement == null) {
      // something is very wrong, don't import Log.js and make it worse
      alert('Corrupted GE3 group-index/index.html\nReload page, and if problem persists contact developers')
      return null
   }
   return metaElement.getAttribute('content')
}

function getBaseURL () {
   const pageUrl = new URL(window.location.href)
   const pageUrlString = pageUrl.origin + pageUrl.pathname // trim off query string
   const baseURL = pageUrlString.slice(0, pageUrlString.lastIndexOf('/') + 1) // baseURL is part up to last '/'

   return baseURL
}

export async function initialize () {
   // get version from web page <meta> tag
   const webpageVersion = version()

   // get last update version from local storage
   const localStoreVersion = localStorage.getItem('GE-version')

   if (webpageVersion != localStoreVersion) {
      const baseURL = getBaseURL()

      // reload javascript code files, bypassing the browser cache
      await Promise.all(AutoUpgradeManifest.codeFiles.map((url) => window.fetch(`${baseURL}${url}`, { cache: 'reload' })))

      const Library = await import('./Library.js') // dynamic import so it doesn't happen before loading this page
      await Library.updateAllGroups()  // reload Library groups

      localStorage.setItem('GE-version', `${webpageVersion || ''}`)  // update version in local storage
   } else {
      // be sure the group library is loaded from local storage before starting anything else
      const Library = await import('./Library.js')
      await Library.loadLibrary()
   }
}
