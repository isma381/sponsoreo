import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function rateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const rateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
    analytics: true,
  });
  
  const result = await rateLimiter.limit(`${identifier}`);
  
  // Log cuando se excede el rate limit
  if (!result.success) {
    console.warn('[RATE_LIMIT]', JSON.stringify({
      identifier,
      limit: result.limit,
      remaining: result.remaining,
      reset: new Date(result.reset).toISOString(),
      timestamp: new Date().toISOString(),
    }));
  }
  
  return result;
}

