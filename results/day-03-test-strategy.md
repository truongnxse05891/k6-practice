# Day 03 Test Strategy

## Goal

Xây dựng strategy performance test rõ mục tiêu cho checkout endpoint, tách riêng availability, latency, rate-limit discovery và stability. Mục tiêu không chỉ là chạy K6 pass/fail mà là biết endpoint fail vì chậm, vì lỗi server, hay vì bị reject bởi rate limit/business rule.

## Current Evidence

Kết quả Day 02 cho thấy lỗi chính là `429 Too Many Requests` từ `openresty`, không phải `5xx`. Khi tăng request rate lên 10 và 20 req/s, lỗi tăng mạnh trong khi `p95` vẫn thấp. Điều này cho thấy hệ thống reject request trước khi latency backend tăng.

Kết quả Day 03:

| Scenario | Requests | Req/s | Failed rate | Checks | p95 | Max | Status | Result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Baseline group/tag | 146 | 2.37 | 0.00% | 99.32% | 151.73ms | 6895.39ms | 146 x 2xx | PASS threshold, có 3 check latency fail ở `checkout_page` |
| setup example | 6 | 13.26 | 0.00% | 100.00% | 122.98ms | 123.81ms | HTTP 200 | PASS |
| handleSummary example | 19 | 1.72 | 0.00% | 100.00% | 114.39ms | 115.77ms | HTTP 200 | PASS |
| VUs load test | 1133 | 5.37 | 13.59% | 95.47% | 147.04ms | 434.53ms | 979 x 2xx, 154 x 4xx | FAIL |
| Arrival-rate 5 req/s | 601 | 5.00 | 0.00% | 100.00% | 100.10ms | 396.72ms | 601 x 2xx | PASS |

Baseline có `checkout_page_duration p95=155.66ms` và `checkout_revisit_duration p95=136.34ms`. `checkout_page` chậm hơn và có 3 request vượt check `<1000ms`, dù metric tổng vẫn nhìn khá tốt. Điều này chứng minh tag/group giúp phát hiện vấn đề mà metric tổng có thể làm mờ.

## Recommended Scenarios

1. Smoke availability

- Mục tiêu: xác nhận checkout URL còn mở được.
- Profile: 1 VU, 5-10 iterations.
- Pass khi status là `200`, body không rỗng, `p95 < 1000ms`.

2. Baseline with group/tag

- Mục tiêu: đo từng step như first load và revisit.
- Profile: 2-3 VUs, 1-3 phút.
- Dùng tag `page`, `step`, `test_run_id`.

3. User-flow load test

- Mục tiêu: mô phỏng user thật.
- Profile: VUs + think time.
- Điều kiện quan trọng: mỗi VU hoặc mỗi iteration nên có checkout URL/session riêng nếu business flow yêu cầu.

4. Rate-limit discovery

- Mục tiêu: tìm ngưỡng bắt đầu bị `429`.
- Profile: `constant-arrival-rate`, ví dụ 5, 10, 20 req/s.
- Không nên coi `429` là lỗi test khi mục tiêu là khám phá rate limit; cần đo và báo cáo tỷ lệ `429`.

5. Latency-only diagnostic

- Mục tiêu: đo latency backend hợp lệ.
- Chỉ nên tính response `2xx` hoặc expected response.
- Tách riêng response `429` vì đó là rejection nhanh, không phản ánh latency xử lý checkout thật.

## Threshold Strategy

Đã thêm `lib/checkout-thresholds.js` với 3 nhóm threshold:

- `availabilityThresholds`: fail nếu request lỗi hoặc checks thấp. Dùng cho smoke/baseline.
- `latencyThresholds`: tập trung `p95/p99`. Dùng khi data hợp lệ và không bị rate limit.
- `rateLimitDiscoveryThresholds`: không fail ngay vì `429`; dùng để quan sát ngưỡng reject.

Đề xuất:

```js
availabilityThresholds = {
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.99'],
}
```

```js
latencyThresholds = {
  http_req_duration: ['p(95)<1000', 'p(99)<2000'],
  checks: ['rate>0.98'],
}
```

```js
rateLimitDiscoveryThresholds = {
  http_req_duration: ['p(95)<1500'],
}
```

Availability test phải fail khi status không phải `200` vì mục tiêu là user mở được checkout page. Rate-limit discovery thì không nên fail ngay khi có `429`, vì mục tiêu chính là tìm điểm bắt đầu bị reject.

## Data Strategy

Không nên dùng một checkout URL cố định cho mọi VU nếu muốn mô phỏng nhiều user thật. Với checkout, URL/session có thể có state, rate limit, bot rule hoặc lifetime riêng.

Strategy tốt hơn:

- Dùng `setup()` để tạo hoặc lấy danh sách checkout URL hợp lệ trước khi test.
- Gán mỗi VU một checkout URL riêng nếu muốn mô phỏng concurrent users.
- Gán mỗi iteration một checkout URL riêng nếu checkout session bị mutate hoặc single-use.
- Gắn `testRunId` vào tag/header để trace log backend.

`setup()` chạy một lần trước VU execution, phù hợp để chuẩn bị data chung. Không nên dùng chung data từ `setup()` nếu data đó có state thay đổi sau mỗi request hoặc bị giới hạn theo session.

## Risks

- Kết quả VUs load test và arrival-rate test khác nhau dù req/s gần nhau, vì VUs test có ramping, think time, concurrency pattern và reuse pattern khác.
- Response `429` có thể làm `http_req_duration` nhìn thấp, vì server/proxy reject rất nhanh.
- Nếu chỉ nhìn `p95`, có thể kết luận sai rằng hệ thống khỏe trong khi user thật nhận lỗi.
- Nếu chỉ nhìn tổng metric, có thể bỏ sót step cụ thể bị chậm hoặc lỗi.

## Next Actions

- Tạo API/setup flow để sinh checkout URL mới cho từng VU hoặc từng iteration.
- Thêm counter riêng cho `429` trong rate test để báo cáo trực tiếp thay vì gom chung `4xx`.
- Tạo threshold theo tag/step nếu cần kiểm soát `checkout_page` và `checkout_revisit` riêng.
- Chạy lại arrival-rate ở 5, 8, 10 req/s với unique checkout sessions để xác nhận rate limit thật.
- Nếu có backend logs, đối chiếu `testRunId` để xác nhận rule nào trả `429`.

