global.LOGIN = 'LoginAction.do';
global.LOGOUT = 'logout.jsp';

global.API_PATH = 'rs/uiapi/';
global.RADIUS_POLICY_SETS = API_PATH + 'policytable/radius/';
global.SECURITY_GROUPS = API_PATH + 'policytable/radius/results/securityGroups/';
global.SERVICE_NAMES = API_PATH + 'policytable/radius/results/serviceName/';
global.IDENTITY_STORES = API_PATH + 'policytable/radius/results/identityStores/';
global.FAILOVERS = API_PATH + 'policytable/radius/results/failovers/';
global.AUTHZ_PROFILES = API_PATH + 'policytable/radius/results/profiles/';
global.GLOBAL_EXCEPTIONS = API_PATH + '0/exceptions';
global.SXP_BINDINGS = API_PATH + 'sxp/allbindings';
global.GENERIC_DASHBOARD = API_PATH + 'dashboard/generic/fetchData';

// METRICS
global.METRIC_PATH = API_PATH + 'visibility/fetchMetricData/';
global.ACTIVE_ENDPOINTS_METRIC = METRIC_PATH + 'activeEndpoints';
global.REJECTED_ENDPOINTS_METRIC = METRIC_PATH + 'rejectedEndpoints';
global.ANOMALOUS_ENDPOINTS_METRIC = METRIC_PATH + 'anomalousEndpoints';
global.AUTHENTICATED_GUEST_METRIC = METRIC_PATH + 'authenticateGuest';
global.BYOD_ENDPOINTS_METRIC = METRIC_PATH + 'byodEndpoints';
global.CHART_PATH = API_PATH + 'visibility/fetchChartData/';
global.DEVICE_COMPLIANCE_CHART = CHART_PATH + 'DeviceCompliance';
global.ENDPOINT_GROUP_CHART = CHART_PATH + 'EndPointGroup';
global.ENDPOINT_POLICY_CHART = CHART_PATH + 'EndPointPolicy';
global.IDENTITY_GROUP_CHART = CHART_PATH + 'IdentityGroup';
global.ENDPOINT_PROFILER_SERVER_CHART = CHART_PATH + 'EndPointProfilerServer';
global.OPERATING_SYSTEM_CHART = CHART_PATH + 'operating-system';
global.NETWORK_DEVICE_CHART = CHART_PATH + 'NetworkDeviceName';
global.DEVICE_TYPE_CHART = CHART_PATH + 'Device Type';
global.LOCATION_CHART = CHART_PATH + 'Location';

// APPLICATION DATA
global.APPLICATION_CATEGORY_CHART = API_PATH + 'visibility/fetchApplicationsByCategory/';

// VULNERABILITY DATA
global.TOTAL_VULNERABLE_ENDPOINTS = API_PATH + 'visibility/fetchTotalVulnerableEndPoints/0';
global.ALL_VULNERABILITY_DATA = API_PATH + 'visibility/fetchVulnerabilityData/EndPoints/all';
global.VULNERABILITY_ENDPOINTS_OVER_TIME =
  API_PATH + 'visibility/fetchVulnerabilityEndpointsOverTime/';

// THREAT/COMPROMISE DATA
global.THREAT_PATH = API_PATH + 'charts/compromised/';
global.TOP_COMPROMISED_ENDPOINTS = THREAT_PATH + 'compromisedEndpointsTop';
global.TOP_THREATS = THREAT_PATH + 'topThreats/incidents/impacted/all';
global.THREATS_OVER_TIME = THREAT_PATH + 'compromisedEndpointsTime/';
