import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const snippets = pgTable('snippets', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  code: text('code').notNull(),
  language: text('language').notNull().default('html'),
  theme: text('theme').notNull().default('light'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  snippets: many(snippets),
}));

export const snippetsRelations = relations(snippets, ({ one }) => ({
  author: one(users, {
    fields: [snippets.userId],
    references: [users.id],
  }),
}));
