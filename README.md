# K6 Performance Practice Project

Project này dùng để thực hành performance testing với K6 theo các cấp độ phổ biến: smoke, load, stress, spike, soak và data-driven test.

## Cấu trúc

```text
k6-performance-practice/
  data/
    users.json
  lib/
    config.js
    helpers.js
    thresholds.js
  scripts/
    smoke-test.js
    load-test.js
    stress-test.js
    spike-test.js
    soak-test.js
    data-driven-test.js
  results/
  docker-compose.yml
  package.json
```

## Cài K6

Windows:

```powershell
winget install k6.k6
```

Hoặc chạy bằng Docker:

```powershell
docker compose run --rm k6 run scripts/smoke-test.js
```

## Chạy nhanh

Từ thư mục project:

```powershell
cd k6-performance-practice
k6 run scripts/smoke-test.js
```

Nếu muốn dùng npm scripts:

```powershell
npm run smoke
npm run load
npm run stress
npm run spike
npm run soak
npm run data
```

Chạy riêng một checkout endpoint:

```powershell
$env:CHECKOUT_URL="https://your-app.example.com/checkouts/id"
npm run checkout:load
```

## Đổi môi trường test

Mặc định script chạy với `https://test.k6.io`. Có thể đổi URL bằng biến môi trường:

```powershell
$env:BASE_URL="https://your-app.example.com"
k6 run scripts/load-test.js
```

Các biến hỗ trợ:

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `BASE_URL` | `https://test.k6.io` | Host cần test |
| `THINK_TIME_SECONDS` | `1` | Thời gian mô phỏng người dùng chờ giữa các hành động |
| `REQUEST_TIMEOUT` | `30s` | Timeout cho request |

## Các loại test

| Script | Mục đích | Khi dùng |
| --- | --- | --- |
| `scripts/smoke-test.js` | Kiểm tra script và môi trường chạy được | Trước mọi lần load test |
| `scripts/load-test.js` | Đo hệ thống dưới tải kỳ vọng | Test baseline hoặc regression |
| `scripts/stress-test.js` | Tăng tải vượt mức kỳ vọng | Tìm điểm nghẽn và giới hạn hệ thống |
| `scripts/spike-test.js` | Tăng tải đột ngột | Kiểm tra khả năng chịu traffic burst |
| `scripts/soak-test.js` | Chạy tải ổn định trong thời gian dài | Tìm memory leak, degradation, lỗi tài nguyên |
| `scripts/data-driven-test.js` | Đọc test data từ file JSON | Thực hành data-driven scenario |

## Xuất kết quả

```powershell
k6 run --summary-export results/smoke-summary.json scripts/smoke-test.js
k6 run --out json=results/load-result.json scripts/load-test.js
```

## Cách đọc kết quả cơ bản

- `http_req_duration`: thời gian phản hồi request.
- `http_req_failed`: tỷ lệ request lỗi.
- `checks`: tỷ lệ assertion pass.
- `vus`: số virtual users đang chạy.
- `iterations`: số vòng lặp kịch bản đã hoàn thành.

Threshold đang được định nghĩa tại `lib/thresholds.js`. Khi threshold fail, K6 trả exit code khác 0 để phù hợp CI.

## Gợi ý bài tập

1. Chạy `smoke-test.js`, đọc các metric chính.
2. Tăng `target` trong `load-test.js` từ 10 lên 20, 50, 100 VUs và so sánh `p(95)`.
3. Đổi `BASE_URL` sang môi trường staging của bạn.
4. Thêm endpoint mới vào `load-test.js` và đặt tag theo page hoặc API name.
5. Điều chỉnh threshold trong `lib/thresholds.js` theo SLA thực tế.
6. Xuất JSON result vào `results/` và phân tích lỗi request.

## Bài tập theo ngày

- [Day 02 - K6 Performance Practice](exercises/day-02-2026-05-14.md)
- [Day 03 - K6 Performance Practice](exercises/day-03-2026-05-21.md)
- [Day 04 - K6 Performance Practice](exercises/day-04-2026-05-24.md)

## Ghi chú kết quả thực hành

### Day 04 - Capacity probe checkout endpoint

- Endpoint test: `https://plb-hyperswitch-dev.myshopbase.net/checkouts/e443ab0bdf4d4c2a8a284393340500c8`.
- Script chính: `scripts/checkout-step-rate-test.js`.
- Kết quả hiện tại: `5 RPS` pass với 274/274 request 2xx, p95 117.22 ms, không có `429` hoặc `5xx`.
- `10 RPS` fail do rate limit: 428/550 request trả `429`, không có `5xx`.
- Step-rate `1 -> 5 -> 10 -> 20 RPS` fail do `429` chiếm 17.02%.
- Safe operating rate tạm thời: `5 RPS` cho checkout URL dùng chung hiện tại.
- Không nên chỉ nhìn p95: ở rate cao, nhiều response `429` trả về nhanh nên latency có thể thấp nhưng user flow vẫn fail.
- Báo cáo chi tiết: `results/day-04-capacity-report.md`.
