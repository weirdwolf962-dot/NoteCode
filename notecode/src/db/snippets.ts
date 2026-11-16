import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { snippets, users } from './schema.ts';

export interface CreateSnippetInput {
  id: string;
  userId?: number | null;
  code: string;
  language: string;
  theme: string;
}

export async function createSnippet(input: CreateSnippetInput) {
  try {
    const [created] = await db
      .insert(snippets)
      .values({
        id: input.id,
        userId: input.userId ?? null,
        code: input.code,
        language: input.language,
        theme: input.theme,
      })
      .returning({
        id: snippets.id,
        code: snippets.code,
        language: snippets.language,
        theme: snippets.theme,
        createdAt: snippets.createdAt,
      });

    return created;
  } catch (error) {
    console.error('Database query failed in createSnippet:', error);
    throw new Error('Failed to save code snippet.', { cause: error });
  }
}

export async function getSnippetById(id: string) {
  try {
    const [snippet] = await db
      .select({
        id: snippets.id,
        code: snippets.code,
        language: snippets.language,
        theme: snippets.theme,
        createdAt: snippets.createdAt,
      })
      .from(snippets)
      .where(eq(snippets.id, id))
      .limit(1);

    return snippet ?? null;
  } catch (error) {
    console.error('Database query failed in getSnippetById:', error);
    throw new Error('Failed to load code snippet.', { cause: error });
  }
}

export async function getSnippetsByUserUid(uid: string) {
  try {
    return await db
      .select({
        id: snippets.id,
        code: snippets.code,
        language: snippets.language,
        theme: snippets.theme,
        createdAt: snippets.createdAt,
      })
      .from(snippets)
      .innerJoin(users, eq(snippets.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(snippets.createdAt))
      .limit(50);
  } catch (error) {
    console.error('Database query failed in getSnippetsByUserUid:', error);
    throw new Error('Failed to load saved snippets.', { cause: error });
  }
}

export async function deleteSnippetForUser(id: string, uid: string) {
  try {
    const [owner] = await db
      .select({ userId: users.id })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (!owner) {
      return false;
    }

    const deleted = await db
      .delete(snippets)
      .where(and(eq(snippets.id, id), eq(snippets.userId, owner.userId)))
      .returning({ id: snippets.id });

    return deleted.length > 0;
  } catch (error) {
    console.error('Database query failed in deleteSnippetForUser:', error);
    throw new Error('Failed to delete snippet.', { cause: error });
  }
}
