import { NextResponse } from 'next/server';
import { clearSessionCookieOptions, getSessionCookieName } from '../../../lib/auth';
import { isTrustedOrigin, originDeniedResponse } from '../../../lib/request-security';

export async function POST(req) {
  if (!isTrustedOrigin(req)) {
    return originDeniedResponse();
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(getSessionCookieName(), '', clearSessionCookieOptions());
  return response;
}
