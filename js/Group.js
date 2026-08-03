/*
# Group

Class holds group definition

```js
 */
import { BitSet } from './BitSet.js';
import * as DefiningRelations from './DefiningRelations.js';
import * as GEUtils from './GEUtils.js';
import * as Library from './Library.js';
import * as MathUtils from './MathUtils.js';
import * as ShowGAPCode from './ShowGAPCode.js';
import { SubgroupLattice } from './SubgroupLattice.js';
export class Group {
    // Calculated group properties
    multtable;
    /*
     * How representations work:
     *   representationIndex >= 0 => representation = representations[index]
     *   representationIndex < 0 => representation = userRepresentation[-(representationIndex + 1)]
     *
     * (representationIndex is an integer, not an object reference, so Group can be easily serialized)
     */
    representations = [];
    // Properties from .group file
    names = ['Unnamed Group'];
    gapname;
    shortName = 'Unnamed Group';
    links = null;
    declaredGenerators = null;
    definition = null;
    phrase = '';
    notes = '';
    author = '';
    cayleyDiagrams = [];
    symmetryObjects = [];
    custom = {};
    // Group properties set elsewhere
    library;
    lastModifiedOnServer;
    thumbnails;
    URL = '';
    _gapid_lock;
    constructor(multtable) {
        this.multtable = multtable;
    }
    static fromMulttable(multtable) {
        const G = new Group(multtable);
        G.names = [`An unknown group of order ${G.order}`];
        G.representations = [Array.from({ length: G.order }, (_, inx) => '' + inx)];
        return G;
    }
    // reads .group file from distribution
    static fromGroupFileJSON(json) {
        const G = Object.assign(new Group(json.multtable), json);
        return G;
    }
    // reads group from IndexedDB GeneralStore.GroupLibrary
    static fromLocalCopyJSON(json) {
        return Group.fromGroupFileJSON(json);
    }
    /////////////////////// Assigned values
    get name() {
        return this.customName ?? this.names[0];
    }
    get customName() {
        return this.custom.name;
    }
    set customName(customName) {
        if (customName != null && customName.length != 0) {
            this.custom.name = customName;
        }
        else {
            delete this.custom.name;
        }
    }
    get gapid() {
        if (this._gapid_lock === undefined) {
            const groupURL = this.URL;
            Object.defineProperty(this, '_gapid_lock', {
                value: true,
                enumerable: false,
                configurable: true // so it can be removed later
            });
            window.setTimeout(async () => {
                const presentation = new URL(groupURL).search.slice(1);
                try {
                    const { gapid, gapname } = await ShowGAPCode.resolveGAPInfo(presentation);
                    const group = Library.getGroupByURL(groupURL); // make sure the group hasn't been deleted
                    if (group != null && (group.gapid != gapid || group.gapname != gapname)) {
                        group.gapid = gapid;
                        group.gapname = gapname;
                        Library.saveGroup(group);
                    }
                }
                catch (_error) { }
                delete this._gapid_lock;
            }, 0);
        }
        return `${this.order},??`;
    }
    set gapid(gapid) {
        if (gapid != null && !gapid.endsWith('??')) {
            Object.defineProperty(this, 'gapid', {
                value: gapid,
                enumerable: true, // serialize gapid if it is set
                writable: true
            });
        }
    }
    get other_names() {
        return (this.customName == null) ? this.names.slice(1) : this.names;
    }
    get representation() {
        const inx = this.representationIndex;
        return (inx < 0) ? this.userRepresentations[-(inx + 1)] : this.representations[inx];
    }
    set representation(representation) {
        const inx = this.representations.findIndex((el) => el == representation);
        if (inx >= 0) {
            this.representationIndex = inx;
        }
        else {
            const jnx = this.userRepresentations.findIndex((el) => el == representation);
            if (jnx >= 0) {
                this.representationIndex = -(jnx + 1);
            }
            else {
                this.representationIndex = 0;
            }
        }
    }
    get representationIndex() {
        return this.custom.representationIndex ?? 0;
    }
    set representationIndex(representationIndex) {
        this.custom.representationIndex = representationIndex;
    }
    get representationIsUserDefined() {
        return this.representationIndex < 0;
    }
    get userRepresentations() {
        if (this.custom.representations == null) {
            this.custom.representations = [];
        }
        return this.custom.representations;
    }
    set userRepresentations(userRepresentations) {
        this.custom.representations = userRepresentations;
    }
    deleteUserRepresentation(userIndex) {
        this.userRepresentations.splice(userIndex, 1);
        if (-(userIndex + 1) > this.representationIndex) {
            this.representationIndex += 1;
        }
        else if (-(userIndex + 1) === this.representationIndex) {
            this.representationIndex = 0;
        }
    }
    // length of longest label, rendered as HTML at font-size = 20px
    get longestHTMLLabel() {
        const dummy = document.createElement('div');
        dummy.innerHTML = this.representation.reduce((html, label) => html + label + '<br>', ''),
            Object.assign(dummy.style, { left: '0', top: `${this.order + 10}em`, position: 'absolute', fontSize: '40px' });
        document.body.append(dummy);
        const longestHTMLLabel = dummy.offsetWidth / 40;
        dummy.remove();
        this.#setProperty('longestHTMLLabel', longestHTMLLabel);
        return this.longestHTMLLabel;
    }
    get userNotes() {
        return this.custom.notes ?? '';
    }
    set userNotes(userNotes) {
        this.custom.notes = userNotes;
    }
    ////////////////////////// Calculated values
    get center() {
        this.#setProperty('center', this.#getCenter());
        return this.center;
    }
    get commutatorSubgroup() {
        // subgroup generated by the commutators i^-1 * j^-1 * i * j for all element pairs
        // also: the smallest normal subgroup which has an abelian quotient
        this.#setProperty('commutatorSubgroup', this.subgroups.find((H) => H.isNormal && H.isomorphicQuotientGroup?.isAbelian));
        return this.commutatorSubgroup;
    }
    get conjugacyClasses() {
        this.#setProperty('conjugacyClasses', this.#getConjugacyClasses(this.elements));
        return this.conjugacyClasses;
    }
    get conjugateSubgroupClasses() {
        this.#setProperty('conjugateSubgroupClasses', this.#getConjugateSubgroupClasses());
        return this.conjugateSubgroupClasses;
    }
    get elementPowers() {
        this.#setElementPowersAndPrimePowers();
        return this.elementPowers;
    }
    get elementPrimePowers() {
        this.#setElementPowersAndPrimePowers();
        return this.elementPrimePowers;
    }
    get elementOrders() {
        this.#setProperty('elementOrders', this.elementPowers.map(el => el.popcount()));
        return this.elementOrders;
    }
    get elements() {
        return [...this.multtable[0]];
    }
    get generators() {
        const generators = this.declaredGenerators?.[0] || this.subgroups[this.subgroups.length - 1].generators.toArray();
        return generators;
    }
    get inverses() {
        this.#setProperty('inverses', this.elements.map((el) => this.multtable[el].indexOf(0)));
        return this.inverses;
    }
    get isAbelian() {
        this.#setProperty('isAbelian', this.nonAbelianExample == null);
        return this.isAbelian;
    }
    get isCyclic() {
        this.#setProperty('isCyclic', this.elementOrders.some((el) => el == this.order));
        return this.isCyclic;
    }
    get isSimple() {
        this.#setProperty('isSimple', this.order > 1
            && !this.subgroups.some((H) => H.isNormal && H.order != 1 && H.order != this.order));
        return this.isSimple;
    }
    get isSolvable() {
        this.#setSubgroupsAndSolvable();
        return this.isSolvable;
    }
    get nonAbelianExample() {
        let nonAbelianExample = null;
        loop: for (const i of this.generators)
            for (const j of this.generators)
                if (this.multtable[i][j] != this.multtable[j][i]) {
                    nonAbelianExample = [i, j];
                    break loop;
                }
        this.#setProperty('nonAbelianExample', nonAbelianExample);
        return this.nonAbelianExample;
    }
    get nontrivialProperNormalSubgroups() {
        this.#setProperty('nontrivialProperNormalSubgroups', this.nontrivialProperSubgroups.filter((H) => H.isNormal));
        return this.nontrivialProperNormalSubgroups;
    }
    get nontrivialProperSubgroups() {
        this.#setProperty('nontrivialProperSubgroups', this.subgroups.filter((H) => H.order != 1 && H.order != this.order));
        return this.nontrivialProperSubgroups;
    }
    get normalSubgroups() {
        this.#setProperty('normalSubgroups', this.subgroups.filter((H) => H.isNormal));
        return this.normalSubgroups;
    }
    get order() {
        return this.multtable.length;
    }
    get orderClasses() {
        this.#setProperty('orderClasses', this.#getOrderClasses(this.elementOrders));
        return this.orderClasses;
    }
    get orderClassSizes() {
        const orderClassSizes = GEUtils.countBy(this.elementOrders, (el) => el);
        orderClassSizes[0] = 0;
        this.#setProperty('orderClassSizes', orderClassSizes);
        return this.orderClassSizes;
    }
    get relations() {
        this.#setProperty('relations', DefiningRelations.findRelations(this));
        return this.relations;
    }
    get subgroups() {
        this.#setSubgroupsAndSolvable();
        return this.subgroups;
    }
    get subgroupOrders() {
        this.#setProperty('subgroupOrders', GEUtils.countBy(this.subgroups, (H) => H.order));
        return this.subgroupOrders;
    }
    ////////////////////////// Private helper functions
    #setProperty(propertyName, value) {
        Object.defineProperty(this, propertyName, {
            value: value,
            enumerable: false
        });
    }
    #setElementPowersAndPrimePowers() {
        const [elementPowers, elementPrimePowers] = this.#getElementPowers(this);
        this.#setProperty('elementPowers', elementPowers);
        this.#setProperty('elementPrimePowers', elementPrimePowers);
    }
    #setSubgroupsAndSolvable() {
        const [subgroups, isSolvable] = SubgroupLattice.getSubgroups(this);
        this.#setProperty('subgroups', subgroups);
        this.#setProperty('isSolvable', isSolvable);
    }
    #getCenter() {
        const centerElements = new BitSet(this.order);
        const generators = [0, ...this.generators];
        for (let inx = 0; inx < this.order; inx++) {
            let ok = true;
            for (let jnx = 0; jnx < generators.length; jnx++) {
                if (this.mult(generators[jnx], this.elements[inx]) != this.mult(this.elements[inx], generators[jnx])) {
                    ok = false;
                    break;
                }
            }
            if (ok) {
                centerElements.set(inx);
            }
        }
        const center = this.subgroups.find((H) => H.members.contains(centerElements));
        return center;
    }
    // creates conjugacy classes for element array, which may be the elements of a subgroup
    #getConjugacyClasses(elements) {
        const conjugacyClasses = [];
        const todo = new BitSet(this.order, elements);
        while (todo.popcount() > 0) {
            const currentElement = todo.pop();
            const conjugacyClass = this.elements
                .reduce((conjugacyClass, el) => conjugacyClass.set(this.conjugate(currentElement, el)), new BitSet(this.order));
            todo.subtract(conjugacyClass);
            conjugacyClasses.push(conjugacyClass);
        }
        conjugacyClasses.sort((a, b) => a.popcount() - b.popcount());
        return conjugacyClasses;
    }
    #getConjugateSubgroupClasses() {
        const conjugateSubgroupClasses = [];
        this.subgroups.forEach((H, hIndex) => {
            let conjugacyClass = conjugateSubgroupClasses.find((klass) => {
                const K = this.subgroups[klass.first()];
                return H.order == K.order
                    && this.elements.some((g) => H.members.toArray()
                        .reduce((conjugateMembers, h) => conjugateMembers.set(this.conjugate(h, g)), new BitSet(this.order))
                        .equals(K.members));
            });
            if (conjugacyClass == null) {
                conjugacyClass = new BitSet(this.subgroups.length);
                conjugateSubgroupClasses.push(conjugacyClass);
            }
            conjugacyClass.set(hIndex); // sets at least one element of a newly created BitSet
        });
        return conjugateSubgroupClasses;
    }
    // needs fixing to work for general set of elements (not just entire group)?
    #getElementPowers(group) {
        const powers = [], primePowers = [];
        for (let g = 0; g < group.order; g++) {
            const elementPowers = new BitSet(group.order, [0]), elementPrimePowers = new BitSet(group.order);
            for (let i = 1, prevAcc = g, acc = g; prevAcc != 0; i++, prevAcc = acc, acc = group.multtable[g][acc]) {
                elementPowers.set(acc);
                if (MathUtils.isPrime(i))
                    elementPrimePowers.set(acc);
            }
            powers.push(elementPowers);
            primePowers.push(elementPrimePowers);
        }
        return [powers, primePowers];
    }
    #getOrderClasses(elementOrders) {
        const orderClasses = elementOrders.reduce((orderClasses, elementOrder, element) => {
            if (orderClasses[elementOrder] == null) {
                orderClasses[elementOrder] = new BitSet(this.order);
            }
            orderClasses[elementOrder].set(element);
            return orderClasses;
        }, []);
        return orderClasses;
    }
    ////////////////////////// Public functions
    mult(a, b) {
        return this.multtable[a % this.order][b % this.order];
    }
    // g h g⁻¹
    conjugate(h, g) {
        return this.multtable[g][this.multtable[h][this.inverses[g]]];
    }
    // takes bitset or array of generators; return bitset
    // note: depends on knowing this.subgroups, can only be run after SubgroupLattice
    closure(generators) {
        const gens = Array.isArray(generators) ? new BitSet(this.order, generators) : generators;
        const rslt = this.subgroups.find((H) => H.members.contains(gens))?.members;
        return rslt;
    }
    getElementPowerArray(element) {
        const result = [0];
        for (let g = element; g != 0; g = this.mult(element, g)) {
            result.push(g);
        }
        return result;
    }
    getSubgroupByElements(elements) {
        const elts = Array.isArray(elements) ? new BitSet(this.order, elements) : elements;
        const subgroup = this.subgroups.find((H) => H.members.equals(elts));
        return subgroup;
    }
}
/*
```
*/
//# sourceMappingURL=Group.js.map