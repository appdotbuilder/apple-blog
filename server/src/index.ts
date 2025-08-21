import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import {
  createUserInputSchema,
  loginInputSchema,
  updateUserInputSchema,
  createCategoryInputSchema,
  createPostInputSchema,
  updatePostInputSchema,
  getPostsInputSchema,
  createTagInputSchema,
  addTagToPostInputSchema,
  createCommentInputSchema,
  updateCommentInputSchema,
  getCommentsInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { loginUser } from './handlers/login_user';
import { getUserById } from './handlers/get_user_by_id';
import { updateUser } from './handlers/update_user';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { createPost } from './handlers/create_post';
import { getPosts } from './handlers/get_posts';
import { getPostById } from './handlers/get_post_by_id';
import { getPostBySlug } from './handlers/get_post_by_slug';
import { updatePost } from './handlers/update_post';
import { deletePost } from './handlers/delete_post';
import { createTag } from './handlers/create_tag';
import { getTags } from './handlers/get_tags';
import { addTagToPost } from './handlers/add_tag_to_post';
import { removeTagFromPost } from './handlers/remove_tag_from_post';
import { getTagsForPost } from './handlers/get_tags_for_post';
import { createComment } from './handlers/create_comment';
import { getComments } from './handlers/get_comments';
import { approveComment } from './handlers/approve_comment';
import { deleteComment } from './handlers/delete_comment';
import { likePost } from './handlers/like_post';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User authentication routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  loginUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  getUserById: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserById(input)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Category routes
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),

  getCategories: publicProcedure
    .query(() => getCategories()),

  // Post routes
  createPost: publicProcedure
    .input(createPostInputSchema)
    .mutation(({ input }) => createPost(input)),

  getPosts: publicProcedure
    .input(getPostsInputSchema)
    .query(({ input }) => getPosts(input)),

  getPostById: publicProcedure
    .input(z.number())
    .query(({ input }) => getPostById(input)),

  getPostBySlug: publicProcedure
    .input(z.string())
    .query(({ input }) => getPostBySlug(input)),

  updatePost: publicProcedure
    .input(updatePostInputSchema)
    .mutation(({ input }) => updatePost(input)),

  deletePost: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deletePost(input)),

  likePost: publicProcedure
    .input(z.number())
    .mutation(({ input }) => likePost(input)),

  // Tag routes
  createTag: publicProcedure
    .input(createTagInputSchema)
    .mutation(({ input }) => createTag(input)),

  getTags: publicProcedure
    .query(() => getTags()),

  addTagToPost: publicProcedure
    .input(addTagToPostInputSchema)
    .mutation(({ input }) => addTagToPost(input)),

  removeTagFromPost: publicProcedure
    .input(addTagToPostInputSchema)
    .mutation(({ input }) => removeTagFromPost(input)),

  getTagsForPost: publicProcedure
    .input(z.number())
    .query(({ input }) => getTagsForPost(input)),

  // Comment routes
  createComment: publicProcedure
    .input(createCommentInputSchema)
    .mutation(({ input }) => createComment(input)),

  getComments: publicProcedure
    .input(getCommentsInputSchema)
    .query(({ input }) => getComments(input)),

  approveComment: publicProcedure
    .input(z.number())
    .mutation(({ input }) => approveComment(input)),

  deleteComment: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteComment(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC Blog API server listening at port: ${port}`);
}

start();