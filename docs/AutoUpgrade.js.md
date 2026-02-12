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
/*
```
### version

Get GE3 version number from <meta> tag in top-level web page
```javascript
 */
export function version () /*: string */ {
   const metaElement = document.querySelector('meta[name="GE3-GITVersion"]')
   if (metaElement == null) {
      alert('Corrupted GE3 group-index/index.html\nReload page, and if problem persists contact developers')
      return null
   }
   return metaElement.getAttribute('content')
}

export async function initialize () {
   // get version from web page <meta> tag
   const webpageVersion = version()

   // get last update version from local storage
   const localStoreVersion = localStorage.getItem('GE-version')

   if (webpageVersion != localStoreVersion) {
      const pageUrl = new URL(window.location.href)
      const pageUrlString = pageUrl.origin + pageUrl.pathname // trim off query string
      const baseURL = pageUrlString.slice(0, pageUrlString.lastIndexOf('/') + 1) // baseURL is part up to last '/'
      await Promise.all(AutoUpgradeManifest.codeFiles.map((url) => window.fetch(`${baseURL}${url}`, { cache: 'reload' })))
      const Library = await import('./Library.js')
      await Library.updateAllGroups()
      localStorage.setItem('GE-version', `${webpageVersion || ''}`)
   } else {
      const Library = await import('./Library.js')
      await Library.loadLibrary()
   }
}
