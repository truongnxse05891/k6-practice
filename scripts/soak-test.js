import http from 'k6/http';
import { group } from 'k6';
import { buildUrl, config } from '../lib/config.js';
import { assertOk, thinkTime } from '../lib/helpers.js';
import { soakThresholds } from '../lib/thresholds.js';

export const options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '30m', target: 10 },
    { duration: '2m', target: 0 },
  ],
  thresholds: soakThresholds,
};

export default function () {
  group('Sustained browsing traffic', () => {
    const response = http.get(buildUrl('/'), {
      timeout: config.requestTimeout,
      tags: { flow: 'soak_browse' },
    });

    assertOk(response, 'home page remains stable during soak');
    thinkTime();
  });
}

