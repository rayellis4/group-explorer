/*

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

// Extended groups — generated from presentation, no .group files needed
export const EXTENDED_GROUP_PREFIX = 'data:,//GE3/extended'

type ExtendedManifestEntry = {
   presentation: string,
   gapid: string,
   gapname: string,
   names: string[],
   link?: string,
   phrase?: string
}

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
   'js/GroupRegistry.js',
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
   'js/Settings.js',
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

   // Notable large groups, often used as stress tests
   'groups/168.group',
   'groups/Tesseract.group',
]

const EXTENDED_MANIFEST: ExtendedManifestEntry[] = [
   {"presentation": "a,b:a11=b2=baba=1", "gapid": "22,1", "gapname": "D22", "names": ["<i>D</i><sub>11</sub>", "ℤ<sub>8</sub> ⋊ ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/D11.html", "phrase": "Dihedral group on 11 vertices"},
   {"presentation": "a,b:a3=b8=bab-1a=1", "gapid": "24,1", "gapname": "C3 : C8", "names": ["ℤ<sub>3</sub> ⋊ ℤ<sub>8</sub>"], "link": "http://groupnames.org/1/C3sC8.html"},
   {"presentation": "a,b,c:a3=b4=c2=aba-1b-1=aca-1c-1=cbcb=1", "gapid": "24,10", "gapname": "C3 x D8", "names": ["ℤ<sub>3</sub> × <i>D</i><sub>4</sub>", "ℤ<sub>12</sub> ⋊ ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C3xD4.html"},
   {"presentation": "a,b,c:a3=b4=c2b-2=aba-1b-1=aca-1c-1=cbc-1b=1", "gapid": "24,11", "gapname": "C3 x Q8", "names": ["ℤ<sub>3</sub> × <i>Q</i><sub>4</sub>"], "link": "http://groupnames.org/1/C3xQ8.html"},
   {"presentation": "a,b,c,d:a2=b2=c2=d3=aba-1b-1=aca-1c-1=ada-1d-1=dbd-1b-1c-1=bcb-1c-1=dcd-1b-1=1", "gapid": "24,13", "gapname": "C2 x A4", "names": ["ℤ<sub>2</sub> × <i>A</i><sub>4</sub>"], "link": "http://groupnames.org/1/C2xA4.html"},
   {"presentation": "a,b,c,d:a2=b2=c3=d2=aba-1b-1=aca-1c-1=ada-1d-1=bcb-1c-1=bdb-1d-1=dcdc=1", "gapid": "24,14", "gapname": "C2 x C2 x S3", "names": ["ℤ<sub>2</sub> × ℤ<sub>2</sub> × <i>S</i><sub>3</sub>"], "link": "http://groupnames.org/1/C2%5E2xS3.html"},
   {"presentation": "a,b,c:a4=c3=b2a-2=bab-1a=cac-1b-1=cbc-1b-1a-1=1", "gapid": "24,3", "gapname": "SL(2,3)", "names": ["<i>Q</i><sub>4</sub> ⋊ ℤ<sub>3</sub>", "<i>SL</i><sub>2</sub>(𝔽<sub>3</sub>)"], "link": "http://groupnames.org/1/SL(2,3).html"},
   {"presentation": "a,b:a12=b2a-6=bab-1a=1", "gapid": "24,4", "gapname": "C3 : Q8", "names": ["<i>Dic</i><sub>6</sub>", "ℤ<sub>3</sub> ⋊ <i>Q</i><sub>4</sub>"], "link": "http://groupnames.org/1/Dic6.html", "phrase": "Dicyclic group of order 24"},
   {"presentation": "a,b:a12=b2=baba=1", "gapid": "24,6", "gapname": "D24", "names": ["<i>D</i><sub>12</sub>"], "link": "http://groupnames.org/1/D12.html", "phrase": "Dihedral group on 12 vertices"},
   {"presentation": "a,b,c:a2=b6=c2b-3=aba-1b-1=aca-1c-1=cbc-1b=1", "gapid": "24,7", "gapname": "C2 x (C3 : C4)", "names": ["ℤ<sub>2</sub> × <i>Dic</i><sub>3</sub>", "ℤ<sub>2</sub> × (ℤ<sub>3</sub> ⋊ ℤ<sub>4</sub>)"], "link": "http://groupnames.org/1/C2xDic3.html"},
   {"presentation": "a,b,c:a3=b4=c2=bab-1a=caca=cbcb=1", "gapid": "24,8", "gapname": "(C6 x C2)  : C2", "names": ["ℤ<sub>3</sub> ⋊ <i>D</i><sub>4</sub>"], "link": "http://groupnames.org/1/C3sD4.html"},
   {"presentation": "a,b:a13=b2=baba=1", "gapid": "26,1", "gapname": "D26", "names": ["<i>D</i><sub>13</sub>"], "link": "http://groupnames.org/1/D13.html", "phrase": "Dihedral group on 13 vertices"},
   {"presentation": "a,b,c:a3=b3=c3=aba-1b-1=cac-1ba-1=bcb-1c-1=1", "gapid": "27,3", "gapname": "(C3 x C3) : C3", "names": ["(ℤ<sub>3</sub> × ℤ<sub>3</sub>) ⋊ ℤ<sub>3</sub>", "3<sub>+</sub><sup>1+2</sup>"], "link": "http://groupnames.org/1/He3.html", "phrase": "Heisenberg group <i>He</i><sub>3</sub>"},
   {"presentation": "a,b:a9=b3=bab-1a-4=1", "gapid": "27,4", "gapname": "C9 : C3", "names": ["ℤ<sub>9</sub> ⋊ ℤ<sub>3</sub>", "3<sub>-</sub><sup>1+2</sup>"], "link": "http://groupnames.org/1/ES-(3,1).html", "phrase": "Extraspecial group"},
   {"presentation": "a,b:a14=b2a-7=bab-1a=1", "gapid": "28,1", "gapname": "C7 : C4", "names": ["<i>Dic</i><sub>7</sub>", "ℤ<sub>7</sub> ⋊ ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/Dic7.html", "phrase": "Dicyclic group of 28 elements"},
   {"presentation": "a,b:a14=b2=baba=1", "gapid": "28,3", "gapname": "C2 x D7", "names": ["<i>D</i><sub>14</sub>", "ℤ<sub>2</sub> × <i>D</i><sub>7</sub>"], "link": "http://groupnames.org/1/D14.html", "phrase": "Dihedral group on 14 vertices"},
   {"presentation": "a,b,c:a5=b3=c2=aba-1b-1=aca-1c-1=cbcb=1", "gapid": "30,1", "gapname": "C5 x S3", "names": ["ℤ<sub>5</sub> × <i>S</i><sub>3</sub>", "ℤ<sub>15</sub> ⋊ ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C5xS3.html"},
   {"presentation": "a,b,c:a3=b5=c2=aba-1b-1=aca-1c-1=cbcb=1", "gapid": "30,2", "gapname": "C3 x D10", "names": ["ℤ<sub>3</sub> × <i>D</i><sub>5</sub>", "ℤ<sub>15</sub> ⋊ ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C3xD5.html"},
   {"presentation": "a,b:a15=b2=baba=1", "gapid": "30,3", "gapname": "D30", "names": ["<i>D</i><sub>15</sub>"], "link": "http://groupnames.org/1/D15.html", "phrase": "Dihedral group on 15 vertices"},
   {"presentation": "a,b,c:a4=c4=b2a-2=bab-1a=cac-1a=cbc-1b-1a=1", "gapid": "32,10", "gapname": "Q8 : C4", "names": ["<i>Q</i><sub>4</sub> ⋊<sub>1</sub> ℤ<sub>4</sub>", "<i>Q</i><sub>4</sub> ⋊ ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/Q8sC4.html"},
   {"presentation": "a,b,c:a4=b2=c4=baba=aca-1c-1=cbc-1b-1a=1", "gapid": "32,11", "gapname": "(C4 x C4) : C2", "names": ["<i>Q</i><sub>4</sub> ⋊<sub>2</sub> ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/C4wrC2.html", "phrase": "Wreath product of ℤ<sub>4</sub> and ℤ<sub>2</sub>"},
   {"presentation": "a,b:a4=b8=bab-1a=1", "gapid": "32,12", "gapname": "C4 : C8", "names": ["ℤ<sub>4</sub> ⋊ ℤ<sub>8</sub>"], "link": "http://groupnames.org/1/C4sC8.html"},
   {"presentation": "a,b,c:a4=b4a-2=c2b-2a=aba-1b-1=cac-1a=cbc-1b-3=1", "gapid": "32,13", "gapname": "C8 : C4", "names": ["ℤ<sub>8</sub> ⋊<sub>2</sub> ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/C4.Q8.html"},
   {"presentation": "a,b,c:a2=b8=c2a-1=aba-1b-1=aca-1c-1=cbc-1b=1", "gapid": "32,14", "gapname": "C8 : C4", "names": ["ℤ<sub>8</sub> ⋊<sub>1</sub> ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/C2.D8.html"},
   {"presentation": "a,b:a8=b4a-4=bab-1a=1", "gapid": "32,15", "gapname": "C4 . D8 = C4 . (C4 x C2)", "names": ["ℤ<sub>8</sub> . ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/C8.C4.html"},
   {"presentation": "a,b:a16=b2=baba-9=1", "gapid": "32,17", "gapname": "C16 : C2", "names": ["ℤ<sub>16</sub> ⋊ ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/M5(2).html", "phrase": "Modular maximal-cyclic group"},
   {"presentation": "a,b:a16=b2=baba=1", "gapid": "32,18", "gapname": "D32", "names": ["<i>D</i><sub>16</sub>"], "link": "http://groupnames.org/1/D16.html", "phrase": "Dihedral group on 16 vertices"},
   {"presentation": "a,b:a16=b2=baba-7=1", "gapid": "32,19", "gapname": "QD32", "names": ["<i>SD</i><sub>16</sub>"], "link": "http://groupnames.org/1/SD32.html", "phrase": "The quasidihedral (semidihedral) group of 32 elements"},
   {"presentation": "a,b,c:a2=b4=c4=cbc-1a-1b-1=aba-1b-1=aca-1c-1=1", "gapid": "32,2", "gapname": "(C4 x C2) : C4", "names": ["(ℤ<sub>2</sub> × ℤ<sub>4</sub>) ⋊<sub>2</sub> ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/C2.C4%5E2.html"},
   {"presentation": "a,b:a16=b2a-8=bab-1a=1", "gapid": "32,20", "gapname": "Q32", "names": ["<i>Q</i><sub>16</sub>"], "link": "http://groupnames.org/1/Q32.html", "phrase": "Generalized quaternion group of 32 elements"},
   {"presentation": "a,b,c,d:a2=b2=c2=d4=aba-1b-1=aca-1c-1=ada-1d-1=dbd-1b-1c-1=bcb-1c-1=cdc-1d-1=1", "gapid": "32,22", "gapname": "C2 x ((C4 x C2) : C2)", "names": ["((ℤ<sub>2</sub> × ℤ<sub>2</sub>) ⋊ ℤ<sub>4</sub>) × ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C2xC2%5E2sC4.html"},
   {"presentation": "a,b,c:a2=b4=c4=aba-1b-1=aca-1c-1=cbc-1b=1", "gapid": "32,23", "gapname": "C2 x (C4 : C4)", "names": ["(ℤ<sub>4</sub> ⋊ ℤ<sub>4</sub>) × ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C2xC4sC4.html"},
   {"presentation": "a,b,c:a4=b4=c2=aba-1b-1=cacb-2a-1=bcb-1c-1=1", "gapid": "32,24", "gapname": "(C4 x C4) : C2", "names": ["(ℤ<sub>2</sub> × ℤ<sub>4</sub>) ⋊<sub>4</sub> ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/C4%5E2sC2.html"},
   {"presentation": "a,b,c:a4=b4=c2=aba-1b-1=aca-1c-1=cbcb=1", "gapid": "32,25", "gapname": "C4 x D8", "names": ["ℤ<sub>4</sub> × <i>D</i><sub>4</sub>"], "link": "http://groupnames.org/1/C4xD4.html"},
   {"presentation": "a,b,c:a4=b4=c2b-2=aba-1b-1=aca-1c-1=cbc-1b=1", "gapid": "32,26", "gapname": "C4 x Q8", "names": ["ℤ<sub>4</sub> × <i>Q</i><sub>4</sub>"], "link": "http://groupnames.org/1/C4xQ8.html"},
   {"presentation": "a,b,c,d,e:a2=b2=c2=d2=e2=aba-1b-1=eaea-1c-1=aca-1c-1=ada-1d-1=bcb-1c-1=ebeb-1d-1=bdb-1d-1=cdc-1d-1=cec-1e-1=ded-1e-1=1", "gapid": "32,27", "gapname": "(C2 x C2 x C2 x C2) : C2", "names": ["((ℤ<sub>2</sub> × ℤ<sub>2</sub>) ⋊ ℤ<sub>4</sub>) ⋊<sub>2</sub> ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C2%5E2wrC2.html", "phrase": "Wreath product of ℤ<sub>2</sub> and (ℤ<sub>2</sub> × ℤ<sub>2</sub>)"},
   {"presentation": "a,b,c:a4=b4=c2=bab-1a=caca=cbcb=1", "gapid": "32,28", "gapname": "(C4 x C2 x C2) : C2", "names": ["ℤ<sub>4</sub> ⋊<sub>2</sub> <i>D</i><sub>4</sub>"], "link": "http://groupnames.org/1/C4sD4.html"},
   {"presentation": "a,b,c,d:a2=b2=c4=d2c-2=dad-1a-1b-1=aba-1b-1=aca-1c-1=bcb-1c-1=bdb-1d-1=dcd-1c=1", "gapid": "32,29", "gapname": "(C2 x Q8) : C2", "names": ["(ℤ<sub>4</sub> ⋊ ℤ<sub>4</sub>) ⋊<sub>3</sub> ℤ<sub>2</sub>", "(ℤ<sub>2</sub> × <i>Q</i><sub>4</sub>) ⋊ ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/C2%5E2sQ8.html"},
   {"presentation": "a,b,c,d:a2=b2=c4=d2=cac-1a-1b-1=dada-1b-1=aba-1b-1=bcb-1c-1=bdb-1d-1=dcdcb-1=1", "gapid": "32,30", "gapname": "(C4 x C2 x C2) : C2", "names": ["((ℤ<sub>2</sub> × ℤ<sub>2</sub>) ⋊ ℤ<sub>4</sub>) ⋊<sub>4</sub> ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C2%5E2.D4.html"},
   {"presentation": "a,b,c:a4=b4=c2a-2=aba-1b-1=cac-1a=cbc-1ba-2=1", "gapid": "32,31", "gapname": "(C4 x C4) : C2", "names": ["((ℤ<sub>2</sub> × ℤ<sub>2</sub>) ⋊ ℤ<sub>4</sub>) ⋊<sub>5</sub> ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C4.4D4.html"},
   {"presentation": "a,b,c:a4=b4=c2b-2=aba-1b-1=cac-1b-2a-1=cbc-1b-1a-2=1", "gapid": "32,32", "gapname": "(C2 x C2) . (C2 x C2 x C2)", "names": ["(ℤ<sub>4</sub> × ℤ<sub>4</sub>) . ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C4%5E2.C2.html"},
   {"presentation": "a,b,c:a4=b4=c2=aba-1b-1=cacb-2a-1=cbcba-2=1", "gapid": "32,33", "gapname": "(C4 x C4) : C2", "names": ["(ℤ<sub>4</sub> ⋊ ℤ<sub>4</sub>) ⋊<sub>5</sub> ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C4%5E2s2C2.html"},
   {"presentation": "a,b,c:a4=b4=c2=aba-1b-1=caca=cbcb=1", "gapid": "32,34", "gapname": "(C4 x C4) : C2", "names": ["ℤ<sub>4</sub> ⋊<sub>1</sub> <i>D</i><sub>4</sub>"], "link": "http://groupnames.org/1/C4s1D4.html"},
   {"presentation": "a,b,c:a4=b4=c2b-2=aba-1b-1=cac-1a=cbc-1b=1", "gapid": "32,35", "gapname": "C4 : Q8", "names": ["ℤ<sub>4</sub> ⋊ <i>Q</i><sub>4</sub>"], "link": "http://groupnames.org/1/C4sQ8.html"},
   {"presentation": "a,b,c:a2=b8=c2=aba-1b-1=aca-1c-1=cbcb-5=1", "gapid": "32,37", "gapname": "C2 x (C8 : C2)", "names": ["(ℤ<sub>8</sub> ⋊ ℤ<sub>2</sub>) × ℤ<sub>2</sub>", "<i>M</i><sub>4</sub>(2) × ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C2xM4(2).html"},
   {"presentation": "a,b,c:a8=c2=b2a-4=aba-1b-1=aca-1c-1=cbcb-1a-4=1", "gapid": "32,38", "gapname": "(C8 x C2) : C2", "names": ["(ℤ<sub>8</sub> ⋊ ℤ<sub>2</sub>) ⋊<sub>5</sub> ℤ<sub>2</sub>", "<i>M</i><sub>4</sub>(2) ⋊ ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C8oD4.html", "phrase": "Central product of ℤ<sub>8</sub> and <i>D</i><sub>4</sub>"},
   {"presentation": "a,b,c:a2=b8=c2=aba-1b-1=aca-1c-1=cbcb=1", "gapid": "32,39", "gapname": "C2 x D16", "names": ["ℤ<sub>2</sub> × <i>D</i><sub>8</sub>"], "link": "http://groupnames.org/1/C2xD8.html"},
   {"presentation": "a,b:a8=b4=bab-1a-5=1", "gapid": "32,4", "gapname": "C8 : C4", "names": ["ℤ<sub>8</sub> ⋊<sub>3</sub> ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/C8sC4.html"},
   {"presentation": "a,b,c:a2=b8=c2=aba-1b-1=aca-1c-1=cbcb-3=1", "gapid": "32,40", "gapname": "C2 x QD16", "names": ["ℤ<sub>2</sub> × <i>SD</i><sub>8</sub>"], "link": "http://groupnames.org/1/C2xSD16.html"},
   {"presentation": "a,b,c:a2=b8=c2b-4=aba-1b-1=aca-1c-1=cbc-1b=1", "gapid": "32,41", "gapname": "C2 x Q16", "names": ["ℤ<sub>2</sub> × <i>Q</i><sub>8</sub>"], "link": "http://groupnames.org/1/C2xQ16.html"},
   {"presentation": "a,b,c:a4=c2=b4a-2=aba-1b-1=aca-1c-1=cbcb-3a-2=1", "gapid": "32,42", "gapname": "(C8 x C2) : C2", "names": ["<i>D</i><sub>8</sub> ⋊ ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C4oD8.html", "phrase": "Central product of ℤ<sub>4</sub> and <i>D</i><sub>8</sub>"},
   {"presentation": "a,b,c:a8=b2=c2=baba-3=caca-5=bcb-1c-1=1", "gapid": "32,43", "gapname": "C8 : (C2 x C2)", "names": ["ℤ<sub>8</sub> ⋊ (ℤ<sub>2</sub> × ℤ<sub>2</sub>)"], "link": "http://groupnames.org/1/C8sC2%5E2.html"},
   {"presentation": "a,b,c:a8=b2=c2=baba-3=caca-5=cbcb-1a-4=1", "gapid": "32,44", "gapname": "(C2 x Q8) : C2", "names": ["(ℤ<sub>8</sub> ⋊ ℤ<sub>2</sub>) ⋊<sub>2</sub> ℤ<sub>2</sub>", "<i>M</i><sub>4</sub>(2) ⋊ ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C8.C2%5E2.html"},
   {"presentation": "a,b,c,d:a2=b2=c4=d2=aba-1b-1=aca-1c-1=ada-1d-1=bcb-1c-1=bdb-1d-1=dcdc=1", "gapid": "32,46", "gapname": "C2 x C2 x D8", "names": ["(ℤ<sub>2</sub> × ℤ<sub>2</sub>) × <i>D</i><sub>4</sub>"], "link": "http://groupnames.org/1/C2%5E2xD4.html"},
   {"presentation": "a,b,c,d:a2=b2=c4=d2c-2=aba-1b-1=aca-1c-1=ada-1d-1=bcb-1c-1=bdb-1d-1=dcd-1c=1", "gapid": "32,47", "gapname": "C2 x C2 x Q8", "names": ["(ℤ<sub>2</sub> × ℤ<sub>2</sub>) × <i>Q</i><sub>4</sub>"], "link": "http://groupnames.org/1/C2%5E2xQ8.html"},
   {"presentation": "a,b,c,d:a2=b4=d2=c2b-2=aba-1b-1=aca-1c-1=ada-1d-1=bcb-1c-1=bdb-1d-1=dcdc-1b-2=1", "gapid": "32,48", "gapname": "C2 x ((C4 x C2) : C2)", "names": ["(ℤ<sub>2</sub> × ℤ<sub>4</sub>) ⋊ (ℤ<sub>2</sub> × ℤ<sub>2</sub>)"], "link": "http://groupnames.org/1/C2xC4oD4.html"},
   {"presentation": "a,b,c,d:a4=b2=d2=c2a-2=baba=aca-1c-1=ada-1d-1=bcb-1c-1=bdb-1d-1=dcdc-1a-2=1", "gapid": "32,49", "gapname": "(C2 x C2 x C2) : (C2 x C2)", "names": ["<i>D</i><sub>4</sub> ⋊ (ℤ<sub>2</sub> × ℤ<sub>2</sub>)"], "link": "http://groupnames.org/1/ES+(2,2).html", "phrase": "Extraspecial group +(2,2)"},
   {"presentation": "a,b,c:a2=b2=c8=cac-1a-1b-1=aba-1b-1=bcb-1c-1=1", "gapid": "32,5", "gapname": "(C8 x C2) : C2", "names": ["(ℤ<sub>2</sub> × ℤ<sub>2</sub>) ⋊ ℤ<sub>8</sub>"], "link": "http://groupnames.org/1/C2%5E2sC8.html"},
   {"presentation": "a,b,c,d:a4=b2=c2a-2=d2a-2=baba=aca-1c-1=ada-1d-1=bcb-1c-1=bdb-1d-1=dcd-1c-1a-2=1", "gapid": "32,50", "gapname": "(C2 x Q8) : C2", "names": ["(ℤ<sub>2</sub> × ℤ<sub>4</sub>) . (ℤ<sub>2</sub> × ℤ<sub>2</sub>)"], "link": "http://groupnames.org/1/ES-(2,2).html", "phrase": "Extraspecial group -(2,2)"},
   {"presentation": "a,b,c,d:a2=b2=c2=d4=aba-1b-1=aca-1c-1=dad-1c-1b-1a-1=dbd-1b-1c-1=bcb-1c-1=cdc-1d-1=1", "gapid": "32,6", "gapname": "(C2 x C2 x C2) : C4", "names": ["(ℤ<sub>2</sub> × ℤ<sub>4</sub>) ⋊ ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/C2%5E3sC4.html"},
   {"presentation": "a,b,c:a4=b4a-2=c2a-1=bab-1a=aca-1c-1=cbc-1b-3a=1", "gapid": "32,7", "gapname": "(C8 : C2) : C2", "names": ["(ℤ<sub>8</sub> ⋊ ℤ<sub>2</sub>) ⋊ ℤ<sub>2</sub>", "<i>M</i><sub>4</sub>(2) ⋊ ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C4.D4.html"},
   {"presentation": "a,b,c:a4=b4a-2=c2a=bab-1a=aca-1c-1=cbc-1b-3a=1", "gapid": "32,8", "gapname": "C2 . ((C4 x C2) : C2) = (C2 x C2) . (C4 x C2)", "names": ["(ℤ<sub>2</sub> × ℤ<sub>4</sub>) . ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/C4.10D4.html"},
   {"presentation": "a,b,c:a4=b2=c4=baba=cac-1a=cbc-1b-1a-1=1", "gapid": "32,9", "gapname": "(C8 x C2) : C2", "names": ["<i>D</i><sub>4</sub> ⋊ ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/D4sC4.html"},
   {"presentation": "a,b:a17=b2=baba=1", "gapid": "34,1", "gapname": "D34", "names": ["<i>D</i><sub>17</sub>"], "link": "http://groupnames.org/1/D17.html", "phrase": "Dihedral group on 17 vertices"},
   {"presentation": "a,b:a18=b2a-9=bab-1a=1", "gapid": "36,1", "gapname": "C9 : C4", "names": ["<i>Dic</i><sub>9</sub>"], "link": "http://groupnames.org/1/Dic9.html", "phrase": "Dicyclic group of 36 elements"},
   {"presentation": "a,b,c,d:a3=b2=c3=d2=baba=aca-1c-1=ada-1d-1=bcb-1c-1=bdb-1d-1=dcdc=1", "gapid": "36,10", "gapname": "S3 x S3", "names": ["ℤ<sub>3</sub> ⋊ <i>D</i><sub>6</sub>", "<i>S</i><sub>3</sub> × <i>S</i><sub>3</sub>"], "link": "http://groupnames.org/1/S3%5E2.html"},
   {"presentation": "a,b,c,d:a3=b2=c2=d3=aba-1b-1=aca-1c-1=ada-1d-1=dbd-1b-1c-1=bcb-1c-1=dcd-1b-1=1", "gapid": "36,11", "gapname": "C3 x A4", "names": ["ℤ<sub>3</sub> × <i>A</i><sub>4</sub>"], "link": "http://groupnames.org/1/C3xA4.html"},
   {"presentation": "a,b,c:a6=b3=c2=aba-1b-1=aca-1c-1=cbcb=1", "gapid": "36,12", "gapname": "C6 x S3", "names": ["ℤ<sub>6</sub> × <i>S</i><sub>3</sub>"], "link": "http://groupnames.org/1/S3xC6.html"},
   {"presentation": "a,b,c,d:a2=b3=c3=d2=aba-1b-1=aca-1c-1=ada-1d-1=bcb-1c-1=dbdb=dcdc=1", "gapid": "36,13", "gapname": "C2 x ((C3 x C3) : C2)", "names": ["(ℤ<sub>3</sub> ⋊ <i>S</i><sub>3</sub>) × ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C2xC3sS3.html"},
   {"presentation": "a,b,c,d:a3=b2=c2=d3a-1=aba-1b-1=aca-1c-1=ada-1d-1=dbd-1b-1c-1=bcb-1c-1=dcd-1b-1=1", "gapid": "36,3", "gapname": "(C2 x C2) : C9", "names": ["(ℤ<sub>2</sub> × ℤ<sub>2</sub>) ⋊ ℤ<sub>9</sub>", "ℤ<sub>3</sub> . <i>A</i><sub>4</sub>"], "link": "http://groupnames.org/1/C3.A4.html"},
   {"presentation": "a,b:a18=b2=baba=1", "gapid": "36,4", "gapname": "D36", "names": ["<i>D</i><sub>18</sub>"], "link": "http://groupnames.org/1/D18.html", "phrase": "Dihedral group on 18 vertices"},
   {"presentation": "a,b,c:a3=b6=c2b-3=aba-1b-1=aca-1c-1=cbc-1b=1", "gapid": "36,6", "gapname": "C3 x (C3 : C4)", "names": ["ℤ<sub>3</sub> × <i>Dic</i><sub>3</sub>"], "link": "http://groupnames.org/1/C3xDic3.html"},
   {"presentation": "a,b,c:a3=b6=c2b-3=aba-1b-1=cac-1a=cbc-1b=1", "gapid": "36,7", "gapname": "(C3 x C3) : C4", "names": ["ℤ<sub>3</sub> ⋊ <i>Dic</i><sub>3</sub>"], "link": "http://groupnames.org/1/C3sDic3.html"},
   {"presentation": "a,b,c:a3=b3=c4=cbc-1a-1b-1=aba-1b-1=cac-1b-1a=1", "gapid": "36,9", "gapname": "(C3 x C3) : C4", "names": ["(ℤ<sub>3</sub> × ℤ<sub>3</sub>) ⋊ ℤ<sub>4</sub>"], "link": "http://groupnames.org/1/C3%5E2sC4.html"},
   {"presentation": "a,b:a19=b2=baba=1", "gapid": "38,1", "gapname": "D38", "names": ["<i>D</i><sub>19</sub>"], "link": "http://groupnames.org/1/D19.html", "phrase": "Dihedral group on 19 vertices"},
   {"presentation": "a,b:a13=b3=bab-1a-9=1", "gapid": "39,1", "gapname": "C13 : C3", "names": ["ℤ<sub>13</sub> ⋊ ℤ<sub>3</sub>"], "link": "http://groupnames.org/1/C13sC3.html"},
   {"presentation": "a,b:a5=b8=bab-1a=1", "gapid": "40,1", "gapname": "C5 : C8", "names": ["ℤ<sub>5</sub> ⋊<sub>2</sub> ℤ<sub>8</sub>"], "link": "http://groupnames.org/1/C5s2C8.html"},
   {"presentation": "a,b,c:a5=b4=c2=aba-1b-1=aca-1c-1=cbcb=1", "gapid": "40,10", "gapname": "C5 x D8", "names": ["ℤ<sub>20</sub> ⋊<sub>3</sub> ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C5xD4.html"},
   {"presentation": "a,b,c:a5=b4=c2b-2=aba-1b-1=aca-1c-1=cbc-1b=1", "gapid": "40,11", "gapname": "C5 x Q8", "names": ["ℤ<sub>5</sub> × <i>Q</i><sub>4</sub>"], "link": "http://groupnames.org/1/C5xQ8.html"},
   {"presentation": "a,b,c:a2=b5=c4=aba-1b-1=aca-1c-1=cbc-1b-3=1", "gapid": "40,12", "gapname": "C2 x (C5 : C4)", "names": ["(ℤ<sub>5</sub> ⋊ ℤ<sub>4</sub>) × ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C2xF5.html"},
   {"presentation": "a,b,c,d:a2=b2=c5=d2=aba-1b-1=aca-1c-1=ada-1d-1=bcb-1c-1=bdb-1d-1=dcdc=1", "gapid": "40,13", "gapname": "C2 x C2 x D10", "names": ["(ℤ<sub>2</sub> × ℤ<sub>2</sub>) × <i>D</i><sub>5</sub>"], "link": "http://groupnames.org/1/C2%5E2xD5.html"},
   {"presentation": "a,b:a5=b8=bab-1a-3=1", "gapid": "40,3", "gapname": "C5 : C8", "names": ["ℤ<sub>5</sub> ⋊ ℤ<sub>8</sub>"], "link": "http://groupnames.org/1/C5sC8.html"},
   {"presentation": "a,b:a20=b2a-10=bab-1a=1", "gapid": "40,4", "gapname": "C5 : Q8", "names": ["<i>Dic</i><sub>10</sub>", "ℤ<sub>5</sub> ⋊ <i>Q</i><sub>8</sub>"], "link": "http://groupnames.org/1/Dic10.html", "phrase": "Dicyclic group of 40 elements"},
   {"presentation": "a,b,c:a4=b5=c2=aba-1b-1=aca-1c-1=cbcb=1", "gapid": "40,5", "gapname": "C4 x D10", "names": ["ℤ<sub>20</sub> ⋊<sub>2</sub> ℤ<sub>2</sub>"], "link": "http://groupnames.org/1/C4xD5.html"},
   {"presentation": "a,b:a20=b2=baba=1", "gapid": "40,6", "gapname": "D40", "names": ["<i>D</i><sub>20</sub>"], "link": "http://groupnames.org/1/D20.html", "phrase": "Dihedral group on 20 vertices"},
   {"presentation": "a,b,c:a2=b10=c2b-5=aba-1b-1=aca-1c-1=cbc-1b=1", "gapid": "40,7", "gapname": "C2 x (C5 : C4)", "names": ["ℤ<sub>2</sub> × <i>Dic</i><sub>5</sub>"], "link": "http://groupnames.org/1/C2xDic5.html"},
   {"presentation": "a,b,c:a5=b4=c2=bab-1a=caca=cbcb=1", "gapid": "40,8", "gapname": "(C10 x C2) : C2", "names": ["ℤ<sub>5</sub> ⋊<sub>2</sub> <i>D</i><sub>4</sub>"], "link": "http://groupnames.org/1/C5sD4.html"}
]

function manifestEntryToURL (entry: ExtendedManifestEntry): string {
   return `${EXTENDED_GROUP_PREFIX}?${entry.presentation}`
}

function loadExtendedGroups (Library: any) {
   for (const entry of EXTENDED_MANIFEST) {
      const group = Library.getGroupByURL(manifestEntryToURL(entry))
      if (group != null) {
         group.gapid   = entry.gapid
         group.gapname = entry.gapname
         group.names   = entry.names
         if (entry.link != null)   group.link   = entry.link
         if (entry.phrase != null) group.phrase  = entry.phrase
         Library.saveGroup(group)
      }
   }
}
/*
```
### version

Get GE3 version number from <meta> tag in top-level web page
```javascript
 */
export function version () /*: ?string */ {
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
         loadExtendedGroups(Library)
      } catch (err) {
         alert(`GE3 upgrade failed to update group library — check your network connection and reload the page.\n\n${err}`)
         return
      }

      localStorage.setItem('GE-version', `${webpageVersion || ''}`)  // update version in local storage
   } else {
      // be sure the group library is loaded from local storage before starting anything else
      const Library = await import('./Library.js')
      const Settings = await import('./Settings.js')
      await Library.loadLibrary()
      await Settings.loadSettings()
   }
}
