import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const RETRY_COUNT = Math.max(0, Number(process.env.GEMINI_RETRY_COUNT || 3));
const RETRY_BASE_DELAY_MS = Math.max(250, Number(process.env.GEMINI_RETRY_BASE_DELAY_MS || 1200));
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY || '';

  if (!apiKey || apiKey.includes('...')) {
    throw new Error('GEMINI_API_KEY is missing or still uses the placeholder value');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: MODEL_NAME });
}

export async function extractCVFromImage(fileBase64, mimeType) {
  if (!fileBase64 || !mimeType) {
    throw new Error('Missing file data or mime type');
  }

  const model = getGeminiModel();
  const payload = [
    `Analyze the attached resume/CV and return only valid JSON.
Do not include markdown fences, explanations, comments, or any text outside JSON.

Use exactly this JSON shape:
{
  "name": "Full name",
  "email": "Email address",
  "phone": "Phone number",
  "location": "City or country",
  "summary": "Short professional summary",
  "education": [
    {
      "degree": "Degree",
      "field": "Field of study",
      "institution": "Institution",
      "year": "Year or date range"
    }
  ],
  "experience": [
    {
      "title": "Job title",
      "company": "Company",
      "duration": "Date range or duration",
      "description": "Short description"
    }
  ],
  "skills": ["Skill 1", "Skill 2"],
  "languages": [
    {
      "name": "Language",
      "level": "Level"
    }
  ],
  "totalYearsExperience": 0
}

Use null for missing scalar values and empty arrays for missing lists.
totalYearsExperience must be a number.`,
    {
      inlineData: {
        data: fileBase64,
        mimeType,
      },
    },
  ];

  const result = await generateContentWithRetry(model, payload);

  const text = result.response.text();
  const cleanJson = extractJson(text);

  try {
    return JSON.parse(cleanJson);
  } catch {
    throw new Error('Gemini returned invalid JSON');
  }
}

function extractJson(text) {
  const withoutFences = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = withoutFences.indexOf('{');
  const lastBrace = withoutFences.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return withoutFences;
  }

  return withoutFences.slice(firstBrace, lastBrace + 1);
}

async function generateContentWithRetry(model, payload) {
  let lastError;

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt += 1) {
    try {
      return await model.generateContent(payload);
    } catch (error) {
      lastError = error;

      const canRetry = isRetryableGeminiError(error) && attempt < RETRY_COUNT;
      if (!canRetry) {
        throw mapGeminiError(lastError);
      }

      await sleep(getBackoffDelayMs(attempt));
    }
  }

  throw mapGeminiError(lastError);
}

function getBackoffDelayMs(attempt) {
  const jitter = Math.floor(Math.random() * 300);
  return RETRY_BASE_DELAY_MS * (2 ** attempt) + jitter;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error) {
  const status = getErrorStatusCode(error);
  if (status && RETRYABLE_STATUS_CODES.has(status)) {
    return true;
  }

  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('high demand') ||
    message.includes('service unavailable') ||
    message.includes('temporar') ||
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('socket hang up') ||
    message.includes('timeout') ||
    message.includes('timed out')
  );
}

function getErrorStatusCode(error) {
  const directStatus = Number(error?.status || error?.statusCode || error?.code);
  if (Number.isInteger(directStatus) && directStatus >= 100 && directStatus <= 599) {
    return directStatus;
  }

  const message = String(error?.message || '');
  const match = message.match(/\[(\d{3})[^\]]*\]/);
  if (match) {
    return Number(match[1]);
  }

  return undefined;
}

function mapGeminiError(error) {
  if (isRetryableGeminiError(error)) {
    const wrapped = new Error('Gemini service is temporarily busy. Please try again in a few moments.');
    wrapped.statusCode = 503;
    return wrapped;
  }

  return error;
}
