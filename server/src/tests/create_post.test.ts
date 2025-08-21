import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable, usersTable, categoriesTable } from '../db/schema';
import { type CreatePostInput } from '../schema';
import { createPost } from '../handlers/create_post';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'author@test.com',
  username: 'testauthor',
  password_hash: 'hashedpassword',
  full_name: 'Test Author'
};

const testCategory = {
  name: 'Technology',
  slug: 'technology',
  description: 'Tech posts',
  color: '#3b82f6'
};

const testPostInput: CreatePostInput = {
  title: 'Test Blog Post',
  slug: 'test-blog-post',
  content: 'This is a comprehensive test post about various topics.',
  excerpt: 'A test post excerpt',
  featured_image_url: 'https://example.com/image.jpg',
  media_type: 'text',
  media_url: 'https://example.com/media.mp4',
  status: 'draft',
  author_id: 1, // Will be set after creating user
  category_id: 1 // Will be set after creating category
};

describe('createPost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let categoryId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    // Update test input with actual IDs
    testPostInput.author_id = userId;
    testPostInput.category_id = categoryId;
  });

  it('should create a post with all fields', async () => {
    const result = await createPost(testPostInput);

    // Verify all fields are set correctly
    expect(result.title).toEqual('Test Blog Post');
    expect(result.slug).toEqual('test-blog-post');
    expect(result.content).toEqual('This is a comprehensive test post about various topics.');
    expect(result.excerpt).toEqual('A test post excerpt');
    expect(result.featured_image_url).toEqual('https://example.com/image.jpg');
    expect(result.media_type).toEqual('text');
    expect(result.media_url).toEqual('https://example.com/media.mp4');
    expect(result.status).toEqual('draft');
    expect(result.author_id).toEqual(userId);
    expect(result.category_id).toEqual(categoryId);
    expect(result.view_count).toEqual(0);
    expect(result.like_count).toEqual(0);
    expect(result.published_at).toBeNull(); // Draft posts don't have published_at
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a published post with published_at timestamp', async () => {
    const publishedPostInput = {
      ...testPostInput,
      status: 'published' as const,
      slug: 'published-post'
    };

    const result = await createPost(publishedPostInput);

    expect(result.status).toEqual('published');
    expect(result.published_at).toBeInstanceOf(Date);
    expect(result.published_at).not.toBeNull();
  });

  it('should create a post without optional fields', async () => {
    const minimalPostInput: CreatePostInput = {
      title: 'Minimal Post',
      slug: 'minimal-post',
      content: 'Just the essential content.',
      media_type: 'text',
      status: 'draft',
      author_id: userId
    };

    const result = await createPost(minimalPostInput);

    expect(result.title).toEqual('Minimal Post');
    expect(result.slug).toEqual('minimal-post');
    expect(result.content).toEqual('Just the essential content.');
    expect(result.excerpt).toBeNull();
    expect(result.featured_image_url).toBeNull();
    expect(result.media_url).toBeNull();
    expect(result.category_id).toBeNull();
    expect(result.author_id).toEqual(userId);
    expect(result.media_type).toEqual('text');
    expect(result.status).toEqual('draft');
  });

  it('should save post to database', async () => {
    const result = await createPost(testPostInput);

    // Verify the post exists in the database
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, result.id))
      .execute();

    expect(posts).toHaveLength(1);
    const savedPost = posts[0];
    expect(savedPost.title).toEqual('Test Blog Post');
    expect(savedPost.slug).toEqual('test-blog-post');
    expect(savedPost.content).toEqual('This is a comprehensive test post about various topics.');
    expect(savedPost.author_id).toEqual(userId);
    expect(savedPost.category_id).toEqual(categoryId);
  });

  it('should create post with different media types', async () => {
    // Test image media type
    const imagePostInput = {
      ...testPostInput,
      slug: 'image-post',
      media_type: 'image' as const,
      media_url: 'https://example.com/photo.jpg'
    };

    const imageResult = await createPost(imagePostInput);
    expect(imageResult.media_type).toEqual('image');
    expect(imageResult.media_url).toEqual('https://example.com/photo.jpg');

    // Test video media type
    const videoPostInput = {
      ...testPostInput,
      slug: 'video-post',
      media_type: 'video' as const,
      media_url: 'https://example.com/video.mp4'
    };

    const videoResult = await createPost(videoPostInput);
    expect(videoResult.media_type).toEqual('video');
    expect(videoResult.media_url).toEqual('https://example.com/video.mp4');
  });

  it('should throw error for duplicate slug', async () => {
    // Create first post
    await createPost(testPostInput);

    // Try to create another post with the same slug
    const duplicatePostInput = {
      ...testPostInput,
      title: 'Different Title'
    };

    await expect(createPost(duplicatePostInput)).rejects.toThrow(/slug.*already exists/i);
  });

  it('should throw error for non-existent author', async () => {
    const invalidPostInput = {
      ...testPostInput,
      author_id: 99999, // Non-existent author
      slug: 'invalid-author-post'
    };

    await expect(createPost(invalidPostInput)).rejects.toThrow(/author.*does not exist/i);
  });

  it('should throw error for non-existent category', async () => {
    const invalidPostInput = {
      ...testPostInput,
      category_id: 99999, // Non-existent category
      slug: 'invalid-category-post'
    };

    await expect(createPost(invalidPostInput)).rejects.toThrow(/category.*does not exist/i);
  });

  it('should create post with null category_id when not provided', async () => {
    const postWithoutCategory = {
      ...testPostInput,
      slug: 'no-category-post',
      category_id: null
    };

    const result = await createPost(postWithoutCategory);
    expect(result.category_id).toBeNull();
  });

  it('should handle archived status correctly', async () => {
    const archivedPostInput = {
      ...testPostInput,
      status: 'archived' as const,
      slug: 'archived-post'
    };

    const result = await createPost(archivedPostInput);

    expect(result.status).toEqual('archived');
    expect(result.published_at).toBeNull(); // Archived posts don't have published_at
  });
});