/**
 * @file frontend/src/components/NetworkCanvas.tsx
 * @description HTML5 Canvas renderer for the Kovera Network Map.
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useNetworkContext } from '../context/NetworkContext';
import { useCanvas } from '../hooks/useCanvas';
import { Plus, Minus, Maximize, MousePointer2 } from 'lucide-react';

/** Control point for smooth arcs between chain stops (address → address feel). */
function chainArcControl(
  a: { x: number; y: number },
  b: { x: number; y: number },
  bendScale = 0.26
) {
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  return {
    cpX: midX + (b.y - a.y) * bendScale,
    cpY: midY - (b.x - a.x) * bendScale
  };
}

const NetworkCanvas: React.FC = () => {
  const {
    graphData,
    selectedNode,
    setSelectedNode,
    activeChain,
    filter,
    theme,
    chainStatusFilter,
    privacyMode
  } = useNetworkContext();
  
  const colors = useMemo(() => {
    if (theme === 'light') {
      return {
        bg: '#F5F7FA',
        blue: '#2563EB',
        green: '#059669',
        pink: '#DB2777',
        amber: '#D97706',
        gold: '#B45309',
        text: '#1A1F2E',
        textMuted: '#8B96B8',
        grid: 'rgba(55, 138, 221, 0.12)'
      };
    }
    return {
      bg: '#0A0F1E',
      blue: '#378ADD',
      green: '#22C98A',
      pink: '#D4537E',
      amber: '#BA7517',
      gold: '#D4A017',
      text: '#E8EBF4',
      textMuted: '#4D5A7C',
      grid: 'rgba(99, 130, 255, 0.04)'
    };
  }, [theme]);

  const [hoveredNode, setHoveredNode] = React.useState<any>(null);

  const { 
    canvasRef, 
    viewState, 
    handleMouseDown, 
    handleMouseMove: handleCanvasMove, 
    handleMouseUp, 
    handleWheel,
    screenToWorld,
    zoomIn,
    zoomOut,
    resetView
  } = useCanvas();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleCanvasMove(e);
    
    // Hit Detection for Hover
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const hit = graphData?.nodes?.find((n: any) => {
      const dx = (n.drawX ?? n.x) - worldPos.x;
      const dy = (n.drawY ?? n.y) - worldPos.y;
      const collisionRadius = 15; // Slightly larger for easier hit
      return Math.sqrt(dx * dx + dy * dy) < collisionRadius;
    });
    
    if (hit?.id !== hoveredNode?.id) {
      setHoveredNode(hit || null);
    }
  }, [handleCanvasMove, screenToWorld, graphData, hoveredNode]);

  const animationRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const [mapReady, setMapReady] = React.useState(false);

  const toNodeType = (node: any) => String(node.type || '').toLowerCase();
  const isUserHomeLike = (node: any) => ['user_home', 'swapper', 'pure_seller'].includes(toNodeType(node));
  const isDreamLike = (node: any) => ['dream_address', 'dream_anchor'].includes(toNodeType(node));
  const isBuyerLike = (node: any) => ['pure_buyer'].includes(toNodeType(node));
  const isOffMarketListing = (node: any) =>
    toNodeType(node) === 'pocket_listing' ||
    (toNodeType(node) === 'seeded_listing' && String(node.listingCategory || node.source || '').toLowerCase() === 'off_market');
  const isPublicListing = (node: any) =>
    toNodeType(node) === 'public_listing' ||
    (toNodeType(node) === 'seeded_listing' && !isOffMarketListing(node));
  const isDreamAnchor = (node: any) => toNodeType(node) === 'dream_anchor' || (toNodeType(node) === 'dream_address' && node.dreamHomeSource === 'dream_anchor');

  const chainMetrics = useMemo(() => {
    const edges = Array.isArray(graphData?.edges) ? graphData.edges : [];
    const outgoingDreamSources = new Set(
      edges
        .filter((e: any) => e.type === 'DREAM')
        .map((e: any) => e.source)
    );
    return { outgoingDreamSources };
  }, [graphData]);

  const nodeIdsInAnyChain = useMemo(() => {
    const ids = new Set<string>();
    const chains = Array.isArray(graphData?.chains) ? graphData.chains : [];
    chains.forEach((chain: any) => {
      if (!chain) return;
      const p = Array.isArray(chain.path) ? chain.path : [];
      p.forEach((id: string) => ids.add(id));
    });
    return ids;
  }, [graphData]);

  const nodeDrawData = useMemo(() => {
    if (!graphData?.nodes || !Array.isArray(graphData.nodes)) return [];
    const areaBuckets = new Map<string, number>();
    return graphData.nodes.map((node: any) => {
      const bucketKey = node.lat !== undefined && node.lng !== undefined
        ? `${node.lat.toFixed(2)}:${node.lng.toFixed(2)}`
        : `nogeo:${node.id}`;
      const index = areaBuckets.get(bucketKey) || 0;
      areaBuckets.set(bucketKey, index + 1);
      const angle = ((node.id?.length || 1) * 73 + index * 47) % 360;
      const radius = Math.min(20, index * 2.2);
      const dx = Math.cos((angle * Math.PI) / 180) * radius;
      const dy = Math.sin((angle * Math.PI) / 180) * radius;
      return { ...node, drawX: (node.x || 0) + dx, drawY: (node.y || 0) + dy };
    });
  }, [graphData]);

  const nodePosById = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    nodeDrawData.forEach((n: any) => {
      m.set(n.id, { x: n.drawX ?? n.x, y: n.drawY ?? n.y });
    });
    return m;
  }, [nodeDrawData]);

  const getMaskedLabel = (node: any) => {
    const raw = String(node.label || node.name || '').trim();
    if (!raw || raw.length <= 2) return 'Unknown';
    if (raw === raw.toUpperCase() && raw.length <= 3) return 'Unknown';
    if (privacyMode === 'public') {
      if (isBuyerLike(node)) return 'Buyer';
      if (isUserHomeLike(node)) return 'Home Owner';
      if (isOffMarketListing(node) || isPublicListing(node)) return isOffMarketListing(node) ? 'Pocket Listing' : 'Public Listing';
      if (isDreamLike(node)) return 'Dream Anchor';
    }
    return raw;
  };

  // Filtered Data
  const filteredNodes = useMemo(() => {
    if (!nodeDrawData.length) return [];
    let nodes = nodeDrawData;

    if (filter === 'User Homes') nodes = nodes.filter(isUserHomeLike);
    else if (filter === 'Public Listings') nodes = nodes.filter(isPublicListing);
    else if (filter === 'Off-Market Properties') nodes = nodes.filter(isOffMarketListing);
    else if (filter === 'Pure Buyers') nodes = nodes.filter(isBuyerLike);
    else if (filter === 'Swappers') nodes = nodes.filter(n => toNodeType(n) === 'swapper' || (toNodeType(n) === 'user_home' && chainMetrics.outgoingDreamSources.has(n.id)));
    else if (filter === 'Pure Sellers') nodes = nodes.filter(n => toNodeType(n) === 'pure_seller' || (toNodeType(n) === 'user_home' && !chainMetrics.outgoingDreamSources.has(n.id)));
    else if (filter === 'Dream Anchors') nodes = nodes.filter(isDreamAnchor);

    const chainsSafe = Array.isArray(graphData?.chains) ? graphData.chains : [];

    if (chainStatusFilter === 1) nodes = nodes.filter(n => !nodeIdsInAnyChain.has(n.id));
    if (chainStatusFilter === 2) {
      nodes = nodes.filter(n =>
        nodeIdsInAnyChain.has(n.id) &&
        !chainsSafe.some(
          (c: any) =>
            c?.isReady && Array.isArray(c.path) && c.path.includes(n.id)
        )
      );
    }
    if (chainStatusFilter === 3) {
      nodes = nodes.filter(n =>
        chainsSafe.some(
          (c: any) =>
            c?.isReady && Array.isArray(c.path) && c.path.includes(n.id)
        )
      );
    }

    return nodes;
  }, [nodeDrawData, filter, chainStatusFilter, graphData, nodeIdsInAnyChain, chainMetrics]);

  const filteredEdges = useMemo(() => {
    const edges = Array.isArray(graphData?.edges) ? graphData.edges : [];
    // Only show edges between filtered nodes
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [graphData, filteredNodes]);

  const staticMapUrl = useMemo(() => {
    const geoNodes = (filteredNodes.length ? filteredNodes : nodeDrawData).filter(
      (n: any) => n.lat !== undefined && n.lng !== undefined
    );
    if (geoNodes.length < 2) return null;
    const lats = geoNodes.map((n: any) => Number(n.lat));
    const lngs = geoNodes.map((n: any) => Number(n.lng));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    if (![minLat, maxLat, minLng, maxLng].every(Number.isFinite)) return null;
    const bbox = [minLng, minLat, maxLng, maxLat].join(',');
    return `https://staticmap.openstreetmap.de/staticmap.php?bbox=${bbox}&size=1200x800&maptype=mapnik`;
  }, [filteredNodes, nodeDrawData]);

  useEffect(() => {
    if (!staticMapUrl) {
      mapImageRef.current = null;
      setMapReady(false);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      mapImageRef.current = img;
      setMapReady(true);
    };
    img.onerror = () => {
      mapImageRef.current = null;
      setMapReady(false);
    };
    img.src = staticMapUrl;
  }, [staticMapUrl]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graphData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive Canvas
    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 600;

    // Clear
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (privacyMode === 'private' && mapReady && mapImageRef.current) {
      ctx.save();
      ctx.globalAlpha = theme === 'dark' ? 0.2 : 0.28;
      ctx.drawImage(mapImageRef.current, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Subtle Dot Grid
    ctx.save();
    ctx.translate(viewState.offset.x % (40 * viewState.scale), viewState.offset.y % (40 * viewState.scale));
    ctx.fillStyle = colors.grid;
    for (let i = -40; i < canvas.width + 40; i += 40 * viewState.scale) {
      for (let j = -40; j < canvas.height + 40; j += 40 * viewState.scale) {
        ctx.beginPath();
        ctx.arc(i, j, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Geographic density underlay (map-like layer)
    const geoNodes = filteredNodes.filter((n: any) => n.lat !== undefined && n.lng !== undefined);
    if (privacyMode === 'private' && geoNodes.length) {
      ctx.save();
      ctx.translate(viewState.offset.x, viewState.offset.y);
      ctx.scale(viewState.scale, viewState.scale);
      geoNodes.forEach((node: any) => {
        const x = node.drawX ?? node.x;
        const y = node.drawY ?? node.y;
        const gradient = ctx.createRadialGradient(x, y, 2, x, y, 32);
        gradient.addColorStop(0, 'rgba(34, 201, 138, 0.18)');
        gradient.addColorStop(1, 'rgba(34, 201, 138, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 32, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // Apply View Transform
    ctx.save();
    ctx.translate(viewState.offset.x, viewState.offset.y);
    ctx.scale(viewState.scale, viewState.scale);

    const showChainVisuals = filter === 'All';
    const chainsList = showChainVisuals && Array.isArray(graphData.chains) ? graphData.chains : [];
    const hasChainOverlay = chainsList.some(
      (c: any) => c && Array.isArray(c.path) && c.path.length >= 2
    );

    // Move chains — simple yellow connector lines
    chainsList.forEach((chain: any) => {
      if (!chain) return;
      const pathIds = Array.isArray(chain.path) ? chain.path : [];
      if (pathIds.length < 2) return;
      const isActive = activeChain?.id === chain.id;

      for (let i = 0; i < pathIds.length - 1; i++) {
        const pa = nodePosById.get(pathIds[i]);
        const pb = nodePosById.get(pathIds[i + 1]);
        if (!pa || !pb) continue;

        const bend = isActive ? 0.3 : 0.26;
        const { cpX, cpY } = chainArcControl(pa, pb, bend);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.quadraticCurveTo(cpX, cpY, pb.x, pb.y);
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = isActive ? 4.5 : 3;
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.stroke();
      }
    });

    // Focus Logic
    const focusedId = selectedNode?.id || hoveredNode?.id;
    const acPath: string[] = showChainVisuals ? (activeChain?.path || []) : [];
    const connectedEdges = focusedId ? filteredEdges.filter(e => e.source === focusedId || e.target === focusedId) : [];
    const connectedNodeIds = new Set([
      ...(focusedId ? [focusedId] : []),
      ...connectedEdges.map(e => e.source === focusedId ? e.target : e.source)
    ]);

    // Draw Edges (Pass 1: Secondary/Background)
    filteredEdges.forEach(edge => {
      const isFocused = (focusedId && (edge.source === focusedId || edge.target === focusedId)) ||
                       (activeChain && acPath.includes(edge.source) && acPath.includes(edge.target));
      
      if (isFocused) return; // Skip focused edges for now

      const source = filteredNodes.find(n => n.id === edge.source);
      const target = filteredNodes.find(n => n.id === edge.target);
      if (!source || !target) return;

      ctx.beginPath();
      const sx = source.drawX ?? source.x;
      const sy = source.drawY ?? source.y;
      const tx = target.drawX ?? target.x;
      const ty = target.drawY ?? target.y;
      const midX = (sx + tx) / 2;
      const midY = (sy + ty) / 2;
      const cpX = midX + (ty - sy) * 0.18;
      const cpY = midY - (tx - sx) * 0.18;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cpX, cpY, tx, ty);

      const isUserToUser = isUserHomeLike(source) && isUserHomeLike(target);
      const isUserToListing = isUserHomeLike(source) && (isPublicListing(target) || isOffMarketListing(target));
      ctx.strokeStyle = edge.type === 'DREAM' ? colors.pink : isUserToUser ? colors.amber : (isUserToListing ? colors.green : colors.blue);
      ctx.lineWidth = isUserToUser ? 1.1 : 0.8;
      ctx.globalAlpha = focusedId ? 0.04 : hasChainOverlay ? 0.06 : 0.14;
      if (edge.type === 'DREAM') ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw Edges (Pass 2: Global/Ready Chains)
    filteredEdges.forEach(edge => {
      const isFocusedChainEdge = activeChain &&
        acPath.indexOf(edge.source) !== -1 &&
        acPath.indexOf(edge.target) === acPath.indexOf(edge.source) + 1;

      const chainsArr = Array.isArray(graphData.chains) ? graphData.chains : [];
      const isAnyReadyChainEdge = chainsArr.some((c: any) => {
        if (!c?.isReady || !Array.isArray(c.path)) return false;
        const pi = c.path;
        return (
          pi.indexOf(edge.source) !== -1 &&
          pi.indexOf(edge.target) === pi.indexOf(edge.source) + 1
        );
      });

      if (!isFocusedChainEdge && !isAnyReadyChainEdge) return;

      const source = filteredNodes.find(n => n.id === edge.source);
      const target = filteredNodes.find(n => n.id === edge.target);
      if (!source || !target) return;

      ctx.beginPath();
      const sx = source.drawX ?? source.x;
      const sy = source.drawY ?? source.y;
      const tx = target.drawX ?? target.x;
      const ty = target.drawY ?? target.y;
      const midX = (sx + tx) / 2;
      const midY = (sy + ty) / 2;
      const cpX = midX + (ty - sy) * 0.18;
      const cpY = midY - (tx - sx) * 0.18;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cpX, cpY, tx, ty);

      if (isFocusedChainEdge) {
        ctx.strokeStyle = colors.amber;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 1;
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -offsetRef.current * 1.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = colors.amber;
      } else {
        ctx.strokeStyle = colors.amber;
        ctx.lineWidth = 2;
        ctx.globalAlpha = focusedId && !connectedNodeIds.has(edge.source) ? 0.2 : 0.6;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    });

    // Draw Edges (Pass 3: Direct User Selection/Hover Focus)
    if (focusedId) {
      connectedEdges.forEach(edge => {
        const source = filteredNodes.find(n => n.id === edge.source);
        const target = filteredNodes.find(n => n.id === edge.target);
        if (!source || !target) return;

        ctx.beginPath();
        const sx = source.drawX ?? source.x;
        const sy = source.drawY ?? source.y;
        const tx = target.drawX ?? target.x;
        const ty = target.drawY ?? target.y;
        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;
        const cpX = midX + (ty - sy) * 0.18;
        const cpY = midY - (tx - sx) * 0.18;
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cpX, cpY, tx, ty);

        ctx.strokeStyle = edge.type === 'DREAM' ? colors.pink : colors.blue;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 8;
        ctx.shadowColor = ctx.strokeStyle as string;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // "Shoot out" pulse particles along focused edges.
        const t = ((offsetRef.current % 100) / 100);
        const qx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cpX + t * t * tx;
        const qy = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cpY + t * t * ty;
        ctx.beginPath();
        ctx.arc(qx, qy, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = edge.type === 'DREAM' ? colors.pink : colors.amber;
        ctx.globalAlpha = 0.95;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }

    // Draw Nodes
    filteredNodes.forEach(node => {
      const isSelected = selectedNode && selectedNode.id === node.id;
      const isHovered = hoveredNode && hoveredNode.id === node.id;
      const isFocused = isSelected || isHovered;
      const isInNeighborhood = focusedId ? connectedNodeIds.has(node.id) : true;
      const isChainActive = showChainVisuals && activeChain && (activeChain.path || []).includes(node.id);
      
      const baseRadius = 8;
      let radius = baseRadius + (node.incomeCount || 0) * 1.5;
      if (isDreamLike(node)) {
        radius = node.dreamHomeSource === 'dream_anchor' ? 11 : 7;
      }
      if (isFocused) radius *= 1.2;

      ctx.save();
      ctx.translate(node.drawX ?? node.x, node.drawY ?? node.y);
      ctx.globalAlpha = (focusedId && !isInNeighborhood) ? 0.15 : 1;

      // Pulse for active entities
      if (isChainActive || isFocused) {
        ctx.beginPath();
        ctx.arc(0, 0, radius + 4 + Math.sin(offsetRef.current * 0.1) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = isChainActive ? colors.amber : colors.blue;
        ctx.lineWidth = 1;
        ctx.globalAlpha *= 0.4;
        ctx.stroke();
        ctx.globalAlpha /= 0.4;
      }

      // Node Shape
      ctx.beginPath();
      if (isUserHomeLike(node) || isPublicListing(node) || isOffMarketListing(node)) {
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
      } else if (isDreamLike(node)) {
        ctx.rotate(Math.PI / 4);
        ctx.rect(-radius, -radius, radius * 2, radius * 2);
      } else if (isBuyerLike(node)) {
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          ctx.lineTo(radius * 1.2 * Math.cos(angle), radius * 1.2 * Math.sin(angle));
        }
        ctx.closePath();
      }

      const color = isUserHomeLike(node)
        ? (chainMetrics.outgoingDreamSources.has(node.id) ? colors.gold : colors.blue)
        : (isPublicListing(node) || isOffMarketListing(node))
          ? (isOffMarketListing(node) ? '#2DD4BF' : colors.green)
          : isDreamLike(node)
            ? colors.pink
            : colors.amber;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = (theme === 'dark' && !isFocused) ? 'rgba(255,255,255,0.2)' : color;
      ctx.lineWidth = isFocused ? 2.5 : 1;
      ctx.stroke();

      // Labels: Semantic Zoom
      const showLabel = isFocused || (viewState.scale > 0.8) || (viewState.scale > 0.4 && isUserHomeLike(node));
      if (showLabel) {
        ctx.fillStyle = isFocused ? colors.text : colors.textMuted;
        ctx.font = `${isFocused ? 'bold' : ''} 10px ${theme === 'light' ? 'Inter, sans-serif' : 'Courier New'}`;
        ctx.textAlign = 'center';
        ctx.fillText(getMaskedLabel(node), 0, radius + 15);
      }

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(0, 0, radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
    });

    ctx.restore();
  }, [graphData, filteredNodes, filteredEdges, selectedNode, activeChain, filter, viewState, canvasRef, colors, theme, hoveredNode, privacyMode, chainMetrics, nodePosById]);

  // Main Draw Loop
  useEffect(() => {
    const loop = () => {
      offsetRef.current += 0.5;
      draw();
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [draw]);

  const handleClick = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    // Simple hit detection
    const hitNode = filteredNodes.find(node => {
      const dist = Math.hypot((node.drawX ?? node.x) - worldPos.x, (node.drawY ?? node.y) - worldPos.y);
      return dist < 20; // Hit radius
    });

    setSelectedNode(hitNode || null);
  };

  return (
    <div className="flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden canvas-grid">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        className="w-full h-full"
      />

      {/* Hardware-Style Instrument Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-40 items-end">
        <div className="flex flex-col bg-panel/30 backdrop-blur-2xl border border-white/5 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-black/20 group">
          <button 
            onClick={zoomIn}
            className="p-4 hover:bg-white/5 text-text/40 hover:text-blue-node transition-all active:scale-90"
            title="Increase Resolution (Zoom In)"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="mx-3 h-px bg-white/5" />
          <button 
            onClick={zoomOut}
            className="p-4 hover:bg-white/5 text-text/40 hover:text-blue-node transition-all active:scale-90"
            title="Decrease Resolution (Zoom Out)"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="mx-3 h-px bg-white/5" />
          <button 
            onClick={resetView}
            className="p-4 hover:bg-white/5 text-text/40 hover:text-white transition-all active:scale-90"
            title="Recenter Coordinate Map"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Scale Synchronizer */}
        <div className="px-4 py-2.5 bg-panel/30 backdrop-blur-2xl border border-white/5 rounded-full text-[9px] font-bold text-text/40 mono uppercase tracking-[0.25em] text-center shadow-2xl flex items-center gap-3 ring-1 ring-black/20">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-2 h-2 rounded-full bg-blue-node/40 animate-ping" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-blue-node" />
          </div>
          <span className="opacity-80">Zoom Factor:</span>
          <span className="text-text tracking-normal font-black">{Math.round(viewState.scale * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default NetworkCanvas;
