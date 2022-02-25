const ise = require('./setup');

ise
  .login()
  .then(() => Promise.all([ise.getSystemAlarms(), ise.getSystemSummary()]))
  .then(values => {
    const [alarms, summary] = values;
    console.log('Alarms');
    console.table(alarms);
    console.log('System Summaries');
    console.log('60 Minutes');
    console.table(summary['60MIN'][0].Memory);
    console.table(summary['60MIN'][0].CPU);
    console.table(summary['60MIN'][0].Latency);
    console.log('24 Hours');
    console.table(summary['24HR'][0].Memory);
    console.table(summary['24HR'][0].CPU);
    console.table(summary['24HR'][0].Latency);
  });
