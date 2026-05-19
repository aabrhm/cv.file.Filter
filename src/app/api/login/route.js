import { NextResponse } from 'next/server';
import {
  createSessionToken,
  getAllowedLoginEmail,
  getSessionCookieName,
  getSessionCookieOptions,
  isAllowedCredentials,
} from '../../../lib/auth';
import {
  getClientIp,
  isTrustedOrigin,
  originDeniedResponse,
  rateLimitResponse,
  takeRateLimit,
} from '../../../lib/request-security';

const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function POST(req) {
  try {
    if (!isTrustedOrigin(req)) {
      return originDeniedResponse();
    }

    const { email, password } = await req.json();
    const normalizedEmail = normalizeEmail(email);

    const ip = getClientIp(req);
    const limiter = takeRateLimit({
      key: `login:${ip}:${normalizedEmail || 'empty'}`,
      limit: LOGIN_LIMIT,
      windowMs: LOGIN_WINDOW_MS,
    });
    if (!limiter.allowed) {
      return rateLimitResponse({ retryAfterMs: limiter.retryAfterMs });
    }

    const emailAllowed = normalizedEmail === getAllowedLoginEmail();
    const valid = emailAllowed && isAllowedCredentials(normalizedEmail, password);
    if (!valid) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة.' }, { status: 401 });
    }

    const sessionToken = createSessionToken(normalizedEmail);
    const response = NextResponse.json({ success: true });
    response.cookies.set(getSessionCookieName(), sessionToken, getSessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || 'تعذر تسجيل الدخول.' }, { status: 500 });
  }
}
