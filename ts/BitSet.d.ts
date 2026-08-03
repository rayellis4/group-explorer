export declare class BitSet {
    len: number;
    arr: Uint32Array<ArrayBuffer>;
    constructor(length?: number, init?: never[]);
    toJSON(): {
        len: number;
        arr: number[];
    };
    fromJSON(json: any): this;
    static intersection(a: any, b: any): any;
    intersection(other: any): this;
    static union(a: any, b: any): any;
    union(other: any): this;
    static difference(a: any, b: any): any;
    difference(other: any): this;
    complement(): this;
    clone(): BitSet;
    setFrom(other: any): this;
    clearAll(): this;
    setAll(): this;
    get(pos: any): number;
    set(pos: any): this;
    clear(pos: any): this;
    isEmpty(): boolean;
    isSet(pos: any): boolean;
    pop(): number | undefined;
    first(): number | undefined;
    equals(other: any): boolean;
    popcount(): number;
    contains(otherElements: any): any;
    add(other: any): this;
    subtract(other: any): this;
    toArray(): number[];
    toString(): string;
    toBitString(): string;
}
