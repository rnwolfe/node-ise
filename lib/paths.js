global.LOGIN = 'LoginAction.do';
global.LOGOUT = 'logout.jsp';

global.API_PATH = 'rs/uiapi/';
global.MNT_PATH = API_PATH + 'mnt/';

// RADIUS POLICIES
global.RADIUS_POLICY_SETS = API_PATH + 'policytable/radius/';
global.RADIUS_AUTHENTICATION_POLICY = id => RADIUS_POLICY_SETS + id + '/authentication/';
global.RADIUS_AUTHORIZATION_POLICY = id => RADIUS_POLICY_SETS + id + '/authorization/';
global.RADIUS_SECURITY_GROUPS = RADIUS_POLICY_SETS + 'results/securityGroups/';
global.RADIUS_SERVICE_NAMES = RADIUS_POLICY_SETS + 'results/serviceName/';
global.RADIUS_IDENTITY_STORES = RADIUS_POLICY_SETS + 'results/identityStores/';
global.RADIUS_FAILOVERS = RADIUS_POLICY_SETS + 'results/failovers/';
global.RADIUS_AUTHZ_PROFILES = RADIUS_POLICY_SETS + 'results/profiles/';
global.RADIUS_LOCAL_EXCEPTIONS = id => RADIUS_POLICY_SETS + id + '/exceptions';
global.RADIUS_GLOBAL_EXCEPTIONS = RADIUS_POLICY_SETS + '0/exceptions';

// TACACS POLICIES
global.TACACS_POLICY_SETS = API_PATH + 'policytable/tacacs/';
global.TACACS_AUTHENTICATION_POLICY = id => TACACS_POLICY_SETS + id + '/authentication/';
global.TACACS_AUTHORIZATION_POLICY = id => TACACS_POLICY_SETS + id + '/authorization/';
global.TACACS_SERVICE_NAMES = TACACS_POLICY_SETS + 'results/serviceName/';
global.TACACS_IDENTITY_STORES = TACACS_POLICY_SETS + 'results/identityStores/';
global.TACACS_FAILOVERS = TACACS_POLICY_SETS + 'results/failovers/';
global.TACACS_SHELL_PROFILES = TACACS_POLICY_SETS + 'results/profiles/';
global.TACACS_COMMAND_SETS = TACACS_POLICY_SETS + 'results/commandSets';
global.TACACS_LOCAL_EXCEPTIONS = id => TACACS_POLICY_SETS + id + '/exceptions';
global.TACACS_GLOBAL_EXCEPTIONS = TACACS_POLICY_SETS + '0/exceptions';

// SXP
global.SXP_BINDINGS = API_PATH + 'sxp/allbindings';

// METRICS
global.METRIC_PATH = API_PATH + 'visibility/fetchMetricData/';
global.ACTIVE_ENDPOINTS_METRIC = METRIC_PATH + 'activeEndpoints';
global.REJECTED_ENDPOINTS_METRIC = METRIC_PATH + 'rejectedEndpoints';
global.ANOMALOUS_ENDPOINTS_METRIC = METRIC_PATH + 'anomalousEndpoints';
global.AUTHENTICATED_GUEST_METRIC = METRIC_PATH + 'authenticateGuest';
global.BYOD_ENDPOINTS_METRIC = METRIC_PATH + 'byodEndpoints';
global.GENERIC_DASHBOARD = API_PATH + 'dashboard/generic/fetchData';
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

// LIVE LOGS
global.RADIUS_LIVE_LOGS = MNT_PATH + 'authLiveLog/';
global.RADIUS_LIVE_LOG_COUNTERS = RADIUS_LIVE_LOGS + 'counters';
global.TACACS_LIVE_LOGS = MNT_PATH + 'tacacsLiveLog';
global.TCNAC_LIVE_LOGS = 'irf/sasLiveLog';
