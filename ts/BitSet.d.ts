export type BitSetJSON = {
    len: number;
    arr: number[];
};
export declare class BitSet {
    len: number;
    arr: Uint32Array;
    constructor(length?: number, init?: groupElement[]);
    toJSON(): BitSetJSON;
    fromJSON(json: string | BitSetJSON): this;
    static intersection(a: BitSet, b: BitSet): BitSet;
    intersection(other: BitSet): this;
    static union(a: BitSet, b: BitSet): BitSet;
    union(other: BitSet): this;
    static difference(a: BitSet, b: BitSet): BitSet;
    difference(other: BitSet): this;
    complement(): this;
    clone(): BitSet;
    setFrom(other: BitSet): this;
    clearAll(): this;
    setAll(): this;
    get(pos: number): number;
    set(pos: number): this;
    clear(pos: number): this;
    isEmpty(): boolean;
    isSet(pos: number): boolean;
    pop(): Maybe<number>;
    first(): Maybe<number>;
    equals(other: BitSet): boolean;
    popcount(): number;
    contains(otherElements: BitSet | groupElement[]): boolean;
    add(other: BitSet): this;
    subtract(other: BitSet): this;
    toArray(): number[];
    toString(): string;
    toBitString(): string;
}
