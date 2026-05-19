import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { requireApiAuth } from '../../../../../lib/auth';
import { getCV } from '../../../../../lib/store';
import { getClientIp, rateLimitResponse, takeRateLimit } from '../../../../../lib/request-security';
import { getUploadsDir } from '../../../../../lib/storage-paths';

function detectMimeFromName(fileName = '') {
  const lower = String(fileName).toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

function sanitizeDownloadName(fileName) {
  const cleaned = String(fileName || 'resume')
    .replace(/[^\w.\-\u0600-\u06FF ]+/g, '_')
    .trim();
  return cleaned || 'resume';
}

export async function GET(req, { params }) {
  try {
    if (!requireApiAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limiter = takeRateLimit({
      key: `file-download:${getClientIp(req)}`,
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });
    if (!limiter.allowed) {
      return rateLimitResponse({ retryAfterMs: limiter.retryAfterMs });
    }

    const id = String(params?.id || '');
    if (!id) {
      return NextResponse.json({ error: 'Missing candidate id' }, { status: 400 });
    }

    const cv = await getCV(id);
    if (!cv) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    let filePath = null;
    if (cv.storageFileName) {
      const privateRoot = resolve(getUploadsDir());
      const candidatePath = resolve(join(privateRoot, cv.storageFileName));
      if (candidatePath.startsWith(privateRoot)) {
        filePath = candidatePath;
      }
    }

    if (!filePath) {
      return NextResponse.json({ error: 'File path is invalid' }, { status: 400 });
    }

    const buffer = await readFile(filePath);
    const mimeType = cv.mimeType || detectMimeFromName(cv.fileName);
    const downloadName = sanitizeDownloadName(cv.fileName);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to download file' }, { status: 500 });
  }
}
