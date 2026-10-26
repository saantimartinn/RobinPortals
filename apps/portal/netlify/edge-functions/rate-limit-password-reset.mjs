// Limit both reset email requests and token redemption attempts.
export default async function rateLimitPasswordReset(_request, context) {
  return context.next();
}

export const config = {
  path: ['/api/auth/reset-request', '/api/auth/reset-confirm'],
  rateLimit: {
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
