export { Mapping };
declare class Mapping {
    constructor(domain: any, codomain: any, definingPairs?: never[]);
    update(): void;
    removeDefiningPair(domainElement: any): void;
    addDefiningPair(domainElement: any, codomainElement: any): void;
    get isInjective(): boolean;
    get isSurjective(): boolean;
    get isHomomorphism(): any;
    clone(): Mapping;
    extend(domainElement: any, codomainElement: any): this;
    validSources(codomainElement: any): any;
    validTargets(domainElement: any): any;
    get fullMapping(): any;
    extendedMap(mapping: any): any;
}
