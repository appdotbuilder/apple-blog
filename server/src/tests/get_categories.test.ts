import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { getCategories } from '../handlers/get_categories';

// Test category data
const testCategories: CreateCategoryInput[] = [
  {
    name: 'Technology',
    slug: 'technology',
    description: 'Posts about technology and programming',
    color: '#3b82f6'
  },
  {
    name: 'Design',
    slug: 'design',
    description: 'UI/UX design and visual content',
    color: '#ef4444'
  },
  {
    name: 'Business',
    slug: 'business',
    description: 'Business strategy and entrepreneurship',
    color: '#10b981'
  }
];

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();

    expect(result).toEqual([]);
  });

  it('should return all categories', async () => {
    // Insert test categories
    await db.insert(categoriesTable)
      .values(testCategories)
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(3);
    
    // Verify all categories are returned
    const names = result.map(cat => cat.name);
    expect(names).toContain('Technology');
    expect(names).toContain('Design');
    expect(names).toContain('Business');
  });

  it('should return categories ordered by name alphabetically', async () => {
    // Insert categories in non-alphabetical order
    await db.insert(categoriesTable)
      .values([
        testCategories[2], // Business
        testCategories[0], // Technology
        testCategories[1]  // Design
      ])
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('Business');
    expect(result[1].name).toEqual('Design');
    expect(result[2].name).toEqual('Technology');
  });

  it('should return categories with all required fields', async () => {
    // Insert a single category
    await db.insert(categoriesTable)
      .values(testCategories[0])
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    const category = result[0];

    // Verify all fields are present
    expect(category.id).toBeDefined();
    expect(category.name).toEqual('Technology');
    expect(category.slug).toEqual('technology');
    expect(category.description).toEqual('Posts about technology and programming');
    expect(category.color).toEqual('#3b82f6');
    expect(category.created_at).toBeInstanceOf(Date);
  });

  it('should handle categories with nullable fields', async () => {
    // Insert category with null description
    const categoryWithNulls = {
      name: 'Minimal Category',
      slug: 'minimal',
      description: null,
      color: '#6366f1'
    };

    await db.insert(categoriesTable)
      .values(categoryWithNulls)
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].name).toEqual('Minimal Category');
  });

  it('should handle large number of categories', async () => {
    // Generate many categories
    const manyCategories = Array.from({ length: 50 }, (_, i) => ({
      name: `Category ${String(i + 1).padStart(2, '0')}`,
      slug: `category-${i + 1}`,
      description: `Description for category ${i + 1}`,
      color: '#6366f1'
    }));

    await db.insert(categoriesTable)
      .values(manyCategories)
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(50);
    // Verify they're ordered alphabetically
    expect(result[0].name).toEqual('Category 01');
    expect(result[1].name).toEqual('Category 02');
    expect(result[49].name).toEqual('Category 50');
  });
});