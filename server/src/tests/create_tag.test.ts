import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tagsTable } from '../db/schema';
import { type CreateTagInput } from '../schema';
import { createTag } from '../handlers/create_tag';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateTagInput = {
  name: 'JavaScript',
  slug: 'javascript'
};

const secondTestInput: CreateTagInput = {
  name: 'TypeScript',
  slug: 'typescript'
};

describe('createTag', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a tag', async () => {
    const result = await createTag(testInput);

    // Basic field validation
    expect(result.name).toEqual('JavaScript');
    expect(result.slug).toEqual('javascript');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save tag to database', async () => {
    const result = await createTag(testInput);

    // Query using proper drizzle syntax
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, result.id))
      .execute();

    expect(tags).toHaveLength(1);
    expect(tags[0].name).toEqual('JavaScript');
    expect(tags[0].slug).toEqual('javascript');
    expect(tags[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple tags with different names and slugs', async () => {
    const result1 = await createTag(testInput);
    const result2 = await createTag(secondTestInput);

    expect(result1.name).toEqual('JavaScript');
    expect(result2.name).toEqual('TypeScript');
    expect(result1.id).not.toEqual(result2.id);

    // Verify both tags are in database
    const allTags = await db.select().from(tagsTable).execute();
    expect(allTags).toHaveLength(2);
    
    const tagNames = allTags.map(tag => tag.name).sort();
    expect(tagNames).toEqual(['JavaScript', 'TypeScript']);
  });

  it('should handle database constraint violations for duplicate name', async () => {
    // Create first tag
    await createTag(testInput);

    // Attempt to create tag with same name
    const duplicateInput: CreateTagInput = {
      name: 'JavaScript',
      slug: 'js-different'
    };

    await expect(createTag(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should handle database constraint violations for duplicate slug', async () => {
    // Create first tag
    await createTag(testInput);

    // Attempt to create tag with same slug
    const duplicateInput: CreateTagInput = {
      name: 'JS Framework',
      slug: 'javascript'
    };

    await expect(createTag(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should create tag with special characters in name', async () => {
    const specialInput: CreateTagInput = {
      name: 'C++',
      slug: 'cpp'
    };

    const result = await createTag(specialInput);
    
    expect(result.name).toEqual('C++');
    expect(result.slug).toEqual('cpp');

    // Verify in database
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, result.id))
      .execute();

    expect(tags[0].name).toEqual('C++');
  });
});