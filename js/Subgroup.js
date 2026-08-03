/*
# Subgroup

Subgroup structure -- containing group, and generator, member, bitsets

```js
 */
import { BitSet } from './BitSet.js';
import * as DefiningRelations from './DefiningRelations.js';
import { Group } from './Group.js';
import * as IsomorphicGroups from './IsomorphicGroups.js';
import * as Library from './Library.js';
import * as MathUtils from './MathUtils.js';
export class Subgroup {
    group;
    generators;
    members;
    constructor(group, generators = [], members = []) {
        this.group = group;
        this.generators = new BitSet(group.order, generators);
        this.members = new BitSet(group.order, members);
    }
    // clone/copy all fields
    clone() {
        const clone = new Subgroup(this.group, this.generators.toArray(), this.members.toArray());
        return clone;
    }
    setAllMembers() {
        this.members.setAll();
        return this;
    }
    toString() {
        return `generators: ${this.generators.toString()}; ` +
            `members: ${this.members.toString()}`;
    }
    get order() {
        this.#setProperty('order', this.members.popcount());
        return this.order;
    }
    get index() {
        this.#setProperty('index', this.group.order / this.order);
        return this.index;
    }
    get isCyclic() {
        this.#setProperty('isCyclic', this.generators.popcount() == 1);
        return this.isCyclic;
    }
    get isNormal() {
        this.#setProperty('isNormal', this.#subgroupIsNormal());
        return this.isNormal;
    }
    get isomorphicGroup() {
        this.#setIsomorphicGroupAndEmbedding();
        return this.isomorphicGroup;
    }
    get isomorphicGroupEmbedding() {
        this.#setIsomorphicGroupAndEmbedding();
        return this.isomorphicGroupEmbedding;
    }
    get isomorphicQuotientGroup() {
        this.#setQuotientGroupAndMap();
        return this.isomorphicQuotientGroup;
    }
    get isomorphicQuotientMap() {
        this.#setQuotientGroupAndMap();
        return this.isomorphicQuotientMap;
    }
    get leftCosets() {
        this.#setProperty('leftCosets', this.#getCosets('left'));
        return this.leftCosets;
    }
    get rightCosets() {
        this.#setProperty('rightCosets', this.#getCosets('right'));
        return this.rightCosets;
    }
    get subgroupIndex() {
        this.#setProperty('subgroupIndex', this.group.subgroups.findIndex((H) => H.members.equals(this.members)));
        return this.subgroupIndex;
    }
    ////////////////////////// Private helper functions
    #getCosets(side) {
        const mult = (side == 'left')
            ? (a, b) => this.group.multtable[a][b]
            : (a, b) => this.group.multtable[b][a];
        const cosets = [this.members.clone()];
        const todo = new BitSet(this.group.order).setAll().subtract(this.members);
        const subgroupArray = this.members.toArray();
        for (;;) {
            const g = todo.pop();
            if (g == undefined)
                break;
            const newCoset = new BitSet(this.group.order);
            subgroupArray.forEach(el => newCoset.set(mult(g, el)));
            cosets.push(newCoset);
            todo.subtract(newCoset);
        }
        return cosets;
    }
    #getLibraryGroup(G) {
        let libraryGroup = IsomorphicGroups.find(G);
        if (libraryGroup == null) {
            const presentation = DefiningRelations.makePresentation(G);
            const presentationURL = DefiningRelations.GENERATED_GROUP_PREFIX + '?' + presentation;
            libraryGroup = Library.getGroupByURL(presentationURL);
        }
        return libraryGroup;
    }
    // call N = this a normal subgroup and G = this.group,
    // getQuotientGroup() // returns a pair [Q,q]
    // such that Q is in the groups library and q is an onto map from G to Q
    // with kernel K.  q is stored as an array such that q[i] means q(i),
    // for all i in G.
    #getQuotientGroup() {
        const cosets = this.leftCosets;
        const quotientOrder = cosets.length;
        const cosetReps = cosets.map((coset) => coset.first());
        const elementToCoset = [];
        cosets.forEach((coset, inx) => coset.toArray().forEach((elt) => elementToCoset[elt] = inx));
        const multtable = Array.from({ length: quotientOrder }, (_, inx) => {
            return Array.from({ length: quotientOrder }, (_, jnx) => {
                return elementToCoset[this.group.multtable[cosetReps[inx]][cosetReps[jnx]]];
            });
        });
        const quotientGroup = Group.fromMulttable(multtable);
        const libraryGroup = this.#getLibraryGroup(quotientGroup);
        const isomorphism = IsomorphicGroups.isomorphism(quotientGroup, libraryGroup);
        if (isomorphism == null) {
            throw new Error('Subgroup.getQuotientGroup error:\n' +
                `error finding quotient map in ${this.group.shortName} (${this.group.gapid || ''})`);
        }
        return [libraryGroup, this.group.elements.map((elt) => isomorphism[elementToCoset[elt]])];
    }
    // call H = this and G = this.group, getSubgroupAsGroup()  returns a pair [H',f]
    // such that H' is in the groups library and f is an embedding of H'
    // into G and onto H.  f is stored as an array such that f[i] means f(i),
    // for all i in H'.
    #getSubgroupAsGroup() {
        const subgroupToParent = this.members.toArray();
        const parentToSubgroup = subgroupToParent.reduce((acc, el, inx) => { acc[el] = inx; return acc; }, new Array(this.group.order));
        const multtable = Array.from({ length: this.order }, (_, inx) => {
            return Array.from({ length: this.order }, (_, jnx) => {
                return parentToSubgroup[this.group.multtable[subgroupToParent[inx]][subgroupToParent[jnx]]];
            });
        });
        const subgroupAsGroup = Group.fromMulttable(multtable);
        const libraryGroup = this.#getLibraryGroup(subgroupAsGroup);
        const isomorphism = IsomorphicGroups.isomorphism(libraryGroup, subgroupAsGroup);
        if (isomorphism == null) {
            throw new Error('Subgroup.getSubgroupAsGroup error:\n' +
                `error finding subgroup embedding in ${this.group.shortName} (${this.group.gapid || ''})`);
        }
        return [libraryGroup, isomorphism.map((elt) => subgroupToParent[elt])];
    }
    #setProperty(propertyName, value) {
        Object.defineProperty(this, propertyName, {
            value: value,
            enumerable: false
        });
    }
    #setIsomorphicGroupAndEmbedding() {
        const [isomorphicGroup, isomorphicGroupEmbedding] = this.#getSubgroupAsGroup();
        this.#setProperty('isomorphicGroup', isomorphicGroup);
        this.#setProperty('isomorphicGroupEmbedding', isomorphicGroupEmbedding);
    }
    #setQuotientGroupAndMap() {
        const [isomorphicQuotientGroup, isomorphicQuotientMap] = this.isNormal
            ? this.#getQuotientGroup()
            : [null, null];
        this.#setProperty('isomorphicQuotientGroup', isomorphicQuotientGroup);
        this.#setProperty('isomorphicQuotientMap', isomorphicQuotientMap);
    }
    #subgroupIsNormal() {
        const isNormal = (this.group.isAbelian)
            ? true
            : this.group.generators.every((g) => this.generators.toArray().every((h) => this.members.isSet(this.group.conjugate(h, g))));
        return isNormal;
    }
    ////////////////////////// Public methods
    getPSubgroupInfo() {
        const subgroupElements = this.members.toArray();
        const subgroupElementOrders = subgroupElements.map(el => this.group.elementOrders[el]);
        const prime = MathUtils.getFactors(subgroupElementOrders[1])[0];
        let result;
        if (subgroupElementOrders.every(el => el == 1 || el % prime == 0)) {
            result = { p: prime };
            if (this.group.order / subgroupElements.length % prime != 0) {
                result.isSylow = true;
            }
        }
        return result;
    }
}
//# sourceMappingURL=Subgroup.js.map