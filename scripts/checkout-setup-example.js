import http from 'k6/http';
import { check, group } from 'k6';
import { availabilityThresholds } from '../lib/checkout-thresholds.js';

export const options = {
  vus: Number(__ENV.VUS || 2),
  iterations: Number(__ENV.ITERATIONS || 6),
  thresholds: availabilityThresholds,
};

export function setup() {
  const checkoutUrl = __ENV.CHECKOUT_URL;

  if (!checkoutUrl) {
    throw new Error('Missing CHECKOUT_URL. Example: k6 run -e CHECKOUT_URL=https://example.com/checkouts/id scripts/checkout-setup-example.js');
  }

  return {
    checkoutUrl,
    testRunId: `k6-${Date.now()}`,
    startedAt: new Date().toISOString(),
  };
}

export default function (data) {
  group('checkout setup data example', () => {
    const response = http.get(data.checkoutUrl, {
      timeout: __ENV.REQUEST_TIMEOUT || '30s',
      headers: {
        'X-K6-Test-Run-Id': data.testRunId,
      },
      tags: {
        page: 'checkout',
        step: 'setup_example',
        test_run_id: data.testRunId,
        started_at: data.startedAt,
      },
    });

    check(response, {
      'setup example returns HTTP 200': (res) => res.status === 200,
      'setup example response time < 1000ms': (res) => res.timings.duration < 1000,
      'setup example body is not empty': (res) => Boolean(res.body && res.body.length > 0),
    });
  });
}

