/**
 * In-memory IP Rate Limiter for SIGAP report submissions.
 * Rule: Maximum 3 submissions per IP per 10 minutes.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 3;

/**
 * Extracts client IP address from standard proxy/CDN headers or falls back to loopback.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Evaluates whether the request from a given IP is permitted under the 3 per 10 min quota.
 * Automatically purges timestamps older than the 10-minute window.
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const existing = rateLimitMap.get(ip);
  const validTimestamps = existing
    ? existing.timestamps.filter((ts) => ts > cutoff)
    : [];

  if (validTimestamps.length >= MAX_REQUESTS) {
    const oldest = validTimestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: MAX_REQUESTS - validTimestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Helper to reset rate limits (useful for test environments)
 */
export function resetRateLimits(): void {
  rateLimitMap.clear();
}
