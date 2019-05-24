const fs = require('fs');
const path = require('path');
const util = require('util');

const http = require('axios');
const https = require('https');
const qs = require('querystring');
const ObjectsToCsv = require('objects-to-csv');

const UI_API_PATH = 'rs/uiapi/';

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
    const params = {
      columns: options.columns || ['MACAddress'],
      sortBy: options.sortBy || 'MACAddress',
      startAt: options.startAt || 1,
      pageSize: options.pageSize || 500
    };
    if (Object.entries(filter).length > 0) {
      Object.assign(params, filter);
    }

    const headers = {
      headers: {
        _QPH_: this._b64(this._buildQueryParams(params))
      }
    };
    return this.session.get(UI_API_PATH + 'visibility', headers);
  }

  resolveEndpoint(mac) {
    return this.session
      .get(UI_API_PATH + 'visibility/endpoint/' + mac)
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
      .post(UI_API_PATH + 'pxGrid/certificate/create', reqBody, reqConfig)
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
            UI_API_PATH + 'pxGrid/certificate/download/' + data.fileName,
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
