import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, postsTable, tagsTable, postTagsTable } from '../db/schema';
import { getTagsForPost } from '../handlers/get_tags_for_post';

describe('getTagsForPost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for post with no tags', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashedpassword',
        full_name: 'Test Author'
      })
      .returning()
      .execute();

    // Create post without any tags
    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: userResult[0].id
      })
      .returning()
      .execute();

    const tags = await getTagsForPost(postResult[0].id);

    expect(tags).toEqual([]);
  });

  it('should return tags for post with single tag', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashedpassword',
        full_name: 'Test Author'
      })
      .returning()
      .execute();

    // Create post
    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create tag
    const tagResult = await db.insert(tagsTable)
      .values({
        name: 'JavaScript',
        slug: 'javascript'
      })
      .returning()
      .execute();

    // Associate tag with post
    await db.insert(postTagsTable)
      .values({
        post_id: postResult[0].id,
        tag_id: tagResult[0].id
      })
      .execute();

    const tags = await getTagsForPost(postResult[0].id);

    expect(tags).toHaveLength(1);
    expect(tags[0].id).toBe(tagResult[0].id);
    expect(tags[0].name).toBe('JavaScript');
    expect(tags[0].slug).toBe('javascript');
    expect(tags[0].created_at).toBeInstanceOf(Date);
  });

  it('should return multiple tags for post ordered by tag id', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashedpassword',
        full_name: 'Test Author'
      })
      .returning()
      .execute();

    // Create post
    const postResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create multiple tags
    const tag1Result = await db.insert(tagsTable)
      .values({
        name: 'JavaScript',
        slug: 'javascript'
      })
      .returning()
      .execute();

    const tag2Result = await db.insert(tagsTable)
      .values({
        name: 'TypeScript',
        slug: 'typescript'
      })
      .returning()
      .execute();

    const tag3Result = await db.insert(tagsTable)
      .values({
        name: 'React',
        slug: 'react'
      })
      .returning()
      .execute();

    // Associate all tags with post
    await db.insert(postTagsTable)
      .values([
        { post_id: postResult[0].id, tag_id: tag1Result[0].id },
        { post_id: postResult[0].id, tag_id: tag2Result[0].id },
        { post_id: postResult[0].id, tag_id: tag3Result[0].id }
      ])
      .execute();

    const tags = await getTagsForPost(postResult[0].id);

    expect(tags).toHaveLength(3);
    
    // Verify all tags are returned
    const tagNames = tags.map(tag => tag.name).sort();
    expect(tagNames).toEqual(['JavaScript', 'React', 'TypeScript']);

    // Verify all have required properties
    tags.forEach(tag => {
      expect(tag.id).toBeDefined();
      expect(tag.name).toBeDefined();
      expect(tag.slug).toBeDefined();
      expect(tag.created_at).toBeInstanceOf(Date);
    });
  });

  it('should only return tags for specified post', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'author@example.com',
        username: 'author',
        password_hash: 'hashedpassword',
        full_name: 'Test Author'
      })
      .returning()
      .execute();

    // Create two posts
    const post1Result = await db.insert(postsTable)
      .values({
        title: 'First Post',
        slug: 'first-post',
        content: 'First content',
        author_id: userResult[0].id
      })
      .returning()
      .execute();

    const post2Result = await db.insert(postsTable)
      .values({
        title: 'Second Post',
        slug: 'second-post',
        content: 'Second content',
        author_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create tags
    const tag1Result = await db.insert(tagsTable)
      .values({
        name: 'JavaScript',
        slug: 'javascript'
      })
      .returning()
      .execute();

    const tag2Result = await db.insert(tagsTable)
      .values({
        name: 'Python',
        slug: 'python'
      })
      .returning()
      .execute();

    // Associate JavaScript with post 1, Python with post 2
    await db.insert(postTagsTable)
      .values([
        { post_id: post1Result[0].id, tag_id: tag1Result[0].id },
        { post_id: post2Result[0].id, tag_id: tag2Result[0].id }
      ])
      .execute();

    // Get tags for first post only
    const post1Tags = await getTagsForPost(post1Result[0].id);

    expect(post1Tags).toHaveLength(1);
    expect(post1Tags[0].name).toBe('JavaScript');
    expect(post1Tags[0].slug).toBe('javascript');

    // Get tags for second post only
    const post2Tags = await getTagsForPost(post2Result[0].id);

    expect(post2Tags).toHaveLength(1);
    expect(post2Tags[0].name).toBe('Python');
    expect(post2Tags[0].slug).toBe('python');
  });

  it('should handle non-existent post id', async () => {
    const tags = await getTagsForPost(999999);
    expect(tags).toEqual([]);
  });
});