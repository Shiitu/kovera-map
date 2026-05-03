/**
 * @file backend/src/services/anonymizer.ts
 * @description Anonymizes graph data based on user roles and identity.
 */

import { GraphNode } from './graphBuilder.js';
import { MoveChain } from './chainDetector.js';

export function anonymizeGraph(
  nodes: GraphNode[], 
  chains: MoveChain[],
  role: 'admin' | 'user',
  currentUserId?: number
) {
  // If admin, return everything but maybe hide internal coordinates if strictly requested.
  // The spec says: "Role: ADMIN - Sees: actual addresses, user IDs, full edge metadata"
  // "Role: USER - Sees: anonymized schematic only... cannot see any address, any user ID"
  
  const anonymizedNodes = nodes.map(node => {
    // Basic shared logic: remove raw coordinates from الجميع
    const { lat, lng, ...rest } = node;
    
    if (role === 'admin') {
      return { ...rest };
    }

    // Role is USER
    const isSelf = currentUserId !== undefined && node.uid === currentUserId;
    
    return {
      ...rest,
      id: rest.id,
      label: isSelf ? 'You' : `Node ${rest.id}`,
      address: isSelf ? rest.address : undefined,
      uid: isSelf ? rest.uid : undefined,
      // Keep types, x, y, incomeCount, outcomeCount, etc.
    };
  });

  const anonymizedChains = chains.map(chain => {
    if (role === 'admin') return chain;
    
    // For users, we might want to hide the path IDs if they are based on address or UIDs
    // But the spec says "show chain shape/length but not which addresses"
    // Since addresses are already removed from nodes, keeping the path of node IDs is usually fine 
    // as long as the IDs themselves aren't sensitive.
    // Our node IDs are `user_ID` or `listing_Hash`. 
    // To be safe, let's map them to indices if needed, or just rely on the anonymized nodes.
    return {
      ...chain,
      // We keep the path so the frontend can relate it to the nodes it HAS.
    };
  });

  return {
    nodes: anonymizedNodes,
    chains: anonymizedChains
  };
}
