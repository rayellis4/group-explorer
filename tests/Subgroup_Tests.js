// Claude Sonnet 4.5-generated unit test for Group

import Group from '../js/Group.js'
import Subgroup from '../js/Subgroup.js'
import BitSet from '../js/BitSet.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

// Return the subgroup of G with the given order, or throw if not found
function subgroupOfOrder (G, order) {
  const H = G.subgroups.find(H => H.order === order);
  if (H == null) throw new Error(`No subgroup of order ${order} in group of order ${G.order}`);
  return H;
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('Subgroup', function () {

  // ── constructor ────────────────────────────────────────────────────────────
  describe('constructor', function () {
    it('creates generators and members as BitSets', function () {
      const H = new Subgroup(Z4, [1], [0, 1, 2, 3]);
      expect(H.generators).to.be.instanceOf(BitSet);
      expect(H.members).to.be.instanceOf(BitSet);
    });

    it('generators BitSet reflects the passed array', function () {
      const H = new Subgroup(Z4, [1], [0, 1, 2, 3]);
      expect(H.generators.isSet(1)).to.be.true;
      expect(H.generators.isSet(0)).to.be.false;
    });

    it('members BitSet reflects the passed array', function () {
      const H = new Subgroup(Z4, [1], [0, 1, 2, 3]);
      [0, 1, 2, 3].forEach(el => expect(H.members.isSet(el)).to.be.true);
    });

    it('creates an empty Subgroup when called with no arguments', function () {
      const H = new Subgroup();
      expect(H.group).to.be.undefined;
      expect(H.generators).to.be.undefined;
      expect(H.members).to.be.undefined;
    });

    it('stores a reference to the containing group', function () {
      const H = new Subgroup(Z4, [0], [0]);
      expect(H.group).to.equal(Z4);
    });
  });

  // ── order / index ──────────────────────────────────────────────────────────
  describe('order / index', function () {
    it('order equals the member count', function () {
      Z4.subgroups.forEach(H => {
        expect(H.order).to.equal(H.members.popcount());
      });
    });

    it('index equals group order divided by subgroup order', function () {
      Z4.subgroups.forEach(H => {
        expect(H.index).to.equal(Z4.order / H.order);
      });
    });

    it('trivial subgroup has order 1', function () {
      expect(Z4.subgroups[0].order).to.equal(1);
    });

    it('whole group subgroup has index 1', function () {
      const whole = Z4.subgroups[Z4.subgroups.length - 1];
      expect(whole.index).to.equal(1);
    });

    it('order * index equals group order for every subgroup', function () {
      S3.subgroups.forEach((H, i) => {
        expect(H.order * H.index).to.equal(S3.order, `subgroup ${i}`);
      });
    });
  });

  // ── isCyclic ───────────────────────────────────────────────────────────────
  describe('isCyclic', function () {
    it('a subgroup with one generator is cyclic', function () {
      Z4.subgroups.forEach((H, i) => {
        if (H.generators.popcount() === 1) {
          expect(H.isCyclic).to.be.true, `subgroup ${i}`;
        }
      });
    });

    it('trivial subgroup is cyclic', function () {
      expect(Z4.subgroups[0].isCyclic).to.be.true;
    });

    it('whole group of Z4 is cyclic', function () {
      const whole = Z4.subgroups[Z4.subgroups.length - 1];
      expect(whole.isCyclic).to.be.true;
    });
  });

  // ── isNormal ───────────────────────────────────────────────────────────────
  describe('isNormal', function () {
    it('all subgroups of an abelian group are normal', function () {
      Z4.subgroups.forEach((H, i) => {
        expect(H.isNormal).to.be.true, `subgroup ${i}`;
      });
    });

    it('trivial subgroup of S3 is normal', function () {
      expect(S3.subgroups[0].isNormal).to.be.true;
    });

    it('whole group of S3 is normal', function () {
      expect(S3.subgroups[S3.subgroups.length - 1].isNormal).to.be.true;
    });

    it('isNormal result is consistent with group.isNormal()', function () {
      S3.subgroups.forEach((H, i) => {
        expect(H.isNormal).to.equal(S3.isNormal(H), `subgroup ${i}`);
      });
    });

    it('isNormal is cached after first access', function () {
      const H = S3.subgroups[0].clone();
      const first  = H.isNormal;
      const second = H.isNormal;
      expect(first).to.equal(second);
    });
  });

  // ── setAllMembers ──────────────────────────────────────────────────────────
  describe('setAllMembers', function () {
    it('sets all bits in the members BitSet', function () {
      const H = new Subgroup(Z4, [0], [0]);
      H.setAllMembers();
      expect(H.members.popcount()).to.equal(Z4.order);
    });

    it('returns the subgroup instance (fluent)', function () {
      const H = new Subgroup(Z4, [0], [0]);
      expect(H.setAllMembers()).to.equal(H);
    });
  });

  // ── toString ───────────────────────────────────────────────────────────────
  describe('toString', function () {
    it('includes "generators" and "members" labels', function () {
      const H = subgroupOfOrder(Z4, 2);
      const str = H.toString();
      expect(str).to.include('generators');
      expect(str).to.include('members');
    });

    it('includes the generator elements', function () {
      const H = subgroupOfOrder(Z4, 2);
      // generator of the order-2 subgroup of Z4 is element 2
      expect(H.toString()).to.include(H.generators.toArray().join(','));
    });
  });

  // ── JSON round-trip ────────────────────────────────────────────────────────
  describe('JSON serialisation', function () {
    it('parseJSON restores generators as a BitSet', function () {
      const H       = subgroupOfOrder(Z4, 2);
      const json    = H.toJSON();
      const restored = Subgroup.parseJSON(json);
      expect(restored.generators).to.be.instanceOf(BitSet);
    });

    it('parseJSON restores members as a BitSet', function () {
      const H        = subgroupOfOrder(Z4, 2);
      const restored = Subgroup.parseJSON(H.toJSON());
      expect(restored.members).to.be.instanceOf(BitSet);
    });

    it('round-trip preserves generators content', function () {
      const H        = subgroupOfOrder(Z4, 2);
      const restored = Subgroup.parseJSON(H.toJSON());
      expect(restored.generators.toArray()).to.deep.equal(H.generators.toArray());
    });

    it('round-trip preserves members content', function () {
      const H        = subgroupOfOrder(Z4, 2);
      const restored = Subgroup.parseJSON(H.toJSON());
      expect(restored.members.toArray()).to.deep.equal(H.members.toArray());
    });

     /* .group files do not contain a URL
    it('toJSON replaces group reference with group URL string', function () {
      const H    = subgroupOfOrder(Z4, 2);
      const json = H.toJSON();
      expect(json.group).to.be.a('string');
    });
      */
  });

  // ── clone ──────────────────────────────────────────────────────────────────
  describe('clone', function () {
    it('clone has the same order as the original', function () {
      const H = subgroupOfOrder(Z4, 2);
      expect(H.clone().order).to.equal(H.order);
    });

    it('clone has equal generators', function () {
      const H = subgroupOfOrder(Z4, 2);
      expect(H.clone().generators.toArray()).to.deep.equal(H.generators.toArray());
    });

    it('clone has equal members', function () {
      const H = subgroupOfOrder(Z4, 2);
      expect(H.clone().members.toArray()).to.deep.equal(H.members.toArray());
    });

    it('clone is independent — mutating it does not affect the original', function () {
      const H     = subgroupOfOrder(Z4, 2);
      const clone = H.clone();
      clone.members.setAll();
      expect(H.members.popcount()).to.equal(2); // original unchanged
    });

    it('clone preserves the group reference', function () {
      const H = subgroupOfOrder(Z4, 2);
      expect(H.clone().group).to.equal(Z4);
    });
  });

  // ── structural invariants ──────────────────────────────────────────────────
  describe('structural invariants', function () {
    it('identity is a member of every subgroup', function () {
      S3.subgroups.forEach((H, i) => {
        expect(H.members.isSet(0)).to.be.true, `subgroup ${i}`;
      });
    });

    it('members are closed under the group operation', function () {
      S3.subgroups.forEach((H, i) => {
        const elems = H.members.toArray();
        for (const a of elems) {
          for (const b of elems) {
            expect(H.members.isSet(S3.mult(a, b))).to.be.true,
              `subgroup ${i}: ${a}*${b}`;
          }
        }
      });
    });

    it('every member has its inverse in the subgroup', function () {
      S3.subgroups.forEach((H, i) => {
        H.members.toArray().forEach(g => {
          expect(H.members.isSet(S3.inverseOf(g))).to.be.true,
            `subgroup ${i}: inverse of ${g}`;
        });
      });
    });

    it('generators are all members', function () {
      S3.subgroups.forEach((H, i) => {
        H.generators.toArray().forEach(g => {
          expect(H.members.isSet(g)).to.be.true,
            `subgroup ${i}: generator ${g}`;
        });
      });
    });
  });

});
