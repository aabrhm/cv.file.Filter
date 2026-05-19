import 'server-only';

import { NextResponse } from 'next/server';

const rateLimitBuckets = new Map();

function cleanupExpiredBuckets(now) {
  if (rateLimitBuckets.size < 5000) return;
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

export function getClientIp(req) {
  const forwardedFor = req?.headers?.get?.('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req?.headers?.get?.('x-real-ip');
  if (realIp) return realIp.trim();

  const cfIp = req?.headers?.get?.('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  return 'unknown';
}

export function takeRateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  let bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateLimitBuckets.set(key, bucket);
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;
  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterMs = Math.max(0, bucket.resetAt - now);

  return { allowed, remaining, retryAfterMs };
}

export function rateLimitResponse({ retryAfterMs, message = 'طلبات كثيرة، حاول مرة أخرى بعد قليل.' }) {
  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  const res = NextResponse.json({ error: message }, { status: 429 });
  res.headers.set('Retry-After', String(retryAfterSeconds));
  return res;
}

function getAllowedOriginsFromEnv() {
  const list = String(process.env.APP_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set(list);
}

function getRequestOrigin(req) {
  const host = req?.headers?.get?.('x-forwarded-host') || req?.headers?.get?.('host');
  if (!host) return null;

  const proto = req?.headers?.get?.('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

export function isTrustedOrigin(req) {
  const originHeader = req?.headers?.get?.('origin');
  if (!originHeader) {
    return true;
  }

  const allowed = getAllowedOriginsFromEnv();
  const requestOrigin = getRequestOrigin(req);
  if (requestOrigin) {
    allowed.add(requestOrigin);
  }

  return allowed.has(originHeader);
}

export function originDeniedResponse() {
  return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
}

export function securityHeaders() {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  ];
}
