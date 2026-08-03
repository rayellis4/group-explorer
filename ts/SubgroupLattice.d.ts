import { BitSet } from './BitSet.js';
import { Subgroup } from './Subgroup.js';
import type { Group } from './Group.js';
export declare class SubgroupLattice {
    #private;
    group: Group;
    z_generators: BitSet;
    constructor(group: Group);
    static getSubgroups(group: Group): [Subgroup[], boolean];
    findAllSubgroups(): Subgroup[];
    findNextLayer(currLayer: Subgroup[]): Subgroup[];
    findNormalizer(subgroup: Subgroup): Subgroup;
    normalizes(subgroup: Subgroup, g: groupElement): boolean;
    extendSubgroup(subgroup: Subgroup, normalizer: number): void;
    minimizeGenerators(subgroup: Subgroup, extension: number): void;
}
