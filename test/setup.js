/* eslint-disable mocha/no-top-level-hooks */
/* eslint-disable mocha/no-hooks-for-single-case */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);
global.expect = require('chai').expect;

global.ISE = require('..');
global.PATHS = require('../lib/paths');

if ((process.env.TEST_MODE || '').trim() === 'live') {
  global.LIVE_TEST = true;
  global.ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);
  console.log(`Tests running against a live ISE environment (${ise.host})`);
} else {
  global.LIVE_TEST = false;
  global.ise = new ISE('ise.example.com', 'goodtest', 'goodtest');
  global.nock = require('nock');
}

global.BASEURL = `https://${ise.host}/admin`;
global.ROOT = '/';

before('Login to ISE', async () => ise.login());

after('Logout of ISE', async () => ise.logout());
