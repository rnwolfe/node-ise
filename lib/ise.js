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

const LOGIN = 'LoginAction.do';
const LOGOUT = 'logout.jsp';

const API_PATH = 'rs/uiapi/';
const RADIUS_POLICY_SETS = API_PATH + 'policytable/radius/';
const SECURITY_GROUPS = API_PATH + 'policytable/radius/results/securityGroups/';
const SERVICE_NAMES = API_PATH + 'policytable/radius/results/serviceName/';
const IDENTITY_STORES = API_PATH + 'policytable/radius/results/identityStores/';
const FAILOVERS = API_PATH + 'policytable/radius/results/failovers/';
const AUTHZ_PROFILES = API_PATH + 'policytable/radius/results/profiles/';
const GLOBAL_EXCEPTIONS = API_PATH + '0/exceptions';
const SXP_BINDINGS = API_PATH + 'sxp/allbindings';
const GENERIC_DASHBOARD = API_PATH + 'dashboard/generic/fetchData';

// METRICS
const METRIC_PATH = API_PATH + 'visibility/fetchMetricData/';
const ACTIVE_ENDPOINTS_METRIC = METRIC_PATH + 'activeEndpoints';
const REJECTED_ENDPOINTS_METRIC = METRIC_PATH + 'rejectedEndpoints';
const ANOMALOUS_ENDPOINTS_METRIC = METRIC_PATH + 'anomalousEndpoints';
const AUTHENTICATED_GUEST_METRIC = METRIC_PATH + 'authenticateGuest';
const BYOD_ENDPOINTS_METRIC = METRIC_PATH + 'byodEndpoints';
const CHART_PATH = API_PATH + 'visibility/fetchChartData/';
const DEVICE_COMPLIANCE_CHART = CHART_PATH + 'DeviceCompliance';
const ENDPOINT_GROUP_CHART = CHART_PATH + 'EndPointGroup';
const ENDPOINT_POLICY_CHART = CHART_PATH + 'EndPointPolicy';
const IDENTITY_GROUP_CHART = CHART_PATH + 'IdentityGroup';
const ENDPOINT_PROFILER_SERVER_CHART = CHART_PATH + 'EndPointProfilerServer';
const OPERATING_SYSTEM_CHART = CHART_PATH + 'operating-system';
const NETWORK_DEVICE_CHART = CHART_PATH + 'NetworkDeviceName';
const DEVICE_TYPE_CHART = CHART_PATH + 'Device Type';
const LOCATION_CHART = CHART_PATH + 'Location';

// VULNERABILITY DATA
const TOTAL_VULNERABLE_ENDPOINTS = API_PATH + 'visibility/fetchTotalVulnerableEndPoints/0';
const ALL_VULNERABILITY_DATA = API_PATH + 'visibility/fetchVulnerabilityData/EndPoints/all';
const VULNERABILITY_ENDPOINTS_OVER_TIME =
  API_PATH + 'visibility/fetchVulnerabilityEndpointsOverTime/';

// THREAT/COMPROMISE DATA
const THREAT_PATH = API_PATH + 'charts/compromised/';
const TOP_COMPROMISED_ENDPOINTS = THREAT_PATH + 'compromisedEndpointsTop';
const TOP_THREATS = THREAT_PATH + 'topThreats/incidents/impacted/all';
const THREATS_OVER_TIME = THREAT_PATH + 'compromisedEndpointsTime/';

class ISE {
  constructor(host, username, password) {
    this.host = host;
    this.username = username;
    this.password = password;
  }

  iseLogin() {
    const reqBody = qs.stringify({
      username: this.username,
      password: this.password,
      authType: 'Internal',
      rememberme: 'on',
      name: this.username,
      newPassword: '',
      destinationURL: '',
      xeniaUrl: ''
    });

    const session = this._createIseSession();
    return session
      .post(LOGIN, reqBody, {
        // We can't follow redirects because we end up with the wrong APPSESSIONID
        maxRedirects: 0
      })
      .then(response => {
        // Handle errors
        if (response.data.includes('<html')) {
          const error = new Error();
          error.message = 'Failed to login!';
          error.response = {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            all: response
          };
          throw error;
        }
        if (!response.headers['set-cookie']) {
          const error = new Error();
          error.message = 'Response did not contain any cookies!';
          error.response = {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            all: response
          };
          throw error;
        }
        // Handle success
        if (response.headers['set-cookie']) {
          const sessionCookieArray = response.headers['set-cookie'].filter(cookie =>
            cookie.includes('APPSESSIONID')
          );
          const sessionIdCookie = sessionCookieArray[0].split(';')[0];
          session.defaults.headers['Cookie'] = sessionIdCookie;
          this.session = session;
          return true;
        }
      })
      .then(() => this.getCsrfToken());
  }

  getCsrfToken() {
    return this._get('', { maxRedirects: 0 }).then(response => {
      if (response.status === 302 && response.headers.location === '/admin/login.jsp') {
        const error = new Error();
        error.message =
          'Problem with authenticated session. Redirected to the login page after login.';
        error.response = response;
        throw error;
      }
      if (response.status === 200) {
        // console.log('Logged in successfully. Reached home page.');
        const csrfRegex = /^<input.*?id="CSRFTokenNameValue".*?value=(.*?) \/>$/m;
        const csrfToken = response.match(csrfRegex)[1].split('=')[1];
        this.csrfToken = csrfToken;
        this.session.defaults.headers['OWASP_CSRFTOKEN'] = csrfToken;
        return true;
      }
    });
  }

  logout() {
    const reqConfig = { maxRedirects: 0 };
    return this.session.get(LOGOUT, reqConfig).then(response => {
      if (response.status === 302) {
        return true;
      } else {
        this._handleError('There was an error logging out.', response);
      }
    });
  }

  _handleError(msg, response = {}) {
    const error = new Error();
    error.message = msg;
    if (response) {
      error.response.data = response.data;
      error.status = response.status;
      error.statusText = response.statusText;
      error.headers = response.headers;
    }
    throw error;
  }

  // ENDPOINTS
  visibilityEndpointRequest(
    filter = {},
    options = {
      columns: ['MACAddress'],
      sortBy: 'MACAddress',
      startAt: 1,
      pageSize: 500
    }
  ) {
    const reqConfig = this._addQPH(options, filter);
    // FIX LATER: using direct get due to headers not being passed back in _get
    return this.session.get(API_PATH + 'visibility', reqConfig);
  }

  resolveEndpoint(mac) {
    return this._get(API_PATH + 'visibility/endpoint/' + mac);
  }

  resolveAllEndpoints(response, filter = {}) {
    let promises = [];
    // endpoint handling
    const macs = this._pullOutMacs(response.data);
    macs.forEach(mac => {
      promises.push(this.resolveEndpoint(mac));
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

  getEndpoints(filter = {}) {
    return this.visibilityEndpointRequest(filter)
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
  visibilityUserRequest(
    filter = {},
    options = {
      columns: [
        'FirstName',
        'LastName',
        'userName',
        'NoOfDevicesPerUser',
        'Email',
        'User-Fetch-Telephone',
        'User-Fetch-Department',
        'User-Fetch-Job-Title'
        //'PortalUser'
      ],
      sortBy: 'FirstName',
      startAt: 1,
      pageSize: 500
    }
  ) {
    const reqConfig = this._addQPH(options, filter);
    // FIX LATER: using direct get due to headers not being passed back in _get
    return this.session.get(API_PATH + 'visibility', reqConfig);
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

  getUsers(filter = {}) {
    return this.visibilityUserRequest(filter)
      .then(response => this.resolveAllUsers(response, filter))
      .then(endpoints => this._flatten(endpoints));
  }

  // RADIUS POLICY SETS
  getRadiusPolicySets(
    options = {
      startAt: 1,
      pageSize: 25
    }
  ) {
    return this.session.get(RADIUS_POLICY_SETS, this._addQPH(options));
  }

  getRadiusPolicySetByName(name) {
    return this.getRadiusPolicySets().then(policySets =>
      policySets.find(policySet => policySet.name === name)
    );
  }

  resolveRadiusPolicySet(policySet) {
    // Get policy set info from this.getRadiusPolicySets()
    // Resolve member info: exceptions, serviceName, SGTs, profiles (authz), authorizations,
    return Promise.all([
      this.getAuthenticationPolicy(policySet),
      this.getAuthorizationPolicy(policySet),
      this.getLocalExceptions(policySet),
      this.getGlobalExceptions(),
      this.getSecurityGroups(),
      this.getServiceNames(),
      this.getFailovers(),
      this.getIdentityStores()
    ]).then(values => {
      const data = {
        authcPolicy: values[0],
        authzPolicy: values[1],
        localExceptions: values[2],
        globalExceptions: values[3],
        securityGroups: values[4],
        serviceNames: values[5],
        failovers: values[6],
        identityStores: values[7]
      };
      return data;
    });
  }

  getSecurityGroups() {
    return this._get(SECURITY_GROUPS);
  }

  getServiceNames() {
    return this._get(SERVICE_NAMES);
  }

  getAuthorizationProfiles() {
    return this._get(AUTHZ_PROFILES);
  }

  getIdentityStores() {
    return this._get(IDENTITY_STORES);
  }

  getFailovers() {
    return this._get(FAILOVERS);
  }

  getAuthenticationPolicy(policySet) {
    return this.session.get(RADIUS_POLICY_SETS + policySet + '/authentication');
  }

  getAuthorizationPolicy(policySet) {
    return this.session.get(RADIUS_POLICY_SETS + policySet + '/authorization');
  }

  getLocalExceptions(policySet) {
    return this.session.get(RADIUS_POLICY_SETS + policySet + '/exceptions');
  }

  getGlobalExceptions() {
    return this._get(GLOBAL_EXCEPTIONS).then(response => {
      if (response === '' || !response) {
        return undefined;
      }
      return response;
    });
  }

  // SXP
  getSxpBindings() {
    return this._get(SXP_BINDINGS);
  }

  // METRICS
  getActiveEndpoints() {
    return this._get(ACTIVE_ENDPOINTS_METRIC).then(response => response.attrValue);
  }

  getRejectedEndpoints() {
    return this._get(REJECTED_ENDPOINTS_METRIC).then(response => response.attrValue);
  }

  getAnomalousEndpoints() {
    return this._get(ANOMALOUS_ENDPOINTS_METRIC).then(response => response.attrValue);
  }

  getByodEndpoints() {
    return this._get(BYOD_ENDPOINTS_METRIC).then(response => response.attrValue);
  }

  getAuthenticatedGuest() {
    return this._get(AUTHENTICATED_GUEST_METRIC).then(response => response.attrValue);
  }

  // CHARTS
  // TODO: There is fetchDataWithFilter URIs, as well.
  getDeviceComplianceChartData() {
    return this._get(DEVICE_COMPLIANCE_CHART);
  }

  getEndpointGroupChartData() {
    return this._get(ENDPOINT_GROUP_CHART);
  }

  getEndpointPolicyChartData() {
    return this._get(ENDPOINT_POLICY_CHART);
  }

  getIdentityGroupChartData() {
    return this._get(IDENTITY_GROUP_CHART);
  }

  getNetworkDeviceChartData() {
    return this._get(NETWORK_DEVICE_CHART);
  }

  getLocationChartData() {
    return this._get(LOCATION_CHART);
  }

  getEndpointProfilerServerChartData() {
    return this._get(ENDPOINT_PROFILER_SERVER_CHART);
  }

  getOperatingSystemChartData() {
    return this._get(OPERATING_SYSTEM_CHART);
  }

  getDeviceTypeChartData() {
    return this._get(DEVICE_TYPE_CHART);
  }

  // DASHBOARDS
  getGenericDashboard(query = 'alarms') {
    return this.session.get(GENERIC_DASHBOARD, this._addQPH({ query: query }));
  }

  getSystemAlarms() {
    return this.getGenericDashboard('alarms');
  }

  getSystemSummary() {
    return this.getGenericDashboard('systemSummary');
  }

  // VULNERABILITY
  getVulnerabilityData() {
    return this._get(ALL_VULNERABILITY_DATA);
  }

  getTotalVulnerableEndpoints() {
    return this._get(TOTAL_VULNERABLE_ENDPOINTS);
  }

  getVulnerableEndpointsOverTime(period = 'day') {
    // 'day', '3days', 'week', 'month', '3months', etc.
    return this.session.get(`${VULNERABILITY_ENDPOINTS_OVER_TIME}/${period}/0`);
  }

  // THREATS
  getTopThreats() {
    return this._get(TOP_THREATS);
  }

  getTopCompromisedEndpoints() {
    return this._get(TOP_COMPROMISED_ENDPOINTS);
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
    return this._post(API_PATH + 'pxGrid/certificate/create', reqBody, reqConfig)
      .then(data => {
        if (
          (typeof data.valid === 'string' && data.valid !== 'true') ||
          (typeof data.valid === 'boolean' && !data.valid)
        ) {
          const error = new Error();
          error.message =
            'Certificate generation failed. This often means that the pxGrid service is not running on the node.';
          error.response = data;
          throw error;
        } else {
          reqConfig.responseType = 'stream';
          return this._get(API_PATH + 'pxGrid/certificate/download/' + data.fileName, reqConfig);
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
          const err = new Error();
          err.message =
            'A server error occurred. This could be due to exceeding the maximum number of sessions or a malformed request.';
          err.status = error.response.status;
          err.statusText = error.response.statusText;
          // err.response = error.response;
          throw err;
        }
      });
  }

  _post(path, body, config = {}) {
    return this.session
      .post(path, body, config)
      .then(response => response.data)
      .catch(error => {
        if (error.response.status === 500) {
          const err = new Error();
          err.message =
            'A server error occurred. This could be due to exceeding the maximum number of sessions or a malformed request.';
          err.status = error.response.status;
          err.statusText = error.response.statusText;
          // err.response = error.response;
          throw err;
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
    let params = {};
    params = Object.assign(params, defaults, options, filter);
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
    return new ObjectsToCsv(data).toDisk(filename, { bom: true });
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
}

module.exports = ISE;
