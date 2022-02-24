/* eslint-disable class-methods-use-this */
/**
 * Make sure we've resolved everything we need in resolveRadiusPolicySet
 * everything else? :)
 * link with node-pxgrid to auto-gen client setup
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const unzip = util.promisify(require('extract-zip'));

const http = require('axios');
const https = require('https');
const qs = require('querystring');
const ObjectsToCsv = require('objects-to-csv');

const PATHS = require('./paths');

const TESTED_VERSIONS = ['2.4', '2.6'];

class ISE {
  constructor(host, username, password) {
    this.host = host;
    this.username = username;
    this.password = password;
    this.isLoggedIn = false;
  }

  login() {
    const reqBody = qs.stringify({
      username: this.username,
      password: this.password,
      authType: 'Internal',
      rememberme: 'on',
      name: this.username,
      newPassword: '',
      destinationURL: '',
      xeniaUrl: '',
      locale: 'en'
    });

    const session = this._createIseSession();
    return (
      session
        .post(PATHS.LOGIN, reqBody, { maxRedirects: 0 })
        .then((response) => {
          // Handle errors
          // A full HTML doc means failure.
          if (response.data.includes('<html')) {
            throw this._handleError('Failed to login!', response);
          }

          // No cookies means something went wrong.
          // Even bad credentials give an APPSESSIONID that doesn't work.
          if (!response.headers['set-cookie']) {
            throw this._handleError(
              'Response did not contain any cookies!',
              response
            );
          }

          // These URL redirects indicate bad credentials
          if (
            response.headers.location ===
            '/admin/login.jsp?mid=external_auth_msg' || // ISE2.4
            response.headers.location === '/admin/login.jsp?mid=auth_failed' // ISE3.0
          ) {
            throw this._handleError(
              'Authentication failed. Bad username or password.',
              response
            );
          }

          // Check cookies
          if (response.headers['set-cookie']) {
            const cookies = {};
            response.headers['set-cookie'].forEach((cookie) => {
              const [key, value] = cookie.split(';')[0].split('=');
              cookies[key.toLocaleLowerCase()] = value;
            });
            if (!('token' in cookies) && response.headers.location !== '/') {
              // ISE3.0 does not use TOKEN header, and only other differentiator
              // is the redirect to / on success.
              throw this._handleError(
                'Missing TOKEN cookie. An error occurred in authentication. Double check credentials.',
                response
              );
            }
            if (!('appsessionid' in cookies)) {
              throw this._handleError(
                'Missing APPSESSIONID cookie. An error occurred in authentication. Double check credentials.',
                response
              );
            }
            // Successful login should have an APPSESSIONID and TOKEN cookie.
            const sessionCookieArray = response.headers[
              'set-cookie'
            ].filter((cookie) => cookie.includes('APPSESSIONID'));
            const sessionIdCookie = sessionCookieArray[0].split(';')[0];
            session.defaults.headers.Cookie = sessionIdCookie;
            // eslint-disable-next-line prefer-destructuring
            this.sessionId = sessionIdCookie.split('=')[1];
            this.session = session;
            return this.sessionId;
          }
          return false;
        })
        .then(() => this.getCsrfToken())
        // We've made reasonable attempts at catching bad logins,
        // but given variations in ISE versions, best approach to finish up with
        // is to make an API call and validate the response is what we expect.
        // Reminder: this is a non-documented, "non-public" API! :)
        .then(() =>
          this.getNodes().then((nodes) => {
            if (
              nodes.length > 0 &&
              typeof nodes === 'object' &&
              'hostname' in nodes[0]
            ) {
              this.isLoggedIn = true;
              this.iseNodes = nodes;
              this.iseVersion = nodes[0].version;
              return true;
            }
            throw this._handleError(
              `${'Login failed, please check your ISE hostname and credentials. ' +
              'Otherwise, this may be an issue with your version of ISE. Note that this is ' +
              'using a non-public API that Cisco can change without warning or notification.' +
              'This library has only been *successfully* tested against ISE versions: '
              }${TESTED_VERSIONS.join(', ')}`
            );
          })
        )
    );
  }

  getCsrfToken() {
    return this._getWithMeta('login.jsp', { maxRedirects: 0 }).then(
      (response) => {
        // This has been made "optional."
        // If we can get it, we'll use it. If not, we'll continue.
        // This is due to changes in the login flow of each version of ISE.
        // The CSRF token was a nice to have, but never appeared to affect the
        // usage of the API if it wasn't present. If these are found in the future,
        // we can implement a csrf check that throws if not found.
        if (response.status === 200) {
          const csrfRegex = /<input.*?id="CSRFTokenNameValue".*?value=(.*?) \/>$/m;
          const csrfMatch = response.data.match(csrfRegex);
          if (!csrfMatch) {
            // eslint-disable-next-line max-len
            // throw this._handleError('Login was successful, but was unable to retrieve the CSRF Token!', response)
            return false;
          }
          const csrfToken = csrfMatch[1].split('=')[1];
          this.csrfToken = csrfToken;
          this.session.defaults.headers.OWASP_CSRFTOKEN = csrfToken;
          return true;
        }
        return false;
      }
    );
  }

  logout() {
    // eslint-disable-next-line no-console
    console.info('Log out not yet implemented.');
    // const reqConfig = { maxRedirects: 0 };
    // return this._getWithMeta(PATHS.LOGOUT, reqConfig).then((response) => {
    //   if (response.status === 302) {
    //     this.isLoggedIn = false;
    //     this.sessionId = null;
    //     this.csrfToken = null;
    //     return true;
    //   }
    //   throw this._handleError('There was an error logging out.', response);
    // });
  }

  // ENDPOINTS
  visibilityEndpointRequest(filter = {}, options = {}) {
    const defaults = {
      columns: ['MACAddress'],
      sortBy: 'MACAddress',
      startAt: 1,
      pageSize: 500,
      paginated: true
    };
    const query = { ...defaults, ...options };
    const reqConfig = this._addQPH(query, filter);
    // TODO: FIX LATER: using direct get due to headers not being passed back in _get
    return this._getWithMeta(`${PATHS.API}visibility`, reqConfig);
  }

  getEndpoint(mac) {
    return this._get(`${PATHS.API}visibility/endpoint/${mac}`);
  }

  resolveAllEndpoints(response, filter = {}) {
    const promises = [];
    // endpoint handling
    const macs = this._pullOutMacs(response.data);
    macs.forEach((mac) => {
      promises.push(this.getEndpoint(mac));
    });

    // pagination
    const [startItem, endItem, totalEndpoints] = response.headers[
      'content-range'
    ]
      .split(/[-/]/)
      .map((e) => parseInt(e));

    const hasNextPage = endItem < totalEndpoints;
    const pageSize = endItem - startItem;
    const pageNum = endItem / pageSize;
    if (hasNextPage) {
      promises.push(
        this.visibilityEndpointRequest(filter, {
          startAt: pageNum + 1,
          pageSize
        }).then((endpoints) => this.resolveAllEndpoints(endpoints))
      );
    }
    return Promise.all(promises);
  }

  getEndpoints(filter, options) {
    return this.visibilityEndpointRequest(filter, options)
      .then((response) => this.resolveAllEndpoints(response, filter))
      .then((endpoints) => this._flatten(endpoints));
  }

  endpointsToCsv(filter = {}) {
    const filename = `endpoints-${this.host}-${Date.now()}.csv`;
    const filepath = path.resolve(process.cwd(), filename);
    return this.visibilityEndpointRequest(filter)
      .then((response) => this.resolveAllEndpoints(response))
      .then((endpoints) => this._flatten(endpoints))
      .then((endpoints) => this._exportToCsv(endpoints, filepath));
  }

  async createEndpoint(macAddress, data = {}) {
    // TODO: Validate MAC format or normalize.
    if (!macAddress) {
      throw this._handleError('MAC Address is required.');
    }
    if (data.identityGroup) {
      var identityGroup = await this.getEndpointIdentityGroupList(
        data.identityGroup
      );
    }
    if (data.policyName) {
      var policyName = await this.getEndpointProfilingPoliciesList(
        data.policyName
      );
    }
    const body = {
      'endPoint.macAddress': macAddress,
      'endPoint.description': data.description || '',
      'endPoint.staticEndpoint': !!policyName,
      'endPoint.policyName': policyName ? policyName.id : '',
      'endPoint.identityGroup': identityGroup ? identityGroup.id : '',
      'endPoint.staticGroupEndpoint': !!identityGroup,
      'endPoint.customAttributes': ''
    };
    return this._postForm(
      PATHS.ENDPOINT_ACTION,
      body,
      this._addQPH({ command: 'createXHR' }, {}, true)
    ).then((response) => {
      return response.status && response.status === 'passed';
    });
  }

  deleteEndpoint(macAddress) {
    // TODO: Validate MAC format or normalize.
    if (!macAddress) {
      throw this._handleError('MAC Address is required.');
    }
    const body = { macToEdit: macAddress };
    return this._postForm(
      PATHS.ENDPOINT_ACTION,
      body,
      this._addQPH({ command: 'deleteXHR' }, {}, true)
    ).then((response) => {
      return response.status && response.status === 'passed';
    });
  }

  // IDENTITY GROUPS
  getEndpointIdentityGroups() {
    const config = this._addQPH({ command: 'restjson' });
    return this._get(PATHS.ENDPOINT_IDENTITY_GROUP_ACTION, config).then(
      (identityGroups) => identityGroups.items
    );
  }

  /**
   * Get the first Endpoint Identity Group matching the given name.
   *
   * @param {*} name
   * @return {*}
   * @memberof ISE
   */
  getEndpointIdentityGroup(name) {
    if (!name) {
      throw this._handleError('Identity Group name is required.');
    }
    return this.getEndpointIdentityGroups().then(
      (groups) => groups.filter((group) => group.name === name)[0]
    );
  }

  /**
   * Returns a quick list of Endpoint Groups (for dropdown use in creating endpoints).
   *
   * @param {*} [name] Return first result matching this name.
   * @return {Promise} An array of profile names, labels, and ids. If filter provided, object containing first match.
   * @memberof ISE
   */
  getEndpointIdentityGroupList(name) {
    const config = this._addQPH({
      command: 'fetchEndpointGroupDropDown'
    });
    return this._get(PATHS.PROFILER_LIST, config).then((groups) => {
      if (name) {
        return groups.items.filter((group) => group.name === name)[0];
      }
      return groups.items;
    });
  }

  // PROFILER

  /**
   * This polls the full profiler policy list. It is a quite slow (up to 5m to pull list of ~700 at once).
   * Recommendation is to use this only when necessary, and use getEndpointProfilingPoliciesList() for the
   * id, name, and label. If using, it is recommended to store returned values to continued usage.
   *
   * @return {Promise} An object with profiles array in `items` and total items count in `totalItems`.
   * @memberof ISE
   */
  getEndpointProfilingPolicies(start = 0, count = 25) {
    // TODO: Potentially handle pagination
    // TODO: Allow profile name filter to be passed in
    const config = this._addQPH(
      {
        command: 'loadTable',
        start,
        count,
        sort: 'name'
      },
      {},
      true
    );
    return this._get(PATHS.PROFILER_ACTIONS, config).then((profiles) => {
      return {
        items: profiles.items,
        totalItems: parseInt(profiles.totalItems)
      };
    });
  }

  /**
   * Returns a quick list of Endpoint Groups (for dropdown use in creating endpoints).
   *
   * @param {*} [name] Return first result matching this name.
   * @return {Promise} An array of profile names, labels, and ids. If filter provided, object containing first match.
   * @memberof ISE
   */
  getEndpointProfilingPoliciesList(name) {
    const config = this._addQPH({
      command: 'fetchProfileDropDownWithUnknown'
    });
    return this._get(PATHS.PROFILER_LIST, config).then((profiles) => {
      if (name) {
        return profiles.items.filter((profile) => profile.name === name)[0];
      }
      return profiles.items;
    });
  }

  // USERS
  visibilityUserRequest(filter = {}, options = {}) {
    const defaults = {
      columns: [
        'FirstName',
        'LastName',
        'userName',
        'NoOfDevicesPerUser',
        'Email',
        'User-Fetch-Telephone',
        'User-Fetch-Department',
        'User-Fetch-Job-Title',
        'PortalUser'
      ],
      sortBy: 'FirstName',
      startAt: 1,
      pageSize: 500
    };
    const query = {
      ...defaults,
      ...options
    };
    const reqConfig = this._addQPH(query, filter);
    return this._getWithMeta(`${PATHS.API}visibility`, reqConfig);
  }

  resolveAllUsers(response, filter = {}) {
    const promises = [];
    response.data.forEach((user) => {
      promises.push(JSON.parse(user));
    });
    // pagination
    const [startItem, endItem, totalItems] = response.headers['content-range']
      .split(/[-/]/)
      .map((e) => parseInt(e));

    const hasNextPage = endItem < totalItems;
    const pageSize = endItem - startItem;
    const pageNum = endItem / pageSize;
    if (hasNextPage) {
      promises.push(
        this.visibilityUserRequest(filter, {
          startAt: pageNum + 1,
          pageSize
        }).then((users) => this.resolveAllUsers(users))
      );
    }
    return Promise.all(promises);
  }

  getUser(username) {
    return this.visibilityUserRequest(
      { userName: username },
      { exactMatch: true }
    ).then((response) => JSON.parse(response.data));
  }

  getUsers(filter, options) {
    return this.visibilityUserRequest(filter, options)
      .then((response) => this.resolveAllUsers(response, filter))
      .then((users) => this._flatten(users));
  }

  // APPLICATIONS
  visibilityApplicationsRequest(filter = {}, options = {}) {
    const defaults = {
      pageType: 'app',
      columns: [
        'productName',
        'version',
        'vendorName',
        'categories',
        'operatingSystem',
        'noOfDevicesPerApp'
      ],
      sortBy: 'productName',
      startAt: 1,
      pageSize: 500
    };
    const query = {
      ...defaults,
      ...options
    };
    const reqConfig = this._addQPH(query, filter);
    return this._getWithMeta(`${PATHS.API}visibility`, reqConfig);
  }

  resolveAllApplications(response, filter = {}) {
    const promises = [];
    response.data.forEach((app) => {
      promises.push(app);
    });
    // pagination
    const [startItem, endItem, totalItems] = response.headers['content-range']
      .split(/[-/]/)
      .map((e) => parseInt(e));

    const hasNextPage = endItem < totalItems;
    const pageSize = endItem - startItem;
    const pageNum = endItem / pageSize;
    if (hasNextPage) {
      promises.push(
        this.visibilityApplicationsRequest(filter, {
          startAt: pageNum + 1,
          pageSize
        }).then((applications) => this.resolveAllApplications(applications))
      );
    }
    return Promise.all(promises);
  }

  getApplications(filter, options) {
    return this.visibilityApplicationsRequest(filter, options)
      .then((response) => this.resolveAllApplications(response, filter))
      .then((endpoints) => this._flatten(endpoints));
  }

  // NETWORK DEVICE VISIBILITY
  visibilityNetworkDevicesRequest(filter = {}, options = {}) {
    const defaults = {
      columns: [
        'NetworkDeviceName',
        'Device Type',
        'Location',
        'NoOfDevicesPerNad',
        'reportStatus'
      ],
      sortBy: 'NetworkDeviceName',
      startAt: 1,
      pageSize: 500
    };
    const query = {
      ...defaults,
      ...options
    };
    const reqConfig = this._addQPH(query, filter);
    return this._getWithMeta(`${PATHS.API}visibility`, reqConfig);
  }

  resolveAllNetworkDevices(response, filter = {}) {
    const promises = [];
    response.data.forEach((device) => {
      promises.push(device);
    });
    // pagination
    const [startItem, endItem, totalItems] = response.headers['content-range']
      .split(/[-/]/)
      .map((e) => parseInt(e));

    const hasNextPage = endItem < totalItems;
    const pageSize = endItem - startItem;
    const pageNum = endItem / pageSize;
    if (hasNextPage) {
      promises.push(
        this.visibilityNetworkDevicesRequest(filter, {
          startAt: pageNum + 1,
          pageSize
        }).then((devices) => this.resolveAllNetworkDevices(devices))
      );
    }
    return Promise.all(promises);
  }

  getNetworkDevice(name) {
    return this.getNetworkDevices({ NetworkDeviceName: name });
  }

  /**
   * Get all network device details.
   *
   * If filter provided, object contains items matching the filter.
   *
   * Filter can should be an object wit the key and value to match:
   *
   * ```js
   * ise.getNetworkDevices({ 'Device Type': 'Device Type#All Device Types#Switches' }))
   * // Returns all devices with the Device Type of 'Switches'
   * ```
   *
   * @param {*} filter
   * @param {*} option
   * @return {Promise} Promise that resolves to an array of network devices.
   * @memberof ISE
   */
  getNetworkDevices(filter, option) {
    return this.visibilityNetworkDevicesRequest(filter, option)
      .then((response) => this.resolveAllNetworkDevices(response, filter))
      .then((endpoints) => this._flatten(endpoints));
  }

  // RADIUS POLICY SETS
  getRadiusPolicySets(options) {
    const defaults = { startAt: 1, pageSize: 25 };
    const query = { ...defaults, ...options };
    return this._get(PATHS.RADIUS_POLICY_SETS, this._addQPH(query));
  }

  getRadiusPolicySetByName(name) {
    return this.getRadiusPolicySets().then((policySets) => {
      const policySet = policySets.find((set) => set.name === name);
      if (typeof policySet === 'undefined') {
        throw this._handleError('Provided RADIUS policy set does not exist.');
      }
      return policySet;
    });
  }

  resolveRadiusPolicySet(policySet) {
    return Promise.all([
      this.getRadiusAuthenticationPolicy(policySet),
      this.getRadiusAuthorizationPolicy(policySet),
      this.getRadiusLocalExceptions(policySet),
      this.getRadiusGlobalExceptions(),
      this.getRadiusSecurityGroups(),
      this.getRadiusServiceNames(),
      this.getRadiusFailovers(),
      this.getRadiusIdentityStores(),
      this.getRadiusAuthorizationProfiles()
    ]).then((values) => {
      const data = {
        authcPolicy: values[0],
        authzPolicy: values[1],
        localExceptions: values[2],
        globalExceptions: values[3],
        securityGroups: values[4],
        serviceNames: values[5],
        failovers: values[6],
        identityStores: values[7],
        authzProfiles: values[8]
      };
      return data;
    });
  }

  getRadiusSecurityGroups() {
    return this._get(PATHS.RADIUS_SECURITY_GROUPS);
  }

  getRadiusServiceNames() {
    return this._get(PATHS.RADIUS_SERVICE_NAMES);
  }

  getRadiusAuthorizationProfiles() {
    return this._get(PATHS.RADIUS_AUTHZ_PROFILES);
  }

  getRadiusIdentityStores() {
    return this._get(PATHS.RADIUS_IDENTITY_STORES);
  }

  getRadiusFailovers() {
    return this._get(PATHS.RADIUS_FAILOVERS);
  }

  getRadiusAuthenticationPolicy(policySet) {
    return this._get(PATHS.RADIUS_AUTHENTICATION_POLICY(policySet));
  }

  getRadiusAuthorizationPolicy(policySet) {
    return this._get(PATHS.RADIUS_AUTHORIZATION_POLICY(policySet));
  }

  getRadiusLocalExceptions(policySet) {
    return this._get(PATHS.RADIUS_LOCAL_EXCEPTIONS(policySet));
  }

  getRadiusGlobalExceptions() {
    return this._get(PATHS.RADIUS_GLOBAL_EXCEPTIONS).then((response) => {
      if (response === '' || !response) {
        return undefined;
      }
      return response;
    });
  }

  // TACACS POLICY SETS
  getTacacsPolicySets(options) {
    const defaults = { startAt: 1, pageSize: 25 };
    const query = { ...defaults, ...options };
    return this._get(PATHS.TACACS_POLICY_SETS, this._addQPH(query));
  }

  getTacacsPolicySetByName(name) {
    return this.getTacacsPolicySets().then((policySets) => {
      const policySet = policySets.find((set) => set.name === name);
      if (typeof policySet === 'undefined') {
        throw this._handleError('Provided TACACS policy set does not exist.');
      }
      return policySet;
    });
  }

  resolveTacacsPolicySet(policySet) {
    return Promise.all([
      this.getTacacsAuthenticationPolicy(policySet),
      this.getTacacsAuthorizationPolicy(policySet),
      this.getTacacsLocalExceptions(policySet),
      this.getTacacsGlobalExceptions(),
      this.getTacacsServiceNames(),
      this.getTacacsFailovers(),
      this.getTacacsIdentityStores(),
      this.getTacacsShellProfiles(),
      this.getTacacsCommandSets()
    ]).then((values) => {
      const data = {
        authcPolicy: values[0],
        authzPolicy: values[1],
        localExceptions: values[2],
        globalExceptions: values[3],
        securityGroups: values[4],
        serviceNames: values[4],
        failovers: values[5],
        identityStores: values[6],
        shellProfiles: values[7],
        commandSets: values[8]
      };
      return data;
    });
  }

  getTacacsServiceNames() {
    return this._get(PATHS.TACACS_SERVICE_NAMES);
  }

  getTacacsShellProfiles() {
    return this._get(PATHS.TACACS_SHELL_PROFILES);
  }

  getTacacsCommandSets() {
    return this._get(PATHS.TACACS_COMMAND_SETS);
  }

  getTacacsIdentityStores() {
    return this._get(PATHS.TACACS_IDENTITY_STORES);
  }

  getTacacsFailovers() {
    return this._get(PATHS.TACACS_FAILOVERS);
  }

  getTacacsAuthenticationPolicy(policySet) {
    return this._get(PATHS.TACACS_AUTHENTICATION_POLICY(policySet));
  }

  getTacacsAuthorizationPolicy(policySet) {
    return this._get(PATHS.TACACS_AUTHORIZATION_POLICY(policySet));
  }

  getTacacsLocalExceptions(policySet) {
    return this._get(PATHS.TACACS_LOCAL_EXCEPTIONS(policySet));
  }

  getTacacsGlobalExceptions() {
    return this._get(PATHS.TACACS_GLOBAL_EXCEPTIONS).then((response) => {
      if (response === '' || !response) {
        return undefined;
      }
      return response;
    });
  }

  // SXP
  getSxpBindings() {
    return this._get(PATHS.SXP_BINDINGS);
  }

  // METRICS
  /**
   * Returns the total number of unique endpoints known to ISE.
   *
   * **In ISE UI**: This API populates the Total Endpoints dashboard pane.
   *
   * @return {Promise} A promise that resolves to the number of total number of endpoints.
   * @memberof ISE
   */
  getTotalEndpoints() {
    return this._get(PATHS.TOTAL_ENDPOINTS_METRIC).then(
      (response) => response.attrValue
    );
  }

  /**
   * Returns the total number of unique endpoints with active sessions as determined by RADIUS accounting state.
   *
   * **In ISE UI**: This API populates the Active Endpoints dashboard pane.
   *
   * @return {Promise} A promise that resolves to the number of active endpoint sessions.
   * @memberof ISE
   */
  getActiveEndpoints() {
    return this._get(PATHS.ACTIVE_ENDPOINTS_METRIC).then(
      (response) => response.attrValue
    );
  }

  /**
   * Returns the number of unique endpoints which were rejected.
   *
   * **In ISE UI**: This API populates the Rejected Endpoints dashboard pane.
   *
   * @return {Promise} A promise that resolves to the number of active endpoint sessions.
   * @memberof ISE
   */
  getRejectedEndpoints() {
    return this._get(PATHS.REJECTED_ENDPOINTS_METRIC).then(
      (response) => response.attrValue
    );
  }

  /**
   * Returns the number of anomalous endpoints.
   *
   * **In ISE UI**: This API populates the Anamoulous Behavior dashboard pane.
   *
   * @return {Promise} A promise that resolves to the number of anomalous endpoints.
   * @memberof ISE
   */
  getAnomalousEndpoints() {
    return this._get(PATHS.ANOMALOUS_ENDPOINTS_METRIC).then(
      (response) => response.attrValue
    );
  }

  /**
   * Returns the total number of BYOD endpoints that were authenticated by ISE.
   *
   * **In ISE UI**: This API populates the BYOD Endpoints dashboard pane.
   *
   * @return {Promise} A promise that resolves to the number of anomalous endpoints.
   * @memberof ISE
   */
  getByodEndpoints() {
    return this._get(PATHS.BYOD_ENDPOINTS_METRIC).then(
      (response) => response.attrValue
    );
  }

  /**
   * Returns the total number of endpoints with active sessions that were authenticated against the guest user database.
   *
   * **In ISE UI**: This API populates the Authenticated Guests dashboard pane.
   *
   * @return {Promise} A promise that resolves to the number of authenticated guests.
   * @memberof ISE
   */
  getAuthenticatedGuests() {
    return this._get(PATHS.AUTHENTICATED_GUEST_METRIC).then(
      (response) => response.attrValue
    );
  }

  // CHARTS
  // TODO: There is fetchDataWithFilter URIs, as well.
  getDeviceComplianceChartData() {
    return this._get(PATHS.DEVICE_COMPLIANCE_CHART);
  }

  getEndpointGroupChartData() {
    return this._get(PATHS.ENDPOINT_GROUP_CHART);
  }

  getEndpointPolicyChartData() {
    return this._get(PATHS.ENDPOINT_POLICY_CHART);
  }

  getIdentityGroupChartData() {
    return this._get(PATHS.IDENTITY_GROUP_CHART);
  }

  getNetworkDeviceChartData() {
    return this._get(PATHS.NETWORK_DEVICE_CHART);
  }

  getLocationChartData() {
    return this._get(PATHS.LOCATION_CHART);
  }

  getEndpointProfilerServerChartData() {
    return this._get(PATHS.ENDPOINT_PROFILER_SERVER_CHART);
  }

  getOperatingSystemChartData() {
    return this._get(PATHS.OPERATING_SYSTEM_CHART);
  }

  getDeviceTypeChartData() {
    return this._get(PATHS.DEVICE_TYPE_CHART);
  }

  getApplicationCategoryChartData(filter = 'all') {
    if (filter !== 'all' && filter !== 'windows' && filter !== 'mac') {
      throw this._handleError(
        "Filter parameter must equal 'windows', 'mac', or 'all'."
      );
    }
    return this._get(
      `${PATHS.APPLICATION_CATEGORY_CHART + filter}/all`
    ).then((data) => data.map((item) => JSON.parse(item)));
  }

  // DASHBOARDS
  getGenericDashboard(query = 'alarms') {
    return this._get(
      PATHS.GENERIC_DASHBOARD,
      this._addQPH({ query }, {}, true)
    );
  }

  getSystemAlarms() {
    return this.getGenericDashboard('alarms');
  }

  getSystemSummary() {
    return this.getGenericDashboard('systemSummary');
  }

  // VULNERABILITY
  getVulnerabilityData() {
    return this._get(PATHS.ALL_VULNERABILITY_DATA);
  }

  /**
   * Returns metrics of the top compromised endpoints.
   *
   * **In ISE UI**: These metrics are displayed on the default Threat dashboard.
   *
   * Example of returned data:
   * ```json
   * { "connected": "1", "disconnected": "0", "all": "1", "info": "" }
   * ```
   * @return {Promise} A promise that resolves to an object containing metrics.
   * @memberof ISE
   */
  getTotalVulnerableEndpoints() {
    return this._get(PATHS.TOTAL_VULNERABLE_ENDPOINTS);
  }

  /**
   * Returns vulnerable endpoints over a specified period.
   *
   * **In ISE UI**: These metrics are displayed on the default Threat dashboard.
   *
   * @param {string} [period='day'] - The period to get vulnerable endpoints for. Example: 'day' (default), '3days', 'week', 'month', '3months', etc.
   * @return {Promise} A promise that resolves to an object containing metrics.
   * @memberof ISE
   */
  getVulnerableEndpointsOverTime(period = 'day') {
    return this._get(`${PATHS.VULNERABILITY_ENDPOINTS_OVER_TIME}/${period}/0`);
  }

  // THREATS
  /**
   * Returns the top threats and related metrics.
   *
   * **In ISE UI**: These metrics are displayed on the default Threat dashboard.
   *
   * Example of returned data:
   * ```json
   * {
   *    "labels":[
   *       "Unknown",
   *       "Insignificant",
   *       "Distracting",
   *       "Painful",
   *       "Damaging",
   *       "Catastrophic"
   *    ],
   *    "dataset":{
   *       "possibly unwanted application":{
   *          "endpoints":{
   *             "connected":0,
   *             "disconnected":523
   *          },
   *          "severity":"Catastrophic",
   *          "meta":{
   *             "name":"possibly unwanted application"
   *          }
   *       },
   *       "malware":{
   *          "endpoints":{
   *             "connected":3,
   *             "disconnected":500
   *          },
   *          "severity":"Unknown",
   *          "meta":{
   *             "name":"malware"
   *          }
   *       },
   *       "malicious host":{
   *          "endpoints":{
   *             "connected":3,
   *             "disconnected":491
   *          },
   *          "severity":"Catastrophic",
   *          "meta":{
   *             "name":"malicious host"
   *          }
   *       }
   *    }
   * }
   * ```
   * @return {Promise} A promise that resolves to an object containing metrics.
   * @memberof ISE
   */
  getTopThreats() {
    return this._get(PATHS.TOP_THREATS);
  }

  /**
   * Returns metrics of the top compromised endpoints.
   *
   * **In ISE UI**: These metrics are displayed on the default Threat dashboard.
   *
   * Example of returned data:
   * ```json
   * { "all": "1520", "connected": "6", "disconnected": "1514" },
   * ```
   * @return {Promise} A promise that resolves to an object containing metrics.
   * @memberof ISE
   */
  getTopCompromisedEndpoints() {
    return this._get(PATHS.TOP_COMPROMISED_ENDPOINTS);
  }

  /**
   * Returns compromised endpoints over a specified period.
   *
   * **In ISE UI**: These metrics are displayed on the default Threat dashboard.
   *
   * @param {string} [period='day'] - The period to get compromised endpoints for. Example: 'day' (default), '3days', 'week', 'month', '3months', etc.
   * @return {Promise} A promise that resolves to an object containing metrics.
   * @memberof ISE
   */
  getCompromisedEndpointsOverTime(period = 'day') {
    return this._get(`${PATHS.THREATS_OVER_TIME}/${period}`);
  }

  // PXGRID
  autoGenPxGridCert(
    commonName,
    description,
    password,
    format = 'pkcs8',
    certpath = null
  ) {
    const fileDir = certpath
      ? path.format({ base: certpath })
      : path.format({ dir: process.cwd(), base: 'certs' });

    const certConfig = {
      certPath: fileDir,
      clientCert: `${commonName}_.cer`,
      clientKey: `${commonName}_.key`,
      clientKeyPassword: password,
      caBundle: `${this.host}_.cer`
    };

    const reqConfig = {
      headers: {
        _QPH_: this._b64(`OWASP_CSRFTOKEN=${this.csrfToken}`)
      }
    };

    const reqBody = {
      actionType: 'commonName', // other actions?
      description,
      certificateFormat: format === 'pkcs8' ? 'certInPrivacy' : '???', // other formats?
      certificatePassword: password,
      certificateConfirmPassword: password,
      commonName,
      certificateDetails: '',
      csvFile: '',
      hostNames: null, // theese are hostnames of nodes if getting node certs
      sans: [
        {
          select: null, // IP or hostnames??
          input: ''
        }
      ]
    };
    return this._post(
      `${PATHS.API}pxGrid/certificate/create`,
      reqBody,
      reqConfig
    )
      .then((data) => {
        if (
          (typeof data.valid === 'string' && data.valid !== 'true') ||
          (typeof data.valid === 'boolean' && !data.valid)
        ) {
          throw this._handleError(
            'Certificate generation failed. This often means that the pxGrid service is not running on the node.',
            data
          );
        } else {
          reqConfig.responseType = 'stream';
          return this._get(
            `${PATHS.API}pxGrid/certificate/download/${data.fileName}`,
            reqConfig
          );
        }
      })
      .then((response) => {
        this._makeDirIfNotExists(fileDir);
        const filepath = path.join(
          fileDir,
          `${Date.now().toString()}_${commonName}_cert.zip`
        );
        return this._writeToFile(filepath, response);
      })
      .then((filepath) =>
        unzip(filepath, { dir: fileDir }).then((err) => {
          if (err) {
            throw new Error(err);
          }
          return certConfig;
        })
      );
  }

  // LIVE LOGS
  getRadiusLiveLogs(filter, options) {
    const defaults = {
      timePeriod: 1440,
      pageSize: 20,
      startAt: 1
    };
    const query = {
      ...defaults,
      ...options
    };
    const reqConfig = this._addQPH(query, filter);
    return this._get(PATHS.RADIUS_LIVE_LOGS, reqConfig);
  }

  /**
   * Returns RADIUS counters.
   *
   * **In ISE UI**: These metrics are displayed above the RADIUS Live Logs.
   *
   * Some of the provided metrics are not shown in the UI and, therefore, are there meanings are not explicitly defined.
   *
   * Example of returned data:
   * ```json
   * {
   *    "misConfiguredSuppCount": 1,
   *    "misConfiguredNasCount": 0,
   *    "eapTimeoutCount": 0,
   *    "radiusDropCount": 864,
   *    "totalRAuthCount": 0,
   *    "retryCount": 2417302,
   *    "percentMisConfiguredSuppCount": 0.00004135364,
   *    "percentMisConfiguredNasCount": 0,
   *    "percentEapTimeoutCount": 0,
   *    "percentRadiusDropCount": 0.03572954,
   *    "percentTotalRAuthCount": null,
   *    "percentRetryCount": 99.96423
   * }
   * ```
   * @return {Promise} A promise that resolves to an object containing metrics.
   * @memberof ISE
   */
  getRadiusLiveLogCounters() {
    return this._get(PATHS.RADIUS_LIVE_LOG_COUNTERS);
  }

  getRadiusLiveSessions(filter, options) {
    const defaults = {
      timePeriod: 1440,
      pageSize: 20,
      startAt: 1
    };
    const query = {
      ...defaults,
      ...options
    };
    const reqConfig = this._addQPH(query, filter);
    return this._get(PATHS.RADIUS_LIVE_SESSIONS, reqConfig);
  }

  getTacacsLiveLogs(filter, options) {
    const defaults = {
      timePeriod: 1440,
      pageSize: 20,
      startAt: 1
    };
    const query = {
      ...defaults,
      ...options
    };
    const reqConfig = this._addQPH(query, filter);
    return this._get(PATHS.TACACS_LIVE_LOGS, reqConfig);
  }

  getTcNacLiveLogs(filter, options) {
    const defaults = {
      timePeriod: 1440,
      pageSize: 20,
      startAt: 1
    };
    const query = {
      ...defaults,
      ...options
    };
    const reqConfig = this._addQPH(query, filter);
    return this._get(PATHS.TCNAC_LIVE_LOGS, reqConfig);
  }

  // NODE DATA
  getNodes() {
    return this._get(PATHS.NODES);
  }

  /**
   * "INTERNAL" USE FUNCTIONS
   */
  _createIseSession() {
    return http.create({
      baseURL: `https://${this.host}/admin/`,
      headers: {
        Referer: `https://${this.host}/admin/`
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      withCredentials: true,
      validateStatus: (status) =>
        (status >= 200 && status <= 299) || status === 404 || status === 302
    });
  }

  _get(requestPath, config = {}) {
    return this.session
      .get(requestPath, config)
      .then((response) => {
        // Because this API returns JSON sometimes and poorly formatted "JSON-like" string others.
        // We have to account for each.
        if (typeof response.data === 'string') {
          try {
            return JSON.parse(response.data.trim().replace(/'/g, '"'));
          } catch (e) {
            throw this._handleError(`API response is not valid JSON. ${e}`, {
              ...response,
              data: {}
            });
          }
        }
        return response.data;
      })
      .catch((error) => {
        if (error.response.status === 500) {
          throw this._handleError(
            'A server error occurred. This could be due to exceeding the maximum number of sessions or a malformed request.',
            error.response
          );
        }
      });
  }

  _getWithMeta(requestPath, config = {}) {
    return this.session.get(requestPath, config).catch((error) => {
      if (error.response.status === 500) {
        throw this._handleError(
          'A server error occurred. This could be due to exceeding the maximum number of sessions or a malformed request.',
          error.response
        );
      }
    });
  }

  _post(requestPath, body, config = {}) {
    return this.session
      .post(requestPath, body, config)
      .then((response) => response.data)
      .catch((error) => {
        if (error.response.status === 500) {
          throw this._handleError(
            'A server error occurred. This could be due to exceeding the maximum number of sessions or a malformed request.',
            error.response
          );
        }
      });
  }

  _postWithMeta(requestPath, config = {}) {
    return this.session.post(requestPath, config).catch((error) => {
      if (error.response.status === 500) {
        throw this._handleError(
          'A server error occurred. This could be due to exceeding the maximum number of sessions or a malformed request.',
          error.response
        );
      }
    });
  }

  _postForm(requestPath, body, config = {}) {
    config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    config.headers['X-Requested-With'] = 'OWASP CSRFGuard Project';
    config.maxRedirects = 0;
    return this.session
      .post(requestPath, qs.stringify(body), config)
      .then((response) => {
        if (response.data.status && response.data.status === 'passed') {
          return response.data;
        }
        if (response.data.status && response.data.status === 'failed') {
          if (response.data.messages.length > 0) {
            throw this._handleError(response.data.messages[0]);
          }
        }
        if (
          response.status === 302 &&
          response.headers.location.match(/logout/)
        ) {
          throw this._handleError(
            'The session was forcibly logged out by ISE. This is normally caused by a POST request with a bad CSRF token/header.'
          );
        }
      });
  }

  _pullOutMacs(endpoints) {
    const list = [];
    endpoints.forEach((e) => {
      const mac = JSON.parse(e).MACAddress;
      list.push(mac);
    });
    return list;
  }

  _flatten(list) {
    return Array.isArray(list)
      ? list.reduce(
        (a, b) => a.concat(Array.isArray(b) ? this._flatten(b) : b),
        []
      )
      : list;
  }

  _addQPH(options, filter = {}, skipDefaults = false) {
    const defaults = {};
    if (!skipDefaults) {
      defaults.columns = null;
      defaults.sortBy = null;
      defaults.startAt = 1;
      defaults.pageSize = 500;
    }
    const params = { ...defaults, ...options, ...filter };
    return {
      headers: {
        _QPH_: this._b64(this._buildQueryParams(params))
      }
    };
  }

  _buildQueryParams(queryObject) {
    const params = { ...queryObject };
    if (queryObject.columns) {
      params.columns = queryObject.columns.join(',');
    }
    return qs.stringify(params);
  }

  _b64(str) {
    return Buffer.from(str).toString('base64');
  }

  _normalizeKeys(obj) {
    const allKeys = [];
    obj.forEach((e) => {
      if (e) {
        Object.keys(e).forEach((k) => {
          if (!allKeys.includes(k)) {
            allKeys.push(k);
          }
        });
      }
    });
    obj.map((e) => {
      allKeys.forEach((k) => {
        if (typeof e[k] === 'undefined') {
          e[k] = '';
        }
      });
    });
    return obj;
  }

  _exportToCsv(obj, filename, normalizeKeys = true) {
    let data = [];
    if (normalizeKeys) {
      data = this._normalizeKeys(obj);
    }
    return new ObjectsToCsv(data)
      .toDisk(filename, { bom: true })
      .then(() => filename);
  }

  _writeToFile(filepath, data) {
    const writer = fs.createWriteStream(filepath);
    data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve(filepath));
      writer.on('error', reject);
    });
  }

  _makeDirIfNotExists(dir) {
    if (!fs.existsSync(dir)) {
      return fs.mkdirSync(dir);
    }
  }

  _handleError(msg, response) {
    const error = new Error();
    error.message = msg;
    if (response) {
      error.response = {};
      error.response.data = response.data;
      error.response.status = response.status;
      error.response.statusText = response.statusText;
      error.response.headers = response.headers;
    }
    return error;
  }
}

module.exports = ISE;
