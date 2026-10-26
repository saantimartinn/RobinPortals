// Prevent anonymous report submissions from flooding the support mailbox.
export default async function rateLimitReports(_request, context) {
  return context.next();
}

export const config = {
  path: '/api/report-problem',
  rateLimit: {
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
