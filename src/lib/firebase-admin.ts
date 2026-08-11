import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const config = firebaseConfig as Record<string, any>;

if (!getApps().length) {
  initializeApp({
    projectId: config?.projectId || process.env.FIREBASE_PROJECT_ID,
  });
}

export const adminAuth = getAuth();
