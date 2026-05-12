/**
 * @file frontend/src/components/NetworkCanvas.tsx
 * @description OpenStreetMap (Leaflet) renderer for the Kovera Network Map.
 */

import React, { useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L, { type DivIcon, type LatLngExpression } from 'leaflet';
import { useNetworkContext } from '../context/NetworkContext';

const toNodeType = (node: any) => String(node.type || '').toLowerCase();
const isUserHomeLike = (node: any) => ['user_home', 'swapper', 'pure_seller'].includes(toNodeType(node));
const isSwapperNode = (node: any) =>
  toNodeType(node) === 'swapper' ||
  (toNodeType(node) === 'user_home' && String(node.personType || '').toLowerCase() === 'swapper');
const isPureSellerNode = (node: any) =>
  toNodeType(node) === 'pure_seller' ||
  (toNodeType(node) === 'user_home' && String(node.personType || '').toLowerCase() === 'pure_seller');
const isBuyerLike = (node: any) => toNodeType(node) === 'pure_buyer';
const isPocketListing = (node: any) => toNodeType(node) === 'pocket_listing';
const isOffMarketListing = (node: any) =>
  (toNodeType(node) === 'seeded_listing' && String(node.listingCategory || node.source || '').toLowerCase() === 'off_market');
const isPublicListing = (node: any) =>
  toNodeType(node) === 'public_listing' ||
  (toNodeType(node) === 'seeded_listing' && !isOffMarketListing(node) && !isPocketListing(node));
const isDreamAnchor = (node: any) => ['dream_anchor', 'dream_address'].includes(toNodeType(node));

const markerColor = (node: any) => {
  if (isDreamAnchor(node)) return '#D4537E';
  if (isBuyerLike(node)) return '#BA7517';
  if (isPocketListing(node)) return '#A855F7';
  if (isOffMarketListing(node)) return '#14B8A6';
  if (isPublicListing(node)) return '#22C98A';
  return '#378ADD';
};

const toEdgePair = (edge: any) => ({
  from: edge.source ?? edge.from,
  to: edge.target ?? edge.to,
  type: String(edge.type || '').toUpperCase(),
});

const FitBounds: React.FC<{ points: LatLngExpression[]; maxZoom?: number }> = ({ points, maxZoom }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!points.length) return;
    map.fitBounds(points as any, { padding: [32, 32], maxZoom: maxZoom ?? 12 });
  }, [map, points, maxZoom]);

  return null;
};

const percentile = (arr: number[], p: number) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
};

/** Jitter overlapping pins (same lat/lng) for readability. */
function spreadNodesByCoord(nodes: any[]): any[] {
  const grouped = new Map<string, any[]>();
  nodes.forEach((node: any) => {
    const key = `${Number(node.lat).toFixed(6)}:${Number(node.lng).toFixed(6)}`;
    const list = grouped.get(key) || [];
    list.push(node);
    grouped.set(key, list);
  });
  const spread: any[] = [];
  grouped.forEach((list) => {
    if (list.length === 1) {
      spread.push(list[0]);
      return;
    }
    list.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / list.length;
      const radius = 0.00022 + Math.floor(index / 12) * 0.0001;
      spread.push({
        ...node,
        renderLat: Number(node.lat) + Math.sin(angle) * radius,
        renderLng: Number(node.lng) + Math.cos(angle) * radius,
      });
    });
  });
  return spread;
}

const NetworkCanvas: React.FC = () => {
  const { graphData, filter, selectedNode, setSelectedNode, theme, activeChain, setActiveChain } = useNetworkContext();

  const nodesWithCoords = useMemo(() => {
    const nodes = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
    return nodes.filter(
      (n: any) =>
        Number.isFinite(Number(n.lat)) &&
        Number.isFinite(Number(n.lng)) &&
        n.isInternal !== true &&
        n.internal !== true
    );
  }, [graphData]);

  /** All geocoded graph nodes — used so chain polylines still resolve when the node-type filter hides pins. */
  const fullGeoNodeById = useMemo(() => {
    const m = new Map<string, any>();
    for (const n of nodesWithCoords) {
      if (n?.id != null) m.set(String(n.id), n);
    }
    return m;
  }, [nodesWithCoords]);

  const filteredNodes = useMemo(() => {
    if (filter === 'User Homes') return nodesWithCoords.filter(isUserHomeLike);
    if (filter === 'Public Listings') return nodesWithCoords.filter(isPublicListing);
    if (filter === 'Off-Market Properties') return nodesWithCoords.filter((n: any) => isOffMarketListing(n) || isPocketListing(n));
    if (filter === 'Pure Buyers') return nodesWithCoords.filter(isBuyerLike);
    if (filter === 'Swappers') return nodesWithCoords.filter(isSwapperNode);
    if (filter === 'Pure Sellers') return nodesWithCoords.filter(isPureSellerNode);
    if (filter === 'Dream Anchors') return nodesWithCoords.filter(isDreamAnchor);
    return nodesWithCoords;
  }, [nodesWithCoords, filter]);

  const adjustedNodes = useMemo(() => spreadNodesByCoord(filteredNodes), [filteredNodes]);

  /** Chain selected in sidebar: only those path nodes as pins (plus the chain line). */
  const displayNodes = useMemo(() => {
    if (!activeChain?.id || !Array.isArray(activeChain.path) || !activeChain.path.length) {
      return adjustedNodes;
    }
    const raw = activeChain.path
      .map((id: string) => fullGeoNodeById.get(String(id)))
      .filter(Boolean) as any[];
    if (!raw.length) return [];
    return spreadNodesByCoord(raw.map((n) => ({ ...n })));
  }, [activeChain, fullGeoNodeById, adjustedNodes]);

  const chainOnlyView = Boolean(activeChain?.id && displayNodes.length > 0);

  const nodeMap = useMemo(() => {
    const map = new Map<string, any>();
    adjustedNodes.forEach((n: any) => map.set(n.id, n));
    return map;
  }, [adjustedNodes]);

  const filteredEdges = useMemo(() => {
    const edges = Array.isArray(graphData?.edges) ? graphData.edges : [];
    const normalizeType = (value: string) => value.toLowerCase();
    return edges
      .map(toEdgePair)
      .filter((e: any) => nodeMap.has(e.from) && nodeMap.has(e.to))
      .filter((e: any) => e.from !== e.to)
      .filter((e: any) => {
        const sourceNode = nodeMap.get(e.from);
        if (!sourceNode) return false;
        // Pure buyers should not visually show house-like/discovery likes.
        if (isBuyerLike(sourceNode) && normalizeType(e.type) !== 'dream') return false;
        return true;
      });
  }, [graphData, nodeMap]);

  const chainSegments = useMemo(() => {
    const chains = Array.isArray(graphData?.chains) ? graphData.chains : [];
    const segments: Array<{ id: string; points: LatLngExpression[]; active: boolean; ready: boolean }> = [];

    const resolveNode = (nodeId: string) => {
      const fromFilter = nodeMap.get(nodeId);
      if (fromFilter) return fromFilter;
      return fullGeoNodeById.get(nodeId);
    };

    chains.forEach((chain: any, idx: number) => {
      const path = Array.isArray(chain?.path) ? chain.path : [];
      if (path.length < 2) return;

      const chainId = String(chain?.id || `chain-${idx}`);
      const points = path
        .map((nodeId: string) => {
          const n = resolveNode(nodeId);
          if (!n) return null;
          return [Number(n.renderLat ?? n.lat), Number(n.renderLng ?? n.lng)] as LatLngExpression;
        })
        .filter((p): p is LatLngExpression => p != null);

      if (points.length < 2) return;
      segments.push({
        id: chainId,
        points,
        active: activeChain?.id === chainId,
        ready: Boolean(chain?.isReady),
      });
    });

    return segments;
  }, [graphData, nodeMap, fullGeoNodeById, activeChain]);

  /** When a chain is selected in the list, draw only that chain on the map. */
  const visibleChainSegments = useMemo(() => {
    if (!activeChain?.id) return chainSegments;
    return chainSegments.filter((c) => c.id === activeChain.id);
  }, [chainSegments, activeChain]);

  const markerIcons = useMemo(() => {
    const map = new Map<string, DivIcon>();
    displayNodes.forEach((node: any) => {
      const isSelected = selectedNode?.id === node.id;
      const color = markerColor(node);
      const size = isSelected ? 16 : 12;
      map.set(
        node.id,
        L.divIcon({
          className: 'kovera-node-icon',
          html: isDreamAnchor(node)
            ? `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #fff;transform:rotate(45deg);"></div>`
            : `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #fff;border-radius:9999px;"></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })
      );
    });
    return map;
  }, [displayNodes, selectedNode]);

  const center: LatLngExpression = useMemo(() => {
    if (!displayNodes.length) return [0, 0];
    return [
      Number(displayNodes[0].renderLat ?? displayNodes[0].lat),
      Number(displayNodes[0].renderLng ?? displayNodes[0].lng),
    ];
  }, [displayNodes]);

  const boundPoints: LatLngExpression[] = useMemo(
    () =>
      displayNodes.map(
        (node: any) => [Number(node.renderLat ?? node.lat), Number(node.renderLng ?? node.lng)] as LatLngExpression
      ),
    [displayNodes]
  );

  const focusBoundPoints: LatLngExpression[] = useMemo(() => {
    if (!displayNodes.length) return [];
    if (displayNodes.length <= 50) return boundPoints;
    const latitudes = displayNodes.map((node: any) => Number(node.renderLat ?? node.lat));
    const longitudes = displayNodes.map((node: any) => Number(node.renderLng ?? node.lng));
    const latLow = percentile(latitudes, 0.05);
    const latHigh = percentile(latitudes, 0.95);
    const lngLow = percentile(longitudes, 0.05);
    const lngHigh = percentile(longitudes, 0.95);
    const focused = displayNodes
      .filter((node: any) => {
        const lat = Number(node.renderLat ?? node.lat);
        const lng = Number(node.renderLng ?? node.lng);
        return lat >= latLow && lat <= latHigh && lng >= lngLow && lng <= lngHigh;
      })
      .map((node: any) => [Number(node.renderLat ?? node.lat), Number(node.renderLng ?? node.lng)] as LatLngExpression);
    return focused.length > 5 ? focused : boundPoints;
  }, [displayNodes, boundPoints]);

  const displayNodeById = useMemo(() => {
    const m = new Map<string, any>();
    displayNodes.forEach((n: any) => m.set(String(n.id), n));
    return m;
  }, [displayNodes]);

  const mapFitPoints = useMemo(() => {
    if (!activeChain?.path?.length) return focusBoundPoints;
    const pts: LatLngExpression[] = [];
    for (const nodeId of activeChain.path) {
      const id = String(nodeId);
      const n = displayNodeById.get(id) || nodeMap.get(id) || fullGeoNodeById.get(id);
      if (!n) continue;
      pts.push([Number(n.renderLat ?? n.lat), Number(n.renderLng ?? n.lng)] as LatLngExpression);
    }
    return pts.length >= 2 ? pts : focusBoundPoints;
  }, [activeChain, displayNodeById, nodeMap, fullGeoNodeById, focusBoundPoints]);

  if (!displayNodes.length) {
    const hasAnyGeo = nodesWithCoords.length > 0;
    const emptyLabel = activeChain?.id
      ? 'No coordinates on the map for this chain path.'
      : hasAnyGeo
        ? 'No nodes of this type on the map.'
        : 'No geocoded nodes yet.';
    return (
      <div className="flex-1 flex items-center justify-center bg-bg text-text2 text-sm px-6 text-center">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      <div className="absolute top-3 left-3 z-1000 bg-bg2/90 text-text px-3 py-1.5 rounded-lg border border-border2 text-xs max-w-[min(90vw,320px)]">
        {chainOnlyView
          ? `Chain: ${activeChain?.id} · ${displayNodes.length} pin${displayNodes.length === 1 ? '' : 's'}`
          : `Showing ${adjustedNodes.length} / ${nodesWithCoords.length} geo nodes`}
      </div>
      <MapContainer
        center={center}
        zoom={12}
        className="w-full h-full"
        zoomControl
      >
        <FitBounds
          points={mapFitPoints}
          maxZoom={activeChain?.path?.length >= 2 ? 14 : undefined}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={
            theme === 'dark'
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
        />

        {!activeChain?.id &&
          filteredEdges.map((edge: any, index: number) => {
          const fromNode = nodeMap.get(edge.from);
          const toNode = nodeMap.get(edge.to);
          if (!fromNode || !toNode) return null;
          const edgeType = String(edge.type || '').toLowerCase();
          const isUserToUser = isUserHomeLike(fromNode) && isUserHomeLike(toNode);
          const strokeColor =
            edgeType === 'dream'
              ? '#D4537E'
              : isUserToUser
                ? '#F59E0B'
                : '#378ADD';

          return (
            <Polyline
              key={`${edge.from}-${edge.to}-${index}`}
              positions={[
                { lat: Number(fromNode.lat), lng: Number(fromNode.lng) },
                { lat: Number(toNode.lat), lng: Number(toNode.lng) },
              ]}
              pathOptions={{
                color: strokeColor,
                opacity: 0.7,
                weight: edgeType === 'dream' ? 3 : isUserToUser ? 2.8 : 2.2,
                dashArray: edgeType === 'dream' ? '6 6' : undefined,
              }}
            />
          );
        })}

        {visibleChainSegments
          .filter((c) => !c.active)
          .map((chain) => (
            <Polyline
              key={`chain-${chain.id}`}
              positions={chain.points}
              pathOptions={{
                color: chain.ready ? '#22C98A' : '#EAB308',
                opacity: chain.ready ? 0.9 : 0.6,
                weight: chain.ready ? 3.5 : 2.5,
                dashArray: '8 6',
              }}
            />
          ))}
        {visibleChainSegments
          .filter((c) => c.active)
          .map((chain) => (
            <Polyline
              key={`chain-${chain.id}-active`}
              positions={chain.points}
              pathOptions={{
                color: '#FACC15',
                opacity: 1,
                weight: 6,
              }}
            />
          ))}

        {displayNodes.map((node: any) => {
          return (
            <Marker
              key={node.id}
              position={{ lat: Number(node.renderLat ?? node.lat), lng: Number(node.renderLng ?? node.lng) }}
              eventHandlers={{
                click: () => {
                  setActiveChain(null);
                  setSelectedNode(node);
                },
              }}
              icon={markerIcons.get(node.id)}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <div className="text-xs">
                  <div className="font-semibold">{node.label || node.name || node.id}</div>
                  <div>{node.address || 'No address'}</div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default NetworkCanvas;
