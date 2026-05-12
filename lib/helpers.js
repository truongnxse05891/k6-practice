import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { config } from './config.js';

export function assertOk(response, name = 'response is successful') {
  return check(response, {
    [name]: (res) => res.status >= 200 && res.status < 400,
    'response time < 1000ms': (res) => res.timings.duration < 1000,
  });
}

export function thinkTime(seconds = config.thinkTimeSeconds) {
  sleep(seconds);
}

export function pickTestUser(users) {
  const index = exec.scenario.iterationInTest % users.length;
  return users[index];
}

