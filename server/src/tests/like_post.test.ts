import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable, categoriesTable } from '../db/schema';
import { likePost } from '../handlers/like_post';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'author@example.com',
  username: 'testauthor',
  password_hash: 'hashed_password',
  full_name: 'Test Author',
  bio: 'A test author',
  avatar_url: null,
  is_verified: false
};

const testCategory = {
  name: 'Test Category',
  slug: 'test-category',
  description: 'A test category',
  color: '#ff0000'
};

const testPost = {
  title: 'Test Post',
  slug: 'test-post',
  content: 'This is test content for the post',
  excerpt: 'Test excerpt',
  featured_image_url: null,
  media_type: 'text' as const,
  media_url: null,
  status: 'published' as const,
  published_at: new Date(),
  view_count: 5,
  like_count: 0
};

describe('likePost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should increment like count for existing post', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(categoriesTable).values(testCategory).returning().execute();
    const [post] = await db.insert(postsTable).values({
      ...testPost,
      author_id: user.id,
      category_id: category.id
    }).returning().execute();

    // Like the post
    const result = await likePost(post.id);

    // Verify like count was incremented
    expect(result.id).toEqual(post.id);
    expect(result.like_count).toEqual(1);
    expect(result.title).toEqual('Test Post');
    expect(result.status).toEqual('published');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated like count to database', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(categoriesTable).values(testCategory).returning().execute();
    const [post] = await db.insert(postsTable).values({
      ...testPost,
      author_id: user.id,
      category_id: category.id,
      like_count: 5 // Start with existing likes
    }).returning().execute();

    // Like the post
    await likePost(post.id);

    // Verify in database
    const updatedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    expect(updatedPost).toHaveLength(1);
    expect(updatedPost[0].like_count).toEqual(6); // Should be incremented by 1
    expect(updatedPost[0].updated_at).toBeInstanceOf(Date);
    
    // Verify updated_at was actually changed
    expect(updatedPost[0].updated_at.getTime()).toBeGreaterThan(post.updated_at.getTime());
  });

  it('should handle multiple likes correctly', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(categoriesTable).values(testCategory).returning().execute();
    const [post] = await db.insert(postsTable).values({
      ...testPost,
      author_id: user.id,
      category_id: category.id,
      like_count: 0
    }).returning().execute();

    // Like the post multiple times
    const firstLike = await likePost(post.id);
    expect(firstLike.like_count).toEqual(1);

    const secondLike = await likePost(post.id);
    expect(secondLike.like_count).toEqual(2);

    const thirdLike = await likePost(post.id);
    expect(thirdLike.like_count).toEqual(3);

    // Verify final state in database
    const finalPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, post.id))
      .execute();

    expect(finalPost[0].like_count).toEqual(3);
  });

  it('should throw error for non-existent post', async () => {
    const nonExistentPostId = 9999;

    await expect(likePost(nonExistentPostId)).rejects.toThrow(/not found/i);
  });

  it('should preserve all other post fields when liking', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(categoriesTable).values(testCategory).returning().execute();
    const [post] = await db.insert(postsTable).values({
      ...testPost,
      author_id: user.id,
      category_id: category.id,
      excerpt: 'Original excerpt',
      view_count: 42,
      like_count: 7
    }).returning().execute();

    // Like the post
    const result = await likePost(post.id);

    // Verify all fields are preserved except like_count and updated_at
    expect(result.title).toEqual(post.title);
    expect(result.slug).toEqual(post.slug);
    expect(result.content).toEqual(post.content);
    expect(result.excerpt).toEqual(post.excerpt);
    expect(result.author_id).toEqual(post.author_id);
    expect(result.category_id).toEqual(post.category_id);
    expect(result.view_count).toEqual(42); // Should remain unchanged
    expect(result.like_count).toEqual(8); // Should be incremented
    expect(result.status).toEqual(post.status);
    expect(result.media_type).toEqual(post.media_type);
  });
});