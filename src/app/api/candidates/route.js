import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join, resolve } from 'path';
import { requireApiAuth } from '../../../lib/auth';
import { deleteCV, listCVs } from '../../../lib/store';
import { getUploadsDir } from '../../../lib/storage-paths';
import { getClientIp, isTrustedOrigin, originDeniedResponse, rateLimitResponse, takeRateLimit } from '../../../lib/request-security';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    if (!requireApiAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const limiter = takeRateLimit({
      key: `candidates-get:${getClientIp(req)}`,
      limit: 120,
      windowMs: 5 * 60 * 1000,
    });
    if (!limiter.allowed) {
      return rateLimitResponse({ retryAfterMs: limiter.retryAfterMs });
    }

    const { searchParams } = new URL(req.url);
    const skills = searchParams.get('skills')?.split(',').map((skill) => skill.trim()).filter(Boolean) || [];
    const specialization = searchParams.get('specialization') || '';
    const location = searchParams.get('location') || '';
    const minExp = parseInt(searchParams.get('minExp') || '0', 10);
    const maxExp = parseInt(searchParams.get('maxExp') || '50', 10);
    const search = searchParams.get('search') || '';

    const cvs = await listCVs();
    let filtered = cvs.map((cv) => {
      let data = {};
      try {
        data = typeof cv.extractedData === 'string' ? JSON.parse(cv.extractedData || '{}') : cv.extractedData || {};
      } catch {}
      return { ...cv, parsedData: data };
    });

    const searchTerms = search
      ? search
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    if (searchTerms.length > 0) {
      filtered = filtered.filter((candidate) => {
        const spec = candidate.parsedData.specialization || '';
        const educationFields = Array.isArray(candidate.parsedData.education)
          ? candidate.parsedData.education.map((item) => String(item.field || '').toLowerCase())
          : [];
        const locationVal = candidate.parsedData.location || '';

        return searchTerms.some((term) => {
          const lower = term.toLowerCase();
          return (
            candidate.parsedData.name?.toLowerCase().includes(lower) ||
            candidate.parsedData.skills?.some((skill) => skill.toLowerCase().includes(lower)) ||
            String(spec).toLowerCase().includes(lower) ||
            educationFields.some((field) => field.includes(lower)) ||
            String(locationVal).toLowerCase().includes(lower)
          );
        });
      });
    }

    if (skills.length > 0) {
      filtered = filtered.filter((candidate) =>
        skills.some((skill) => candidate.parsedData.skills?.some((cvSkill) => cvSkill.toLowerCase() === skill.toLowerCase()))
      );
    }

    if (specialization) {
      const lowerSpec = specialization.toLowerCase();
      filtered = filtered.filter((candidate) => {
        const spec = candidate.parsedData.specialization || '';
        const educationFields = Array.isArray(candidate.parsedData.education)
          ? candidate.parsedData.education.map((item) => String(item.field || '').toLowerCase())
          : [];

        return (
          String(spec).toLowerCase().includes(lowerSpec) ||
          educationFields.some((field) => field.includes(lowerSpec))
        );
      });
    }

    if (location) {
      const lowerLocation = location.toLowerCase();
      filtered = filtered.filter((candidate) =>
        String(candidate.parsedData.location || '').toLowerCase().includes(lowerLocation)
      );
    }

    filtered = filtered.filter((candidate) => {
      const exp = parseInt(candidate.parsedData.totalYearsExperience, 10) || 0;
      return exp >= minExp && exp <= maxExp;
    });

    const candidates = filtered.map((candidate) => ({
      id: candidate.id,
      fileName: candidate.fileName,
      createdAt: candidate.createdAt,
      status: candidate.status,
      parsedData: candidate.parsedData,
      hasFile: Boolean(candidate.storageFileName || candidate.originalUrl),
    }));

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error('Candidates error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    if (!requireApiAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isTrustedOrigin(req)) {
      return originDeniedResponse();
    }
    const limiter = takeRateLimit({
      key: `candidates-delete:${getClientIp(req)}`,
      limit: 40,
      windowMs: 10 * 60 * 1000,
    });
    if (!limiter.allowed) {
      return rateLimitResponse({ retryAfterMs: limiter.retryAfterMs });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing candidate id' }, { status: 400 });
    }

    const deleted = await deleteCV(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    if (deleted.storageFileName) {
      const privateUploadsDir = resolve(getUploadsDir());
      const privateFilePath = resolve(join(privateUploadsDir, deleted.storageFileName));
      if (privateFilePath.startsWith(privateUploadsDir)) {
        await unlink(privateFilePath).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete candidate error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
