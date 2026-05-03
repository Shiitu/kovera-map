/**
 * @file backend/src/routes/network.ts
 * @description Network routes for building, viewing, and exporting graph data.
 */

import express from 'express';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { buildGraph } from '../services/graphBuilder.js';
import { detectChains } from '../services/chainDetector.js';
import { anonymizeGraph } from '../services/anonymizer.js';
import { generateNetworkMarkdown } from '../utils/mdExporter.js';

const router = express.Router();

/**
 * POST /api/network/generate
 * Auth: admin only
 * Action: pulls live DB data, builds graph
 */
router.post('/generate', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const graphData = await buildGraph();
    const { chains } = detectChains(graphData.nodes, graphData.edges);
    
    res.json({
      ...graphData,
      chains
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/network/schematic
 * Auth: any valid token
 */
router.get('/schematic', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const graphData = await buildGraph();
    const { chains } = detectChains(graphData.nodes, graphData.edges);
    
    const anonymized = anonymizeGraph(
      graphData.nodes, 
      chains, 
      req.user!.role, 
      req.user!.userId
    );

    res.json({
      nodes: anonymized.nodes,
      edges: graphData.edges, // Edges don't contain PII, just IDs
      chains: anonymized.chains,
      metadata: graphData.metadata
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/network/export
 * Auth: admin only
 */
router.get('/export', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const graphData = await buildGraph();
    const { chains } = detectChains(graphData.nodes, graphData.edges);
    
    const md = generateNetworkMarkdown(graphData.nodes, graphData.edges, chains);
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename=network_map.md');
    res.send(md);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/network/chains
 * Auth: any valid token
 */
router.get('/chains', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const graphData = await buildGraph();
    const { chains } = detectChains(graphData.nodes, graphData.edges);
    
    if (req.user!.role === 'admin') {
      return res.json({ chains });
    }

    // Anonymize for user role
    const anonymized = anonymizeGraph([], chains, 'user', req.user!.userId);
    res.json({ chains: anonymized.chains });
  } catch (err) {
    next(err);
  }
});

export default router;
