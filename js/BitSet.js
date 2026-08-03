/*
# BitSet

BitSet is a JavaScript representation of a small, fixed-size set, implemented using a typed array of unsigned 32-bit integers.

Individual elements can be set and examined, and they can be manipulated using common set-theoretic functions like union and intersection.

Class static methods generally return a copy of the result and do not modify their arguments;
while instance methods generally return a modified object (often used in chained expressions).

BitSets are used throughout GE3, and some implementation decisions were made with performance in mind:
* for loops are used in favor of other iteration constructs
* the bit array is stored in a Uint32Array
    * notably faster than previous Array&lt;number&gt; implementations
    * avoids sign extension issues in bit-wise operations
    * default JSON is different from previous Array implementation, requiring `parseJSON` and `toJSON` shims
```js
 */
export class BitSet {
    len;
    arr;
    constructor(length = 0, init = []) {
        this.len = length;
        this.arr = new Uint32Array(length === 0 ? 0 : (((length - 1) >>> 5) + 1));
        this.arr.fill(0);
        for (let i = 0; i < init.length; i++) {
            this.set(init[i]);
        }
    }
    toJSON() {
        return { len: this.len, arr: Array.from(this.arr) };
    }
    fromJSON(json) {
        const jsonObject = (typeof json == 'string') ? JSON.parse(json) : json;
        this.len = jsonObject.len;
        this.arr = Uint32Array.from(jsonObject.arr);
        return this;
    }
    static intersection(a, b) {
        return (a.clone()).intersection(b);
    }
    intersection(other) {
        for (let i = 0; i < this.arr.length; i++) {
            this.arr[i] &= other.arr[i];
        }
        return this;
    }
    static union(a, b) {
        return (a.clone()).union(b);
    }
    union(other) {
        for (let i = 0; i < this.arr.length; i++) {
            this.arr[i] |= other.arr[i];
        }
        return this;
    }
    static difference(a, b) {
        return (a.clone()).difference(b);
    }
    difference(other) {
        for (let i = 0; i < this.arr.length; i++) {
            this.arr[i] &= ~other.arr[i];
        }
        return this;
    }
    complement() {
        for (let i = 0, len = this.len; i < this.arr.length; i++, len -= 32) {
            const mask = 0xFFFFFFFF >>> (32 - Math.min(32, len));
            this.arr[i] = (~this.arr[i]) & mask;
        }
        return this;
    }
    clone() {
        let other = new BitSet(this.len);
        for (let i = 0; i < this.arr.length; i++) {
            other.arr[i] = this.arr[i];
        }
        return other;
    }
    setFrom(other) {
        this.len = other.len;
        this.arr = Uint32Array.from(other.arr);
        return this;
    }
    clearAll() {
        this.arr.fill(0);
        return this;
    }
    setAll() {
        this.arr.fill(0xFFFFFFFF);
        this.arr[this.arr.length - 1] = 0xFFFFFFFF >>> (0x20 - (this.len & 0x1F));
        return this;
    }
    get(pos) {
        return (this.arr[pos >>> 5] & (1 << (pos & 0x1F))) >>> (pos & 0x1F);
    }
    // accept an array too?
    set(pos) {
        this.arr[pos >>> 5] |= (1 << (pos & 0x1F));
        return this;
    }
    clear(pos) {
        this.arr[pos >>> 5] &= ~(1 << (pos & 0x1F));
        return this;
    }
    isEmpty() {
        for (let i = 0; i < this.arr.length - 1; i++) {
            if (this.arr[i] != 0) {
                return false;
            }
        }
        ;
        return (this.arr[this.arr.length - 1] & (0xFFFFFFFF >>> (0x20 - (this.len & 0x1F)))) == 0;
    }
    isSet(pos) {
        return (this.arr[pos >>> 5] & (1 << (pos & 0x1F))) !== 0;
    }
    pop() {
        const first = this.first();
        if (first != undefined) {
            this.clear(first);
        }
        return first;
    }
    first() {
        for (let i = 0; i < this.arr.length; i++) {
            if (this.arr[i] != 0) {
                for (let j = i << 5; j < (i + 1) << 5; j++) {
                    if (this.isSet(j)) {
                        return j;
                    }
                }
            }
        }
        return undefined;
    }
    equals(other) {
        if (this.len != other.len) {
            return false;
        }
        for (let i = 0; i < this.arr.length; i++) {
            if (this.arr[i] != other.arr[i]) {
                return false;
            }
        }
        return true;
    }
    // number of elements in set
    popcount() {
        let count = 0;
        for (let i = 0; i < this.arr.length; i++) {
            let v = this.arr[i];
            v = v - ((v >> 1) & 0x55555555);
            v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
            count += ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
        }
        ;
        return count;
    }
    // contains = (this ∩ other) == other
    contains(otherElements) {
        const other = (Array.isArray(otherElements)) ? new BitSet(this.len, otherElements) : otherElements;
        return BitSet.intersection(this, other).equals(other);
    }
    add(other) {
        return this.union(other);
    }
    subtract(other) {
        for (let i = 0; i < this.arr.length; i++) {
            this.arr[i] &= ~other.arr[i];
        }
        ;
        this.arr[this.arr.length - 1] &= 0xFFFFFFFF >>> (0x20 - (this.len & 0x1F));
        return this;
    }
    toArray() {
        let arr = [];
        for (let i = 0; i < this.len; i++) {
            if (this.isSet(i)) {
                arr.push(i);
            }
        }
        ;
        return arr;
    }
    toString() {
        return this.toArray().toString();
    }
    toBitString() {
        let str = '';
        for (let i = 0; i < this.len; i++) {
            if (i % 5 == 0)
                str += ' ';
            str += this.get(i);
        }
        return str;
    }
}
//# sourceMappingURL=BitSet.js.map