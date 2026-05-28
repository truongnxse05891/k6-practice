# Day 05 Quality Gate Notes

Ngay thuc hien: 2026-05-28

## Source Files

- Regression/capacity source fail: `results/day-04-step-rate-summary.json`
- Regression source pass: `results/day-04-rate-5.json`
- Analyzer: `scripts/analyze-k6-summary.js`
- Regression report: `results/day-05-quality-gate-report.md`
- Capacity report: `results/day-05-capacity-gate-report.md`
- Rate 5 report: `results/day-05-rate-5-gate-report.md`
- CI fail simulation: `results/day-05-ci-fail-simulation-report.md`

## Regression Gate Result

`results/day-04-step-rate-summary.json` fail regression gate.

| Metric | Expected | Actual | Result |
| --- | ---: | ---: | --- |
| Success rate | >= 99.00% | 82.98% | FAIL |
| Rate limited rate | <= 1.00% | 17.02% | FAIL |
| HTTP failed rate | <= 1.00% | 17.02% | FAIL |
| p95 latency | <= 1000.00 ms | 128.68 ms | PASS |
| 5xx count | <= 0 | 0 | PASS |

Ket luan: step-rate fail chu yeu vi `429 Too Many Requests`, khong phai vi `5xx` hay latency. `p95` van pass nhung khong du de ket luan test tot, vi response `429` co the tra ve rat nhanh.

## Capacity Gate Result

Khi noi long capacity gate thanh:

- success rate >= 95%
- rate limited rate <= 5%
- http failed rate <= 5%
- p95 <= 1000 ms
- 5xx count <= 0

`results/day-04-step-rate-summary.json` van fail:

| Metric | Expected | Actual | Result |
| --- | ---: | ---: | --- |
| Success rate | >= 95.00% | 82.98% | FAIL |
| Rate limited rate | <= 5.00% | 17.02% | FAIL |
| HTTP failed rate | <= 5.00% | 17.02% | FAIL |

Ket luan: step-rate da vuot qua vung capacity chap nhan duoc cho endpoint/test data hien tai.

## Rate 5 Regression Candidate

`results/day-04-rate-5.json` pass regression gate:

| Metric | Expected | Actual | Result |
| --- | ---: | ---: | --- |
| Success rate | >= 99.00% | 100.00% | PASS |
| Rate limited rate | <= 1.00% | 0.00% | PASS |
| HTTP failed rate | <= 1.00% | 0.00% | PASS |
| p95 latency | <= 1000.00 ms | 117.22 ms | PASS |
| 5xx count | <= 0 | 0 | PASS |

Ket luan: `5 RPS` phu hop hon de lam regression gate hang ngay cho checkout URL hien tai.

## Why Step-rate Should Not Be Daily Regression

Step-rate `1 -> 5 -> 10 -> 20 RPS` duoc thiet ke de tim gioi han, nen no co chu dich day endpoint toi vung co the bi `429`. Neu dung test nay lam regression gate hang ngay, CI se fail vi capacity discovery thay vi fail do regression that.

Regression gate nen on dinh, lap lai duoc va chay o muc tai da duoc chung minh la an toan. Voi evidence hien tai, muc phu hop la `5 RPS`.

## Recommended CI Gate

Dung `results/day-04-rate-5.json` hoac mot run moi tu `scripts/checkout-step-rate-test.js` voi tat ca rate dat ve `5` lam input cho analyzer.

Threshold de xuat:

- `MIN_SUCCESS_RATE=0.99`
- `MAX_RATE_LIMITED_RATE=0.01`
- `MAX_HTTP_FAILED_RATE=0.01`
- `MAX_P95_MS=1000`
- `MAX_5XX_COUNT=0`
- `FAIL_ON_GATE=true`

Lenh goi y:

```powershell
$env:SUMMARY_FILE="results/day-04-rate-5.json"
$env:REPORT_FILE="results/day-05-rate-5-gate-report.md"
$env:FAIL_ON_GATE="true"
node scripts/analyze-k6-summary.js
```

## CI Fail Simulation

Khi chay analyzer voi:

```powershell
$env:SUMMARY_FILE="results/day-04-step-rate-summary.json"
$env:FAIL_ON_GATE="true"
node scripts/analyze-k6-summary.js
```

Ket qua:

- Gate conclusion: `FAIL`
- Process exit code: `1`

CI nen fail trong truong hop nay neu day la regression gate, vi success rate thap va `429` vuot nguong. Neu day la capacity discovery co chu dich tim gioi han, nen dat `FAIL_ON_GATE=false` va chi dung report de phan tich.

## Next Actions

- Tao checkout URL/session rieng cho moi VU hoac moi iteration de giam nhieu do dung chung data.
- Tao job CI rieng cho regression gate o `5 RPS`.
- Tao job capacity discovery chay theo lich rieng, khong block merge request.
- Them trend theo tag/rate de phan tich chinh xac stage nao bat dau co `429`.
