// Claude Sonnet 4.5-generated unit test for Group

import {Group} from '../js/Group.js'
import {BitSet} from '../js/BitSet.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────
// Groups are loaded once before the suite runs, then reused read-only.
// Each test that mutates a group should call G.clone() or rebuild from the file.

let Z4, S3;

before(async function () {
  this.timeout(5000);
  const [z4json, s3json] = await Promise.all([
     fetch('../groups/Z_4.group').then(r => r.json()),
     fetch('../groups/S_3.group').then(r => r.json()),
  ]);
  Z4 = Group.fromGroupFileJSON(z4json);
  S3 = Group.fromGroupFileJSON(s3json);
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe('Group', function () {

  // ── Basic properties ──────────────────────────────────────────────────────
  describe('basic properties', function () {
    it('Z4 has order 4', function () {
      expect(Z4.order).to.equal(4);
    });

    it('S3 has order 6', function () {
      expect(S3.order).to.equal(6);
    });

    it('elements is [0, 1, …, n-1]', function () {
      expect(Z4.elements).to.deep.equal([0, 1, 2, 3]);
      expect(S3.elements).to.deep.equal([0, 1, 2, 3, 4, 5]);
    });
  });

  // ── mult ─────────────────────────────────────────────────────────────────
  describe('mult', function () {
    it('identity is neutral on left and right', function () {
      for (let i = 0; i < Z4.order; i++) {
        expect(Z4.mult(0, i)).to.equal(i, `0 * ${i}`);
        expect(Z4.mult(i, 0)).to.equal(i, `${i} * 0`);
      }
    });

    it('matches multtable[a][b] directly', function () {
      for (let a = 0; a < S3.order; a++) {
        for (let b = 0; b < S3.order; b++) {
          expect(S3.mult(a, b)).to.equal(S3.multtable[a][b]);
        }
      }
    });

    it('wraps indices modulo order', function () {
      // mult(n, b) should equal mult(0, b) since n mod n === 0
      expect(Z4.mult(Z4.order, 1)).to.equal(Z4.mult(0, 1));
    });
  });

  // ── inverses ─────────────────────────────────────────────────────────────
  describe('inverses', function () {
    it('identity is its own inverse', function () {
      expect(Z4.inverseOf(0)).to.equal(0);
      expect(S3.inverseOf(0)).to.equal(0);
    });

    it('g * g⁻¹ === identity for every element in Z4', function () {
      for (let g = 0; g < Z4.order; g++) {
        expect(Z4.mult(g, Z4.inverseOf(g))).to.equal(0, `g=${g}`);
      }
    });

    it('g * g⁻¹ === identity for every element in S3', function () {
      for (let g = 0; g < S3.order; g++) {
        expect(S3.mult(g, S3.inverseOf(g))).to.equal(0, `g=${g}`);
      }
    });

    it('inverses array matches inverseOf()', function () {
      for (let g = 0; g < S3.order; g++) {
        expect(S3.inverses[g]).to.equal(S3.inverseOf(g), `g=${g}`);
      }
    });
  });

  // ── isAbelian / nonAbelianExample ─────────────────────────────────────────
  describe('isAbelian / nonAbelianExample', function () {
    it('Z4 is abelian', function () {
      expect(Z4.isAbelian).to.be.true;
    });

    it('S3 is not abelian', function () {
      expect(S3.isAbelian).to.be.false;
    });

    it('nonAbelianExample is undefined for Z4', function () {
      expect(Z4.nonAbelianExample).to.be.undefined;
    });

    it('nonAbelianExample [a,b] satisfies a*b ≠ b*a in S3', function () {
      const [a, b] = S3.nonAbelianExample;
      expect(S3.mult(a, b)).to.not.equal(S3.mult(b, a));
    });
  });

  // ── isCyclic ─────────────────────────────────────────────────────────────
  describe('isCyclic', function () {
    it('Z4 is cyclic', function () {
      expect(Z4.isCyclic).to.be.true;
    });

    it('S3 is not cyclic', function () {
      expect(S3.isCyclic).to.be.false;
    });
  });

  // ── elementOrders ─────────────────────────────────────────────────────────
  describe('elementOrders', function () {
    it('identity always has order 1', function () {
      expect(Z4.elementOrders[0]).to.equal(1);
      expect(S3.elementOrders[0]).to.equal(1);
    });

    it('element orders multiply-check: g^ord(g) === identity', function () {
      for (let g = 0; g < Z4.order; g++) {
        let acc = g;
        for (let k = 1; k < Z4.elementOrders[g]; k++) acc = Z4.mult(acc, g);
        expect(acc).to.equal(0, `g=${g}, ord=${Z4.elementOrders[g]}`);
      }
    });

    it('Z4 generator has order equal to group order', function () {
      expect(Z4.elementOrders.some(o => o === Z4.order)).to.be.true;
    });

    it('all element orders divide the group order (Lagrange)', function () {
      for (let g = 0; g < S3.order; g++) {
        expect(S3.order % S3.elementOrders[g]).to.equal(0, `g=${g}`);
      }
    });
  });

  // ── elementPowers ─────────────────────────────────────────────────────────
  describe('elementPowers', function () {
    it('powers of identity contain only the identity', function () {
      expect(Z4.elementPowers[0].toArray()).to.deep.equal([0]);
    });

    it('a generator of Z4 has powers equal to the whole group', function () {
      const genIndex = Z4.elementOrders.findIndex(o => o === Z4.order);
      expect(Z4.elementPowers[genIndex].popcount()).to.equal(Z4.order);
    });

    it('power-set of g always contains the identity', function () {
      for (let g = 0; g < S3.order; g++) {
        expect(S3.elementPowers[g].isSet(0)).to.be.true, `g=${g}`;
      }
    });

    it('size of power-set equals element order', function () {
      for (let g = 0; g < Z4.order; g++) {
        expect(Z4.elementPowers[g].popcount()).to.equal(Z4.elementOrders[g], `g=${g}`);
      }
    });
  });

  // ── conjugate ─────────────────────────────────────────────────────────────
  describe('conjugate', function () {
    it('conjugating by identity returns h unchanged', function () {
      for (let h = 0; h < S3.order; h++) {
        expect(S3.conjugate(h, 0)).to.equal(h, `h=${h}`);
      }
    });

    it('conjugate(h, g) === g * h * g⁻¹', function () {
      for (let g = 0; g < S3.order; g++) {
        for (let h = 0; h < S3.order; h++) {
          const expected = S3.mult(g, S3.mult(h, S3.inverseOf(g)));
          expect(S3.conjugate(h, g)).to.equal(expected, `g=${g} h=${h}`);
        }
      }
    });

    it('conjugation is trivial in an abelian group', function () {
      for (let g = 0; g < Z4.order; g++) {
        for (let h = 0; h < Z4.order; h++) {
          expect(Z4.conjugate(h, g)).to.equal(h, `g=${g} h=${h}`);
        }
      }
    });
  });

  // ── isNormal ──────────────────────────────────────────────────────────────
  describe('isNormal', function () {
    it('every subgroup of an abelian group is normal', function () {
      Z4.subgroups.forEach((H, i) => {
        expect(Z4.isNormal(H)).to.be.true, `subgroup ${i}`;
      });
    });

    it('trivial subgroup is always normal', function () {
      expect(S3.isNormal(S3.subgroups[0])).to.be.true;
    });

    it('whole group is always normal', function () {
      expect(S3.isNormal(S3.subgroups[S3.subgroups.length - 1])).to.be.true;
    });
  });

  // ── closure ───────────────────────────────────────────────────────────────
  describe('closure', function () {
    it('closure of [] is just the identity', function () {
      expect(Z4.closure([]).toArray()).to.deep.equal([0]);
    });

    it('closure of [identity] is just the identity', function () {
      expect(Z4.closure([0]).toArray()).to.deep.equal([0]);
    });

    it('closure of a generator produces the whole group', function () {
      const gen = Z4.elementOrders.findIndex(o => o === Z4.order);
      expect(Z4.closure([gen]).popcount()).to.equal(Z4.order);
    });

    it('closure result is the same whether passed an array or a BitSet', function () {
      const gen = Z4.elementOrders.findIndex(o => o === Z4.order);
      const fromArray  = Z4.closure([gen]);
      const bs = new BitSet(Z4.order);
      bs.set(gen);
      const fromBitSet = Z4.closure(bs);
      expect(fromArray.equals(fromBitSet)).to.be.true;
    });

    it('closure is closed under multiplication', function () {
      const closed = S3.closure([1]).toArray();
      for (const a of closed) {
        for (const b of closed) {
          expect(closed.includes(S3.mult(a, b))).to.be.true, `${a}*${b}`;
        }
      }
    });
  });

  // ── getCosets ─────────────────────────────────────────────────────────────
  describe('getCosets', function () {
    it('cosets partition the group', function () {
      const H       = S3.subgroups[1];  // a non-trivial proper subgroup
      const cosets  = S3.getCosets(H.members);
      const covered = new BitSet(S3.order);
      cosets.forEach(c => covered.union(c));
      expect(covered.popcount()).to.equal(S3.order);
    });

    it('all cosets have the same size', function () {
      const H      = S3.subgroups[1];
      const cosets = S3.getCosets(H.members);
      const size   = cosets[0].popcount();
      cosets.forEach((c, i) => expect(c.popcount()).to.equal(size, `coset ${i}`));
    });

    it('number of cosets equals index [G:H]', function () {
      const H      = Z4.subgroups[1];
      const cosets = Z4.getCosets(H.members);
      expect(cosets.length).to.equal(Z4.order / H.order);
    });

    it('cosets are pairwise disjoint', function () {
      const H      = Z4.subgroups[1];
      const cosets = Z4.getCosets(H.members);
      for (let i = 0; i < cosets.length; i++) {
        for (let j = i + 1; j < cosets.length; j++) {
          expect(BitSet.intersection(cosets[i], cosets[j]).isEmpty()).to.be.true;
        }
      }
    });
  });

  // ── subgroups ─────────────────────────────────────────────────────────────
  describe('subgroups', function () {
    it('trivial and whole-group subgroups are always present', function () {
      expect(Z4.subgroups[0].order).to.equal(1);
      expect(Z4.subgroups[Z4.subgroups.length - 1].order).to.equal(Z4.order);
    });

    it('every subgroup order divides the group order (Lagrange)', function () {
      S3.subgroups.forEach((H, i) => {
        expect(S3.order % H.order).to.equal(0, `subgroup ${i} order ${H.order}`);
      });
    });

    it('Z4 has exactly 3 subgroups: {e}, Z2, Z4', function () {
      expect(Z4.subgroups.length).to.equal(3);
      const orders = Z4.subgroups.map(H => H.order).sort((a, b) => a - b);
      expect(orders).to.deep.equal([1, 2, 4]);
    });
  });

  // ── isSolvable / isSimple ─────────────────────────────────────────────────
  describe('isSolvable / isSimple', function () {
    it('Z4 is solvable', function () {
      expect(Z4.isSolvable).to.be.true;
    });

    it('S3 is solvable', function () {
      expect(S3.isSolvable).to.be.true;
    });

    it('Z4 is not simple (has non-trivial proper normal subgroup)', function () {
      expect(Z4.isSimple).to.be.false;
    });
  });

  // ── center ────────────────────────────────────────────────────────────────
  describe('center', function () {
    it('center of an abelian group is the whole group', function () {
      expect(Z4.center()).to.deep.equal([0, 1, 2, 3]);
    });

    it('center always contains the identity', function () {
      expect(S3.center()).to.include(0);
    });

    it('center of S3 is just the identity', function () {
      expect(S3.center()).to.deep.equal([0]);
    });
  });

  // ── elementPowerArray ─────────────────────────────────────────────────────
  describe('elementPowerArray', function () {
    it('power array of identity is [0]', function () {
      expect(Z4.elementPowerArray(0)).to.deep.equal([0]);
    });

    it('length of power array equals element order', function () {
      for (let g = 0; g < Z4.order; g++) {
        expect(Z4.elementPowerArray(g).length).to.equal(Z4.elementOrders[g], `g=${g}`);
      }
    });

    it('last element times g itself equals the identity', function () {
      for (let g = 1; g < Z4.order; g++) {
        const arr = Z4.elementPowerArray(g);
        expect(Z4.mult(arr[arr.length - 1], g)).to.equal(0, `g=${g}`);
      }
    });
  });

  // ── conjugacy classes ─────────────────────────────────────────────────────
  describe('conjugacy classes', function () {
    it('conjugacy classes partition the group', function () {
      const covered = new BitSet(S3.order);
      S3.conjugacyClasses.forEach(c => covered.union(c));
      expect(covered.popcount()).to.equal(S3.order);
    });

    it('each element belongs to exactly one conjugacy class', function () {
      for (let g = 0; g < S3.order; g++) {
        const count = S3.conjugacyClasses.filter(c => c.isSet(g)).length;
        expect(count).to.equal(1, `element ${g}`);
      }
    });

    it('abelian group has as many classes as elements', function () {
      expect(Z4.conjugacyClasses.length).to.equal(Z4.order);
    });
  });

});
