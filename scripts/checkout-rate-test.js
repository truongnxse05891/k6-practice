import http from 'k6/http';
import { check, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const checkoutUrl = __ENV.CHECKOUT_URL;
const rate = Number(__ENV.RATE || 5);
const duration = __ENV.DURATION || '2m';

if (!checkoutUrl) {
  throw new Error('Missing CHECKOUT_URL. Example: k6 run -e CHECKOUT_URL=https://example.com/checkouts/id scripts/checkout-rate-test.js');
}

const checkoutStatus2xx = new Counter('checkout_status_2xx');
const checkoutStatus3xx = new Counter('checkout_status_3xx');
const checkoutStatus4xx = new Counter('checkout_status_4xx');
const checkoutStatus5xx = new Counter('checkout_status_5xx');
const checkoutStatusOther = new Counter('checkout_status_other');
const checkoutDuration = new Trend('checkout_duration');

export const options = {
  scenarios: {
    checkout_rate: {
      executor: 'constant-arrival-rate',
      rate,
      timeUnit: '1s',
      duration,
      preAllocatedVUs: Number(__ENV.PRE_ALLOCATED_VUS || 20),
      maxVUs: Number(__ENV.MAX_VUS || 50),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.98'],
  },
};

export default function () {
  group('Checkout constant arrival rate', () => {
    const response = http.get(checkoutUrl, {
      timeout: __ENV.REQUEST_TIMEOUT || '30s',
      tags: {
        page: 'checkout',
        flow: 'checkout_rate',
        configured_rate: String(rate),
      },
    });

    recordStatus(response.status);
    checkoutDuration.add(response.timings.duration);

    check(response, {
      'checkout returns HTTP 200': (res) => res.status === 200,
      'checkout response time < 1000ms': (res) => res.timings.duration < 1000,
      'checkout body is not empty': (res) => Boolean(res.body && res.body.length > 0),
    });
  });
}

function recordStatus(status) {
  if (status >= 200 && status < 300) {
    checkoutStatus2xx.add(1);
  } else if (status >= 300 && status < 400) {
    checkoutStatus3xx.add(1);
  } else if (status >= 400 && status < 500) {
    checkoutStatus4xx.add(1);
  } else if (status >= 500 && status < 600) {
    checkoutStatus5xx.add(1);
  } else {
    checkoutStatusOther.add(1);
  }
}

