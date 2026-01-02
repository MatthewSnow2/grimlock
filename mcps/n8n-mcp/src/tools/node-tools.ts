/**
 * Node Discovery Tools
 */

import { z } from 'zod';
import { searchNodes as searchNodesData, getNodeInfo as getNodeInfoData, type N8nNode } from '../n8n-client.js';

// Schema definitions
export const SearchNodesSchema = z.object({
  query: z.string().describe('Search query (e.g., "slack", "webhook", "google")'),
  limit: z.number().min(1).max(50).optional().default(10).describe('Max results'),
});

export const GetNodeInfoSchema = z.object({
  node_type: z.string().describe('Full node type (e.g., "n8n-nodes-base.httpRequest")'),
});

// Tool handlers
export function searchNodes(
  args: z.infer<typeof SearchNodesSchema>
): { nodes: Array<{ name: string; displayName: string; description: string; group: string[] }> } {
  const nodes = searchNodesData(args.query, args.limit);
  return {
    nodes: nodes.map((n) => ({
      name: n.name,
      displayName: n.displayName,
      description: n.description,
      group: n.group,
    })),
  };
}

export function getNodeInfo(
  args: z.infer<typeof GetNodeInfoSchema>
): { node: N8nNode | null; message?: string } {
  const node = getNodeInfoData(args.node_type);
  if (!node) {
    return {
      node: null,
      message: `Node type "${args.node_type}" not found in common nodes. Try searching with search_nodes first.`,
    };
  }
  return { node };
}
