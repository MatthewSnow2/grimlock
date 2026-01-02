/**
 * Credential Tools
 */

import { z } from 'zod';
import type { N8nClient } from '../n8n-client.js';

// Schema definitions
export const ListCredentialsSchema = z.object({
  type: z.string().optional().describe('Filter by credential type'),
});

// Tool handlers
export async function listCredentials(
  client: N8nClient,
  args: z.infer<typeof ListCredentialsSchema>
): Promise<{ credentials: Array<{ id: string; name: string; type: string }> }> {
  const result = await client.listCredentials(args.type);
  return {
    credentials: result.data.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
    })),
  };
}
