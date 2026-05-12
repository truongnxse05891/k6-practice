import http from 'k6/http';
import { group } from 'k6';
import { buildUrl, config } from '../lib/config.js';
import { assertOk, thinkTime } from '../lib/helpers.js';
import { stressThresholds } from '../lib/thresholds.js';

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '1m', target: 25 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 75 },
    { duration: '2m', target: 75 },
    { duration: '1m', target: 0 },
  ],
  thresholds: stressThresholds,
};

export default function () {
  group('Stress browse flow', () => {
    const response = http.get(buildUrl('/'), {
      timeout: config.requestTimeout,
      tags: { flow: 'stress_browse' },
    });

    assertOk(response, 'browse flow returns success under stress');
    thinkTime(0.5);
  });
}

