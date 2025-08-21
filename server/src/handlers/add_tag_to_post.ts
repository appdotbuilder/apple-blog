import { type AddTagToPostInput, type PostTag } from '../schema';

export async function addTagToPost(input: AddTagToPostInput): Promise<PostTag> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a relationship between a post and tag,
    // validating that both entities exist and preventing duplicate associations.
    return Promise.resolve({
        id: 1,
        post_id: input.post_id,
        tag_id: input.tag_id,
        created_at: new Date()
    } as PostTag);
}