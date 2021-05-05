require('./setup');

if (!LIVE_TEST) require('./mocks/dashboards.nock');

const SYSTEM_ALARM_KEYS = [
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
  'visitedNumber',
];

describe('ISE Dashboards:', () => {
  describe('System Alarms:', () => {
    it('should get system alarms', async () => {
      const alarms = await ise.getGenericDashboard();
      expect(alarms).to.be.an('array');
      expect(alarms[0]).to.have.nested.property('alarm');
      expect(alarms[0]).to.include.keys(SYSTEM_ALARM_KEYS);
    });
    it('should also get system alarms', async () => {
      const alarms = await ise.getSystemAlarms();
      expect(alarms).to.be.an('array');
      expect(alarms[0]).to.have.nested.property('alarm');
      expect(alarms[0]).to.include.keys(SYSTEM_ALARM_KEYS);
    });
    it('should get system summary', async () => {
      const data = await ise.getSystemSummary();
      expect(data).to.be.an('object');
    });
  });
});
