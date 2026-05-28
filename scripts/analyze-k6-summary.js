const fs = require('fs');
const path = require('path');

const summaryFile = process.env.SUMMARY_FILE || 'results/day-04-step-rate-summary.json';
const reportFile = process.env.REPORT_FILE || 'results/day-05-quality-gate-report.md';
const failOnGate = process.env.FAIL_ON_GATE !== 'false';

const slo = {
  minSuccessRate: Number(process.env.MIN_SUCCESS_RATE || 0.99),
  maxRateLimitedRate: Number(process.env.MAX_RATE_LIMITED_RATE || 0.01),
  maxHttpFailedRate: Number(process.env.MAX_HTTP_FAILED_RATE || 0.01),
  maxP95Ms: Number(process.env.MAX_P95_MS || 1000),
  max5xxCount: Number(process.env.MAX_5XX_COUNT || 0),
};

if (!fs.existsSync(summaryFile)) {
  console.error(`Summary file not found: ${summaryFile}`);
  process.exit(2);
}

const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
const metrics = summary.metrics || {};

const result = {
  source: summaryFile,
  httpReqs: metricValue('http_reqs', 'count'),
  httpFailedRate: metricRate('http_req_failed'),
  successRate: metricRate('checkout_successful'),
  rateLimitedRate: metricRate('checkout_rate_limited'),
  status2xx: metricValue('checkout_status_2xx', 'count'),
  status429: metricValue('checkout_status_429', 'count'),
  status5xx: metricValue('checkout_status_5xx', 'count'),
  p95Ms: metricValue('http_req_duration', 'p(95)'),
};

const checks = [
  {
    name: 'success rate',
    expected: `>= ${formatPercent(slo.minSuccessRate)}`,
    actual: formatPercent(result.successRate),
    passed: result.successRate >= slo.minSuccessRate,
  },
  {
    name: 'rate limited rate',
    expected: `<= ${formatPercent(slo.maxRateLimitedRate)}`,
    actual: formatPercent(result.rateLimitedRate),
    passed: result.rateLimitedRate <= slo.maxRateLimitedRate,
  },
  {
    name: 'http failed rate',
    expected: `<= ${formatPercent(slo.maxHttpFailedRate)}`,
    actual: formatPercent(result.httpFailedRate),
    passed: result.httpFailedRate <= slo.maxHttpFailedRate,
  },
  {
    name: 'p95 latency',
    expected: `<= ${slo.maxP95Ms.toFixed(2)} ms`,
    actual: `${result.p95Ms.toFixed(2)} ms`,
    passed: result.p95Ms <= slo.maxP95Ms,
  },
  {
    name: '5xx count',
    expected: `<= ${slo.max5xxCount}`,
    actual: String(result.status5xx),
    passed: result.status5xx <= slo.max5xxCount,
  },
];

const passed = checks.every((check) => check.passed);
const markdown = renderMarkdown(result, checks, passed);

fs.mkdirSync(path.dirname(reportFile), { recursive: true });
fs.writeFileSync(reportFile, markdown);

console.log(markdown);

if (!passed && failOnGate) {
  process.exit(1);
}

function metricValue(name, field) {
  const metric = metrics[name];
  if (!metric) {
    return 0;
  }

  return metric.values?.[field] ?? metric[field] ?? 0;
}

function metricRate(name) {
  const metric = metrics[name];
  if (!metric) {
    return 0;
  }

  return metric.values?.rate ?? metric.rate ?? metric.value ?? 0;
}

function renderMarkdown(data, gateChecks, passedGate) {
  const rows = gateChecks
    .map((check) => {
      const status = check.passed ? 'PASS' : 'FAIL';
      return `| ${check.name} | ${check.expected} | ${check.actual} | ${status} |`;
    })
    .join('\n');

  return [
    '# Day 05 K6 Quality Gate Report',
    '',
    `- Source: \`${data.source}\``,
    `- Total requests: ${data.httpReqs}`,
    `- 2xx count: ${data.status2xx}`,
    `- 429 count: ${data.status429}`,
    `- 5xx count: ${data.status5xx}`,
    `- Conclusion: ${passedGate ? 'PASS' : 'FAIL'}`,
    '',
    '## Gate Checks',
    '',
    '| Check | Expected | Actual | Result |',
    '| --- | ---: | ---: | --- |',
    rows,
    '',
    '## Diagnosis',
    '',
    diagnosis(data),
    '',
  ].join('\n');
}

function diagnosis(data) {
  if (data.status5xx > 0) {
    return '- Co `5xx`: uu tien dieu tra availability/server error.';
  }

  if (data.rateLimitedRate > slo.maxRateLimitedRate) {
    return '- Rate limit vuot nguong: can giam RPS, dung unique checkout/session, hoac tach capacity test khoi regression gate.';
  }

  if (data.p95Ms > slo.maxP95Ms) {
    return '- Latency p95 vuot nguong: can xem lai saturation, network, cache, hoac dependency cham.';
  }

  if (data.successRate < slo.minSuccessRate) {
    return '- Success rate thap: can phan tich status code va failed checks.';
  }

  return '- Gate dat yeu cau hien tai.';
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}
