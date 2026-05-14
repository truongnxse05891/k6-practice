import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import exec from 'k6/execution';

const checkoutUrl = __ENV.CHECKOUT_URL;
const maxLoggedErrors = Number(__ENV.MAX_LOGGED_ERRORS || 10);
let vuLoggedError = false;

if (!checkoutUrl) {
  throw new Error('Missing CHECKOUT_URL. Example: k6 run -e CHECKOUT_URL=https://example.com/checkouts/id scripts/checkout-diagnostic-test.js');
}

const checkoutStatus200 = new Counter('checkout_status_200');
const checkoutStatus400 = new Counter('checkout_status_400');
const checkoutStatus401 = new Counter('checkout_status_401');
const checkoutStatus403 = new Counter('checkout_status_403');
const checkoutStatus404 = new Counter('checkout_status_404');
const checkoutStatus409 = new Counter('checkout_status_409');
const checkoutStatus429 = new Counter('checkout_status_429');
const checkoutStatus4xxOther = new Counter('checkout_status_4xx_other');
const checkoutStatus5xx = new Counter('checkout_status_5xx');
const checkoutStatusOther = new Counter('checkout_status_other');
const loggedErrors = new Counter('logged_errors');
const checkoutDuration = new Trend('checkout_duration');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.95'],
  },
};

export default function () {
  group('Checkout diagnostic status analysis', () => {
    const response = http.get(checkoutUrl, {
      timeout: __ENV.REQUEST_TIMEOUT || '30s',
      tags: {
        page: 'checkout',
        flow: 'checkout_diagnostic',
      },
    });

    recordStatus(response.status);
    checkoutDuration.add(response.timings.duration);
    logErrorSample(response);

    check(response, {
      'checkout returns HTTP 200': (res) => res.status === 200,
      'checkout response time < 1000ms': (res) => res.timings.duration < 1000,
      'checkout body is not empty': (res) => Boolean(res.body && res.body.length > 0),
    });

    sleep(Number(__ENV.THINK_TIME_SECONDS || 1));
  });
}

function recordStatus(status) {
  if (status === 200) {
    checkoutStatus200.add(1);
  } else if (status === 400) {
    checkoutStatus400.add(1);
  } else if (status === 401) {
    checkoutStatus401.add(1);
  } else if (status === 403) {
    checkoutStatus403.add(1);
  } else if (status === 404) {
    checkoutStatus404.add(1);
  } else if (status === 409) {
    checkoutStatus409.add(1);
  } else if (status === 429) {
    checkoutStatus429.add(1);
  } else if (status >= 400 && status < 500) {
    checkoutStatus4xxOther.add(1);
  } else if (status >= 500 && status < 600) {
    checkoutStatus5xx.add(1);
  } else {
    checkoutStatusOther.add(1);
  }
}

function logErrorSample(response) {
  if (response.status === 200 || vuLoggedError || exec.vu.idInTest > maxLoggedErrors) {
    return;
  }

  vuLoggedError = true;
  loggedErrors.add(1);

  const body = String(response.body || '')
    .replace(/\s+/g, ' ')
    .slice(0, 200);

  console.error(
    `checkout_error_sample status=${response.status} duration=${response.timings.duration.toFixed(2)}ms body="${body}"`,
  );
}
