import http from 'k6/http';
import { group } from 'k6';
import { buildUrl, config } from '../lib/config.js';
import { assertOk, thinkTime } from '../lib/helpers.js';
import { smokeThresholds } from '../lib/thresholds.js';

export const options = {
  vus: 1,
  iterations: 5,
  thresholds: smokeThresholds,
};

export default function () {
  group('Home page is available', () => {
    const response = http.get(buildUrl('/'), {
      timeout: config.requestTimeout,
      tags: { page: 'home' },
    });

    assertOk(response, 'home page returns success');
    thinkTime();
  });
}

