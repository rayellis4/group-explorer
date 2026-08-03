import type { Group } from './Group.ts';
export type definingPairType = [groupElement, groupElement];
export declare class Mapping {
    domain: Group;
    codomain: Group;
    definingPairs: [groupElement, groupElement][];
    image: Maybe<groupElement>[];
    fullMapping_: Maybe<Maybe<groupElement>[]>;
    constructor(domain: Group, codomain: Group, definingPairs?: Array<[groupElement, groupElement]>);
    update(): void;
    removeDefiningPair(domainElement: groupElement): void;
    addDefiningPair(domainElement: groupElement, codomainElement: groupElement): void;
    get isInjective(): boolean;
    get isSurjective(): boolean;
    get isHomomorphism(): boolean;
    clone(): Mapping;
    extend(domainElement: groupElement, codomainElement: groupElement): Mapping;
    validSources(codomainElement: groupElement): groupElement[];
    validTargets(domainElement: groupElement): groupElement[];
    get fullMapping(): groupElement[];
    extendedMap(mapping: Mapping): Maybe<Mapping>;
}
