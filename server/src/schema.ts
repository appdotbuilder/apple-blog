import { z } from 'zod';

// User schema for authors
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string(),
  full_name: z.string(),
  bio: z.string().nullable(),
  avatar_url: z.string().nullable(),
  is_verified: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for user registration
export const createUserInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  full_name: z.string().min(1).max(100),
  password: z.string().min(8),
  bio: z.string().max(500).nullable().optional(),
  avatar_url: z.string().url().nullable().optional()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for user login
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Input schema for updating user profile
export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).max(50).optional(),
  full_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).nullable().optional(),
  avatar_url: z.string().url().nullable().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Input schema for creating categories
export const createCategoryInputSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
  description: z.string().max(200).nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/) // Hex color validation
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

// Media type enum
export const mediaTypeSchema = z.enum(['text', 'image', 'video']);
export type MediaType = z.infer<typeof mediaTypeSchema>;

// Post status enum
export const postStatusSchema = z.enum(['draft', 'published', 'archived']);
export type PostStatus = z.infer<typeof postStatusSchema>;

// Post schema
export const postSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  excerpt: z.string().nullable(),
  featured_image_url: z.string().nullable(),
  media_type: mediaTypeSchema,
  media_url: z.string().nullable(),
  status: postStatusSchema,
  published_at: z.coerce.date().nullable(),
  author_id: z.number(),
  category_id: z.number().nullable(),
  view_count: z.number(),
  like_count: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Post = z.infer<typeof postSchema>;

// Input schema for creating posts
export const createPostInputSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  content: z.string().min(1),
  excerpt: z.string().max(500).nullable().optional(),
  featured_image_url: z.string().url().nullable().optional(),
  media_type: mediaTypeSchema.default('text'),
  media_url: z.string().url().nullable().optional(),
  status: postStatusSchema.default('draft'),
  category_id: z.number().nullable().optional(),
  author_id: z.number()
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;

// Input schema for updating posts
export const updatePostInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(500).nullable().optional(),
  featured_image_url: z.string().url().nullable().optional(),
  media_type: mediaTypeSchema.optional(),
  media_url: z.string().url().nullable().optional(),
  status: postStatusSchema.optional(),
  category_id: z.number().nullable().optional()
});

export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;

// Tag schema
export const tagSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  created_at: z.coerce.date()
});

export type Tag = z.infer<typeof tagSchema>;

// Input schema for creating tags
export const createTagInputSchema = z.object({
  name: z.string().min(1).max(30),
  slug: z.string().min(1).max(30)
});

export type CreateTagInput = z.infer<typeof createTagInputSchema>;

// Post-Tag junction schema
export const postTagSchema = z.object({
  id: z.number(),
  post_id: z.number(),
  tag_id: z.number(),
  created_at: z.coerce.date()
});

export type PostTag = z.infer<typeof postTagSchema>;

// Input schema for adding tags to posts
export const addTagToPostInputSchema = z.object({
  post_id: z.number(),
  tag_id: z.number()
});

export type AddTagToPostInput = z.infer<typeof addTagToPostInputSchema>;

// Comment schema
export const commentSchema = z.object({
  id: z.number(),
  content: z.string(),
  author_name: z.string(),
  author_email: z.string(),
  author_website: z.string().nullable(),
  post_id: z.number(),
  parent_id: z.number().nullable(), // For threaded comments
  is_approved: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Comment = z.infer<typeof commentSchema>;

// Input schema for creating comments
export const createCommentInputSchema = z.object({
  content: z.string().min(1).max(1000),
  author_name: z.string().min(1).max(100),
  author_email: z.string().email(),
  author_website: z.string().url().nullable().optional(),
  post_id: z.number(),
  parent_id: z.number().nullable().optional()
});

export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

// Input schema for updating comments
export const updateCommentInputSchema = z.object({
  id: z.number(),
  content: z.string().min(1).max(1000).optional(),
  is_approved: z.boolean().optional()
});

export type UpdateCommentInput = z.infer<typeof updateCommentInputSchema>;

// Query input schemas
export const getPostsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
  category_id: z.number().nullable().optional(),
  status: postStatusSchema.optional(),
  author_id: z.number().optional()
});

export type GetPostsInput = z.infer<typeof getPostsInputSchema>;

export const getCommentsInputSchema = z.object({
  post_id: z.number(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  approved_only: z.boolean().default(true)
});

export type GetCommentsInput = z.infer<typeof getCommentsInputSchema>;