const ISE = require('..');

const ise = new ISE(
  process.env.ISE_HOST,
  process.env.ISE_USER,
  process.env.ISE_PASS
);
module.exports = ise;
