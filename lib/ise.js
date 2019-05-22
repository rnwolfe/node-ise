const fs = require('fs');
const path = require('path');

const http = require('axios');
const https = require('https');
const qs = require('querystring');
const ObjectsToCsv = require('objects-to-csv');

const UI_API_PATH = 'rs/uiapi/';

class ISE {
  constructor(host, sessionId, csrfToken) {
    this.host = host;
    this.sessionId = sessionId;
    this.csrfToken = csrfToken;
    // this.session = this._createIseSession();
  }

  _createIseSession() {
    return http.create({
      baseURL: `https://${this.host}/admin/`,
      headers: {
        Referer: `https://${this.host}/admin/`
        // Cookie: `APPSESSIONID=${this.sessionId}`,
        // OWASP_CSRFTOKEN: this.csrfToken
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
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
    return this.session.get('visibility', headers);
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

  /**
   * WORKS IN PROGRESS ----
   */
  autoGenPxGridCert(commonName, description, password, format = 'pkcs8', pathToFile = null) {
    // This is currently killing the existing session id.... :D
    const filename = 'cert_archive.zip';
    const filepath = pathToFile
      ? path.format({ base: pathToFile })
      : path.format({ dir: process.cwd(), base: filename });
    console.log(filepath);

    const reqConfig = { responseType: 'stream' };

    const reqBody = {
      actionType: 'commonName', // other actions?
      description: description,
      certificateFormat: format === 'pkcs8' ? 'certInPrivacy' : '???', // other formats?
      certificatePassword: password,
      certificateConfirmPassword: password,
      commonName: commonName,
      certificateDetails: '',
      csvFile: '',
      hostNames: null, // ??
      sans: [
        {
          select: null, // IP or hostnames??
          input: ''
        }
      ]
    };
    return this.session
      .post('pxGrid/certificate/create', reqBody, reqConfig)
      .then(response => {
        // console.dir(response.request);
        return response.data;
      })
      .then(data => this._writeToFile(filepath, data));
  }

  _writeToFile(filepath, data) {
    const writer = fs.createWriteStream(filepath);
    data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  iseLogin(username, password) {
    const reqBody = qs.stringify({
      username: username,
      password: password,
      authType: 'Internal',
      rememberme: 'on',
      name: username,
      newPassword: '',
      destinationURL: '',
      xeniaUrl: ''
    });

    const session = this._createIseSession();
    return session
      .post('LoginAction.do', reqBody, {
        // headers: {
        //   Referer: `https://${this.host}/admin/login.jsp,https://${this.host}/admin/LoginAction.do`,
        //   Origin: `https://${this.host}`
        // },
        // We can't follow redirects because we end up with the wrong APPSESSIONID
        maxRedirects: 0
      })
      .then(response => {
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
        if (response.headers['set-cookie']) {
          session.defaults.headers['Cookie'] = response.headers['set-cookie'];
          this.session = session;
          return true;
        }
      });
  }
}

module.exports = ISE;
