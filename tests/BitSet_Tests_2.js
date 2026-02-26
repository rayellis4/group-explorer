// Claude Sonnet 4.5-generated unit test for BitSet

import {BitSet} from '../js/BitSet.js'

describe('BitSet', function () {

  // ── Constructor ──────────────────────────────────────────────────────────
  describe('constructor', function () {
    it('creates an empty set with correct length', function () {
      const bs = new BitSet(16);
      expect(bs.len).to.equal(16);
      expect(bs.isEmpty()).to.be.true;
    });

    it('creates a zero-length set', function () {
      const bs = new BitSet(0);
      expect(bs.len).to.equal(0);
      expect(bs.arr.length).to.equal(0);
    });

    it('initialises bits from the init array', function () {
      const bs = new BitSet(10, [0, 3, 9]);
      expect(bs.isSet(0)).to.be.true;
      expect(bs.isSet(3)).to.be.true;
      expect(bs.isSet(9)).to.be.true;
      expect(bs.isSet(1)).to.be.false;
    });

    it('allocates the right number of 32-bit words', function () {
      expect(new BitSet(1).arr.length).to.equal(1);
      expect(new BitSet(32).arr.length).to.equal(1);
      expect(new BitSet(33).arr.length).to.equal(2);
      expect(new BitSet(64).arr.length).to.equal(2);
      expect(new BitSet(65).arr.length).to.equal(3);
    });

    it('initialises all bits to 0 by default', function () {
      const bs = new BitSet(100);
      expect(bs.toArray()).to.deep.equal([]);
    });
  });

  // ── JSON serialisation ───────────────────────────────────────────────────
  describe('JSON serialisation', function () {
    it('toJSON returns a plain object with len and arr', function () {
      const bs   = new BitSet(8, [1, 4]);
      const json = bs.toJSON();
      expect(json).to.have.property('len', 8);
      expect(json.arr).to.be.an('array');
    });

    it('parseJSON round-trips correctly', function () {
      const original = new BitSet(20, [0, 7, 19]);
      const json     = original.toJSON();
      const restored = new BitSet().fromJSON(json);
      expect(restored.equals(original)).to.be.true;
    });

    it('toJSON arr is a plain Array, not Uint32Array', function () {
      const json = new BitSet(10, [5]).toJSON();
      expect(Array.isArray(json.arr)).to.be.true;
    });
  });

  // ── get / set / clear / isSet ────────────────────────────────────────────
  describe('get / set / clear / isSet', function () {
    it('set returns the instance (fluent)', function () {
      const bs = new BitSet(10);
      expect(bs.set(3)).to.equal(bs);
    });

    it('get returns 1 for a set bit and 0 for a clear bit', function () {
      const bs = new BitSet(10);
      bs.set(5);
      expect(bs.get(5)).to.equal(1);
      expect(bs.get(4)).to.equal(0);
    });

    it('isSet returns true for a set bit', function () {
      const bs = new BitSet(32, [31]);
      expect(bs.isSet(31)).to.be.true;
    });

    it('clear removes a previously set bit', function () {
      const bs = new BitSet(10, [2, 5]);
      bs.clear(5);
      expect(bs.isSet(5)).to.be.false;
      expect(bs.isSet(2)).to.be.true;
    });

    it('handles bits at word boundaries (pos 31, 32, 63)', function () {
      const bs = new BitSet(64, [0, 31, 32, 63]);
      [0, 31, 32, 63].forEach(p => expect(bs.isSet(p)).to.be.true);
      [1, 30, 33, 62].forEach(p => expect(bs.isSet(p)).to.be.false);
    });
  });

  // ── clearAll / setAll ────────────────────────────────────────────────────
  describe('clearAll / setAll', function () {
    it('clearAll empties the set', function () {
      const bs = new BitSet(20, [0, 10, 19]);
      bs.clearAll();
      expect(bs.isEmpty()).to.be.true;
    });

    it('setAll sets every bit in range', function () {
      const bs = new BitSet(10);
      bs.setAll();
      expect(bs.popcount()).to.equal(10);
    });

    it('setAll does not set bits beyond len', function () {
      const bs = new BitSet(5);
      bs.setAll();
      expect(bs.toArray()).to.deep.equal([0, 1, 2, 3, 4]);
    });

    it('setAll on a 32-bit-aligned set works correctly', function () {
      const bs = new BitSet(32);
      bs.setAll();
      expect(bs.popcount()).to.equal(32);
    });
  });

  // ── isEmpty ──────────────────────────────────────────────────────────────
  describe('isEmpty', function () {
    it('returns true on a new empty set', function () {
      expect(new BitSet(16).isEmpty()).to.be.true;
    });

    it('returns false once any bit is set', function () {
      const bs = new BitSet(16);
      bs.set(0);
      expect(bs.isEmpty()).to.be.false;
    });

    it('returns true after clearing the only set bit', function () {
      const bs = new BitSet(8, [7]);
      bs.clear(7);
      expect(bs.isEmpty()).to.be.true;
    });
  });

  // ── equals ───────────────────────────────────────────────────────────────
  describe('equals', function () {
    it('two identically constructed sets are equal', function () {
      expect(new BitSet(10, [1, 5]).equals(new BitSet(10, [1, 5]))).to.be.true;
    });

    it('sets with different bits are not equal', function () {
      expect(new BitSet(10, [1]).equals(new BitSet(10, [2]))).to.be.false;
    });

    it('sets with different lengths are not equal', function () {
      expect(new BitSet(8, [1]).equals(new BitSet(16, [1]))).to.be.false;
    });

    it('empty sets of the same length are equal', function () {
      expect(new BitSet(32).equals(new BitSet(32))).to.be.true;
    });
  });

  // ── clone / setFrom ──────────────────────────────────────────────────────
  describe('clone / setFrom', function () {
    it('clone produces an equal but independent copy', function () {
      const a = new BitSet(16, [1, 7, 15]);
      const b = a.clone();
      expect(b.equals(a)).to.be.true;
      b.set(0);
      expect(a.isSet(0)).to.be.false;  // original unaffected
    });

    it('setFrom overwrites the target', function () {
      const a = new BitSet(16, [3, 9]);
      const b = new BitSet(32, [1]);
      b.setFrom(a);
      expect(b.equals(a)).to.be.true;
    });
  });

  // ── Set operations ───────────────────────────────────────────────────────
  describe('set operations', function () {
    describe('union', function () {
      it('static union combines both sets', function () {
        const a = new BitSet(8, [0, 2]);
        const b = new BitSet(8, [1, 2]);
        expect(BitSet.union(a, b).toArray()).to.deep.equal([0, 1, 2]);
      });

      it('instance union is mutating and returns this', function () {
        const a      = new BitSet(8, [0]);
        const b      = new BitSet(8, [1]);
        const result = a.union(b);
        expect(result).to.equal(a);
        expect(a.toArray()).to.deep.equal([0, 1]);
      });

      it('add is an alias for union', function () {
        const a = new BitSet(8, [0]);
        const b = new BitSet(8, [3]);
        a.add(b);
        expect(a.isSet(3)).to.be.true;
      });
    });

    describe('intersection', function () {
      it('static intersection returns common elements only', function () {
        const a = new BitSet(8, [0, 1, 2]);
        const b = new BitSet(8, [1, 2, 3]);
        expect(BitSet.intersection(a, b).toArray()).to.deep.equal([1, 2]);
      });

      it('intersection with empty set is empty', function () {
        const a = new BitSet(8, [1, 2]);
        const b = new BitSet(8);
        expect(BitSet.intersection(a, b).isEmpty()).to.be.true;
      });
    });

    describe('difference', function () {
      it('static difference removes b elements from a', function () {
        const a = new BitSet(8, [0, 1, 2, 3]);
        const b = new BitSet(8, [2, 3, 4]);
        expect(BitSet.difference(a, b).toArray()).to.deep.equal([0, 1]);
      });

      it('difference with itself is empty', function () {
        const a = new BitSet(8, [1, 2, 3]);
        expect(BitSet.difference(a, a).isEmpty()).to.be.true;
      });

      it('subtract is equivalent to difference (mutating)', function () {
        const a = new BitSet(8, [0, 1, 2]);
        const b = new BitSet(8, [1]);
        a.subtract(b);
        expect(a.toArray()).to.deep.equal([0, 2]);
      });
    });

    describe('complement', function () {
      it('complement flips all bits within len', function () {
        const bs = new BitSet(4, [0, 2]);
        bs.complement();
        expect(bs.toArray()).to.deep.equal([1, 3]);
      });

      it('double complement returns original', function () {
        const original = new BitSet(10, [1, 5, 9]);
        const bs       = original.clone();
        bs.complement().complement();
        expect(bs.equals(original)).to.be.true;
      });

      it('complement does not leak bits beyond len', function () {
        const bs = new BitSet(5, []);
        bs.complement();
        expect(bs.popcount()).to.equal(5);
        expect(bs.toArray()).to.deep.equal([0, 1, 2, 3, 4]);
      });
    });
  });

  // ── contains ─────────────────────────────────────────────────────────────
  describe('contains', function () {
    it('returns true when all bits of other are present', function () {
      const a = new BitSet(8, [0, 1, 2, 3]);
      const b = new BitSet(8, [1, 2]);
      expect(a.contains(b)).to.be.true;
    });

    it('returns false when other has a bit not in this', function () {
      const a = new BitSet(8, [0, 1]);
      const b = new BitSet(8, [1, 5]);
      expect(a.contains(b)).to.be.false;
    });

    it('accepts a plain array as argument', function () {
      const a = new BitSet(8, [0, 2, 4]);
      expect(a.contains([0, 4])).to.be.true;
      expect(a.contains([1])).to.be.false;
    });

    it('every set contains the empty set', function () {
      const a = new BitSet(8, [3]);
      expect(a.contains(new BitSet(8))).to.be.true;
    });
  });

  // ── popcount ─────────────────────────────────────────────────────────────
  describe('popcount', function () {
    it('returns 0 for empty set', function () {
      expect(new BitSet(32).popcount()).to.equal(0);
    });

    it('returns correct count after setting individual bits', function () {
      const bs = new BitSet(64, [0, 31, 32, 63]);
      expect(bs.popcount()).to.equal(4);
    });

    it('matches toArray().length', function () {
      const bs = new BitSet(100, [5, 10, 50, 99]);
      expect(bs.popcount()).to.equal(bs.toArray().length);
    });

    it('setAll then popcount equals len', function () {
      const bs = new BitSet(37);
      bs.setAll();
      expect(bs.popcount()).to.equal(37);
    });
  });

  // ── first / pop ──────────────────────────────────────────────────────────
  describe('first / pop', function () {
    it('first returns the lowest set bit', function () {
      expect(new BitSet(10, [3, 7]).first()).to.equal(3);
    });

    it('first returns undefined for empty set', function () {
      expect(new BitSet(10).first()).to.be.undefined;
    });

    it('pop returns and removes the lowest bit', function () {
      const bs     = new BitSet(10, [2, 5, 8]);
      const popped = bs.pop();
      expect(popped).to.equal(2);
      expect(bs.isSet(2)).to.be.false;
      expect(bs.toArray()).to.deep.equal([5, 8]);
    });

    it('pop on empty set returns undefined and leaves set empty', function () {
      const bs = new BitSet(8);
      expect(bs.pop()).to.be.undefined;
      expect(bs.isEmpty()).to.be.true;
    });

    it('pop can drain the entire set in order', function () {
      const bs  = new BitSet(8, [1, 3, 6]);
      const out = [];
      let v;
      while ((v = bs.pop()) !== undefined) out.push(v);
      expect(out).to.deep.equal([1, 3, 6]);
      expect(bs.isEmpty()).to.be.true;
    });
  });

  // ── toArray / toString / toBitString ─────────────────────────────────────
  describe('string / array conversion', function () {
    it('toArray returns set indices in ascending order', function () {
      expect(new BitSet(10, [9, 0, 5]).toArray()).to.deep.equal([0, 5, 9]);
    });

    it('toArray returns empty array for empty set', function () {
      expect(new BitSet(10).toArray()).to.deep.equal([]);
    });

    it('toString is the comma-separated indices', function () {
      expect(new BitSet(6, [1, 3, 5]).toString()).to.equal('1,3,5');
    });

    it('toBitString length equals len + space-separators', function () {
      const bs       = new BitSet(10, [0, 9]);
      const str      = bs.toBitString();
      const bitsOnly = str.replace(/ /g, '');
      expect(bitsOnly.length).to.equal(10);
      expect(bitsOnly[0]).to.equal('1');
      expect(bitsOnly[9]).to.equal('1');
    });
  });

  // ── Static methods preserve originals ────────────────────────────────────
  describe('static methods do not mutate operands', function () {
    it('BitSet.union leaves both operands unchanged', function () {
      const a = new BitSet(8, [0]);
      const b = new BitSet(8, [1]);
      BitSet.union(a, b);
      expect(a.toArray()).to.deep.equal([0]);
      expect(b.toArray()).to.deep.equal([1]);
    });

    it('BitSet.intersection leaves both operands unchanged', function () {
      const a = new BitSet(8, [0, 1]);
      const b = new BitSet(8, [1, 2]);
      BitSet.intersection(a, b);
      expect(a.toArray()).to.deep.equal([0, 1]);
      expect(b.toArray()).to.deep.equal([1, 2]);
    });

    it('BitSet.difference leaves both operands unchanged', function () {
      const a = new BitSet(8, [0, 1, 2]);
      const b = new BitSet(8, [1]);
      BitSet.difference(a, b);
      expect(a.toArray()).to.deep.equal([0, 1, 2]);
      expect(b.toArray()).to.deep.equal([1]);
    });
  });

  // ── Large / boundary values ───────────────────────────────────────────────
  describe('large / boundary values', function () {
    it('handles a 128-bit set correctly', function () {
      const bs = new BitSet(128, [0, 63, 64, 127]);
      expect(bs.popcount()).to.equal(4);
      expect(bs.toArray()).to.deep.equal([0, 63, 64, 127]);
    });

    it('setAll on 128-bit set gives popcount 128', function () {
      const bs = new BitSet(128);
      bs.setAll();
      expect(bs.popcount()).to.equal(128);
    });

    it('complement of a full set is empty', function () {
      const bs = new BitSet(16);
      bs.setAll().complement();
      expect(bs.isEmpty()).to.be.true;
    });
  });

});
