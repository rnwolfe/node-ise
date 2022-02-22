/* eslint-disable mocha/no-top-level-hooks */
/* eslint-disable mocha/no-hooks-for-single-case */
/* eslint-disable prefer-template */
/* eslint-disable global-require */

const path = require('path');
require('dotenv').config({
  path: path.resolve('./test') + '/.env'
});
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { expect } = require('chai');

chai.should();
chai.use(chaiAsPromised);
global.expect = require('chai').expect;

global.ISE = require('..');
global.PATHS = require('../lib/paths');

if ((process.env.TEST_MODE || '').trim() === 'mock') {
  // Need more complete mocks here for this to be useful, defaults to live test.
  global.LIVE_TEST = false;
  global.ise = new ISE('ise.example.com', 'goodtest', 'goodtest');
  global.nock = require('nock');
} else {
  // Live tests expect env vars
  // Check if ISE_VER is set
  const ISE_VER = (process.env.ISE_VER || '').replace(/\./, '');

  // If version provided, update env with specific version vars
  if (ISE_VER !== '') {
    var ISE_HOST = process.env[`ISE${ISE_VER}_HOST`] || '';
    var ISE_USER = process.env[`ISE${ISE_VER}_USER`] || '';
    var ISE_PASS = process.env[`ISE${ISE_VER}_PASS`] || '';
  } else {
    var ISE_HOST = process.env.ISE_HOST || '';
    var ISE_USER = process.env.ISE_USER || '';
    var ISE_PASS = process.env.ISE_PASS || '';
  }
  // Make sure env vars were passed and not empty
  if (ISE_HOST === '' || ISE_USER === '' || ISE_PASS === '') {
    throw new ReferenceError(
      'ISE_HOST, ISE_USER, and ISE_PASS environment variables are required for tests. \n\n' +
      'If providing a specific version, ISE_VER is required with ISE<ISE_VER>_HOST, ISE<ISE_VER>_USER, ISE<ISE_VER>_PASS'
    );
  }
  global.LIVE_TEST = true;
  global.ise = new ISE(ISE_HOST, ISE_USER, ISE_PASS);

  console.log(`Tests running against a live ISE environment (${ise.host})`);
}

global.BASEURL = `https://${ise.host}/admin`;
global.ROOT = '/';

const blacklistMacs = [
  '00:00:00:00:00:01',
  '00:00:00:00:00:02',
  '00:00:00:00:00:03',
  '00:00:00:00:00:04',
  '00:00:00:00:00:05'
];
const blacklistOptions = { identityGroup: 'Blacklist' };
const workstationMacs = [
  '00:00:00:00:00:21',
  '00:00:00:00:00:22',
  '00:00:00:00:00:23',
  '00:00:00:00:00:24',
  '00:00:00:00:00:25'
];
const workstationOptions = { policyName: 'Workstation' };
const extraMacs = [
  '00:00:00:00:00:06',
  '00:00:00:00:00:07',
  '00:00:00:00:00:08',
  '00:00:00:00:00:09',
  '00:00:00:00:00:10',
  '00:00:00:00:00:11',
  '00:00:00:00:00:12',
  '00:00:00:00:00:13',
  '00:00:00:00:00:14',
  '00:00:00:00:00:15'
];

before(async () => {
  console.log('Setting up test environment: ');
  it('login to ise', async () => {
    expect(await ise.login()).to.be.true;
  });
  it('create test endpoints', async () => {
    await ise.login();
    blacklistMacs.forEach(async (mac) => {
      await ise.createEndpoint(mac, blacklistOptions);
      await setTimeout(() => { }, 1000);
    });
    workstationMacs.forEach(async (mac) => {
      await ise.createEndpoint(mac, workstationOptions);
      await setTimeout(() => { }, 1000);
    });
    extraMacs.forEach(async (mac) => {
      await ise.createEndpoint(mac);
      await setTimeout(() => { }, 1000);
    });
    await setTimeout(() => { }, 1000);
  });
});

after(async () => {
  // This is firing, but it() blocks don't seem to
  console.log('Cleaning up test environment:');
  it('delete test endpoints', async () => {
    console.log('deleting all endpoints');
    allMacs = [...blacklistMacs, ...workstationMacs, ...extraMacs];
    allMacs.forEach(async (mac) => {
      await ise.deleteEndpoint(mac);
      await setTimeout(() => { }, 1000);
    });
  });
  it('logout of ise', async () => {
    console.log('logging out of ISE');
    expect(await ise.logout()).to.be.true;
  });
});
