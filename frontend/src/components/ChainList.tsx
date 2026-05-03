/**
 * @file frontend/src/components/ChainList.tsx
 * @description Chain list with Kovera green design system.
 */

import React from 'react';
import { useNetworkContext } from '../context/NetworkContext';

const ChainList: React.FC = () => {
  const { graphData, activeChain, setActiveChain } = useNetworkContext();

  const chains = Array.isArray(graphData?.chains) ? graphData.chains.filter(Boolean) : [];

  if (!chains.length) {
    return <div className="text-[10px] text-text3 italic py-2">No chains detected.</div>;
  }

  return (
    <div className="space-y-2 pt-1">
      {chains.map((chain, idx) => {
        const cid = chain.id || `chain-${idx}`;
        const mappedLen = Array.isArray(chain.path) ? chain.path.length : 0;
        const ord = Array.isArray(chain.orderedPath) ? chain.orderedPath : [];
        const pathLen = mappedLen || ord.length || 0;
        const score = typeof chain.readinessScore === 'number' ? chain.readinessScore : chain.score;
        return (
        <div 
          key={cid}
          onClick={() => setActiveChain(activeChain?.id === cid ? null : chain)}
          className={`p-3 rounded-xl transition-all cursor-pointer group ${
            activeChain?.id === cid 
              ? 'border border-kovera bg-kovera/10 shadow-lg shadow-kovera/5' 
              : chain.isReady 
                ? 'border border-kovera/20 bg-kovera/5 hover:border-kovera/40' 
                : 'border border-border2 bg-card/50 opacity-60 hover:opacity-80'
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-[10px] font-bold font-mono truncate max-w-[140px] ${chain.isReady ? 'text-kovera' : 'text-text3'}`}>
              {cid}
            </span>
            {chain.isReady && (
              <span className="text-[9px] px-1.5 py-0.5 bg-kovera/20 text-kovera rounded-full font-semibold shrink-0">READY</span>
            )}
          </div>
          <div className="text-[10px] text-text3 uppercase tracking-wide mb-1">
            {chain.chainType || 'chain'} · {pathLen} nodes (mapped {mappedLen})
          </div>
          
          <div className="text-xs font-semibold mb-2 text-text2">
            Move path on map
          </div>

          {(chain.isReady || typeof score === 'number') && (
            <div className="w-full bg-bg h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-kovera to-kovera-light h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.round((score ?? 0) * 100))}%` }} 
              />
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
};

export default ChainList;
