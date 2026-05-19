import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { requireApiAuth } from '../../../lib/auth';
import { createCV } from '../../../lib/store';
import {
  getClientIp,
  isTrustedOrigin,
  originDeniedResponse,
  rateLimitResponse,
  takeRateLimit,
} from '../../../lib/request-security';

export const dynamic = 'force-dynamic';

const UPLOAD_LIMIT = 20;
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const MAX_UPLOAD_BYTES = Math.max(1, Number(process.env.APP_MAX_UPLOAD_MB || 10)) * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

function normalizeExt(fileName, mimeType) {
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';

  const ext = extname(String(fileName || '')).toLowerCase();
  if (ext === '.pdf' || ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
    return ext === '.jpeg' ? '.jpg' : ext;
  }
  return '.bin';
}

export async function POST(req) {
  try {
    if (!requireApiAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isTrustedOrigin(req)) {
      return originDeniedResponse();
    }

    const limiter = takeRateLimit({
      key: `upload:${getClientIp(req)}`,
      limit: UPLOAD_LIMIT,
      windowMs: UPLOAD_WINDOW_MS,
    });
    if (!limiter.allowed) {
      return rateLimitResponse({ retryAfterMs: limiter.retryAfterMs });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'لم يتم إرسال ملف صحيح.' }, { status: 400 });
    }

    const mimeType = String(file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json({ error: 'نوع الملف غير مدعوم. المسموح: PDF, JPG, PNG.' }, { status: 415 });
    }

    if (Number(file.size || 0) > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `حجم الملف كبير جدًا. الحد الأقصى ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), 'data', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const safeBase = String(file.name || 'resume')
      .replace(/\.[^.]+$/, '')
      .replace(/[^\w\-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'resume';
    const ext = normalizeExt(file.name, mimeType);
    const storageFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeBase}${ext}`;
    await writeFile(join(uploadsDir, storageFileName), buffer);

    const cv = await createCV({
      originalUrl: null,
      fileName: file.name,
      storageFileName,
      mimeType,
    });

    return NextResponse.json({ success: true, cvId: cv.id });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء رفع الملف.' }, { status: 500 });
  }
}
