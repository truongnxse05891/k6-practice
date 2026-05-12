import http from 'k6/http';
import { group } from 'k6';
import { buildUrl, config } from '../lib/config.js';
import { assertOk, thinkTime } from '../lib/helpers.js';
import { loadThresholds } from '../lib/thresholds.js';

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 10 },
    { duration: '1m', target: 0 },
  ],
  thresholds: loadThresholds,
};

export default function () {
  group('Browse public pages', () => {
    const home = http.get(buildUrl('/'), {
      timeout: config.requestTimeout,
      tags: { page: 'home' },
    });
    assertOk(home, 'home page returns success');

    const contacts = http.get(buildUrl('/contacts.php'), {
      timeout: config.requestTimeout,
      tags: { page: 'contacts' },
    });
    assertOk(contacts, 'contacts page returns success');

    thinkTime();
  });
}

