import { NextResponse } from 'next/server';
import { requireApiAuth } from '../../../../lib/auth';
import { updateCV } from '../../../../lib/store';
import { getClientIp, isTrustedOrigin, originDeniedResponse, rateLimitResponse, takeRateLimit } from '../../../../lib/request-security';

export async function POST(req) {
  try {
    if (!requireApiAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isTrustedOrigin(req)) {
      return originDeniedResponse();
    }
    const limiter = takeRateLimit({
      key: `candidates-update:${getClientIp(req)}`,
      limit: 100,
      windowMs: 10 * 60 * 1000,
    });
    if (!limiter.allowed) {
      return rateLimitResponse({ retryAfterMs: limiter.retryAfterMs });
    }

    const body = await req.json();
    const id = body.id || body.cvId;
    const extractedData = body.extractedData || body.data;

    if (!id || !extractedData) {
      return NextResponse.json({ error: 'Missing candidate data' }, { status: 400 });
    }

    const serialized = JSON.stringify(extractedData);
    const updated = await updateCV(id, {
      extractedData: serialized,
      rawText: serialized,
      status: 'EXTRACTED',
    });

    if (!updated) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error('Candidates update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
