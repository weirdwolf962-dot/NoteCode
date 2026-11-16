import { createApiApp } from '../src/app.ts';

// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json)
// and handled by the Express app. Static files and the SPA are served by Vercel itself.
export default createApiApp();
