# Day 04 Capacity Report

Ngay chay: 2026-05-24

## Test Target

- Endpoint: `https://plb-hyperswitch-dev.myshopbase.net/checkouts/e443ab0bdf4d4c2a8a284393340500c8`
- Script: `scripts/checkout-step-rate-test.js`
- Executor: `ramping-arrival-rate`
- Muc tieu: tim nguong request rate an toan va phan tich loi request.

## Test Matrix

| Rate | Total Requests | 2xx | 429 | 5xx | p95 | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 RPS | 54 | 54 | 0 | 0 | 3514.54 ms | FAIL latency |
| 5 RPS | 274 | 274 | 0 | 0 | 117.22 ms | PASS |
| 10 RPS | 550 | 122 | 428 | 0 | 75.99 ms | FAIL rate limit |
| Step 1 -> 5 -> 10 -> 20 RPS | 564 | 468 | 96 | 0 | 128.68 ms | FAIL rate limit |

## Finding

- `5 RPS` la muc on dinh nhat trong bo test hom nay: 100% request tra 2xx, khong co `429`, khong co `5xx`, p95 thap.
- `10 RPS` cham rate limit ro rang: `429` chiem 77.82%, success rate chi con 22.18%.
- Step-rate tong hop fail vi `429` chiem 17.02%, khong phai vi server error.
- `1 RPS` co mot mau latency bat thuong voi p95 3514.54 ms, can chay lai de xac nhan day la spike tam thoi hay degradation that.
- Khong co `5xx` trong cac lan chay, nen chua thay bang chung backend crash/server error.

## Safe Operating Rate

- Safe operating rate tam thoi: `5 RPS`.
- Warning zone: tu gan `10 RPS`, vi `429` tang manh.
- Khong nen dung `10 RPS` cho regression hang ngay neu endpoint/test data van la checkout URL dung chung.

## Threshold Strategy

- Regression: nen dung `checkout_rate_limited: ['rate<0.01']` va `checkout_successful: ['rate>0.99']`.
- Capacity discovery: co the dung `checkout_rate_limited: ['rate<0.05']` de khong fail qua som khi dang probe gioi han.
- `checkout_status_5xx: ['count<1']` nen giu nghiem ngat, vi `5xx` la loi availability nghiem trong hon `429`.
- Khong nen chi nhin `http_req_duration`: response `429` co the tra ve nhanh, lam p95 dep gia tao trong khi user flow da fail.

## Request Error Analysis

- `429 Too Many Requests`: endpoint bi rate limit; day la dau hieu vuot nguong request rate hoac checkout/session bi dung lap lai qua nhieu.
- `5xx`: khong xuat hien trong bo test Day 04.
- `http_req_failed`: tang khi status la `429`, vi K6 xem status >= 400 la failed.
- `checks`: fail khi status khong phai 2xx, khi body rong, hoac latency vuot nguong check.
- `p95`: can doc kem status code; p95 thap o rate 10 khong co nghia la he thong tot, vi phan lon response la `429` nhanh.

## Proposed Temporary SLO

- Availability: >= 99% request checkout tra 2xx trong regression test.
- Latency p95: < 1000 ms cho response 2xx.
- Rate limit: < 1% `429` trong regression; < 5% trong capacity discovery.
- Error budget: 0 request `5xx` trong bai test checkout ngan.
- Regression load level: 5 RPS cho endpoint/test data hien tai.

## Risk

- Dang dung mot checkout URL co dinh, nen ket qua co the bi anh huong boi cache, session state hoac rate limit theo resource.
- Can co unique checkout URL/session moi VU hoac moi iteration de test gan voi hanh vi user that hon.
- Can chay lai `1 RPS` de xac minh latency spike 3514.54 ms.

## Next Test

- Tao data checkout rieng cho moi VU/session.
- Chay lai 1 RPS va 5 RPS trong thoi gian dai hon de xac nhan stability.
- Them tag theo stage/rate neu can phan tich p95 theo tung bac trong cung mot run.
- Them canh bao rieng cho `429` vao CI report.
