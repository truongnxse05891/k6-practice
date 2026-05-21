import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { availabilityThresholds } from '../lib/checkout-thresholds.js';

const checkoutUrl = __ENV.CHECKOUT_URL;

if (!checkoutUrl) {
  throw new Error('Missing CHECKOUT_URL. Example: k6 run -e CHECKOUT_URL=https://example.com/checkouts/id scripts/checkout-baseline-test.js');
}

const checkoutPageDuration = new Trend('checkout_page_duration');
const checkoutRevisitDuration = new Trend('checkout_revisit_duration');
const checkoutPageErrors = new Counter('checkout_page_errors');
const checkoutRevisitErrors = new Counter('checkout_revisit_errors');
const checkoutStatus2xx = new Counter('checkout_status_2xx');
const checkoutStatus4xx = new Counter('checkout_status_4xx');
const checkoutStatus5xx = new Counter('checkout_status_5xx');

export const options = {
  vus: Number(__ENV.VUS || 3),
  duration: __ENV.DURATION || '1m',
  thresholds: availabilityThresholds,
};

export default function () {
  group('checkout_page', () => {
    const response = http.get(checkoutUrl, {
      timeout: __ENV.REQUEST_TIMEOUT || '30s',
      tags: { page: 'checkout', step: 'checkout_page' },
    });

    checkoutPageDuration.add(response.timings.duration);
    recordStatus(response.status);
    recordStepError(response, checkoutPageErrors);

    check(response, {
      'checkout_page returns HTTP 200': (res) => res.status === 200,
      'checkout_page response time < 1000ms': (res) => res.timings.duration < 1000,
      'checkout_page body is not empty': (res) => Boolean(res.body && res.body.length > 0),
    });
  });

  sleep(Number(__ENV.THINK_TIME_SECONDS || 1));

  group('checkout_revisit', () => {
    const response = http.get(checkoutUrl, {
      timeout: __ENV.REQUEST_TIMEOUT || '30s',
      tags: { page: 'checkout', step: 'checkout_revisit' },
    });

    checkoutRevisitDuration.add(response.timings.duration);
    recordStatus(response.status);
    recordStepError(response, checkoutRevisitErrors);

    check(response, {
      'checkout_revisit returns HTTP 200': (res) => res.status === 200,
      'checkout_revisit response time < 1000ms': (res) => res.timings.duration < 1000,
      'checkout_revisit body is not empty': (res) => Boolean(res.body && res.body.length > 0),
    });
  });

  sleep(Number(__ENV.THINK_TIME_SECONDS || 1));
}

function recordStatus(status) {
  if (status >= 200 && status < 300) {
    checkoutStatus2xx.add(1);
  } else if (status >= 400 && status < 500) {
    checkoutStatus4xx.add(1);
  } else if (status >= 500 && status < 600) {
    checkoutStatus5xx.add(1);
  }
}

function recordStepError(response, counter) {
  if (response.status !== 200) {
    counter.add(1);
  }
}

