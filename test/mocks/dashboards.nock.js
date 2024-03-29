require('./auth.nock');

const replyBody = [
  {
    owner: null,
    repositoryName: null,
    configName: null,
    __equalsCalc: null,
    __hashCodeCalc: false,
    alaramAuditId: null,
    alarmRule: null,
    alarm: {
      owner: null,
      repositoryName: null,
      configName: null,
      alarmId: 6001,
      alarmGUId: 'a0905f75-0417-4962-9558-8548da61a5bb',
      alarmName: 'Unknown SGT was provisioned',
      threshold: null,
      link: null,
      resolution: null,
      loggedInUser: null,
      alarmGuids: null,
      alarmCategoryName: 'Trustsec',
      severity: 3,
      enabled: 0,
      description: null,
      updateTime: null
    },
    visitedNumber: 842,
    message: null,
    alarmTimeStamp: 1559239293772,
    reportLink: null,
    updateTime: null,
    lastOccur: '618301',
    strAlarmTimeStamp: 'May 30 2019 14:01:33.772 PM',
    reportInstanceId: null,
    isLocal: null
  },
  {
    owner: null,
    repositoryName: null,
    configName: null,
    __equalsCalc: null,
    __hashCodeCalc: false,
    alaramAuditId: null,
    alarmRule: null,
    alarm: {
      owner: null,
      repositoryName: null,
      configName: null,
      alarmId: 2022,
      alarmGUId: '8a1b21cf-14e2-4dda-8f4f-60a7a755678a',
      alarmName: 'Insufficient Virtual Machine Resources',
      threshold: null,
      link: null,
      resolution: null,
      loggedInUser: null,
      alarmGuids: null,
      alarmCategoryName: 'Administrative and Operational Audit',
      severity: 1,
      enabled: 0,
      description: null,
      updateTime: null
    },
    visitedNumber: 249,
    message: null,
    alarmTimeStamp: 1559201433772,
    reportLink: null,
    updateTime: null,
    lastOccur: '38478301',
    strAlarmTimeStamp: 'May 30 2019 03:30:33.772 AM',
    reportInstanceId: null,
    isLocal: null
  }
];

// Return system alarms
nock(BASEURL)
  .get(ROOT + PATHS.GENERIC_DASHBOARD)
  .reply(200, replyBody);
