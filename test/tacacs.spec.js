'use strict';
require('./setup');

// if (!LIVE_TEST) require('./mocks/radius.nock');
const POLICY_SET_KEYS = [
  'id',
  'state',
  'name',
  'conditionObject',
  'description',
  'rank',
  'hitCounts',
  'serviceName',
  'allowedProtocols',
  'isProxy',
  'isDuplicated',
  'duplicationSourceId',
  'default'
];

describe('TACACS Policy Sets:', () => {
  describe('Get policy sets:', () => {
    it('should get all policy sets', async () => {
      const policySets = await ise.getTacacsPolicySets();
      expect(policySets).to.be.an('array');
      const set = policySets[0];
      expect(set).to.have.nested.property('conditionObject');
      expect(set).to.include.keys(POLICY_SET_KEYS);
      expect(set.id).to.be.a('string');
      expect(set.state).to.be.a('string');
      expect(set.name).to.be.a('string');
      expect(set.conditionObject).to.be.an('object');
      expect(set.description).to.be.a('string');
      expect(set.rank).to.be.a('number');
      expect(set.hitCounts).to.be.a('number');
      expect(set.serviceName).to.be.a('string');
      expect(set.allowedProtocols).to.be.null;
      expect(set.isProxy).to.be.a('boolean');
      expect(set.isDuplicated).to.be.a('boolean');
      expect(set.duplicationSourceId).to.be.null;
      expect(set.default).to.be.a('boolean');
    });
    it('should get a policy set by name', async () => {
      const policySet = await ise.getTacacsPolicySetByName('Default');
      expect(policySet).to.be.an('object');
      expect(policySet).to.have.nested.property('conditionObject');
      expect(policySet).to.include.keys(POLICY_SET_KEYS);
      expect(policySet.id).to.be.a('string');
      expect(policySet.state).to.be.a('string');
      expect(policySet.name).to.be.a('string');
      expect(policySet.conditionObject).to.be.an('object');
      expect(policySet.description).to.be.a('string');
      expect(policySet.rank).to.be.a('number');
      expect(policySet.hitCounts).to.be.a('number');
      expect(policySet.serviceName).to.be.a('string');
      expect(policySet.allowedProtocols).to.be.null;
      expect(policySet.isProxy).to.be.a('boolean');
      expect(policySet.isDuplicated).to.be.a('boolean');
      expect(policySet.duplicationSourceId).to.be.null;
      expect(policySet.default).to.be.a('boolean');
    });
    it('should not be found', async () => {
      ise
        .getTacacsPolicySetByName('PolicySet12345')
        .should.eventually.be.rejectedWith(Error, /Provided TACACS policy set does not exist./);
    });
  });
  describe("Get a policy set's details:", () => {
    it('should resolve all policy objects', async () => {
      const policySet = await ise.getTacacsPolicySetByName('Default');
      const policy = await ise.resolveTacacsPolicySet(policySet.id);
      expect(policy).to.be.an('object');
      expect(policy).to.include.keys([
        'authcPolicy',
        'authzPolicy',
        'localExceptions',
        'globalExceptions',
        'securityGroups',
        'serviceNames',
        'failovers',
        'identityStores',
        'shellProfiles',
        'commandSets'
      ]);
    });
  });
});
