import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// NOTE: keep firebase-admin on v13 (see package.json). v14 loads the ESM-only "jose" package
// through jwks-rsa via require(), which Vercel's function runtime rejects with
// ERR_REQUIRE_ESM and crashes every /api request. Upgrade only after verifying on Vercel.

// Token verification only needs the project ID. It is read from the environment
// (no JSON import, which plain Node ESM cannot do without an import attribute).
// Must match "projectId" in firebase-applet-config.json.
const DEFAULT_FIREBASE_PROJECT_ID = 'notecode-ae0d1';

function buildOptions() {
  const projectId = process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;

  // Optional: full service-account JSON (only needed for features that require
  // credentials, e.g. revoked-token checks). Plain verifyIdToken() works without it.
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
        projectId: parsed.project_id ?? projectId,
      };
    } catch (err) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:', err);
    }
  }
  return { projectId };
}

if (!getApps().length) {
