/**
 * @file backend/src/services/graphBuilder.ts
 * @description Builds the full graph of nodes and edges from database data.
 */

import pool from '../db/pool.js';
import { geocodeAddress } from './geocoder.js';
import { normalizeAddress } from '../utils/addressNormalizer.js';
import config from '../config/index.js';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

export interface GraphNode {
  id: string; // Internal unique ID for the graph
  type: 'USER_HOME' | 'SEEDED_LISTING' | 'DREAM_HOME' | 'PURE_BUYER';
  label: string;
  address?: string;
  uid?: number;
  x?: number;
  y?: number;
  lat?: number;
  lng?: number;
  incomeCount: number;
  outcomeCount: number;
  isSharedAddress: boolean;
  isDoubleIntent: boolean;
  dreamHomeSource?: string;
  listingCategory?: 'public' | 'off_market';
  personType?: 'pure_buyer' | 'swapper' | 'pure_seller';
}

export interface GraphEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  type: 'LIKE' | 'DREAM' | 'CHAIN_READY';
}

export async function buildGraph() {
  if (config.isDemoMode) {
    return buildMockGraph();
  }
  
  // 1. Fetch live DB data
  // Filter out internal users
  const internalUserRes = await pool.query('SELECT user_id FROM network_internal_users');
  const internalUserIds = internalUserRes.rows.map(r => r.user_id);
  const internalUserIdsStr = internalUserIds.length > 0 ? internalUserIds.join(',') : '0';

  // Users and their current home addresses
  const usersRes = await pool.query(`
    SELECT u.id, u.email, up.current_address
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id NOT IN (${internalUserIdsStr})
  `);

  // Seeded listings
  const listingsRes = await pool.query('SELECT id, address FROM listings WHERE is_seeded = true');

  // Likes
  const likesRes = await pool.query(`
    SELECT l.id, l.user_id, l.listing_id, u.email as user_email, list.address as listing_address
    FROM likes l
    JOIN users u ON l.user_id = u.id
    JOIN listings list ON l.listing_id = list.id
    WHERE l.user_id NOT IN (${internalUserIdsStr})
  `);

  // Dream Homes
  const dreamRes = await pool.query(`
    SELECT id, user_id, address, source
    FROM dream_homes
    WHERE user_id NOT IN (${internalUserIdsStr})
  `);

  const nodesMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  // Helper to get or create address-based listing node
  const getListingNodeId = (address: string) => `listing_${normalizeAddress(address)}`;
  const getUserNodeId = (id: number) => `user_${id}`;

  // Process User Home Nodes
  for (const user of usersRes.rows) {
    if (user.current_address) {
      nodesMap.set(getUserNodeId(user.id), {
        id: getUserNodeId(user.id),
        type: 'USER_HOME',
        label: user.email,
        address: user.current_address,
        uid: user.id,
        incomeCount: 0,
        outcomeCount: 0,
        isSharedAddress: false,
        isDoubleIntent: false
      });
    }
  }

  // Process Seeded Listings
  for (const list of listingsRes.rows) {
    const nid = getListingNodeId(list.address);
    if (!nodesMap.has(nid)) {
      nodesMap.set(nid, {
        id: nid,
        type: 'SEEDED_LISTING',
        label: list.address,
        address: list.address,
        incomeCount: 0,
        outcomeCount: 0,
        isSharedAddress: false,
        isDoubleIntent: false,
        listingCategory: 'public'
      });
    }
  }

  // Identify Pure Buyers
  for (const dream of dreamRes.rows) {
    const userNodeId = getUserNodeId(dream.user_id);
    if (!nodesMap.has(userNodeId)) {
      nodesMap.set(userNodeId, {
        id: userNodeId,
        type: 'PURE_BUYER',
        label: `Buyer ${dream.user_id}`,
        uid: dream.user_id,
        incomeCount: 0,
        outcomeCount: 0,
        isSharedAddress: false,
        isDoubleIntent: false,
        personType: 'pure_buyer'
      });
    }
  }

  // Create Edges and Update Stats
  // 1. Like Edges
  for (const like of likesRes.rows) {
    const sourceId = getUserNodeId(like.user_id);
    const targetAddressN = normalizeAddress(like.listing_address);
    // Find if the targeted listing/home exists as a node
    // A user might like a seeded listing OR another user's home
    const targetNodeId = getListingNodeId(like.listing_address);
    
    // Check if any USER_HOME is at this address
    let actualTargetId = targetNodeId;
    for (const node of nodesMap.values()) {
      if (node.type === 'USER_HOME' && node.address && normalizeAddress(node.address) === targetAddressN) {
        actualTargetId = node.id;
        break;
      }
    }

    if (nodesMap.has(sourceId) && nodesMap.has(actualTargetId)) {
      edges.push({
        id: `like_${like.id}`,
        source: sourceId,
        target: actualTargetId,
        type: 'LIKE'
      });
      nodesMap.get(sourceId)!.outcomeCount++;
      nodesMap.get(actualTargetId)!.incomeCount++;
    }
  }

  // 2. Dream Edges
  for (const dream of dreamRes.rows) {
    const sourceId = getUserNodeId(dream.user_id);
    const targetAddressN = normalizeAddress(dream.address);
    const dreamNodeId = `dream_${targetAddressN}`;

    // Create a Diamond Node if target isn't already a known listing/home
    let targetNodeId = dreamNodeId;
    let existingNodeFound = false;
    for (const node of nodesMap.values()) {
      if (node.address && normalizeAddress(node.address) === targetAddressN) {
        targetNodeId = node.id;
        existingNodeFound = true;
        break;
      }
    }

    if (!existingNodeFound && !nodesMap.has(targetNodeId)) {
      nodesMap.set(targetNodeId, {
        id: targetNodeId,
        type: 'DREAM_HOME',
        label: dream.address,
        address: dream.address,
        incomeCount: 0,
        outcomeCount: 0,
        isSharedAddress: false,
        isDoubleIntent: false,
        dreamHomeSource: dream.source
      });
    }

    if (nodesMap.has(sourceId)) {
      edges.push({
        id: `dream_edge_${dream.id}`,
        source: sourceId,
        target: targetNodeId,
        type: 'DREAM'
      });
      nodesMap.get(sourceId)!.outcomeCount++;
      nodesMap.get(targetNodeId)!.incomeCount++;
      
      // Double intent check: user lives at address X and dreams of address X
      const sourceNode = nodesMap.get(sourceId)!;
      if (sourceNode.address && normalizeAddress(sourceNode.address) === targetAddressN) {
        sourceNode.isDoubleIntent = true;
      }
    }
  }

  // Shared Address Detection
  const addrGroups = new Map<string, string[]>();
  for (const node of nodesMap.values()) {
    if (node.address) {
      const n = normalizeAddress(node.address);
      const group = addrGroups.get(n) || [];
      group.push(node.id);
      addrGroups.set(n, group);
    }
  }

  // Classify user-home nodes by intent
  const dreamSourceUsers = new Set(
    dreamRes.rows.map((d: any) => getUserNodeId(d.user_id))
  );
  for (const node of nodesMap.values()) {
    if (node.type !== 'USER_HOME') continue;
    node.personType = dreamSourceUsers.has(node.id) ? 'swapper' : 'pure_seller';
  }
  for (const ids of addrGroups.values()) {
    if (ids.length > 1) {
      for (const id of ids) {
        nodesMap.get(id)!.isSharedAddress = true;
      }
    }
  }

  // Geocoding and Normalization
  const geocodedNodes: GraphNode[] = [];
  const coords: { lat: number, lng: number }[] = [];

  for (const node of nodesMap.values()) {
    if (node.address) {
      const g = await geocodeAddress(node.address);
      if (g) {
        node.lat = g.lat;
        node.lng = g.lng;
        coords.push(g);
      }
    }
    geocodedNodes.push(node);
  }

  // Normalize coords to (x, y)
  if (coords.length > 0) {
    const lats = coords.map(c => c.lat);
    const lngs = coords.map(c => c.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;

    for (const node of geocodedNodes) {
      if (node.lat !== undefined && node.lng !== undefined) {
        node.x = ((node.lng - minLng) / lngRange) * (CANVAS_WIDTH - 200) + 100;
        node.y = (1 - (node.lat - minLat) / latRange) * (CANVAS_HEIGHT - 200) + 100; // Inverted Y
      } else {
        // Fallback: Random or force-directed placeholder for now if no geo
        node.x = Math.random() * CANVAS_WIDTH;
        node.y = Math.random() * CANVAS_HEIGHT;
      }
    }
  } else {
    // Total fallback placement
    for (const node of geocodedNodes) {
      node.x = Math.random() * CANVAS_WIDTH;
      node.y = Math.random() * CANVAS_HEIGHT;
    }
  }

  return {
    nodes: geocodedNodes,
    edges,
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: geocodedNodes.length,
      edgeCount: edges.length
    }
  };
}

async function buildMockGraph() {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // 1. GUARANTEE SPECIFIC NODES FOR A READY CHAIN
  // We need B (Home), A (Home), C (Listing), D (Buyer/Home)
  const requiredNodes: { type: GraphNode['type']; id: string; label: string; address?: string }[] = [
    { type: 'USER_HOME', id: 'user_b', label: 'Liker_B@kovera.io', address: '123 Alpha St, SF' },
    { type: 'USER_HOME', id: 'user_a', label: 'Central_A@kovera.io', address: '456 Beta St, SF' },
    { type: 'SEEDED_LISTING', id: 'listing_c', label: 'Target_C St, SF', address: '789 Gamma St, SF' },
    { type: 'PURE_BUYER', id: 'user_d', label: 'Initiator_D@kovera.io' }
  ];

  requiredNodes.forEach((rn, i) => {
    nodes.push({
      ...rn,
      uid: 1000 + i,
      x: 200 + i * 150,
      y: 200 + i * 100,
      incomeCount: 0,
      outcomeCount: 0,
      isSharedAddress: false,
      isDoubleIntent: false,
      personType: rn.type === 'PURE_BUYER' ? 'pure_buyer' : undefined,
      listingCategory: rn.type === 'SEEDED_LISTING' ? 'public' : undefined
    });
  });

  // 2. Generate the rest randomly
  const nodeTypes: ('USER_HOME' | 'SEEDED_LISTING' | 'PURE_BUYER')[] = ['USER_HOME', 'SEEDED_LISTING', 'PURE_BUYER'];
  const nodeCount = 40 + Math.floor(Math.random() * 20);
  for (let i = 4; i < nodeCount; i++) {
    const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
    const id = `${type.toLowerCase()}_${i}`;
    
    nodes.push({
      id,
      type,
      label: type === 'SEEDED_LISTING' ? `${100 + i} Oak St, SF` : `User_${i}@demo.io`,
      address: type !== 'PURE_BUYER' ? `${100 + i} Oak St, SF` : undefined,
      uid: i,
      x: 100 + Math.random() * (CANVAS_WIDTH - 200),
      y: 100 + Math.random() * (CANVAS_HEIGHT - 200),
      incomeCount: 0,
      outcomeCount: 0,
      isSharedAddress: Math.random() > 0.8,
      isDoubleIntent: Math.random() > 0.9,
      listingCategory: type === 'SEEDED_LISTING' ? (Math.random() > 0.7 ? 'off_market' : 'public') : undefined,
      personType: type === 'PURE_BUYER' ? 'pure_buyer' : (type === 'USER_HOME' ? (Math.random() > 0.45 ? 'swapper' : 'pure_seller') : undefined)
    });
  }

  // Create random DREAM_HOME nodes and edges
  for (let i = 0; i < 15; i++) {
    const sourceNode = nodes[Math.floor(Math.random() * nodes.length)];
    if (sourceNode.type === 'SEEDED_LISTING') continue;

    const dreamId = `dream_${i}`;
    const sourceVal = i % 2 === 0 ? 'dream_anchor' : 'quick_tab';

    nodes.push({
      id: dreamId,
      type: 'DREAM_HOME',
      label: `${500 + i} Market St, SF`,
      address: `${500 + i} Market St, SF`,
      x: 100 + Math.random() * (CANVAS_WIDTH - 200),
      y: 100 + Math.random() * (CANVAS_HEIGHT - 200),
      incomeCount: 1,
      outcomeCount: 0,
      isSharedAddress: false,
      isDoubleIntent: false,
      dreamHomeSource: sourceVal
    });

    edges.push({
      id: `dream_edge_${i}`,
      source: sourceNode.id,
      target: dreamId,
      type: 'DREAM'
    });
    sourceNode.outcomeCount++;
  }

  // Create random LIKE edges
  for (let i = 0; i < 30; i++) {
    const sourceNode = nodes[Math.floor(Math.random() * nodes.length)];
    const targetNode = nodes[Math.floor(Math.random() * nodes.length)];

    if (sourceNode.id !== targetNode.id && targetNode.type !== 'PURE_BUYER') {
      edges.push({
        id: `like_edge_${i}`,
        source: sourceNode.id,
        target: targetNode.id,
        type: 'LIKE'
      });
      sourceNode.outcomeCount++;
      targetNode.incomeCount++;
    }
  }

  // GUARANTEE AT LEAST ONE READY CHAIN
  // Logic: D (likes) -> B (likes) -> A (dreams of) -> C
  const nodeB = nodes.find(n => n.id === 'user_b');
  const nodeA = nodes.find(n => n.id === 'user_a');
  const nodeC = nodes.find(n => n.id === 'listing_c');
  const nodeD = nodes.find(n => n.id === 'user_d');

  if (nodeB && nodeA && nodeC && nodeD) {
    // D likes B
    edges.push({ id: 'force_like_1', source: nodeD.id, target: nodeB.id, type: 'LIKE' });
    nodeB.incomeCount++;
    nodeD.outcomeCount++;

    // B likes A
    edges.push({ id: 'force_like_2', source: nodeB.id, target: nodeA.id, type: 'LIKE' });
    nodeA.incomeCount++;
    nodeB.outcomeCount++;

    // A dreams of C
    edges.push({ id: 'force_dream_1', source: nodeA.id, target: nodeC.id, type: 'DREAM' });
    nodeC.incomeCount++;
    nodeA.outcomeCount++;
    
    // Path: [B, A, C]
    // B has income (from D)
    // A has income (from B)
    // C has income (from A)
    // Results in a READY chain.
  }

  return {
    nodes,
    edges,
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      isDemo: true
    }
  };
}
