const ise = require('../setup');

ise
  .login()
  .then(() => ise.getEndpointProfilingPolicies(0, 1500))
  .then(profiles => {
    console.dir(profiles);
    console.log(`There are ${profiles.totalItems} profiles.`);
    return profiles.items.map(profile => profile.name);
  })
  .then(list =>
    console.log('Here is a quick list', list, '\n Count: ', list.length)
  )
  .catch(error => console.dir(error));
