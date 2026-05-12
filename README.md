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
