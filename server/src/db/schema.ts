import { serial, text, pgTable, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const mediaTypeEnum = pgEnum('media_type', ['text', 'image', 'video']);
export const postStatusEnum = pgEnum('post_status', ['draft', 'published', 'archived']);

// Users table for authors
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  bio: text('bio'), // Nullable by default
  avatar_url: text('avatar_url'), // Nullable by default
  is_verified: boolean('is_verified').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'), // Nullable by default
  color: text('color').notNull().default('#6366f1'), // Default indigo color
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Posts table
export const postsTable = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content').notNull(),
  excerpt: text('excerpt'), // Nullable by default
  featured_image_url: text('featured_image_url'), // Nullable by default
  media_type: mediaTypeEnum('media_type').notNull().default('text'),
  media_url: text('media_url'), // Nullable by default
  status: postStatusEnum('status').notNull().default('draft'),
  published_at: timestamp('published_at'), // Nullable by default
  author_id: integer('author_id').notNull().references(() => usersTable.id),
  category_id: integer('category_id').references(() => categoriesTable.id), // Nullable by default
  view_count: integer('view_count').notNull().default(0),
  like_count: integer('like_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Tags table
export const tagsTable = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Post-Tag junction table (many-to-many relationship)
export const postTagsTable = pgTable('post_tags', {
  id: serial('id').primaryKey(),
  post_id: integer('post_id').notNull().references(() => postsTable.id),
  tag_id: integer('tag_id').notNull().references(() => tagsTable.id),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Comments table
export const commentsTable = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  author_name: text('author_name').notNull(),
  author_email: text('author_email').notNull(),
  author_website: text('author_website'), // Nullable by default
  post_id: integer('post_id').notNull().references(() => postsTable.id),
  parent_id: integer('parent_id'), // Self-reference for threaded comments - handled via relations
  is_approved: boolean('is_approved').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  posts: many(postsTable)
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  posts: many(postsTable)
}));

export const postsRelations = relations(postsTable, ({ one, many }) => ({
  author: one(usersTable, {
    fields: [postsTable.author_id],
    references: [usersTable.id]
  }),
  category: one(categoriesTable, {
    fields: [postsTable.category_id],
    references: [categoriesTable.id]
  }),
  comments: many(commentsTable),
  postTags: many(postTagsTable)
}));

export const tagsRelations = relations(tagsTable, ({ many }) => ({
  postTags: many(postTagsTable)
}));

export const postTagsRelations = relations(postTagsTable, ({ one }) => ({
  post: one(postsTable, {
    fields: [postTagsTable.post_id],
    references: [postsTable.id]
  }),
  tag: one(tagsTable, {
    fields: [postTagsTable.tag_id],
    references: [tagsTable.id]
  })
}));

export const commentsRelations = relations(commentsTable, ({ one, many }) => ({
  post: one(postsTable, {
    fields: [commentsTable.post_id],
    references: [postsTable.id]
  }),
  parent: one(commentsTable, {
    fields: [commentsTable.parent_id],
    references: [commentsTable.id],
    relationName: 'parentChild'
  }),
  replies: many(commentsTable, {
    relationName: 'parentChild'
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;

export type Post = typeof postsTable.$inferSelect;
export type NewPost = typeof postsTable.$inferInsert;

export type Tag = typeof tagsTable.$inferSelect;
export type NewTag = typeof tagsTable.$inferInsert;

export type PostTag = typeof postTagsTable.$inferSelect;
export type NewPostTag = typeof postTagsTable.$inferInsert;

export type Comment = typeof commentsTable.$inferSelect;
export type NewComment = typeof commentsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  categories: categoriesTable,
  posts: postsTable,
  tags: tagsTable,
  postTags: postTagsTable,
  comments: commentsTable
};