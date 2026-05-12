import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { loadThresholds } from '../lib/thresholds.js';

const checkoutUrl = __ENV.CHECKOUT_URL;

if (!checkoutUrl) {
  throw new Error('Missing CHECKOUT_URL. Example: k6 run -e CHECKOUT_URL=https://example.com/checkouts/id scripts/checkout-load-test.js');
}

const checkoutStatus2xx = new Counter('checkout_status_2xx');
const checkoutStatus3xx = new Counter('checkout_status_3xx');
const checkoutStatus4xx = new Counter('checkout_status_4xx');
const checkoutStatus5xx = new Counter('checkout_status_5xx');
const checkoutStatusOther = new Counter('checkout_status_other');

export const options = {
  stages: [
    { duration: '30s', target: 3 },
    { duration: '1m', target: 5 },
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: loadThresholds,
};

export default function () {
  group('Checkout page availability under load', () => {
    const response = http.get(checkoutUrl, {
      timeout: __ENV.REQUEST_TIMEOUT || '30s',
      tags: {
        page: 'checkout',
        flow: 'checkout_load',
      },
    });

    recordStatus(response.status);

    check(response, {
      'checkout returns HTTP 200': (res) => res.status === 200,
      'checkout response time < 1200ms': (res) => res.timings.duration < 1200,
      'checkout body is not empty': (res) => Boolean(res.body && res.body.length > 0),
    });

    sleep(Number(__ENV.THINK_TIME_SECONDS || 1));
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
