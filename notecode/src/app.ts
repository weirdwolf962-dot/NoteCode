import express, { type NextFunction, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  createSnippet,
  deleteSnippetForUser,
  getSnippetById,
  getSnippetsByUserUid,
} from './db/snippets.ts';
import { getPool } from './db/index.ts';
import { getOrCreateUser } from './db/users.ts';
import { type AuthRequest, optionalAuth, requireAuth } from './middleware/auth.ts';
import { isValidSnippetId, validateSnippetPayload } from './utils/snippet.ts';

/**
 * Server-side JS/TS execution spawns child processes. It never works on Vercel
 * (serverless functions) and is dangerous anywhere without real isolation, so it
 * is opt-in and hard-disabled on Vercel.
 */
const SERVER_EXECUTION_ENABLED =
  process.env.ENABLE_SERVER_EXECUTION === 'true' && !process.env.VERCEL;

/**
 * Extracts a short machine code (e.g. Postgres 42P01 "table missing", 28P01 "bad password",
 * Node ENOTFOUND / ECONNREFUSED) so a 500 is diagnosable from the browser/Vercel logs.
 * Never returns messages, hosts or credentials.
 */
function errorCode(error: unknown): string | undefined {
  const source = (error as { cause?: unknown } | null)?.cause ?? error;
  const code = (source as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * Builds the JSON API only (no Vite, no static files, no listen()).
 * Used by server.ts (local / VPS / Cloud Run) and api/index.ts (Vercel).
 */
export function createApiApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Diagnostic: checks the DB connection and that the tables exist.
  // Only returns error codes/names, never connection details.
  app.get('/api/health/db', async (_req: Request, res: Response) => {
    try {
      const pool = getPool();
      await pool.query('select 1');
      const t = await pool.query(
        "select to_regclass('public.users') as users, to_regclass('public.snippets') as snippets"
      );
      const { users, snippets } = t.rows[0] as { users: string | null; snippets: string | null };
      res.status(users && snippets ? 200 : 500).json({
        ok: Boolean(users && snippets),
        connected: true,
        tables: { users: Boolean(users), snippets: Boolean(snippets) },
      });
    } catch (error: unknown) {
      const e = error as { code?: string; message?: string };
      console.error('DB health check failed:', error);
      res.status(500).json({
        ok: false,
        connected: false,
        code: e.code ?? 'unknown',
        // Missing-variable errors only name the variable, never a value.
        ...(/^SQL_\w+ must be set/.test(e.message ?? '') ? { config: e.message } : {}),
      });
    }
  });

  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const dbUser = await getOrCreateUser(
        user.uid,
        user.email ?? '',
        typeof user.name === 'string' ? user.name : null
      );
      res.json({
        user: {
          uid: dbUser.uid,
          email: dbUser.email,
          displayName: dbUser.displayName,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sync user';
      console.error('POST /api/auth/sync failed:', error);
      res.status(500).json({ error: message, code: errorCode(error) });
    }
  });

  app.get('/api/me/snippets', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      await getOrCreateUser(
        user.uid,
        user.email ?? '',
        typeof user.name === 'string' ? user.name : null
      );
      const list = await getSnippetsByUserUid(user.uid);
      res.json({ snippets: list });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load snippets';
      console.error('GET /api/me/snippets failed:', error);
      res.status(500).json({ error: message, code: errorCode(error) });
    }
  });

  app.post('/api/snippets', optionalAuth, async (req: AuthRequest, res: Response) => {
    const validation = validateSnippetPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      let dbUserId: number | null = null;
      if (req.user) {
        const dbUser = await getOrCreateUser(
          req.user.uid,
          req.user.email ?? '',
          typeof req.user.name === 'string' ? req.user.name : null
        );
        dbUserId = dbUser.id;
      }

      const snippet = await createSnippet({
        id: uuidv4(),
        userId: dbUserId,
        code: validation.data.code,
        language: validation.data.language,
        theme: validation.data.theme,
      });

      res.status(201).json({ snippet });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to save snippet';
      console.error('POST /api/snippets failed:', error);
      res.status(500).json({ error: message, code: errorCode(error) });
    }
  });

  app.get('/api/snippets/:id', async (req: Request, res: Response) => {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!idParam || !isValidSnippetId(idParam)) {
      return res.status(404).json({ error: 'Snippet not found.' });
    }

    try {
      const snippet = await getSnippetById(idParam);
      if (!snippet) {
        return res.status(404).json({ error: 'Snippet not found.' });
      }
      res.json({ snippet });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load snippet';
      console.error('GET /api/snippets/:id failed:', error);
      res.status(500).json({ error: message, code: errorCode(error) });
    }
  });

  app.delete(
    '/api/snippets/:id',
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!idParam || !isValidSnippetId(idParam)) {
        return res.status(404).json({ error: 'Snippet not found.' });
      }

      try {
        const deleted = await deleteSnippetForUser(idParam, req.user!.uid);
        if (!deleted) {
          return res
            .status(404)
            .json({ error: 'Snippet not found or you do not have permission.' });
        }
        res.json({ deleted: true });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to delete snippet';
        res.status(500).json({ error: message });
      }
    }
  );

  if (SERVER_EXECUTION_ENABLED) {
    app.post('/api/execute', async (req: Request, res: Response) => {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body.code !== 'string' || typeof body.language !== 'string') {
        return res.status(400).json({ error: 'Code and language are required.' });
      }
      if (!body.code.trim()) {
        return res.status(400).json({ error: 'Cannot execute an empty snippet.' });
      }

      const stdin = typeof body.stdin === 'string' ? body.stdin : '';
      try {
        const { executeServerScript } = await import('./utils/serverExecute.ts');
        const result = await executeServerScript({
          code: body.code,
          language: body.language,
          stdin,
        });
        res.json(result);
      } catch (error: unknown) {
        console.error('Script execution failed:', error);
        res.status(500).json({ error: 'Script execution failed.' });
      }
    });
  } else {
    app.post('/api/execute', (_req: Request, res: Response) => {
      res.status(503).json({
        error:
          'Server-side JavaScript/TypeScript execution is disabled on this deployment.',
      });
    });
  }

  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  // Last resort: anything thrown outside a route's own try/catch (bad JSON body,
  // a middleware bug...) still answers with JSON instead of an HTML/plain 500 page.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled API error:', err);
    const status =
      typeof (err as { status?: unknown })?.status === 'number'
        ? (err as { status: number }).status
        : 500;
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: status === 400 ? 'Invalid request body.' : 'Internal server error.',
      code: errorCode(err),
    });
  });

  return app;
}
