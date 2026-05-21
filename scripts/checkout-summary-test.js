import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { availabilityThresholds } from '../lib/checkout-thresholds.js';

const checkoutUrl = __ENV.CHECKOUT_URL;

if (!checkoutUrl) {
  throw new Error('Missing CHECKOUT_URL. Example: k6 run -e CHECKOUT_URL=https://example.com/checkouts/id scripts/checkout-summary-test.js');
}

export const options = {
  vus: Number(__ENV.VUS || 2),
  duration: __ENV.DURATION || '30s',
  thresholds: availabilityThresholds,
};

export default function () {
  group('checkout summary test', () => {
    const response = http.get(checkoutUrl, {
      timeout: __ENV.REQUEST_TIMEOUT || '30s',
      tags: { page: 'checkout', step: 'summary_test' },
    });

    check(response, {
      'summary test returns HTTP 200': (res) => res.status === 200,
      'summary test response time < 1000ms': (res) => res.timings.duration < 1000,
      'summary test body is not empty': (res) => Boolean(res.body && res.body.length > 0),
    });

    sleep(Number(__ENV.THINK_TIME_SECONDS || 1));
  });
}

export function handleSummary(data) {
  const markdown = renderMarkdownSummary(data);

  return {
    stdout: `${markdown}\n`,
    'results/day-03-summary.md': markdown,
  };
}

function renderMarkdownSummary(data) {
  const requests = metricValue(data, 'http_reqs', 'count');
  const failedRate = metricRate(data, 'http_req_failed') * 100;
  const p95 = metricValue(data, 'http_req_duration', 'p(95)');
  const checksRate = metricRate(data, 'checks') * 100;
  const passed = failedRate < 1 && checksRate > 99 && p95 < 1000;

  return [
    '# Day 03 K6 Summary',
    '',
    `- Total requests: ${formatNumber(requests, 0)}`,
    `- Failed rate: ${formatNumber(failedRate, 2)}%`,
    `- p95 response time: ${formatNumber(p95, 2)}ms`,
    `- Checks rate: ${formatNumber(checksRate, 2)}%`,
    `- Result: ${passed ? 'PASS' : 'FAIL'}`,
    '',
    passed
      ? 'Conclusion: checkout endpoint met the availability summary thresholds in this run.'
      : 'Conclusion: checkout endpoint did not meet at least one availability summary threshold in this run.',
    '',
  ].join('\n');
}

function metricValue(data, metricName, fieldName) {
  const metric = data.metrics[metricName];

  return metric?.values?.[fieldName] ?? metric?.[fieldName] ?? 0;
}

function metricRate(data, metricName) {
  const metric = data.metrics[metricName];

  return metric?.values?.rate ?? metric?.rate ?? metric?.value ?? 0;
}

function formatNumber(value, digits) {
  return Number(value || 0).toFixed(digits);
}
