import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const dataDir = join(process.cwd(), 'data');
const storePath = join(dataDir, 'store.json');

async function readStore() {
  try {
    const raw = await readFile(storePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { cvs: [] };
  }
}

async function writeStore(store) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2), 'utf8');
}

export async function listCVs() {
  const store = await readStore();
  return [...store.cvs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getCV(id) {
  const store = await readStore();
  return store.cvs.find((cv) => cv.id === id) || null;
}

export async function createCV({ originalUrl, fileName, storageFileName = null, mimeType = null }) {
  const store = await readStore();
  const now = new Date().toISOString();
  const cv = {
    id: randomUUID(),
    originalUrl,
    fileName,
    storageFileName,
    mimeType,
    status: 'PENDING',
    extractedData: null,
    rawText: null,
    createdAt: now,
    updatedAt: now,
  };

  store.cvs.unshift(cv);
  await writeStore(store);
  return cv;
}

export async function updateCV(id, data) {
  const store = await readStore();
  const index = store.cvs.findIndex((cv) => cv.id === id);
  if (index === -1) return null;

  store.cvs[index] = {
    ...store.cvs[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.cvs[index];
}

export async function deleteCV(id) {
  const store = await readStore();
  const index = store.cvs.findIndex((cv) => cv.id === id);
  if (index === -1) return null;

  const [deleted] = store.cvs.splice(index, 1);
  await writeStore(store);
  return deleted;
}
