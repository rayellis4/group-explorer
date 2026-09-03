import { BitSet } from './BitSet.js';
import { Group } from './Group.js';
import type { BitSetJSON } from './BitSet.js';
export type SubgroupJSON = {
    group: string;
    generators: BitSetJSON;
    members: BitSetJSON;
};
export declare class Subgroup {
    group: Group;
    generators: BitSet;
    members: BitSet;
    constructor(group: Group, generators?: number[], members?: number[]);
    clone(): Subgroup;
    setAllMembers(): Subgroup;
    toString(): string;
    get order(): number;
    get index(): number;
    get isCyclic(): boolean;
    get isNormal(): boolean;
    get isomorphicGroup(): Group;
    get isomorphicGroupEmbedding(): groupElement[];
    get isomorphicQuotientGroup(): Maybe<Group>;
    get isomorphicQuotientMap(): Maybe<groupElement[]>;
    get leftCosets(): BitSet[];
    get rightCosets(): BitSet[];
    get subgroupIndex(): number;
    private getCosets;
    private getLibraryGroup;
    private getQuotientGroup;
    private getSubgroupAsGroup;
    private setProperty;
    private setIsomorphicGroupAndEmbedding;
    private setQuotientGroupAndMap;
    private subgroupIsNormal;
    getPSubgroupInfo(): Maybe<{
        p: number;
        isSylow?: boolean;
    }>;
}
