# Day 05 K6 Quality Gate Report

- Source: `results/day-04-rate-5.json`
- Total requests: 274
- 2xx count: 274
- 429 count: 0
- 5xx count: 0
- Conclusion: PASS

## Gate Checks

| Check | Expected | Actual | Result |
| --- | ---: | ---: | --- |
| success rate | >= 99.00% | 100.00% | PASS |
| rate limited rate | <= 1.00% | 0.00% | PASS |
| http failed rate | <= 1.00% | 0.00% | PASS |
| p95 latency | <= 1000.00 ms | 117.22 ms | PASS |
| 5xx count | <= 0 | 0 | PASS |

## Diagnosis

- Gate dat yeu cau hien tai.
