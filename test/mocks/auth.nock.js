// Successful login
nock(BASEURL)
  .post(ROOT + PATHS.LOGIN, body => body.username === 'goodtest' && body.password === 'goodtest')
  .reply(302, '', {
    'set-cookie': [
      'APPSESSIONID=AA11BB22CC33; Path=/admin; Secure; HttpOnly',
      'TOKEN=; Max-Age=0; Expires=Thu, 01-Jan-1970 00:00:10 GMT; Path=/; Secure; HttpOnly',
      'redirectUrl=; Max-Age=0; Expires=Thu, 01-Jan-1970 00:00:10 GMT; Path=/; Secure; HttpOnly'
    ],
    location: '/admin/'
  })
  .persist(true);

// Bad credentials
nock(BASEURL)
  .post(ROOT + PATHS.LOGIN, body => body.username !== 'goodtest' && body.password !== 'goodtest')
  .reply(302, '', {
    'set-cookie': ['APPSESSIONID=BADSESSION; Path=/admin; Secure; HttpOnly'],
    location: '/admin/login.jsp?mid=external_auth_msg'
  });

// CSRF for good login
const csrfReplyBody = `<input type="hidden" id="accessToLicenseMenu" value=true />
<input type="hidden" id="hostStatus" value=PRIMARY />
<input type="hidden" id="CSRFTokenNameValue" name="CSRFTokenNameValue" value=OWASP_CSRFTOKEN=ICKF-UNW7-U63E-DJLW-LT33-ZGYW-Z5PE-S00I />
<script type="text/javascript"></script>`;
nock(BASEURL, { reqheaders: { cookie: 'APPSESSIONID=AA11BB22CC33' } })
  .get(ROOT)
  .reply(200, csrfReplyBody)
  .persist(true);

// Logout
nock(BASEURL)
  .get(ROOT + PATHS.LOGOUT)
  .reply(302, '', { location: '/' })
  .persist(true);
