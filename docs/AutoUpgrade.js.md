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
export {version}

const codeFiles = [
   './GroupExplorer.html',
   './GroupInfo.html',
   './CayleyDiagram.html',
   './CycleGraph.html',
   './Multtable.html',
   './SymmetryObject.html',
   './Sheet.html',
   'html/ShowGAPCode.html',
   'js/AbelianInfo.js',
   'js/AbstractDiagramDisplay.js',
   'js/AutoUpgrade.js',
   'js/BasicFactInfo.js',
   'js/BitSet.js',
   'js/CayleyDiagram.js',
   'js/CayleyDiagramControl.js',
   'js/CayleyDiagramGenerator.js',
   'js/CayleyDiagramModel.js',
   'js/CayleyDiagramView.js',
   'js/CayleyDiagramViewUI.js',
   'js/CayleyViewControl.js',
   'js/ClassEquationInfo.js',
   'js/ControlPanel.js',
   'js/CycleGraph.js',
   'js/CycleGraphModel.js',
   'js/CycleGraphView.js',
   'js/CycleGraphViewUI.js',
   'js/CyclicInfo.js',
   'js/DefiningRelations.js',
   'js/FileDataInfo.js',
   'js/GeneratorInfo.js',
   'js/Gestures.js',
   'js/GEUtils.js',
   'js/Group.js',
   'js/GroupExplorer.js',
   'js/GroupInfo.js',
   'js/GroupTable.js',
   'js/GroupTableUI.js',
   'js/Heading.js',
   'js/HighlightControl.js',
   'js/HighlightControlView.js',
   'js/HighlightControlViewModel.js',
   'js/IsomorphicGroups.js',
   'js/Library.js',
   'js/Log.js',
   'js/Mapping.js',
   'js/MathML.js',
   'js/MathUtils.js',
   'js/Multtable.js',
   'js/MulttableControl.js',
   'js/MulttableModel.js',
   'js/MulttableView.js',
   'js/MulttableViewUI.js',
   'js/NamingSchemeInfo.js',
   'js/OrderClassInfo.js',
   'js/Sheet.js',
   'js/SheetControl.js',
   'js/SheetEditor.js',
   'js/SheetModel.js',
   'js/SheetModelEditors.js',
   'js/SheetSerialization.js',
   'js/SheetView.js',
   'js/SheetViewModel.js',
   'js/SheetViewUI.js',
   'js/ShowGAPCode.js',
   'js/SolvableInfo.js',
   'js/StoredObjects.js',
   'js/SubgroupInfo.js',
   'js/Subgroup.js',
   'js/SubgroupLattice.js',
   'js/SymmetryObject.js',
   'js/SymmetryObjectControl.js',
   'js/SymmetryObjectView.js',
   'js/UIComponents.js',
   'js/UserNoteInfo.js',
   'js/ViewInfo.js',
   'js/XMLGroup.js',
   'js/ZmnInfo.js',
   'lib/externals.js',
   'style/ge3.css',
]

const groupFiles = [
   // Default library
   'groups/Trivial.group',
   'groups/Z_2.group',
   'groups/Z_3.group',
   'groups/V_4.group',
   'groups/Z_4.group',
   'groups/Z_5.group',
   'groups/S_3.group',
   'groups/Z_6.group',
   'groups/Z_7.group',
   'groups/D_4.group',
   'groups/Q_4.group',
   'groups/Z_2%20x%20Z_2%20x%20Z_2.group',
   'groups/Z_2%20x%20Z_4.group',
   'groups/Z_8.group',
   'groups/Z_3%20x%20Z_3.group',
   'groups/Z_9.group',
   'groups/D_5.group',
   'groups/Z_10.group',
   'groups/Z_11.group',
   'groups/A_4.group',
   'groups/D_6.group',
   'groups/Z_12.group',
   'groups/Z_2%20x%20Z_6.group',
   'groups/Z_3%20sdp%20Z_4.group',
   'groups/Z_13.group',
   'groups/D_7.group',
   'groups/Z_14.group',
   'groups/Z_15.group',
   'groups/D_4%20x%20Z_2.group',
   'groups/D_8.group',
   'groups/G_4,4.group',
   'groups/Modular_16.group',
   'groups/Q_4%20x%20Z_2.group',
   'groups/Q_8.group',
   'groups/Quasihedral_16.group',
   'groups/Unnamed1_16.group',
   'groups/Unnamed2_16.group',
   'groups/Z_16.group',
   'groups/Z_2%20x%20Z_2%20x%20Z_2%20x%20Z_2.group',
   'groups/Z_2%20x%20Z_4%20x%20Z_2.group',
   'groups/Z_2%20x%20Z_8.group',
   'groups/Z_4%20x%20Z_4.group',
   'groups/Z_17.group',
   'groups/D_9.group',
   'groups/S_3%20x%20Z_3.group',
   'groups/Z_18.group',
   'groups/Z_3%20x%20Z_3%20sdp%20Z_2.group',
   'groups/Z_3%20x%20Z_6.group',
   'groups/Z_19.group',
   'groups/D_10.group',
   'groups/Fr_20.group',
   'groups/Z_2%20x%20Z_10.group',
   'groups/Z_20.group',
   'groups/Z_4%20sdp%20Z_5.group',
   'groups/Twenty-one.group',
   'groups/S_3%20x%20Z_4.group',
   'groups/S_4.group',
   'groups/Z_2%20x%20Z_2%20x%20Z_2%20x%20Z_3.group',
   'groups/A_5.group',
   'groups/Z_2%20x%20Z_3%20x%20Z_3%20x%20Z_4.group',

   // fgb_groups, named by GAP id
   'groups/22,1.group',
   'groups/24,10.group',
   'groups/24,11.group',
   'groups/24,13.group',
   'groups/24,14.group',
   'groups/24,1.group',
   'groups/24,3.group',
   'groups/24,4.group',
   'groups/24,6.group',
   'groups/24,7.group',
   'groups/24,8.group',
   'groups/26,1.group',
   'groups/27,3.group',
   'groups/27,4.group',
   'groups/28,1.group',
   'groups/28,3.group',
   'groups/30,1.group',
   'groups/30,2.group',
   'groups/30,3.group',
   'groups/32,10.group',
   'groups/32,11.group',
   'groups/32,12.group',
   'groups/32,13.group',
   'groups/32,14.group',
   'groups/32,15.group',
   'groups/32,17.group',
   'groups/32,18.group',
   'groups/32,19.group',
   'groups/32,20.group',
   'groups/32,22.group',
   'groups/32,23.group',
   'groups/32,24.group',
   'groups/32,25.group',
   'groups/32,26.group',
   'groups/32,27.group',
   'groups/32,28.group',
   'groups/32,29.group',
   'groups/32,2.group',
   'groups/32,30.group',
   'groups/32,31.group',
   'groups/32,32.group',
   'groups/32,33.group',
   'groups/32,34.group',
   'groups/32,35.group',
   'groups/32,37.group',
   'groups/32,38.group',
   'groups/32,39.group',
   'groups/32,40.group',
   'groups/32,41.group',
   'groups/32,42.group',
   'groups/32,43.group',
   'groups/32,44.group',
   'groups/32,46.group',
   'groups/32,47.group',
   'groups/32,48.group',
   'groups/32,49.group',
   'groups/32,4.group',
   'groups/32,50.group',
   'groups/32,5.group',
   'groups/32,6.group',
   'groups/32,7.group',
   'groups/32,8.group',
   'groups/32,9.group',
   'groups/34,1.group',
   'groups/36,10.group',
   'groups/36,11.group',
   'groups/36,12.group',
   'groups/36,13.group',
   'groups/36,1.group',
   'groups/36,3.group',
   'groups/36,4.group',
   'groups/36,6.group',
   'groups/36,7.group',
   'groups/36,9.group',
   'groups/38,1.group',
   'groups/39,1.group',
   'groups/40,10.group',
   'groups/40,11.group',
   'groups/40,12.group',
   'groups/40,13.group',
   'groups/40,1.group',
   'groups/40,3.group',
   'groups/40,4.group',
   'groups/40,5.group',
   'groups/40,6.group',
   'groups/40,7.group',
   'groups/40,8.group',

   // Notable large groups, often used as stress tests
   'groups/168.group',
   'groups/Tesseract.group',
]

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
      try {
         await Promise.all(codeFiles.map((url) => window.fetch(`${baseURL}${url}`, { cache: 'reload' })))
      } catch (err) {
         alert(`GE3 upgrade failed to reload code files — check your network connection and reload the page.\n\n${err}`)
         return
      }

      try {
         const Library = await import('./Library.js') // dynamic import so it doesn't happen before loading this page
         await Library.updateAllGroups(groupFiles.map((url) => baseURL + url))
      } catch (err) {
         alert(`GE3 upgrade failed to update group library — check your network connection and reload the page.\n\n${err}`)
         return
      }

      localStorage.setItem('GE-version', `${webpageVersion || ''}`)  // update version in local storage
   } else {
      // be sure the group library is loaded from local storage before starting anything else
      const Library = await import('./Library.js')
      await Library.loadLibrary()
   }
}

