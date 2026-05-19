import { join } from 'path';

function isVercel() {
  return process.env.VERCEL === '1';
}

export function getDataDir() {
  if (isVercel()) {
    return join('/tmp', 'cv-filter-free', 'data');
  }
  return join(process.cwd(), 'data');
}

export function getUploadsDir() {
  return join(getDataDir(), 'uploads');
}

