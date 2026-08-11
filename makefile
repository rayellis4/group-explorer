# Build procedure assumes all files will be served in place.
# This is simple and, with modern browsers, performance is adequate.

# compiles ts/*.ts, sets version
#    make VERSION=3.7.0

SHELL := /bin/bash
.PHONY : checkCodeFiles clean

all : setVersion
	npx tsc
	$(MAKE) checkCodeFiles

# The PAGES below (GroupExplorer.html, GroupInfo.html, etc.) are generated from PAGE_TEMPLATE
# and get overwritten every time this runs. Don't hand-edit a PAGE.html file directly -- edit
# html/PageTemplate.html (or the page-specific sed substitutions below) instead, or your change
# will be silently clobbered by the next `make`.
PAGES = GroupExplorer GroupInfo Multtable CayleyDiagram CycleGraph SymmetryObject Sheet
PAGE_TEMPLATE = html/PageTemplate.html

# Version lives in three places (README.md, index.html, package.json) and this target is what
# keeps them consistent. Don't hand-edit the version in any of the three -- always go through
# `make VERSION=x.y.z`, or they'll drift out of sync with each other.
# `sed -i.bak ... && rm -f *.bak` (rather than a bare `sed -i`) is deliberate: BSD/macOS sed
# requires a backup-suffix argument to -i where GNU sed doesn't, and this spelling is accepted
# by both. Likewise the README.md line is rewritten with a portable `s///` instead of the `c\`
# change command, whose one-line form (no literal newline before the replacement text) is a GNU
# extension that BSD/macOS sed rejects.
setVersion : $(PAGES)
	sed -i.bak 's/^# Group Explorer 3.*/# Group Explorer $(VERSION)/' README.md && rm -f README.md.bak
	sed -i.bak 's/"GE3-GITVersion" content=".*"/"GE3-GITVersion" content="${VERSION}"/g' index.html && rm -f index.html.bak
	sed -i.bak 's/"version": ".*",/"version": "$(VERSION)",/g' package.json && rm -f package.json.bak

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


# Every compiled js/*.js file must be listed in AutoUpgrade.ts's codeFiles array, or a returning
# user's browser can keep serving a stale cached copy of a forgotten module after a version
# upgrade (this has bitten us more than once). Runs automatically at the end of `make`/
# `make VERSION=x.y.z`, after tsc has produced current output; run `make checkCodeFiles` directly
# any time to check without a full build.
checkCodeFiles :
	@if diff -q <(cd js && ls *.js | grep -v '\.map$$' | sed 's,^,js/,' | sort) \
	            <(grep -oE "'js/[A-Za-z0-9_]+\.js'" ts/AutoUpgrade.ts | tr -d "'" | sort) \
	            > /dev/null; then \
		echo "checkCodeFiles: OK -- js/*.js matches AutoUpgrade.ts's codeFiles"; \
	else \
		echo "checkCodeFiles: js/*.js and AutoUpgrade.ts's codeFiles have diverged:"; \
		diff <(cd js && ls *.js | grep -v '\.map$$' | sed 's,^,js/,' | sort) \
		     <(grep -oE "'js/[A-Za-z0-9_]+\.js'" ts/AutoUpgrade.ts | tr -d "'" | sort) \
		     | sed -e 's/^</  missing from codeFiles:/' -e 's/^>/  listed but not in js\/:/'; \
		exit 1; \
	fi

clean :
	rm -f *~ */*~
