/*
# SubgroupLattice

Find subgroups of group

```js
*/
import * as MathUtils from './MathUtils.js';
import { BitSet } from './BitSet.js';
import { Subgroup } from './Subgroup.js';
export class SubgroupLattice {
    group;
    z_generators;
    constructor(group) {
        this.group = group;
        this.z_generators = new BitSet(group.order);
        for (let i = 1; i < group.order; i++) {
            if (MathUtils.isPrimePower(group.elementOrders[i])) {
                this.z_generators.set(i);
            }
        }
    }
    static getSubgroups(group) {
        const subgroupFinder = new SubgroupLattice(group);
        const allSubgroups = [];
        let isSolvable = true;
        // special case cyclic groups, trivial group
        if (group.order == 1) {
            allSubgroups.push(new Subgroup(group, [0], [0]));
        }
        else if (MathUtils.isPrime(group.order)) {
            allSubgroups.push(new Subgroup(group, [0], [0]), new Subgroup(group, [1]).setAllMembers());
        }
        else {
            allSubgroups.push(...subgroupFinder.findAllSubgroups());
        }
        allSubgroups.sort((a, b) => a.members.popcount() - b.members.popcount());
        const last_subgroup_found = allSubgroups[allSubgroups.length - 1];
        if (last_subgroup_found.members.popcount() != group.order) {
            isSolvable = false;
            // take generators from the next-smallest subgroup, add an element not in that group, and minimize generators
            const new_subgroup = new Subgroup(group, last_subgroup_found.generators.toArray()).setAllMembers();
            const new_element = BitSet.difference(new_subgroup.members, last_subgroup_found.members).first();
            subgroupFinder.minimizeGenerators(new_subgroup, new_element);
            allSubgroups.push(new_subgroup);
        }
        return [allSubgroups, isSolvable];
    }
    findAllSubgroups() {
        const subgroups = [];
        let currLayer = [new Subgroup(this.group, [0], [0])]; // 0-th layer is trivial group
        for (;;) {
            let nextLayer = this.findNextLayer(currLayer);
            subgroups.push(...currLayer);
            if (nextLayer.length == 0) {
                break;
            }
            currLayer = nextLayer;
        }
        return subgroups;
    }
    /*
       Cyclic extension algorithm from
       "Fundamental Algorithms for Permutation Groups" by Greg Butler (1991)
     */
    findNextLayer(currLayer) {
        const nextLayer = [];
        for (let i = 0; i < currLayer.length; i++) {
            const currSubgroup = currLayer[i];
            const normalizer = this.findNormalizer(currSubgroup);
            const todo = BitSet.intersection(this.z_generators, BitSet.difference(normalizer.members, currSubgroup.members));
            for (let j = 0; j < nextLayer.length; j++) {
                const nextSubgroup = nextLayer[j];
                if (nextSubgroup.members.contains(currSubgroup.members)) {
                    todo.subtract(nextSubgroup.members);
                }
            }
            for (let g = todo.pop(); g != undefined; g = todo.pop()) {
                if (!BitSet.intersection(this.group.elementPrimePowers[g], currSubgroup.members)
                    .isEmpty()) {
                    const nextSubgroup = currSubgroup.clone();
                    this.extendSubgroup(nextSubgroup, g);
                    this.minimizeGenerators(nextSubgroup, g);
                    nextLayer.push(nextSubgroup);
                    todo.subtract(nextSubgroup.members);
                }
            }
        }
        return nextLayer;
    }
    /*
       Input: group G, subgroup U
 
       Output: normalizer H of U in G
 
       H = U
       gamma = G - H
       while gamma is not empty
       choose a g from gamma
       if g normalizes H then
       H = < H, g >
       gamma = gamma - H
       else
       gamma = gamma - (H x g)
       end if
       end while
     */
    findNormalizer(subgroup) {
        let normalizer = subgroup.clone(), todo = new BitSet(this.group.order).setAll().subtract(subgroup.members);
        for (let g = todo.pop(); g != undefined; g = todo.pop()) {
            if (this.normalizes(subgroup, g)) {
                this.extendSubgroup(normalizer, g);
                todo.subtract(normalizer.members);
            }
            else {
                for (let i = 0; i < this.group.order; i++) {
                    if (normalizer.members.isSet(i)) {
                        todo.clear(this.group.multtable[i][g]);
                    }
                }
            }
        }
        return normalizer;
    }
    normalizes(subgroup, g) {
        const mult = (a, b) => this.group.multtable[a][b];
        const g_inverse = this.group.inverses[g];
        for (let i = 0; i < this.group.order; i++) {
            if (subgroup.generators.isSet(i)) {
                if (!subgroup.members.isSet(mult(mult(g, i), g_inverse))) {
                    return false;
                }
            }
        }
        return true;
    }
    extendSubgroup(subgroup, normalizer) {
        const todo = this.group.elementPowers[normalizer];
        for (let i = 0; i < subgroup.members.len; i++) {
            if (subgroup.members.isSet(i)) {
                for (let j = 0; j < todo.len; j++) {
                    if (todo.isSet(j)) {
                        subgroup.members.set(this.group.multtable[i][j]);
                    }
                }
            }
        }
    }
    minimizeGenerators(subgroup, extension) {
        // 1) find an element that will generate what extension and an existing generator do now
        const generators = subgroup.generators.toArray();
        for (let i = 0; i < generators.length; i++) {
            const closure = this.#closure([extension, generators[i]]);
            const order_classes = this.group.orderClasses[closure.popcount()];
            if (order_classes !== undefined) {
                const cyclic_generator = order_classes.toArray().find((element) => this.group.elementPowers[element].equals(closure));
                if (cyclic_generator !== undefined) {
                    subgroup.generators
                        .clear(generators[i])
                        .set(cyclic_generator);
                    return;
                }
            }
        }
        // 2) see if we can't remove one of the existing generators and still get the entire subgroup
        generators.push(extension);
        for (let i = 0; i < generators.length - 1; i++) {
            const gens = generators.slice();
            gens.splice(i, 1);
            const closure = this.#closure(gens);
            if (closure.equals(subgroup.members)) {
                subgroup.generators
                    .clear(generators[i])
                    .set(extension);
                return;
            }
        }
        subgroup.generators.set(extension);
        return;
    }
    // takes bitset or array of generators; return bitset
    // note that it does not rely on already knowing the group subgroups
    #closure(generators) {
        const mult = (a, b) => this.group.multtable[a][b];
        const gens = Array.isArray(generators) ? [...generators] : generators.toArray();
        const rslt = new BitSet(this.group.order).set(0);
        if (gens.length == 0) {
            return rslt;
        }
        const gensUsed = [gens.pop()];
        for (let g = gensUsed[0], s = g; g != 0; g = mult(g, s)) {
            rslt.set(g);
        }
        while (gens.length != 0) {
            gensUsed.push(gens.pop());
            const prevRslt = rslt.toArray(); // H_{i-1}
            const coset_reps = [0];
            for (const g of coset_reps) {
                for (const s of gensUsed) {
                    const g_X_s = mult(g, s);
                    if (!rslt.isSet(g_X_s)) {
                        coset_reps.push(g_X_s);
                        for (const h of prevRslt) { // H_{i-1} X (g X s)
                            rslt.set(mult(h, g_X_s));
                        }
                    }
                }
            }
        }
        return rslt;
    }
}
//# sourceMappingURL=SubgroupLattice.js.map