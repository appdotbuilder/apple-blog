import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateCategoryInput = {
  name: 'Technology',
  slug: 'technology',
  description: 'All about technology and innovation',
  color: '#3b82f6'
};

// Test input with minimal required fields
const minimalInput: CreateCategoryInput = {
  name: 'Sports',
  slug: 'sports',
  color: '#ef4444'
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category with all fields', async () => {
    const result = await createCategory(testInput);

    // Basic field validation
    expect(result.name).toEqual('Technology');
    expect(result.slug).toEqual('technology');
    expect(result.description).toEqual('All about technology and innovation');
    expect(result.color).toEqual('#3b82f6');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a category with minimal fields', async () => {
    const result = await createCategory(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Sports');
    expect(result.slug).toEqual('sports');
    expect(result.description).toBeNull();
    expect(result.color).toEqual('#ef4444');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInput);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Technology');
    expect(categories[0].slug).toEqual('technology');
    expect(categories[0].description).toEqual('All about technology and innovation');
    expect(categories[0].color).toEqual('#3b82f6');
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle null description correctly', async () => {
    const inputWithoutDescription: CreateCategoryInput = {
      name: 'Music',
      slug: 'music',
      color: '#8b5cf6'
    };

    const result = await createCategory(inputWithoutDescription);

    expect(result.description).toBeNull();

    // Verify in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories[0].description).toBeNull();
  });

  it('should throw error for duplicate name', async () => {
    // Create first category
    await createCategory(testInput);

    // Try to create another category with the same name
    const duplicateNameInput: CreateCategoryInput = {
      name: 'Technology', // Same name
      slug: 'tech-different',
      color: '#10b981'
    };

    await expect(createCategory(duplicateNameInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should throw error for duplicate slug', async () => {
    // Create first category
    await createCategory(testInput);

    // Try to create another category with the same slug
    const duplicateSlugInput: CreateCategoryInput = {
      name: 'Tech News',
      slug: 'technology', // Same slug
      color: '#10b981'
    };

    await expect(createCategory(duplicateSlugInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should create multiple different categories', async () => {
    const firstCategory = await createCategory(testInput);
    const secondCategory = await createCategory(minimalInput);

    // Verify both exist
    expect(firstCategory.id).not.toEqual(secondCategory.id);
    expect(firstCategory.name).toEqual('Technology');
    expect(secondCategory.name).toEqual('Sports');

    // Query all categories
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
  });

  it('should handle undefined description as null', async () => {
    const inputWithUndefinedDescription: CreateCategoryInput = {
      name: 'Business',
      slug: 'business',
      description: undefined,
      color: '#f59e0b'
    };

    const result = await createCategory(inputWithUndefinedDescription);

    expect(result.description).toBeNull();

    // Verify in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories[0].description).toBeNull();
  });
});