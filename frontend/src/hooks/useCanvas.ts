/**
 * @file frontend/src/hooks/useCanvas.ts
 * @description Hook for canvas interactions: pan, zoom, and hit detection.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface ViewState {
  offset: { x: number; y: number };
  scale: number;
}

export function useCanvas() {
  const [viewState, setViewState] = useState<ViewState>({
    offset: { x: 0, y: 0 },
    scale: 1,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;

    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    setViewState(prev => ({
      ...prev,
      offset: {
        x: prev.offset.x + dx,
        y: prev.offset.y + dy,
      }
    }));

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const zoomIntensity = 0.001;
    const delta = -e.deltaY;
    const newScale = Math.max(0.1, Math.min(5, viewState.scale + delta * zoomIntensity));
    
    setViewState(prev => ({
      ...prev,
      scale: newScale
    }));
  }, [viewState.scale]);

  // Transform coordinates from Screen to World space
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: (screenX - rect.left - viewState.offset.x) / viewState.scale,
      y: (screenY - rect.top - viewState.offset.y) / viewState.scale,
    };
  }, [viewState]);

  const zoomIn = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      scale: Math.min(5, prev.scale * 1.2)
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      scale: Math.max(0.1, prev.scale / 1.2)
    }));
  }, []);

  const resetView = useCallback(() => {
    setViewState({
      offset: { x: 0, y: 0 },
      scale: 1,
    });
  }, []);

  return {
    canvasRef,
    viewState,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    screenToWorld,
    setViewState,
    zoomIn,
    zoomOut,
    resetView
  };
}
