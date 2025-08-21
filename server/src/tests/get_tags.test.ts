import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tagsTable } from '../db/schema';
import { type CreateTagInput } from '../schema';
import { getTags } from '../handlers/get_tags';

// Test tag data
const testTags: CreateTagInput[] = [
  {
    name: 'JavaScript',
    slug: 'javascript'
  },
  {
    name: 'TypeScript',
    slug: 'typescript'
  },
  {
    name: 'React',
    slug: 'react'
  },
  {
    name: 'Node.js',
    slug: 'nodejs'
  }
];

describe('getTags', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tags exist', async () => {
    const result = await getTags();

    expect(result).toEqual([]);
  });

  it('should fetch all tags ordered by name', async () => {
    // Insert test tags in random order
    await db.insert(tagsTable)
      .values([
        testTags[2], // React
        testTags[0], // JavaScript
        testTags[3], // Node.js
        testTags[1]  // TypeScript
      ])
      .execute();

    const result = await getTags();

    expect(result).toHaveLength(4);
    
    // Verify alphabetical ordering by name
    expect(result[0].name).toEqual('JavaScript');
    expect(result[1].name).toEqual('Node.js');
    expect(result[2].name).toEqual('React');
    expect(result[3].name).toEqual('TypeScript');
    
    // Verify all fields are present
    result.forEach(tag => {
      expect(tag.id).toBeDefined();
      expect(typeof tag.id).toBe('number');
      expect(tag.name).toBeDefined();
      expect(tag.slug).toBeDefined();
      expect(tag.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return tags with correct field structure', async () => {
    // Insert single tag
    await db.insert(tagsTable)
      .values(testTags[0])
      .execute();

    const result = await getTags();

    expect(result).toHaveLength(1);
    
    const tag = result[0];
    expect(tag.id).toBeDefined();
    expect(typeof tag.id).toBe('number');
    expect(tag.name).toEqual('JavaScript');
    expect(tag.slug).toEqual('javascript');
    expect(tag.created_at).toBeInstanceOf(Date);
    
    // Verify no unexpected fields
    const expectedKeys = ['id', 'name', 'slug', 'created_at'];
    const actualKeys = Object.keys(tag);
    expect(actualKeys.sort()).toEqual(expectedKeys.sort());
  });

  it('should handle special characters in tag names correctly', async () => {
    // Insert tags with special characters
    const specialTags = [
      { name: 'C++', slug: 'cpp' },
      { name: 'C#', slug: 'csharp' },
      { name: 'Vue.js', slug: 'vuejs' }
    ];

    await db.insert(tagsTable)
      .values(specialTags)
      .execute();

    const result = await getTags();

    expect(result).toHaveLength(3);
    
    // Verify ordering still works with special characters
    expect(result[0].name).toEqual('C#');
    expect(result[1].name).toEqual('C++');
    expect(result[2].name).toEqual('Vue.js');
  });

  it('should handle large number of tags efficiently', async () => {
    // Create 50 tags
    const manyTags = Array.from({ length: 50 }, (_, i) => ({
      name: `Tag ${String(i + 1).padStart(2, '0')}`,
      slug: `tag-${String(i + 1).padStart(2, '0')}`
    }));

    await db.insert(tagsTable)
      .values(manyTags)
      .execute();

    const result = await getTags();

    expect(result).toHaveLength(50);
    
    // Verify first and last tags in alphabetical order
    expect(result[0].name).toEqual('Tag 01');
    expect(result[49].name).toEqual('Tag 50');
    
    // Verify ordering is maintained
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].name.localeCompare(result[i].name)).toBeLessThanOrEqual(0);
    }
  });
});