export const config = {
  baseUrl: __ENV.BASE_URL || 'https://test.k6.io',
  thinkTimeSeconds: Number(__ENV.THINK_TIME_SECONDS || 1),
  requestTimeout: __ENV.REQUEST_TIMEOUT || '30s',
};

export function buildUrl(path) {
  const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBaseUrl}${cleanPath}`;
}

