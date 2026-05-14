# Day 02 Performance Notes

## Objective

Phân tích nguyên nhân lỗi `4xx` của checkout endpoint và so sánh hành vi khi test theo VUs với khi test theo request rate cố định.

## Test Data

- Date: 2026-05-14
- Tool: k6 v1.4.2
- Target: `https://plb-hyperswitch-dev.myshopbase.net/checkouts/e443ab0bdf4d4c2a8a284393340500c8`
- Environment: local Windows
- Limitation: toàn bộ test dùng cùng một checkout URL, nên kết quả có thể bị ảnh hưởng bởi rate limit, session state, token state hoặc rule chống bot.

## Scenarios

- Diagnostic status test: ramp lên 10 VUs, giữ trong khoảng 2 phút, phân loại status cụ thể.
- Rate 5: `constant-arrival-rate`, 5 requests/second trong 2 phút.
- Rate 10: `constant-arrival-rate`, 10 requests/second trong 2 phút.
- Rate 20: `constant-arrival-rate`, 20 requests/second trong 2 phút.

## Results

| Scenario | Requests | Req/s | Failed rate | Checks | p95 | 2xx/200 | 4xx/429 | 5xx | Result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Diagnostic 10 VUs | 842 | 7.01 | 26.72% | 91.05% | 168.10ms | 617 | 225 x 429 | 0 | FAIL |
| Rate 5 req/s | 601 | 5.00 | 0.00% | 100.00% | 95.41ms | 601 | 0 | 0 | PASS |
| Rate 10 req/s | 1201 | 10.00 | 31.81% | 89.40% | 99.24ms | 819 | 382 | 0 | FAIL |
| Rate 20 req/s | 2400 | 20.00 | 79.50% | 73.50% | 129.33ms | 492 | 1908 | 0 | FAIL |

## Findings

- Diagnostic run xác nhận lỗi chính là `429 Too Many Requests`.
- Body lỗi là HTML từ `openresty` với nội dung `429 Too Many Requests`.
- Không thấy lỗi `5xx`, nên chưa có bằng chứng server bị crash hoặc backend xử lý quá tải theo kiểu lỗi hệ thống.
- Tại 5 req/s, endpoint pass sạch với `0%` lỗi và `p95=95.41ms`.
- Tại 10 req/s, lỗi tăng rõ rệt lên `31.81%` trong khi `p95=99.24ms`.
- Tại 20 req/s, lỗi tăng lên `79.50%` trong khi `p95=129.33ms`.
- Lỗi tăng trước latency. Nghĩa là endpoint fail do bị reject/rate limit, không phải do response time tăng dần.

## Risks

- Dùng một checkout URL cố định cho nhiều VUs hoặc request rate cao có thể không phản ánh hành vi user thật.
- Nếu checkout session có giới hạn request, một URL duy nhất sẽ nhanh chóng bị rate limit.
- Nếu mục tiêu là đo backend latency thực sự, kết quả hiện tại bị nhiễu bởi `429`.
- Nếu mục tiêu là page availability với một session cụ thể, status `200` là điều kiện bắt buộc và test hiện tại fail từ 10 req/s trở lên.

## Recommendation

- Với endpoint hiện tại, coi 5 req/s là mức baseline tạm thời vì không phát sinh lỗi trong lần chạy này.
- Không dùng một checkout URL duy nhất để stress test nếu mục tiêu là mô phỏng nhiều người dùng thật.
- Bước tiếp theo nên tạo setup API để sinh checkout URL/session riêng cho từng VU hoặc từng iteration.
- Nếu chỉ muốn kiểm tra rate limit, giữ script hiện tại và thêm threshold riêng cho `checkout_status_429`.
- Nếu muốn kiểm tra latency backend, cần loại trừ hoặc tách riêng response `429` khỏi nhóm response hợp lệ.

## Threshold Notes

Threshold hiện tại trong `checkout-rate-test.js`:

```js
thresholds: {
  http_req_failed: ['rate<0.02'],
  http_req_duration: ['p(95)<1000'],
  checks: ['rate>0.98'],
}
```

Threshold này phù hợp nếu mục tiêu là page availability với status `200`. Với mục tiêu khám phá rate limit, threshold này cố tình fail để chỉ ra ngưỡng bắt đầu bị reject.

Đề xuất:

- Smoke: `http_req_failed < 1%`, `p95 < 1000ms`, `checks > 99%`.
- Load baseline: `http_req_failed < 2%`, `p95 < 1200ms`, `checks > 98%`.
- Rate-limit diagnostic: không nên dùng pass/fail cứng theo `http_req_failed`; thay vào đó đo `429` theo từng rate.

