/**
 * TODO: Add logout() to cleanup session
 * Make sure we've resolved everything we need in resolveRadiusPolicySet
 * everything else? :)
 * link with node-pxgrid to auto-gen client setup
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

const http = require('axios');
const https = require('https');
const qs = require('querystring');
const ObjectsToCsv = require('objects-to-csv');

const PATHS = require('./paths');
const TESTED_VERSIONS = ['2.4', '2.6']

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
    return session
      .post(PATHS.LOGIN, reqBody, { maxRedirects: 0 })
      .then(response => {
        // Handle errors
        // A full HTML doc means failure.
        if (response.data.includes('<html')) {
          this._handleError('Failed to login!', error.response)
        }

        // No cookies means something went wrong, even bad credentials give a APPSESSIONID (that doesn't work)
        if (!response.headers['set-cookie']) {
          this._handleError('Response did not contain any cookies!', error.response)
        }

        // These URL redirects indicate bad credentials
        if (
          response.headers.location === '/admin/login.jsp?mid=external_auth_msg' || // ISE2.4
          response.headers.location === '/admin/login.jsp?mid=auth_failed' // ISE3.0
        ) {
          this._handleError('Authentication failed. Bad username or password.', response);
        }

        // Check cookies
        if (response.headers['set-cookie']) {
          // const cookies = response.headers['set-cookie'].map(cookie => cookie.split(';')[0].split('=')[0].toLocaleLowerCase())
          const cookies = {}
          response.headers['set-cookie'].forEach(cookie => {
            const [key, value] = cookie.split(';')[0].split('=')
            cookies[key.toLocaleLowerCase()] = value;
          })
          if (!('token' in cookies) && response.headers.location != '/') // ISE3.0 does not use TOKEN header, and only other differentiator is the redirect to / on success.
            this._handleError('Missing TOKEN cookie. An error occurred in authentication. Double check credentials.', response)
          if (!('appsessionid' in cookies))
            this._handleError('Missing APPSESSIONID cookie. An error occurred in authentication. Double check credentials.', response)
          // Successful login should have an APPSESSIONID and TOKEN cookie.
          const sessionCookieArray = response.headers['set-cookie'].filter(cookie =>
            cookie.includes('APPSESSIONID')
          );
          const sessionIdCookie = sessionCookieArray[0].split(';')[0];
          session.defaults.headers['Cookie'] = sessionIdCookie;
          this.sessionId = sessionIdCookie.split('=')[1];
          this.session = session;
          return this.sessionId;
        }
      })
      .then(() => this.getCsrfToken())
      // We've made reasonable attempts at catching failed logins, but given variations in ISE versions, 
      // best approach for finality is to make an API call and validate the response is what we expect.
      // Reminder: this is a non-documented, "non-public" API! :)
      .then(() => {
        return this.getNodes().then(nodes => {
          if (
            nodes.length > 0 &&
            typeof nodes === 'object' &&
            'hostname' in nodes[0]
          ) {
            this.isLoggedIn = true;
            this.iseNodes = nodes;
            this.iseVersion = nodes[0]['version'];
            return true;
          } else {
            this._handleError('Login failed, please check your ISE hostname and credentials. ' +
              'Otherwise, this may be an issue with your version of ISE. Note that this is ' +
              'using a non-public API that Cisco can change without warning or notification.' +
              'This library has only been *successfully* tested against ISE versions: ' +
              TESTED_VERSIONS.join(', '));
          }
        })
      })
  }

  getCsrfToken() {
    return this._getWithMeta('login.jsp', { maxRedirects: 0 }).then(response => {
      // This has been made "optional." As in if we can get it, we'll use it. If not, we'll continue. 
      // This is due to changes in the login flow of each version of ISE. The CSRF token was a nice to have, 
      // but never appeared to affect the usage of the API if it wasn't present.
      if (response.status === 200) {
        const csrfRegex = /<input.*?id="CSRFTokenNameValue".*?value=(.*?) \/>$/m;
        const csrfMatch = response.data.match(csrfRegex);
        if (!csrfMatch) {
          // this._handleError('Login was successful, but was unable to retrieve the CSRF Token!', response)
          return false;
        }
        const csrfToken = csrfMatch[1].split('=')[1];
        this.csrfToken = csrfToken;
        this.session.defaults.headers['OWASP_CSRFTOKEN'] = csrfToken;
        return true;
      }
    });
  }

  logout() {
    const reqConfig = { maxRedirects: 0 };
    return this._getWithMeta(PATHS.LOGOUT, reqConfig).then(response => {
      if (response.status === 302) {
        this.isLoggedIn = false;
        this.sessionId = null;
        this.csrfToken = null;
        return true;
      } else {
        this._handleError('There was an error logging out.', response);
      }
    });
  }

  // ENDPOINTS
  visibilityEndpointRequest(filter = {}, options = {}) {
    const defaults = {
      columns: ['MACAddress'],
      sortBy: 'MACAddress',
      startAt: 1,
      pageSize: 500
    };
    const query = { ...defaults, ...options };
    const reqConfig = this._addQPH(query, filter);
    // FIX LATER: using direct get due to headers not being passed back in _get
    return this._getWithMeta(PATHS.API + 'visibility', reqConfig);
  }

  getEndpoint(mac) {
    return this._get(PATHS.API + 'visibility/endpoint/' + mac);
  }

  resolveAllEndpoints(response, filter = {}) {
    let promises = [];
    // endpoint handling
    const macs = this._pullOutMacs(response.data);
    macs.forEach(mac => {
      promises.push(this.getEndpoint(mac));
    });

    // pagination
    let [startItem, endItem, totalEndpoints] = response.headers['content-range']
      .split(/[\-\/]/)
      .map(e => parseInt(e));

    const hasNextPage = endItem < totalEndpoints;
    const pageSize = endItem - startItem;
    const pageNum = endItem / pageSize;
    if (hasNextPage) {
      promises.push(
        this.visibilityEndpointRequest(filter, { startAt: pageNum + 1, pageSize: pageSize }).then(
          response => this.resolveAllEndpoints(response)
        )
      );
    }
    return Promise.all(promises);
  }

  getEndpoints(filter, options) {
    return this.visibilityEndpointRequest(filter, options)
      .then(response => this.resolveAllEndpoints(response, filter))
      .then(endpoints => this._flatten(endpoints));
  }

  endpointsToCsv(filter = {}, detail = false) {
    const filename = `endpoints-${this.host}-${Date.now()}.csv`;
    const filepath = path.resolve(process.cwd(), filename);
    return this.visibilityEndpointRequest(filter)
      .then(response => this.resolveAllEndpoints(response))
      .then(endpoints => this._flatten(endpoints))
      .then(endpoints => {
        if (detail) console.log(`Exporting ${endpoints.length} endpoints to CSV...`);
        if (detail) console.log(`File being written to: ${filepath}...`);
        return this._exportToCsv(endpoints, filepath);
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
    return this._getWithMeta(PATHS.API + 'visibility', reqConfig);
  }

  resolveAllUsers(response, filter = {}) {
    let promises = [];
    // No need to "resolve" individual users because, unlike endpoints, we get all data from original call
    response.data.forEach(user => {
      promises.push(JSON.parse(user));
    });
    // pagination
    let [startItem, endItem, totalItems] = response.headers['content-range']
      .split(/[\-\/]/)
      .map(e => parseInt(e));

    const hasNextPage = endItem < totalItems;
    const pageSize = endItem - startItem;
    const pageNum = endItem / pageSize;
    if (hasNextPage) {
      promises.push(
        this.visibilityUserRequest(filter, { startAt: pageNum + 1, pageSize: pageSize }).then(
          response => this.resolveAllUsers(response)
        )
      );
    }
    return Promise.all(promises);
  }

  getUser(username) {
    return this.visibilityUserRequest({ userName: username }, { exactMatch: true }).then(response =>
      JSON.parse(response.data)
    );
  }

  getUsers(filter, options) {
    return this.visibilityUserRequest(filter, options)
      .then(response => this.resolveAllUsers(response, filter))
      .then(endpoints => this._flatten(endpoints));
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
    return this._getWithMeta(PATHS.API + 'visibility', reqConfig);
  }

  resolveAllApplications(response, filter = {}) {
    let promises = [];
    // No need to "resolve" individual apps because, unlike endpoints, we get all data from original call
    response.data.forEach(app => {
      promises.push(app);
    });
    // pagination
    let [startItem, endItem, totalItems] = response.headers['content-range']
      .split(/[\-\/]/)
      .map(e => parseInt(e));

    const hasNextPage = endItem < totalItems;
    const pageSize = endItem - startItem;
    const pageNum = endItem / pageSize;
    if (hasNextPage) {
      promises.push(
        this.visibilityApplicationsRequest(filter, {
          startAt: pageNum + 1,
          pageSize: pageSize
        }).then(response => this.resolveAllApplications(response))
      );
    }
    return Promise.all(promises);
  }

  getApplications(filter, options) {
    return this.visibilityApplicationsRequest(filter, options)
      .then(response => this.resolveAllApplications(response, filter))
      .then(endpoints => this._flatten(endpoints));
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
    return this._getWithMeta(PATHS.API + 'visibility', reqConfig);
  }

  resolveAllNetworkDevices(response, filter = {}) {
    let promises = [];
    // No need to "resolve" individual NADs because, unlike endpoints, we get all data from original call
    response.data.forEach(device => {
      promises.push(JSON.parse(device));
    });
    // pagination
    let [startItem, endItem, totalItems] = response.headers['content-range']
      .split(/[\-\/]/)
      .map(e => parseInt(e));

    const hasNextPage = endItem < totalItems;
    const pageSize = endItem - startItem;
    const pageNum = endItem / pageSize;
    if (hasNextPage) {
      promises.push(
        this.visibilityNetworkDevicesRequest(filter, {
          startAt: pageNum + 1,
          pageSize: pageSize
        }).then(response => this.resolveAllNetworkDevices(response))
      );
    }
    return Promise.all(promises);
  }

  getNetworkDevice(name) {
    return this.getNetworkDevices({ NetworkDeviceName: name });
  }

  getNetworkDevices(filter, option) {
    return this.visibilityNetworkDevicesRequest(filter, option)
      .then(response => this.resolveAllNetworkDevices(response, filter))
      .then(endpoints => this._flatten(endpoints));
  }
  // RADIUS POLICY SETS
  getRadiusPolicySets(options) {
    const defaults = { startAt: 1, pageSize: 25 };
    const query = { ...defaults, ...options };
    return this._get(PATHS.RADIUS_POLICY_SETS, this._addQPH(query));
  }

  getRadiusPolicySetByName(name) {
    return this.getRadiusPolicySets().then(policySets => {
      const policySet = policySets.find(policySet => policySet.name === name);
      if (typeof policySet === 'undefined') {
        this._handleError('Provided RADIUS policy set does not exist.');
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
    ]).then(values => {
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
    return this._get(PATHS.RADIUS_GLOBAL_EXCEPTIONS).then(response => {
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
    return this.getTacacsPolicySets().then(policySets => {
      const policySet = policySets.find(policySet => policySet.name === name);
      if (typeof policySet === 'undefined') {
        this._handleError('Provided TACACS policy set does not exist.');
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
    ]).then(values => {
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
    return this._get(PATHS.TACACS_GLOBAL_EXCEPTIONS).then(response => {
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
  getActiveEndpoints() {
    return this._get(PATHS.ACTIVE_ENDPOINTS_METRIC).then(response => response.attrValue);
  }

  getRejectedEndpoints() {
    return this._get(PATHS.REJECTED_ENDPOINTS_METRIC).then(response => response.attrValue);
  }

  getAnomalousEndpoints() {
    return this._get(PATHS.ANOMALOUS_ENDPOINTS_METRIC).then(response => response.attrValue);
  }

  getByodEndpoints() {
    return this._get(PATHS.BYOD_ENDPOINTS_METRIC).then(response => response.attrValue);
  }

  getAuthenticatedGuest() {
    return this._get(PATHS.AUTHENTICATED_GUEST_METRIC).then(response => response.attrValue);
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
      this._handleError("Filter parameter must equal 'windows', 'mac', or 'all'.");
    }
    return this._get(PATHS.APPLICATION_CATEGORY_CHART + filter + '/all').then(data =>
      data.map(item => JSON.parse(item))
    );
  }

  // DASHBOARDS
  getGenericDashboard(query = 'alarms') {
    return this._get(PATHS.GENERIC_DASHBOARD, this._addQPH({ query: query }));
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

  getTotalVulnerableEndpoints() {
    return this._get(PATHS.TOTAL_VULNERABLE_ENDPOINTS);
  }

  getVulnerableEndpointsOverTime(period = 'day') {
    // 'day', '3days', 'week', 'month', '3months', etc.
    return this._get(`${PATHS.VULNERABILITY_ENDPOINTS_OVER_TIME}/${period}/0`);
  }

  // THREATS
  getTopThreats() {
    return this._get(PATHS.TOP_THREATS);
  }

  getTopCompromisedEndpoints() {
    return this._get(PATHS.TOP_COMPROMISED_ENDPOINTS);
  }

  getCompromisedEndpointsOverTime(period = 'day') {
    // 'day', '3days', 'week', 'month', '3months', etc.
    return this._get(`${THREATS_OVER_TIME}/${period}`);
  }

  // PXGRID
  autoGenPxGridCert(commonName, description, password, format = 'pkcs8', certpath = null) {
    const fileDir = certpath
      ? path.format({ base: certpath })
      : path.format({ dir: process.cwd(), base: 'certs' });

    const certConfig = {
      certPath: fileDir,
      clientCert: commonName + '_.cer',
      clientKey: commonName + '_.key',
      clientKeyPassword: password,
      caBundle: this.host + '_.cer'
    };

    const reqConfig = {
      headers: {
        _QPH_: this._b64('OWASP_CSRFTOKEN=' + this.csrfToken)
      }
    };

    const reqBody = {
      actionType: 'commonName', // other actions?
      description: description,
      certificateFormat: format === 'pkcs8' ? 'certInPrivacy' : '???', // other formats?
      certificatePassword: password,
      certificateConfirmPassword: password,
      commonName: commonName,
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
    return this._post(PATHS.API + 'pxGrid/certificate/create', reqBody, reqConfig)
      .then(data => {
        if (
          (typeof data.valid === 'string' && data.valid !== 'true') ||
          (typeof data.valid === 'boolean' && !data.valid)
        ) {
          this._handleError('Certificate generation failed. This often means that the pxGrid service is not running on the node.', data)
        } else {
          reqConfig.responseType = 'stream';
          return this._get(PATHS.API + 'pxGrid/certificate/download/' + data.fileName, reqConfig);
        }
      })
      .then(response => {
        this._makeDirIfNotExists(fileDir);
        const filepath = path.join(fileDir, `${Date.now().toString()}_${commonName}_cert.zip`);
        return this._writeToFile(filepath, response);
      })
      .then(filepath =>
        this._unzipArchive(filepath, fileDir).then(err => {
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
      validateStatus: status => (status >= 200 && status <= 299) || status == 404 || status == 302
    });
  }

  _get(path, config = {}) {
    return this.session
      .get(path, config)
      .then(response => response.data)
      .catch(error => {
        if (error.response.status === 500) {
          this._handleError('A server error occurred. This could be due to exceeding the maximum number of sessions or a malformed request.', error.response)
        }
      });
  }

  _getWithMeta(path, config = {}) {
    return this.session.get(path, config).catch(error => {
      if (error.response.status === 500) {
        this._handleError('A server error occurred. This could be due to exceeding the maximum number of sessions or a malformed request.', error.response)
      }
    });
  }

  _post(path, body, config = {}) {
    return this.session
      .post(path, body, config)
      .then(response => response.data)
      .catch(error => {
        if (error.response.status === 500) {
          this._handleError('A server error occurred. This could be due to exceeding the maximum number of sessions or a malformed request.', error.response)
        }
      });
  }

  _postWithMeta(path, config = {}) {
    return this.session.post(path, config).catch(error => {
      if (error.response.status === 500) {
        this._handleError('A server error occurred. This could be due to exceeding the maximum number of sessions or a malformed request.', error.response)
      }
    });
  }

  _pullOutMacs(endpoints) {
    let list = [];
    endpoints.forEach(e => {
      const mac = JSON.parse(e).MACAddress;
      list.push(mac);
    });
    return list;
  }

  _flatten(list) {
    return Array.isArray(list)
      ? list.reduce((a, b) => a.concat(Array.isArray(b) ? this._flatten(b) : b), [])
      : list;
  }

  _addQPH(options, filter = {}) {
    const defaults = {
      columns: null,
      sortBy: null,
      startAt: 1,
      pageSize: 500
    };
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
    let allKeys = [];
    obj.forEach(e => {
      if (e) {
        Object.keys(e).forEach(k => {
          if (!allKeys.includes(k)) {
            allKeys.push(k);
          }
        });
      }
    });
    obj.map(e => {
      allKeys.forEach(k => {
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
    return new ObjectsToCsv(data).toDisk(filename, { bom: true }).then(() => filename);
  }

  _writeToFile(filepath, data) {
    const writer = fs.createWriteStream(filepath);
    data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve(filepath));
      writer.on('error', reject);
    });
  }

  _unzipArchive(filepath, certDir) {
    const unzip = util.promisify(require('extract-zip'));
    return unzip(filepath, { dir: certDir });
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
    throw error;
  }
}

module.exports = ISE;
