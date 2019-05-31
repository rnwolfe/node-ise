'use strict';
require('./setup');

if (!LIVE_TEST) require('./mocks/dashboards.nock');

describe('ISE Dashboards:', () => {
  describe('System Alarms:', () => {
    it('should get system alarms', async () => {
      const alarms = await ise.getGenericDashboard();
      expect(alarms).to.be.an('array');
      expect(alarms[0]).to.have.nested.property('alarm');
      expect(alarms[0]).to.include.keys([
        'owner',
        'configName',
        'alarmRule',
        'alarm',
        'alaramAuditId',
        'alarmTimeStamp',
        'isLocal',
        'lastOccur',
        'message',
        'reportInstanceId',
        'reportLink',
        'repositoryName',
        'strAlarmTimeStamp',
        'updateTime',
        'visitedNumber'
      ]);
    });
  });
});
