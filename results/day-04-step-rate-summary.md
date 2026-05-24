# Day 04 Step Rate Summary

- Total requests: 564
- HTTP failed rate: 17.02%
- Checkout success rate: 82.98%
- Checkout rate limited rate: 17.02%
- HTTP 429 count: 96
- HTTP 5xx count: 0
- HTTP request p95: 128.68 ms
- Conclusion: FAIL

## Notes

- Neu `429` tang khi rate tang, do la dau hieu endpoint da cham nguong rate limit.
- Neu `5xx` xuat hien, day la rui ro availability nghiem trong hon `429`.
- Neu p95 tang truoc khi co loi, he thong dang co dau hieu saturation ve latency.
