'use strict';
require('./setup');
// if (!LIVE_TEST) require('./mocks/endpoints.nock');

const NETWORK_DEVICE_KEYS = ['NetworkDeviceName', 'NoOfDevicesPerNad', 'Device Type', 'Location'];

describe('Context Visibility: Network Devices:', () => {
  describe('Get network devices:', () => {
    it('should get all network devices (no pagination)', async () => {
      const devices = await ise.getNetworkDevices();
      expect(devices)
        .to.be.an('array')
      //   .with.lengthOf.at.least(2);
      // expect(devices[0])
      //   .to.be.an('object')
      //   .that.includes.keys(NETWORK_DEVICE_KEYS);
    });
    it('should get all network devices (with pagination)', async () => {
      const device = await ise.getNetworkDevices({}, { pageSize: 1 });
      expect(device)
        .to.be.an('array')
      // .with.a.lengthOf.at.least(2);
    });
    it('should get all network devices (with filter)', async () => {
      const device = await ise.getNetworkDevices({ NetworkDeviceName: 'Edge' });
      expect(device)
        .to.be.an('array')
      // .with.a.lengthOf.at.least(2);
    });
    it('should get a single network device', async () => {
      const device = await ise.getNetworkDevice('HRN1-Edge-2.ngn.lab');
      expect(device)
        .to.be.an('array')
      //   .that.has.a.lengthOf(1);
      // expect(device[0]).that.includes.keys(NETWORK_DEVICE_KEYS);
    });
  });
});
