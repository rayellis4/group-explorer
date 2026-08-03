import { BitSet } from './BitSet.js';
import { Subgroup } from './Subgroup.js';
export declare class SubgroupLattice {
    #private;
    group: any;
    z_generators: BitSet;
    constructor(group: any);
    static getSubgroups(group: any): (boolean | Subgroup[])[];
    findAllSubgroups(): Subgroup[];
    findNextLayer(currLayer: any): any[];
    findNormalizer(subgroup: any): any;
    normalizes(subgroup: any, g: any): boolean;
    extendSubgroup(subgroup: any, normalizer: any): void;
    minimizeGenerators(subgroup: any, extension: any): void;
}
