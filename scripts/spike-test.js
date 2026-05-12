import http from 'k6/http';
import { group } from 'k6';
import { buildUrl, config } from '../lib/config.js';
import { assertOk, thinkTime } from '../lib/helpers.js';
import { spikeThresholds } from '../lib/thresholds.js';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '20s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '20s', target: 5 },
    { duration: '30s', target: 0 },
  ],
  thresholds: spikeThresholds,
};

export default function () {
  group('Spike traffic to home page', () => {
    const response = http.get(buildUrl('/'), {
      timeout: config.requestTimeout,
      tags: { flow: 'spike_home' },
    });

    assertOk(response, 'home page survives spike traffic');
    thinkTime(0.2);
  });
}

