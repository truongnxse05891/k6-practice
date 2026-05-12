import http from 'k6/http';
import { group } from 'k6';
import { SharedArray } from 'k6/data';
import { buildUrl, config } from '../lib/config.js';
import { assertOk, pickTestUser, thinkTime } from '../lib/helpers.js';
import { loadThresholds } from '../lib/thresholds.js';

const users = new SharedArray('practice users', () => JSON.parse(open('../data/users.json')));

export const options = {
  vus: 3,
  iterations: 9,
  thresholds: loadThresholds,
};

export default function () {
  const user = pickTestUser(users);

  group('Data-driven public session', () => {
    const response = http.get(buildUrl('/'), {
      timeout: config.requestTimeout,
      tags: {
        flow: 'data_driven_session',
        test_user: user.username,
      },
    });

    assertOk(response, `session page returns success for ${user.username}`);
    thinkTime();
  });
}

