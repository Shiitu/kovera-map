/**
 * @file backend/src/utils/mdExporter.ts
 * @description Generates a markdown representation of the network graph.
 */

import { GraphNode, GraphEdge } from '../services/graphBuilder.js';
import { MoveChain } from '../services/chainDetector.js';

export function generateNetworkMarkdown(
  nodes: GraphNode[],
  edges: GraphEdge[],
  chains: MoveChain[]
): string {
  const timestamp = new Date().toLocaleString();
  
  let md = `# Network Map — ${timestamp}\n\n`;

  // Helper to filter nodes by type
  const getByType = (type: string) => nodes.filter(n => n.type === type);

  md += `## Home Nodes\n`;
  getByType('USER_HOME').forEach(n => {
    md += `- **${n.label}** (${n.address})\n`;
  });

  md += `\n## Seeded Listing Nodes\n`;
  getByType('SEEDED_LISTING').forEach(n => {
    md += `- **${n.address}** (Likes: ${n.incomeCount})\n`;
  });

  md += `\n## Dream Address Nodes\n`;
  getByType('DREAM_HOME').forEach(n => {
    md += `- **${n.address}** (Source: ${n.dreamHomeSource || 'unknown'})\n`;
  });

  md += `\n## Pure Buyer Nodes\n`;
  getByType('PURE_BUYER').forEach(n => {
    md += `- **${n.label}** (ID: ${n.uid})\n`;
  });

  md += `\n## Edges\n`;
  edges.forEach(e => {
    md += `- [${e.type}] ${e.source} → ${e.target}\n`;
  });

  md += `\n## Duplicate Addresses\n`;
  nodes.filter(n => n.isSharedAddress).forEach(n => {
    md += `- **${n.address}** (Shared by ${n.label})\n`;
  });

  md += `\n## Notable Patterns\n`;
  const highScoring = chains.filter(c => c.score > 50);
  md += `- High-intent clusters: ${highScoring.length} found\n`;
  md += `- Double-intent users: ${nodes.filter(n => n.isDoubleIntent).length}\n`;

  md += `\n## Detected Chains\n`;
  chains.slice(0, 10).forEach(c => {
    md += `- **Chain Score ${c.score}**: ${c.path.join(' → ')} [${c.isReady ? 'READY' : 'PENDING'}]\n`;
  });

  return md;
}
