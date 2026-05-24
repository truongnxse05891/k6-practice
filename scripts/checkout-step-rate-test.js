import http from 'k6/http';
import { check, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const checkoutUrl = __ENV.CHECKOUT_URL;
const startRate = Number(__ENV.START_RATE || 1);
const midRate = Number(__ENV.MID_RATE || 5);
const highRate = Number(__ENV.HIGH_RATE || 10);
const maxRate = Number(__ENV.MAX_RATE || 20);
const stageDuration = __ENV.STAGE_DURATION || '1m';

if (!checkoutUrl) {
  throw new Error(
    'Missing CHECKOUT_URL. Example: k6 run -e CHECKOUT_URL=https://example.com/checkouts/id scripts/checkout-step-rate-test.js',
  );
}

const checkoutStatus2xx = new Counter('checkout_status_2xx');
const checkoutStatus3xx = new Counter('checkout_status_3xx');
const checkoutStatus4xx = new Counter('checkout_status_4xx');
const checkoutStatus429 = new Counter('checkout_status_429');
const checkoutStatus5xx = new Counter('checkout_status_5xx');
const checkoutStatusOther = new Counter('checkout_status_other');
const checkoutRateLimited = new Rate('checkout_rate_limited');
const checkoutSuccessful = new Rate('checkout_successful');
const checkoutDuration = new Trend('checkout_duration');

export const options = {
  scenarios: {
    checkout_step_rate: {
      executor: 'ramping-arrival-rate',
      startRate,
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.PRE_ALLOCATED_VUS || 30),
      maxVUs: Number(__ENV.MAX_VUS || 100),
      stages: [
        { duration: stageDuration, target: startRate },
        { duration: stageDuration, target: midRate },
        { duration: stageDuration, target: highRate },
        { duration: stageDuration, target: maxRate },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    checkout_successful: ['rate>0.98'],
    checkout_rate_limited: ['rate<0.05'],
    checkout_status_5xx: ['count<1'],
  },
};

export default function () {
  group('Checkout step rate capacity probe', () => {
    const response = http.get(checkoutUrl, {
      timeout: __ENV.REQUEST_TIMEOUT || '30s',
      tags: {
        page: 'checkout',
        flow: 'checkout_step_rate',
      },
    });

    recordStatus(response.status);
    checkoutDuration.add(response.timings.duration);
    checkoutRateLimited.add(response.status === 429);
    checkoutSuccessful.add(response.status >= 200 && response.status < 300);

    check(response, {
      'checkout returns 2xx': (res) => res.status >= 200 && res.status < 300,
      'checkout is not rate limited': (res) => res.status !== 429,
      'checkout response time < 1000ms': (res) => res.timings.duration < 1000,
      'checkout body is not empty': (res) => Boolean(res.body && res.body.length > 0),
    });
  });
}

export function handleSummary(data) {
  const markdownSummary = renderMarkdownSummary(data);

  return {
    'results/day-04-step-rate-summary.md': markdownSummary,
    stdout: markdownSummary,
  };
}

function recordStatus(status) {
  if (status >= 200 && status < 300) {
    checkoutStatus2xx.add(1);
  } else if (status >= 300 && status < 400) {
    checkoutStatus3xx.add(1);
  } else if (status === 429) {
    checkoutStatus429.add(1);
    checkoutStatus4xx.add(1);
  } else if (status >= 400 && status < 500) {
    checkoutStatus4xx.add(1);
  } else if (status >= 500 && status < 600) {
    checkoutStatus5xx.add(1);
  } else {
    checkoutStatusOther.add(1);
  }
}

function renderMarkdownSummary(data) {
  const httpReqs = metricValue(data.metrics.http_reqs, 'count');
  const failedRate = metricRate(data.metrics.http_req_failed);
  const p95 = metricValue(data.metrics.http_req_duration, 'p(95)');
  const successRate = metricRate(data.metrics.checkout_successful);
  const rateLimitedRate = metricRate(data.metrics.checkout_rate_limited);
  const status429 = metricValue(data.metrics.checkout_status_429, 'count');
  const status5xx = metricValue(data.metrics.checkout_status_5xx, 'count');
  const passed =
    failedRate < 0.02 &&
    successRate > 0.98 &&
    rateLimitedRate < 0.05 &&
    status5xx < 1 &&
    p95 < 1000;

  return [
    '# Day 04 Step Rate Summary',
    '',
    `- Total requests: ${formatNumber(httpReqs, 0)}`,
    `- HTTP failed rate: ${formatPercent(failedRate)}`,
    `- Checkout success rate: ${formatPercent(successRate)}`,
    `- Checkout rate limited rate: ${formatPercent(rateLimitedRate)}`,
    `- HTTP 429 count: ${formatNumber(status429, 0)}`,
    `- HTTP 5xx count: ${formatNumber(status5xx, 0)}`,
    `- HTTP request p95: ${formatNumber(p95, 2)} ms`,
    `- Conclusion: ${passed ? 'PASS' : 'FAIL'}`,
    '',
    '## Notes',
    '',
    '- Neu `429` tang khi rate tang, do la dau hieu endpoint da cham nguong rate limit.',
    '- Neu `5xx` xuat hien, day la rui ro availability nghiem trong hon `429`.',
    '- Neu p95 tang truoc khi co loi, he thong dang co dau hieu saturation ve latency.',
    '',
  ].join('\n');
}

function metricValue(metric, field) {
  if (!metric) {
    return 0;
  }

  return metric.values?.[field] ?? metric[field] ?? 0;
}

function metricRate(metric) {
  if (!metric) {
    return 0;
  }

  return metric.values?.rate ?? metric.rate ?? metric.value ?? 0;
}

function formatPercent(value) {
  return `${formatNumber(value * 100, 2)}%`;
}

function formatNumber(value, fractionDigits) {
  return Number(value || 0).toFixed(fractionDigits);
}
