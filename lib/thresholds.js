export const smokeThresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<1000'],
  checks: ['rate>0.99'],
};

export const loadThresholds = {
  http_req_failed: ['rate<0.02'],
  http_req_duration: ['p(95)<1200', 'p(99)<2000'],
  checks: ['rate>0.98'],
};

export const stressThresholds = {
  http_req_failed: ['rate<0.05'],
  http_req_duration: ['p(95)<2500'],
  checks: ['rate>0.95'],
};

export const spikeThresholds = {
  http_req_failed: ['rate<0.08'],
  http_req_duration: ['p(95)<3000'],
  checks: ['rate>0.92'],
};

export const soakThresholds = {
  http_req_failed: ['rate<0.02'],
  http_req_duration: ['p(95)<1500'],
  checks: ['rate>0.98'],
};
