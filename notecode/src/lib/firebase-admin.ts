import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

function buildOptions() {
  // Optional: full service-account JSON (needed on Vercel only if you later use
  // features that require credentials, e.g. revoked-token checks or user lookups).
  // Plain verifyIdToken() works with just the project ID.
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      return {
        credential: cert({
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          // Env vars often store newlines as literal "\n".
          privateKey: parsed.private_key?.replace(/\\n/g, '\n'),
        }),
        projectId: parsed.project_id ?? firebaseConfig.projectId,
      };
    } catch (err) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:', err);
    }
  }
  return { projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId };
}

if (!getApps().length) {
  initializeApp(buildOptions());
}

export const adminAuth = getAuth();
