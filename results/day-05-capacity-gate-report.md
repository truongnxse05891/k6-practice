# Day 05 K6 Quality Gate Report

- Source: `results/day-04-step-rate-summary.json`
- Total requests: 564
- 2xx count: 468
- 429 count: 96
- 5xx count: 0
- Conclusion: FAIL

## Gate Checks

| Check | Expected | Actual | Result |
| --- | ---: | ---: | --- |
| success rate | >= 95.00% | 82.98% | FAIL |
| rate limited rate | <= 5.00% | 17.02% | FAIL |
| http failed rate | <= 5.00% | 17.02% | FAIL |
| p95 latency | <= 1000.00 ms | 128.68 ms | PASS |
| 5xx count | <= 0 | 0 | PASS |

## Diagnosis

- Rate limit vuot nguong: can giam RPS, dung unique checkout/session, hoac tach capacity test khoi regression gate.
