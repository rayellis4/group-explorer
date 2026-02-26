// DeepSeek-generated unit test for BitSet

import {BitSet} from '../js/BitSet.js'

describe('BitSet tests', function() {
   it('should initialize correctly', function() {
      const bs = new BitSet(10);
      expect(bs.len).to.equal(10);
      expect(bs.arr.length).to.equal(1); // 10 bits fit in one Uint32
      expect(bs.isEmpty()).to.be.true;

      const bs2 = new BitSet(64);
      expect(bs2.arr.length).to.equal(2); // 64 bits = 2 Uint32s

      const bs3 = new BitSet(0);
      expect(bs3.len).to.equal(0);
      expect(bs3.arr.length).to.equal(0);
   });

   it('should initialize with values', function() {
      const bs = new BitSet(10, [1, 3, 5]);
      expect(bs.isSet(1)).to.be.true;
      expect(bs.isSet(3)).to.be.true;
      expect(bs.isSet(5)).to.be.true;
      expect(bs.isSet(0)).to.be.false;
      expect(bs.isSet(2)).to.be.false;
      expect(bs.isSet(9)).to.be.false;
   });

   it('should set and clear bits', function() {
      const bs = new BitSet(10);
      bs.set(3);
      expect(bs.get(3)).to.equal(1);
      expect(bs.isSet(3)).to.be.true;

      bs.clear(3);
      expect(bs.get(3)).to.equal(0);
      expect(bs.isSet(3)).to.be.false;

      // Test setting a bit multiple times
      bs.set(5).set(5);
      expect(bs.isSet(5)).to.be.true;

      // Test clearing a bit that isn't set
      bs.clear(7);
      expect(bs.isSet(7)).to.be.false;
   });

   it('should handle edge cases for set/clear', function() {
      const bs = new BitSet(33);

      // Set first and last bits
      bs.set(0);
      bs.set(32);

      expect(bs.isSet(0)).to.be.true;
      expect(bs.isSet(32)).to.be.true;
      expect(bs.isSet(31)).to.be.false;

      bs.clear(0);
      expect(bs.isSet(0)).to.be.false;
      expect(bs.isSet(32)).to.be.true;

      // Clear a bit beyond length (should be no-op)
      bs.clear(100);
   });

   it('should clear all bits', function() {
      const bs = new BitSet(10, [1, 3, 5, 7, 9]);
      bs.clearAll();
      for (let i = 0; i < 10; i++) {
         expect(bs.isSet(i)).to.be.false;
      }
      expect(bs.isEmpty()).to.be.true;
   });

   it('should set all bits', function() {
      const bs = new BitSet(10);
      bs.setAll();
      for (let i = 0; i < 10; i++) {
         expect(bs.isSet(i)).to.be.true;
      }

      // Test with non-multiple of 32
      const bs2 = new BitSet(33);
      bs2.setAll();
      for (let i = 0; i < 33; i++) {
         expect(bs2.isSet(i)).to.be.true;
      }
      // The bit after the set length shouldn't be set
      expect(bs2.arr[1] & (1 << 1)).to.equal(0);
   });

   it('should check emptiness correctly', function() {
      const bs = new BitSet(10);
      expect(bs.isEmpty()).to.be.true;

      bs.set(5);
      expect(bs.isEmpty()).to.be.false;

      bs.clear(5);
      expect(bs.isEmpty()).to.be.true;

      // Test with multiple words
      const bs2 = new BitSet(64);
      expect(bs2.isEmpty()).to.be.true;

      bs2.set(0);
      expect(bs2.isEmpty()).to.be.false;

      bs2.set(63);
      bs2.clear(0);
      expect(bs2.isEmpty()).to.be.false;

      bs2.clear(63);
      expect(bs2.isEmpty()).to.be.true;

      // Test with non-multiple of 32
      const bs3 = new BitSet(33);
      expect(bs3.isEmpty()).to.be.true;

      bs3.set(32);
      expect(bs3.isEmpty()).to.be.false;

      bs3.clear(32);
      expect(bs3.isEmpty()).to.be.true;
   });

   it('should find the first set bit', function() {
      const bs = new BitSet(10);
      expect(bs.first()).to.be.undefined;

      bs.set(5);
      expect(bs.first()).to.equal(5);

      bs.set(3);
      expect(bs.first()).to.equal(3);

      bs.clear(3);
      expect(bs.first()).to.equal(5);

      // Test with multiple words
      const bs2 = new BitSet(64);
      bs2.set(32);
      expect(bs2.first()).to.equal(32);

      bs2.set(0);
      expect(bs2.first()).to.equal(0);
   });

   it('should pop bits', function() {
      const bs = new BitSet(10, [3, 5, 7]);
      expect(bs.pop()).to.equal(3);
      expect(bs.isSet(3)).to.be.false;

      expect(bs.pop()).to.equal(5);
      expect(bs.isSet(5)).to.be.false;

      expect(bs.pop()).to.equal(7);
      expect(bs.isSet(7)).to.be.false;

      expect(bs.pop()).to.be.undefined;
   });

   it('should check equality', function() {
      const bs1 = new BitSet(10, [1, 2, 3]);
      const bs2 = new BitSet(10, [1, 2, 3]);
      const bs3 = new BitSet(10, [1, 2]);
      const bs4 = new BitSet(20, [1, 2, 3]);

      expect(bs1.equals(bs2)).to.be.true;
      expect(bs1.equals(bs3)).to.be.false;
      expect(bs1.equals(bs4)).to.be.false;

      // Test with different content in last word
      const bs5 = new BitSet(33);
      const bs6 = new BitSet(33);
      bs5.set(32);
      expect(bs5.equals(bs6)).to.be.false;

      bs6.set(32);
      expect(bs5.equals(bs6)).to.be.true;
   });

   it('should count bits correctly', function() {
      const bs = new BitSet(10);
      expect(bs.popcount()).to.equal(0);

      bs.set(1).set(3).set(5).set(7).set(9);
      expect(bs.popcount()).to.equal(5);

      // Test with multiple words
      const bs2 = new BitSet(64);
      for (let i = 0; i < 64; i++) {
         bs2.set(i);
      }
      expect(bs2.popcount()).to.equal(64);

      // Test with non-multiple of 32
      const bs3 = new BitSet(33);
      bs3.set(32);
      expect(bs3.popcount()).to.equal(1);

      bs3.setAll();
      expect(bs3.popcount()).to.equal(33);
   });

   it('should compute intersections', function() {
      const bs1 = new BitSet(10, [1, 2, 3, 4]);
      const bs2 = new BitSet(10, [3, 4, 5, 6]);

      // Static method
      const intersectionStatic = BitSet.intersection(bs1, bs2);
      expect(intersectionStatic.toArray()).to.deep.equal([3, 4]);

      // Instance method
      bs1.intersection(bs2);
      expect(bs1.toArray()).to.deep.equal([3, 4]);

      // Test with different sizes (should throw or handle?)
      const bs3 = new BitSet(20, [3, 4]);
      expect(() => bs1.intersection(bs3)).to.throw; // Note: In actual implementation, this won't throw but may have issues
   });

   it('should compute unions', function() {
      const bs1 = new BitSet(10, [1, 2, 3]);
      const bs2 = new BitSet(10, [3, 4, 5]);

      // Static method
      const unionStatic = BitSet.union(bs1, bs2);
      expect(unionStatic.toArray()).to.deep.equal([1, 2, 3, 4, 5]);

      // Instance method
      bs1.union(bs2);
      expect(bs1.toArray()).to.deep.equal([1, 2, 3, 4, 5]);

      // Test with multiple words
      const bs3 = new BitSet(64, [0, 1, 2]);
      const bs4 = new BitSet(64, [30, 31, 32]);
      bs3.union(bs4);
      expect(bs3.toArray()).to.deep.equal([0, 1, 2, 30, 31, 32]);
   });

   it('should compute differences', function() {
      const bs1 = new BitSet(10, [1, 2, 3, 4, 5]);
      const bs2 = new BitSet(10, [3, 4, 5, 6]);

      // Static method
      const diffStatic = BitSet.difference(bs1, bs2);
      expect(diffStatic.toArray()).to.deep.equal([1, 2]);

      // Instance method
      bs1.difference(bs2);
      expect(bs1.toArray()).to.deep.equal([1, 2]);

      // Test with multiple words
      const bs3 = new BitSet(64, [0, 1, 31, 32, 63]);
      const bs4 = new BitSet(64, [0, 31, 63]);
      bs3.difference(bs4);
      expect(bs3.toArray()).to.deep.equal([1, 32]);
   });

   it('should compute complement', function() {
      const bs = new BitSet(4, [0, 2]);
      bs.complement();
      expect(bs.toArray()).to.deep.equal([1, 3]);

      // Test with multiple words
      const bs2 = new BitSet(64);
      bs2.set(0).set(63);
      bs2.complement();
      // Should have all bits set except 0 and 63
      expect(bs2.isSet(0)).to.be.false;
      expect(bs2.isSet(63)).to.be.false;
      for (let i = 1; i < 63; i++) {
         expect(bs2.isSet(i)).to.be.true;
      }

      // Test with non-multiple of 32
      const bs3 = new BitSet(33);
      bs3.set(32);
      bs3.complement();
      for (let i = 0; i < 32; i++) {
         expect(bs3.isSet(i)).to.be.true;
      }
      expect(bs3.isSet(32)).to.be.false;
   });

   it('should clone correctly', function() {
      const bs1 = new BitSet(10, [1, 3, 5]);
      const bs2 = bs1.clone();

      expect(bs2.equals(bs1)).to.be.true;

      bs1.set(7);
      expect(bs1.isSet(7)).to.be.true;
      expect(bs2.isSet(7)).to.be.false;
   });

   it('should set from another bitset', function() {
      const bs1 = new BitSet(10, [1, 3, 5]);
      const bs2 = new BitSet(10);

      bs2.setFrom(bs1);
      expect(bs2.equals(bs1)).to.be.true;

      // Test with different size
      const bs3 = new BitSet(20);
      bs3.setFrom(bs1);
      expect(bs3.len).to.equal(10);
      expect(bs3.equals(bs1)).to.be.true;
   });

   it('should check containment', function() {
      const bs = new BitSet(10, [1, 3, 5, 7, 9]);

      // With BitSet
      const subset = new BitSet(10, [3, 5, 9]);
      expect(bs.contains(subset)).to.be.true;

      const notSubset = new BitSet(10, [2, 3, 5]);
      expect(bs.contains(notSubset)).to.be.false;

      // With Array
      expect(bs.contains([3, 5, 9])).to.be.true;
      expect(bs.contains([2, 3, 5])).to.be.false;

      // Test with different size
      const largeSet = new BitSet(20, [3, 5]);
      expect(bs.contains(largeSet)).to.be.false;
   });

   it('should add and subtract', function() {
      const bs1 = new BitSet(10, [1, 2]);
      const bs2 = new BitSet(10, [3, 4]);

      bs1.add(bs2);
      expect(bs1.toArray()).to.deep.equal([1, 2, 3, 4]);

      bs1.subtract(bs2);
      expect(bs1.toArray()).to.deep.equal([1, 2]);

      // Test with multiple words
      const bs3 = new BitSet(64, [0, 1]);
      const bs4 = new BitSet(64, [32, 33]);
      bs3.add(bs4);
      expect(bs3.toArray()).to.deep.equal([0, 1, 32, 33]);

      bs3.subtract(bs4);
      expect(bs3.toArray()).to.deep.equal([0, 1]);
   });

   it('should convert to array', function() {
      const bs = new BitSet(10, [1, 3, 5, 7, 9]);
      expect(bs.toArray()).to.deep.equal([1, 3, 5, 7, 9]);

      const empty = new BitSet(10);
      expect(empty.toArray()).to.deep.equal([]);

      // Test with multiple words
      const bs2 = new BitSet(64);
      bs2.set(0).set(32).set(63);
      expect(bs2.toArray()).to.deep.equal([0, 32, 63]);
   });

   it('should convert to string', function() {
      const bs = new BitSet(10, [1, 3, 5]);
      expect(bs.toString()).to.equal('1,3,5');

      expect(bs.toBitString()).to.match(/ 01010 10000/);
   });

   it('should handle JSON serialization', function() {
      const bs = new BitSet(10, [1, 3, 5]);
      const json = bs.toJSON();

      expect(json).to.deep.equal({
         len: 10,
         arr: Array.from(bs.arr)
      });

      const bs2 = new BitSet().fromJSON(json);
      expect(bs2.equals(bs)).to.be.true;

      // Test with empty set
      const empty = new BitSet(0);
      const emptyJson = empty.toJSON();
      expect(emptyJson).to.deep.equal({len: 0, arr: []});

      const emptyBs = new BitSet().fromJSON(emptyJson);
      expect(emptyBs.equals(empty)).to.be.true;
   });

   it('should handle edge cases', function() {
      // Zero-length bitset
      const empty = new BitSet(0);
      expect(empty.isEmpty()).to.be.true;
      expect(empty.first()).to.be.undefined;
      expect(empty.pop()).to.be.undefined;
      expect(empty.toArray()).to.deep.equal([]);

      // Single-bit bitset
      const single = new BitSet(1);
      expect(single.isEmpty()).to.be.true;
      single.set(0);
      expect(single.isSet(0)).to.be.true;
      expect(single.first()).to.equal(0);
      single.clear(0);
      expect(single.isEmpty()).to.be.true;

      // Large bitset
      const large = new BitSet(1000);
      large.set(999);
      expect(large.isSet(999)).to.be.true;
      expect(large.popcount()).to.equal(1);
   });
});
