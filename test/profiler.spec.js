require('./setup');
const { expect } = require('chai');
const fs = require('fs');
// if (!LIVE_TEST) require('./mocks/endpoints.nock');

const PROFILER_POLICY_KEYS = [
  'id',
  'name',
  'description',
  'minimumCertainty',
  'createIdentityGroup',
  'enabled',
  'hasChildren',
  'type',
  'version'
];

const PROFILER_DROPDOWN_KEYS = ['id', 'name', 'label'];

describe('Endpoint Profiling Policies:', () => {
  describe('Get endpoint profiling policies:', () => {
    it('should get 25 full profiles', async () => {
      const profiles = await ise.getEndpointProfilingPolicies();
      expect(profiles.totalItems).to.be.at.least(500);
      expect(profiles).to.be.an('object');
      expect(profiles.items).to.be.an('array').with.lengthOf.at.least(25);
      profiles.items.forEach((profile) =>
        expect(profile)
          .to.be.an('object')
          .that.includes.keys(PROFILER_POLICY_KEYS)
      );
    });
    // Not running these tests as they takes around 5m to return
    // the full list. This function be used sparingly.
    // it('should get all profiles (up to 1000)', async () => {
    //   const profiles = await ise.getEndpointProfilingPolicies(0, 1000);
    //   expect(profiles).to.be.an('array').with.lengthOf(25);
    //   expect(profiles[0])
    //     .to.be.an('object')
    //     .that.includes.keys(PROFILER_POLICY_KEYS);
    // });
    // it('should get the Cisco-Device profile', async () => {
    //   const profile = await ise.getEndpointIdentityGroup('Cisco-Device');
    //   expect(profile)
    //     .to.be.an('object')
    //     .that.includes.keys(PROFILER_POLICY_KEYS)
    //     .and.includes({ name: 'Cisco-Device' });
    // });
    it('should get profiling policies for dropdown list', async () => {
      const profiles = await ise.getEndpointProfilingPoliciesList();
      expect(profiles).to.be.an('array').with.lengthOf.at.least(500);
      profiles.forEach((profile) =>
        expect(profile)
          .to.be.an('object')
          .that.includes.keys(PROFILER_DROPDOWN_KEYS)
      );
    });
    it('should get single profiling policy from dropdown list', async () => {
      const profile = await ise.getEndpointProfilingPoliciesList(
        'Cisco-Device'
      );
      expect(profile)
        .to.be.an('object')
        .that.includes.keys(PROFILER_DROPDOWN_KEYS)
        .and.includes({ name: 'Cisco-Device' });
    });
  });
});
