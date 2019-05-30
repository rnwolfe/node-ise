'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

global.ISE = require('../');

global.ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);
