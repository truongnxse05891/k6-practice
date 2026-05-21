export const availabilityThresholds = {
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.99'],
};

export const latencyThresholds = {
  http_req_duration: ['p(95)<1000', 'p(99)<2000'],
  checks: ['rate>0.98'],
};

export const rateLimitDiscoveryThresholds = {
  http_req_duration: ['p(95)<1500'],
};

