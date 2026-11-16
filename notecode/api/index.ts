import type { IncomingMessage, ServerResponse } from 'node:http';

// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
//
// The Express app is NOT imported from ../src directly. `npm run build` bundles it into
// api/_app.mjs (one self-contained file; see the "build" script in package.json), because
// Vercel's TypeScript step keeps our ".ts" import specifiers as written and the deployed
// function then crashes with ERR_MODULE_NOT_FOUND before Express can answer.
// Files starting with "_" are not exposed as routes by Vercel.
//
// If the app cannot start, answer with JSON naming the cause instead of an opaque 500 page.
type Handler = (req: IncomingMessage, res: ServerResponse) => unknown;
let appPromise: Promise<Handler> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    appPromise ??= (
      // @ts-ignore generated at build time by `npm run build` (not present before the first build)
      import('./_app.mjs') as Promise<{ createApiApp: () => Handler }>
    ).then((mod) => mod.createApiApp());
    const app = await appPromise;
    return app(req, res);
  } catch (err: unknown) {
    appPromise = undefined; // allow a retry on the next request
    console.error('API failed to start:', err);
    const e = err as { code?: unknown; message?: unknown };
    const code = typeof e?.code === 'string' ? e.code : undefined;
    const detail = String(e?.message ?? 'unknown error').slice(0, 160);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: `API failed to start${code ? ` (${code})` : ''}: ${detail}`,
        code,
      })
    );
  }
}
