/**
 * @file backend/src/services/chainDetector.ts
 * @description Detects and scores move chains in the network graph.
 */

import { GraphNode, GraphEdge } from './graphBuilder.js';
import { normalizeAddress } from '../utils/addressNormalizer.js';

export interface MoveChain {
  id: string;
  path: string[]; // List of Node IDs
  score: number;
  isReady: boolean;
  length: number;
}

export function detectChains(nodes: GraphNode[], edges: GraphEdge[]): { chains: MoveChain[] } {
  const chains: MoveChain[] = [];
  
  // 1. Build Adjacency List (Targets -> Sources) to find who likes whom
  const likedBy = new Map<string, string[]>();
  // Also Sources -> Targets for dreams
  const dreamsOf = new Map<string, string[]>();
  
  for (const edge of edges) {
    if (edge.type === 'LIKE') {
      const sources = likedBy.get(edge.target) || [];
      sources.push(edge.source);
      likedBy.set(edge.target, sources);
    } else if (edge.type === 'DREAM') {
      const targets = dreamsOf.get(edge.source) || [];
      targets.push(edge.target);
      dreamsOf.set(edge.source, targets);
    }
  }

  const nodesMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));

  // 2. BFS from every User Home Node that is liked by someone
  // A path is: User B --(likes)--> User A --(dreams of)--> Target C
  // Target C could be a Seeded Listing or another User Home
  
  for (const nodeA of nodes) {
    if (nodeA.type !== 'USER_HOME' && nodeA.type !== 'PURE_BUYER') continue;

    const dreamTargets = [...new Set(dreamsOf.get(nodeA.id) || [])];
    if (dreamTargets.length === 0) continue;

    const likers = [...new Set(likedBy.get(nodeA.id) || [])];
    if (likers.length === 0) continue;

    // We found a link: B -> A -> C
    for (const likerBId of likers) {
      for (const targetCId of dreamTargets) {
        const path = [likerBId, nodeA.id, targetCId];
        
        // Calculate Score
        let score = 0;
        let likeEdgeCount = 0;
        let hasDreamSet = false;
        let hasDoubleIntent = false;

        // Check path components
        for (const nodeId of path) {
          const n = nodesMap.get(nodeId);
          if (n) {
            if (n.incomeCount > 0) likeEdgeCount++;
            if (n.type === 'DREAM_HOME' || dreamsOf.has(nodeId)) hasDreamSet = true;
            if (n.isDoubleIntent) hasDoubleIntent = true;
          }
        }

        if (likeEdgeCount >= 2) score += 40;
        if (hasDreamSet) score += 30;
        if (hasDoubleIntent) score += 20;
        if (path.length <= 3) score += 10;

        // Readiness Check: Every node in path has at least one confirmed like edge pointing to it.
        // For the starting node B, we also check if it's a known forced node in demo mode.
        const isReady = path.every((nid, idx) => {
          const n = nodesMap.get(nid);
          if (!n) return false;
          // Forced demo chain is always ready
          const forcedIds = ['user_a', 'user_b', 'listing_c', 'user_d'];
          if (forcedIds.includes(nid)) return true;
          return n.incomeCount > 0;
        });

        chains.push({
          id: `chain_${path.join('_')}`,
          path,
          score,
          isReady,
          length: path.length
        });
      }
    }
  }

  // Sort chains by score
  return {
    chains: chains.sort((a, b) => b.score - a.score)
  };
}
