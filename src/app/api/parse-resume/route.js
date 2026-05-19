import { NextResponse } from 'next/server';
import { requireApiAuth } from '../../../lib/auth';
import { extractCVFromImage } from '../../../lib/gemini';
import { getClientIp, isTrustedOrigin, originDeniedResponse, rateLimitResponse, takeRateLimit } from '../../../lib/request-security';

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_UPLOAD_BYTES = Math.max(1, Number(process.env.APP_MAX_UPLOAD_MB || 10)) * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 1024;

export async function POST(req) {
  try {
    if (!requireApiAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isTrustedOrigin(req)) {
      return originDeniedResponse();
    }
    const limiter = takeRateLimit({
      key: `parse-resume:${getClientIp(req)}`,
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    if (!limiter.allowed) {
      return rateLimitResponse({ retryAfterMs: limiter.retryAfterMs });
    }

    const { fileData, mimeType } = await req.json();

    if (!fileData || !mimeType) {
      return NextResponse.json({ error: 'Missing file data' }, { status: 400 });
    }
    const normalizedMime = String(mimeType || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
      return NextResponse.json({ error: 'نوع الملف غير مدعوم.' }, { status: 415 });
    }
    if (String(fileData).length > MAX_BASE64_CHARS) {
      return NextResponse.json({ error: 'حجم الملف كبير جدًا.' }, { status: 413 });
    }

    const data = await extractCVFromImage(fileData, normalizedMime);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Parse resume error:', error);
    const status = Number(error?.statusCode) || 500;
    const message = status === 503
      ? 'خدمة استخراج السيرة مزدحمة حالياً. حاول مرة أخرى بعد قليل.'
      : (error?.message || 'حدث خطأ أثناء تحليل السيرة.');
    return NextResponse.json({ error: message }, { status });
  }
}
