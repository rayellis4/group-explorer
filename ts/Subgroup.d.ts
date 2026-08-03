import { BitSet } from './BitSet.js';
export declare class Subgroup {
    #private;
    group: any;
    generators: BitSet | undefined;
    members: BitSet | undefined;
    constructor(group: any, generators?: never[], members?: never[]);
    clone(): Subgroup;
    setAllMembers(): this;
    toString(): string;
    get order(): any;
    get index(): any;
    get isCyclic(): any;
    get isNormal(): any;
    get isomorphicGroup(): any;
    get isomorphicGroupEmbedding(): any;
    get isomorphicQuotientGroup(): any;
    get isomorphicQuotientMap(): any;
    get leftCosets(): any;
    get rightCosets(): any;
    get subgroupIndex(): any;
    getPSubgroupInfo(): {
        p: any;
    } | undefined;
}
