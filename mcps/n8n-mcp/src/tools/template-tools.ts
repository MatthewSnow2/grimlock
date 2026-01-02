/**
 * Template Discovery Tools
 */

import { z } from 'zod';
import type { N8nClient, Template } from '../n8n-client.js';

// Schema definitions
export const SearchTemplatesSchema = z.object({
  query: z.string().describe('Search query'),
  limit: z.number().min(1).max(50).optional().default(10).describe('Max templates to return'),
});

export const GetTemplateSchema = z.object({
  template_id: z.number().describe('Template ID from n8n.io'),
});

// Tool handlers
export async function searchTemplates(
  client: N8nClient,
  args: z.infer<typeof SearchTemplatesSchema>
): Promise<{ templates: Array<{ id: number; name: string; description: string; totalViews: number }> }> {
  const result = await client.searchTemplates(args.query, args.limit);
  return {
    templates: result.workflows.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      totalViews: t.totalViews,
    })),
  };
}

export async function getTemplate(
  client: N8nClient,
  args: z.infer<typeof GetTemplateSchema>
): Promise<Template> {
  return client.getTemplate(args.template_id);
}
