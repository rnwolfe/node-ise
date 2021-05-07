require('./setup');
const { expect } = require('chai');
const fs = require('fs');
// if (!LIVE_TEST) require('./mocks/endpoints.nock');

const ENDPOINT_IDENTITY_GROUP_KEYS = [
  'id',
  'internalName',
  'name',
  'description',
  'parentGroupID',
  'parentGroup',
  'systemGroup',
  'rbacPermission'
];

describe('Endpoint Identity Groups:', () => {
  describe('Get endpoint identity groups:', () => {
    it('should get at least 15 identity groups', async () => {
      const groups = await ise.getEndpointIdentityGroups();
      expect(groups).to.be.an('array').with.lengthOf.at.least(15).and.eachOf;
      expect(groups[0])
        .to.be.an('object')
        .that.includes.keys(ENDPOINT_IDENTITY_GROUP_KEYS);
    });
    it('should get the Blacklist identity group', async () => {
      const group = await ise.getEndpointIdentityGroup('Blacklist');
      expect(group)
        .to.be.an('object')
        .that.includes.keys(ENDPOINT_IDENTITY_GROUP_KEYS)
        .and.includes({ name: 'Blacklist' });
    });
  });
});
