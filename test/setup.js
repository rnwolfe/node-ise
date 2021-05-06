/* eslint-disable mocha/no-top-level-hooks */
/* eslint-disable mocha/no-hooks-for-single-case */
const path = require('path');
const dotenv = require('dotenv').config({
  path: path.resolve('./test') + '/.env'
});
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// console.log(dotenv.config({ path: path.resolve('./test') + '/.env' }));
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

before('Login to ISE', async () => ise.login());

after('Logout of ISE', async () => ise.logout());
