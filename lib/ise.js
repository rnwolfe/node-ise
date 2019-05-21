const http = require('axios');
const https = require('https');
const qs = require('querystring');
const ObjectsToCsv = require('objects-to-csv');
const path = require('path');

class ISE {
  constructor(host, sessionId) {
    this.host = host;
    this.session = http.create({
      baseURL: `https://${host}/admin/rs/uiapi/`,
      headers: {
        Referer: `https://${host}/admin/`,
        Cookie: `APPSESSIONID=${sessionId}`
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
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
    return this.session.get('visibility/endpoint/' + mac).then(response => response.data);
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
}

module.exports = ISE;
