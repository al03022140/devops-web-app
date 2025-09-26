import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_reqs: ['count>100'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASS = __ENV.ADMIN_PASS || 'admin123';

export default function () {
  // Login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, {
    email: ADMIN_EMAIL,
    contraseña: ADMIN_PASS,
  });

  check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => !!(r.json() && r.json().token),
  });

  const token = loginRes.json().token;

  // List avisos (first page)
  const avisosRes = http.get(`${BASE_URL}/api/avisos?page=1&pageSize=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(avisosRes, {
    'avisos status 200': (r) => r.status === 200,
    'avisos has data': (r) => Array.isArray(r.json()?.avisos),
  });

  sleep(1);
}
