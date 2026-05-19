import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ALLOWED_EMAIL = String(process.env.APP_LOGIN_EMAIL || '').trim().toLowerCase();
const ALLOWED_PASSWORD = String(process.env.APP_LOGIN_PASSWORD || '');
const SESSION_COOKIE_NAME = 'cv_auth_session';
const SESSION_TTL_SECONDS = Math.max(60 * 15, Number(process.env.APP_SESSION_TTL_SECONDS || 60 * 60 * 12));
const SESSION_SECRET = String(
  process.env.APP_SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  ''
);
const SECURE_COOKIE_IN_PROD = String(process.env.APP_COOKIE_SECURE || 'true').toLowerCase() !== 'false';

assertAuthConfiguration();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function safeEqualString(a, b) {
  const aBuf = Buffer.from(String(a || ''));
  const bBuf = Buffer.from(String(b || ''));
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function signPayload(payloadBase64Url) {
  return createHmac('sha256', SESSION_SECRET).update(payloadBase64Url).digest('base64url');
}

function parseCookieHeader(cookieHeader) {
  const map = new Map();
  const raw = String(cookieHeader || '');
  if (!raw) return map;

  for (const part of raw.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (!name) continue;
    map.set(name, decodeURIComponent(rest.join('=')));
  }

  return map;
}

export function createSessionToken(email) {
  const payload = {
    email: normalizeEmail(email),
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
  const payloadBase64Url = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signPayload(payloadBase64Url);
  return `${payloadBase64Url}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64Url, signature] = parts;
  const expectedSignature = signPayload(payloadBase64Url);
  if (!safeEqualString(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64Url, 'base64url').toString('utf8'));
    if (!payload || normalizeEmail(payload.email) !== ALLOWED_EMAIL) return null;
    if (!payload.exp || Number(payload.exp) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isAllowedCredentials(email, password) {
  const emailOk = safeEqualString(normalizeEmail(email), ALLOWED_EMAIL);
  const passwordOk = safeEqualString(String(password || ''), ALLOWED_PASSWORD);
  return emailOk && passwordOk;
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production' ? SECURE_COOKIE_IN_PROD : false,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function clearSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production' ? SECURE_COOKIE_IN_PROD : false,
    path: '/',
    maxAge: 0,
  };
}

export function getPageSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function requirePageAuth() {
  const session = getPageSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

export function getApiSession(req) {
  const cookieHeader = req?.headers?.get?.('cookie') || '';
  const parsed = parseCookieHeader(cookieHeader);
  const token = parsed.get(SESSION_COOKIE_NAME);
  return verifySessionToken(token);
}

export function requireApiAuth(req) {
  return getApiSession(req);
}

export function getAllowedLoginEmail() {
  return ALLOWED_EMAIL;
}

function assertAuthConfiguration() {
  if (!ALLOWED_EMAIL || !ALLOWED_PASSWORD) {
    throw new Error('APP_LOGIN_EMAIL and APP_LOGIN_PASSWORD must be set.');
  }

  const weakSecret = SESSION_SECRET.length < 32;
  if (weakSecret) {
    throw new Error('APP_SESSION_SECRET must be at least 32 characters.');
  }
}
