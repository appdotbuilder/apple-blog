import { type CreateTagInput, type Tag } from '../schema';

export async function createTag(input: CreateTagInput): Promise<Tag> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new blog tag,
    // validating unique slug/name, and persisting it in the database.
    return Promise.resolve({
        id: 1,
        name: input.name,
        slug: input.slug,
        created_at: new Date()
    } as Tag);
}