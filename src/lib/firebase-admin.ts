import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let config: Record<string, any> = {};

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8').trim();
    if (raw && raw.startsWith('{')) {
      config = JSON.parse(raw);
    }
  }
} catch (e) {
  // Safe fallback if file is empty or missing
}

const projectId = config?.projectId || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'centered-repeater-4x4wp';

let adminAuthInstance: any = null;

try {
  if (!getApps().length) {
    initializeApp({
      projectId,
    });
  }
  adminAuthInstance = getAuth();
} catch (err) {
  console.warn('[Firebase Admin] Initialization skipped or deferred:', err);
}

export const adminAuth = adminAuthInstance;
