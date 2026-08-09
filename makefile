# Build procedure assumes all files will be served in place.
# This is simple and, with modern browsers, performance is adequate.

# compiles ts/*.ts, sets version
#    make VERSION=3.7.0

all : setVersion
	npx tsc

# The PAGES below (GroupExplorer.html, GroupInfo.html, etc.) are generated from PAGE_TEMPLATE
# and get overwritten every time this runs. Don't hand-edit a PAGE.html file directly -- edit
# html/PageTemplate.html (or the page-specific sed substitutions below) instead, or your change
# will be silently clobbered by the next `make`.
PAGES = GroupExplorer GroupInfo Multtable CayleyDiagram CycleGraph SymmetryObject Sheet
PAGE_TEMPLATE = html/PageTemplate.html

# Version lives in three places (README.md, index.html, package.json) and this target is what
# keeps them consistent. Don't hand-edit the version in any of the three -- always go through
# `make VERSION=x.y.z`, or they'll drift out of sync with each other.
setVersion : $(PAGES)
	sed -i --follow-symlinks '/^# Group Explorer 3.*/ c\# Group Explorer $(VERSION)' README.md
	sed -i 's/"GE3-GITVersion" content=".*"/"GE3-GITVersion" content="${VERSION}"/g' index.html
	sed -i 's/"version": ".*",/"version": "$(VERSION)",/g' package.json

GroupExplorer :
	sed -e 's/\*\*TITLE\*\*/Group Explorer Library/g' -e 's/\*\*PAGE\*\*/GroupExplorer/g' -e 's/\*\*VERSION\*\*/$(VERSION)/g' $(PAGE_TEMPLATE) > GroupExplorer.html

GroupInfo :
	sed -e 's/\*\*TITLE\*\*/Group Info/g' -e 's/\*\*PAGE\*\*/GroupInfo/g' -e 's/\*\*VERSION\*\*/$(VERSION)/g' $(PAGE_TEMPLATE) > GroupInfo.html

CayleyDiagram :
	sed -e 's/\*\*TITLE\*\*/Cayley Diagram Visualizer/g' -e 's/\*\*PAGE\*\*/CayleyDiagram/g' -e 's/\*\*VERSION\*\*/$(VERSION)/g' $(PAGE_TEMPLATE) > CayleyDiagram.html

Multtable :
	sed -e 's/\*\*TITLE\*\*/Multtable Visualizer/g' -e 's/\*\*PAGE\*\*/Multtable/g' -e 's/\*\*VERSION\*\*/$(VERSION)/g' $(PAGE_TEMPLATE) > Multtable.html

CycleGraph :
	sed -e 's/\*\*TITLE\*\*/Cycle Graph Visualizer/g' -e 's/\*\*PAGE\*\*/CycleGraph/g' -e 's/\*\*VERSION\*\*/$(VERSION)/g' $(PAGE_TEMPLATE) > CycleGraph.html

SymmetryObject :
	sed -e 's/\*\*TITLE\*\*/Symmetry Object Visualizer/g' -e 's/\*\*PAGE\*\*/SymmetryObject/g' -e 's/\*\*VERSION\*\*/$(VERSION)/g' $(PAGE_TEMPLATE) > SymmetryObject.html

Sheet :
	sed -e 's/\*\*TITLE\*\*/Sheet/g' -e 's/\*\*PAGE\*\*/Sheet/g' -e 's/\*\*VERSION\*\*/$(VERSION)/g' $(PAGE_TEMPLATE) > Sheet.html


clean :
	rm -f *~ */*~
