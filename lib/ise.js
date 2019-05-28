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
      .post('LoginAction.do', reqBody, {
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
    return this.session.get('', { maxRedirects: 0 }).then(response => {
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
        const csrfToken = response.data.match(csrfRegex)[1].split('=')[1];
        this.csrfToken = csrfToken;
        this.session.defaults.headers['OWASP_CSRFTOKEN'] = csrfToken;
        return true;
      }
    });
  }

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
    return this.session.get(API_PATH + 'visibility', reqConfig);
  }

  resolveEndpoint(mac) {
    return this.session
      .get(API_PATH + 'visibility/endpoint/' + mac)
      .then(response => response.data);
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

  getRadiusPolicySets(
    options = {
      startAt: 1,
      pageSize: 25
    }
  ) {
    return this.session
      .get(RADIUS_POLICY_SETS, this._addQPH(options))
      .then(response => response.data);
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
    return this.session.get(SECURITY_GROUPS).then(response => response.data);
  }

  getServiceNames() {
    return this.session.get(SERVICE_NAMES).then(response => response.data);
  }

  getAuthorizationProfiles() {
    return this.session.get(AUTHZ_PROFILES).then(response => response.data);
  }

  getIdentityStores() {
    return this.session.get(IDENTITY_STORES).then(response => response.data);
  }

  getFailovers() {
    return this.session.get(FAILOVERS).then(response => response.data);
  }

  getAuthenticationPolicy(policySet) {
    return this.session
      .get(RADIUS_POLICY_SETS + policySet + '/authentication')
      .then(response => response.data);
  }

  getAuthorizationPolicy(policySet) {
    return this.session
      .get(RADIUS_POLICY_SETS + policySet + '/authorization')
      .then(response => response.data);
  }

  getLocalExceptions(policySet) {
    return this.session
      .get(RADIUS_POLICY_SETS + policySet + '/exceptions')
      .then(response => response.data);
  }

  getGlobalExceptions() {
    return this.session.get(GLOBAL_EXCEPTIONS).then(response => {
      if (response.data === '' || !response.data) {
        return undefined;
      }
      return response.data;
    });
  }

  // SXP
  getSxpBindings() {
    return this.session.get(SXP_BINDINGS).then(response => response.data);
  }

  // METRICS
  getActiveEndpoints() {
    return this.session.get(ACTIVE_ENDPOINTS_METRIC).then(response => response.data.attrValue);
  }

  getRejectedEndpoints() {
    return this.session.get(REJECTED_ENDPOINTS_METRIC).then(response => response.data.attrValue);
  }

  getAnomalousEndpoints() {
    return this.session.get(ANOMALOUS_ENDPOINTS_METRIC).then(response => response.data.attrValue);
  }

  getByodEndpoints() {
    return this.session.get(BYOD_ENDPOINTS_METRIC).then(response => response.data.attrValue);
  }

  getAuthenticatedGuest() {
    return this.session.get(AUTHENTICATED_GUEST_METRIC).then(response => response.data.attrValue);
  }

  // CHARTS
  getDeviceComplianceChartData() {
    return this.session.get(DEVICE_COMPLIANCE_CHART).then(response => response.data);
  }

  getEndpointGroupChartData() {
    return this.session.get(ENDPOINT_GROUP_CHART).then(response => response.data);
  }

  getEndpointPolicyChartData() {
    return this.session.get(ENDPOINT_POLICY_CHART).then(response => response.data);
  }

  getIdentityGroupChartData() {
    return this.session.get(IDENTITY_GROUP_CHART).then(response => response.data);
  }

  getNetworkDeviceChartData() {
    return this.session.get(NETWORK_DEVICE_CHART).then(response => response.data);
  }

  getLocationChartData() {
    return this.session.get(LOCATION_CHART).then(response => response.data);
  }

  getEndpointProfilerServerChartData() {
    return this.session.get(ENDPOINT_PROFILER_SERVER_CHART).then(response => response.data);
  }

  getOperatingSystemChartData() {
    return this.session.get(OPERATING_SYSTEM_CHART).then(response => response.data);
  }

  getDeviceTypeChartData() {
    return this.session.get(DEVICE_TYPE_CHART).then(response => response.data);
  }

  getGenericDashboard(query = 'alarms') {
    return this.session
      .get(GENERIC_DASHBOARD, this._addQPH({ query: query }))
      .then(response => response.data);
  }

  // VULNERABILITY
  getVulnerabilityData() {
    return this.session.get(ALL_VULNERABILITY_DATA).then(response => response.data);
  }

  getTotalVulnerableEndpoints() {
    return this.session.get(TOTAL_VULNERABLE_ENDPOINTS).then(response => response.data);
  }

  getVulnerableEndpointOverTime(period = 'day') {
    // 'day', '3days', 'week', 'month', '3months', etc.
    return this.session
      .get(`${VULNERABILITY_ENDPOINTS_OVER_TIME}/${period}/0`)
      .then(response => response.data);
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
    return this.session
      .post(API_PATH + 'pxGrid/certificate/create', reqBody, reqConfig)
      .then(response => {
        return response.data;
      })
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
          return this.session.get(
            API_PATH + 'pxGrid/certificate/download/' + data.fileName,
            reqConfig
          );
        }
      })
      .then(response => {
        this._makeDirIfNotExists(fileDir);
        const filepath = path.join(fileDir, `${Date.now().toString()}_${commonName}_cert.zip`);
        return this._writeToFile(filepath, response.data);
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
    const params = {};
    Object.assign(params, options);
    Object.assign(params, filter);
    Object.assign(params, defaults);
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
