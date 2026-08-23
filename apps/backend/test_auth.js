const http = require('http');

async function runTests() {
  const baseUrl = 'http://localhost:4000/api/auth';
  let sessionCookie = '';

  const request = (path, method, body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 4000,
        path: `/api/auth${path}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (sessionCookie) {
        options.headers['Cookie'] = sessionCookie;
      }

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          let setCookie = res.headers['set-cookie'];
          if (setCookie) {
            sessionCookie = setCookie[0].split(';')[0];
          }
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        });
      });

      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  };

  console.log('--- STARTING AUTH TESTS ---');

  // 1. Register new user
  console.log('1. Register new user');
  const regRes = await request('/register', 'POST', {
    email: 'test@nexus.com',
    username: 'testuser',
    password: 'password123'
  });
  console.log('Status:', regRes.status, regRes.body);

  // 2. Duplicate email
  console.log('2. Register duplicate email');
  const dupEmail = await request('/register', 'POST', {
    email: 'test@nexus.com',
    username: 'anotheruser',
    password: 'password123'
  });
  console.log('Status:', dupEmail.status, dupEmail.body);

  // 3. Duplicate username
  console.log('3. Register duplicate username');
  const dupUser = await request('/register', 'POST', {
    email: 'another@nexus.com',
    username: 'testuser',
    password: 'password123'
  });
  console.log('Status:', dupUser.status, dupUser.body);

  // 4. Login correct
  console.log('4. Login correct');
  const loginCorrect = await request('/login', 'POST', {
    email: 'test@nexus.com',
    password: 'password123'
  });
  console.log('Status:', loginCorrect.status, loginCorrect.body);
  console.log('Session Cookie received:', !!sessionCookie);

  // 5. Login incorrect
  console.log('5. Login incorrect');
  const loginFail = await request('/login', 'POST', {
    email: 'test@nexus.com',
    password: 'wrongpassword'
  });
  console.log('Status:', loginFail.status, loginFail.body);

  // 6. Access /me authenticated
  console.log('6. Access /me authenticated');
  const meAuth = await request('/me', 'GET');
  console.log('Status:', meAuth.status, meAuth.body);

  // 7. Logout
  console.log('7. Logout');
  const logout = await request('/logout', 'POST', {});
  console.log('Status:', logout.status, logout.body);

  // 8. Access /me without authentication (or invalid session)
  console.log('8. Access /me without authentication');
  const meNoAuth = await request('/me', 'GET');
  console.log('Status:', meNoAuth.status, meNoAuth.body);

  console.log('--- TESTS FINISHED ---');
}

runTests().catch(console.error);
