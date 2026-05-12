/**
 * @file frontend/src/components/Legend.tsx
 * @description Network graph legend with Kovera design system.
 */

import React from 'react';
import { useNetworkContext } from '../context/NetworkContext';

const Legend: React.FC = () => {
  const { activeChain } = useNetworkContext();
  if (activeChain?.id) return null;

  return (
    <div className="absolute bottom-6 left-6 p-4 rounded-2xl backdrop-blur-xl bg-card/60 border border-border2 z-1200 pointer-events-none shadow-2xl">
      <div className="mb-3">
        <h4 className="text-[9px] uppercase font-semibold tracking-[0.2em] text-text3 mb-2.5">Entities</h4>
        <div className="grid grid-cols-2 gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-node shadow-[0_0_6px_rgba(55,138,221,0.4)]" />
            <span className="text-[10px] text-text3 font-mono">Home</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-kovera shadow-[0_0_6px_rgba(34,201,138,0.4)]" />
            <span className="text-[10px] text-text3 font-mono">Public Listing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-pink-node rotate-45 border border-dashed border-white/20" />
            <span className="text-[10px] text-text3 font-mono">Dream Anchor</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <div className="w-2 h-2 border border-dashed border-amber-node rounded-full" />
            <span className="text-[10px] text-text3 font-mono">Potential Buyer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(20,184,166,0.45)]" />
            <span className="text-[10px] text-text3 font-mono">Off-Market</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.45)]" />
            <span className="text-[10px] text-text3 font-mono">Pocket Listing</span>
          </div>
        </div>
      </div>
      
      <div className="border-t border-border2 pt-3">
        <h4 className="text-[9px] uppercase font-semibold tracking-[0.2em] text-text3 mb-2.5">Topology</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-5 h-px bg-blue-node/60" />
            <span className="text-[9px] uppercase text-text3 font-mono tracking-wider">User-to-Listing</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-[1.5px] bg-amber-node/80" />
            <span className="text-[9px] uppercase text-text3 font-mono tracking-wider">User-to-User</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-[1.5px] border-t-2 border-dashed border-pink-node" />
            <span className="text-[9px] uppercase text-text3 font-mono tracking-wider">Dream Link</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Legend;
