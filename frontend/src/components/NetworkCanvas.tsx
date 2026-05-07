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
const isBuyerLike = (node: any) => toNodeType(node) === 'pure_buyer';
const isOffMarketListing = (node: any) =>
  toNodeType(node) === 'pocket_listing' ||
  (toNodeType(node) === 'seeded_listing' && String(node.listingCategory || node.source || '').toLowerCase() === 'off_market');
const isPublicListing = (node: any) =>
  toNodeType(node) === 'public_listing' ||
  (toNodeType(node) === 'seeded_listing' && !isOffMarketListing(node));
const isDreamAnchor = (node: any) => ['dream_anchor', 'dream_address'].includes(toNodeType(node));

const markerColor = (node: any) => {
  if (isDreamAnchor(node)) return '#D4537E';
  if (isBuyerLike(node)) return '#BA7517';
  if (isOffMarketListing(node)) return '#2DD4BF';
  if (isPublicListing(node)) return '#22C98A';
  return '#378ADD';
};

const toEdgePair = (edge: any) => ({
  from: edge.source ?? edge.from,
  to: edge.target ?? edge.to,
  type: String(edge.type || '').toUpperCase(),
});

const FitBounds: React.FC<{ points: LatLngExpression[] }> = ({ points }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!points.length) return;
    map.fitBounds(points as any, { padding: [32, 32] });
  }, [map, points]);

  return null;
};

const percentile = (arr: number[], p: number) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
};

const NetworkCanvas: React.FC = () => {
  const { graphData, filter, selectedNode, setSelectedNode, theme, activeChain } = useNetworkContext();

  const nodesWithCoords = useMemo(() => {
    const nodes = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
    return nodes.filter(
      (n: any) => Number.isFinite(Number(n.lat)) && Number.isFinite(Number(n.lng))
    );
  }, [graphData]);

  const filteredNodes = useMemo(() => {
    if (filter === 'User Homes') return nodesWithCoords.filter(isUserHomeLike);
    if (filter === 'Public Listings') return nodesWithCoords.filter(isPublicListing);
    if (filter === 'Off-Market Properties') return nodesWithCoords.filter(isOffMarketListing);
    if (filter === 'Pure Buyers') return nodesWithCoords.filter(isBuyerLike);
    if (filter === 'Dream Anchors') return nodesWithCoords.filter(isDreamAnchor);
    return nodesWithCoords;
  }, [nodesWithCoords, filter]);

  const adjustedNodes = useMemo(() => {
    const grouped = new Map<string, any[]>();
    filteredNodes.forEach((node: any) => {
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
  }, [filteredNodes]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, any>();
    adjustedNodes.forEach((n: any) => map.set(n.id, n));
    return map;
  }, [adjustedNodes]);

  const filteredEdges = useMemo(() => {
    const edges = Array.isArray(graphData?.edges) ? graphData.edges : [];
    return edges
      .map(toEdgePair)
      .filter((e: any) => nodeMap.has(e.from) && nodeMap.has(e.to));
  }, [graphData, nodeMap]);

  const chainSegments = useMemo(() => {
    const chains = Array.isArray(graphData?.chains) ? graphData.chains : [];
    const segments: Array<{ id: string; points: LatLngExpression[]; active: boolean; ready: boolean }> = [];

    chains.forEach((chain: any, idx: number) => {
      const path = Array.isArray(chain?.path) ? chain.path : [];
      if (path.length < 2) return;

      const chainId = String(chain?.id || `chain-${idx}`);
      const points = path
        .map((nodeId: string) => nodeMap.get(nodeId))
        .filter(Boolean)
        .map((node: any) => [Number(node.renderLat ?? node.lat), Number(node.renderLng ?? node.lng)] as LatLngExpression);

      if (points.length < 2) return;
      segments.push({
        id: chainId,
        points,
        active: activeChain?.id === chainId,
        ready: Boolean(chain?.isReady),
      });
    });

    return segments;
  }, [graphData, nodeMap, activeChain]);

  const markerIcons = useMemo(() => {
    const map = new Map<string, DivIcon>();
    adjustedNodes.forEach((node: any) => {
      const isSelected = selectedNode?.id === node.id;
      const color = markerColor(node);
      const size = isSelected ? 16 : 12;
      map.set(
        node.id,
        L.divIcon({
          className: 'kovera-node-icon',
          html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #fff;border-radius:9999px;"></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })
      );
    });
    return map;
  }, [adjustedNodes, selectedNode]);

  const center: LatLngExpression = useMemo(() => {
    if (!adjustedNodes.length) return [0, 0];
    return [
      Number(adjustedNodes[0].renderLat ?? adjustedNodes[0].lat),
      Number(adjustedNodes[0].renderLng ?? adjustedNodes[0].lng),
    ];
  }, [adjustedNodes]);

  const boundPoints: LatLngExpression[] = useMemo(
    () =>
      adjustedNodes.map(
        (node: any) => [Number(node.renderLat ?? node.lat), Number(node.renderLng ?? node.lng)] as LatLngExpression
      ),
    [adjustedNodes]
  );

  const focusBoundPoints: LatLngExpression[] = useMemo(() => {
    if (!adjustedNodes.length) return [];
    if (adjustedNodes.length <= 50) return boundPoints;
    const latitudes = adjustedNodes.map((node: any) => Number(node.renderLat ?? node.lat));
    const longitudes = adjustedNodes.map((node: any) => Number(node.renderLng ?? node.lng));
    const latLow = percentile(latitudes, 0.05);
    const latHigh = percentile(latitudes, 0.95);
    const lngLow = percentile(longitudes, 0.05);
    const lngHigh = percentile(longitudes, 0.95);
    const focused = adjustedNodes
      .filter((node: any) => {
        const lat = Number(node.renderLat ?? node.lat);
        const lng = Number(node.renderLng ?? node.lng);
        return lat >= latLow && lat <= latHigh && lng >= lngLow && lng <= lngHigh;
      })
      .map((node: any) => [Number(node.renderLat ?? node.lat), Number(node.renderLng ?? node.lng)] as LatLngExpression);
    return focused.length > 5 ? focused : boundPoints;
  }, [adjustedNodes, boundPoints]);

  if (!adjustedNodes.length) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg text-text2 text-sm">
        No geo nodes found for current filters.
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      <div className="absolute top-3 left-3 z-1000 bg-bg2/90 text-text px-3 py-1.5 rounded-lg border border-border2 text-xs">
        Showing {adjustedNodes.length} / {nodesWithCoords.length} geo nodes
      </div>
      <MapContainer
        center={center}
        zoom={12}
        className="w-full h-full"
        zoomControl
      >
        <FitBounds points={focusBoundPoints} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={
            theme === 'dark'
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
        />

        {filteredEdges.map((edge: any, index: number) => {
          const fromNode = nodeMap.get(edge.from);
          const toNode = nodeMap.get(edge.to);
          if (!fromNode || !toNode) return null;

          return (
            <Polyline
              key={`${edge.from}-${edge.to}-${index}`}
              positions={[
                { lat: Number(fromNode.lat), lng: Number(fromNode.lng) },
                { lat: Number(toNode.lat), lng: Number(toNode.lng) },
              ]}
              pathOptions={{
                color: edge.type === 'DREAM' ? '#D4537E' : '#378ADD',
                opacity: 0.7,
                weight: edge.type === 'DREAM' ? 3 : 2,
                dashArray: edge.type === 'DREAM' ? '6 6' : undefined,
              }}
            />
          );
        })}

        {chainSegments.map((chain) => (
          <Polyline
            key={`chain-${chain.id}`}
            positions={chain.points}
            pathOptions={{
              color: chain.active ? '#FACC15' : chain.ready ? '#22C98A' : '#EAB308',
              opacity: chain.active ? 1 : chain.ready ? 0.9 : 0.6,
              weight: chain.active ? 5 : chain.ready ? 3.5 : 2.5,
              dashArray: chain.active ? undefined : '8 6',
            }}
          />
        ))}

        {adjustedNodes.map((node: any) => {
          return (
            <Marker
              key={node.id}
              position={{ lat: Number(node.renderLat ?? node.lat), lng: Number(node.renderLng ?? node.lng) }}
              eventHandlers={{
                click: () => setSelectedNode(node),
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
