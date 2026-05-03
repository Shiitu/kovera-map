/**
 * @file frontend/src/components/DetailPanel.tsx
 * @description Detail panel with Kovera green design system.
 * Uses GET /analytics/network/node/{id} for live node data.
 */

import React, { useEffect, useState } from 'react';
import { useNetworkContext } from '../context/NetworkContext';
import { analyticsApi } from '../services/api';
import { Info, X, MapPin, Heart, ArrowDownLeft, ArrowUpRight, Link2 } from 'lucide-react';
import { motion } from 'motion/react';

const DetailPanel: React.FC = () => {
  const { selectedNode, setSelectedNode, detailsOpen, privacyMode } = useNetworkContext();
  const [nodeDetail, setNodeDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const panelWidth = 'min(88vw, 300px)';

  useEffect(() => {
    if (!selectedNode) {
      setNodeDetail(null);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await analyticsApi.getNodeDetail(selectedNode.id);
        // API returns node data at root level (not nested in .node)
        const detail = res.data.node || res.data;
        setNodeDetail({ ...selectedNode, ...detail });
      } catch (err) {
        console.error('Failed to fetch node details', err);
        setNodeDetail(selectedNode); // fallback to canvas data
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [selectedNode]);

  const displayNode = nodeDetail || selectedNode;

  // Format node type for display
  const formatType = (type: string) => {
    if (!type) return 'Unknown';
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };
  const isUserHomeNode = (node: any) => String(node?.type || '').toLowerCase() === 'user_home';

  const safeLabel = (value?: string) => {
    const raw = String(value || '').trim();
    if (!raw || raw.length <= 2) return 'Unknown';
    if (raw === raw.toUpperCase() && raw.length <= 3) return 'Unknown';
    return raw;
  };
  const getPrimaryDisplayName = (node: any) => {
    if (!node) return 'Unknown';
    if (isUserHomeNode(node)) return String(node.userId || node.uid || node.id || 'Unknown');
    return safeLabel(node.name || node.label);
  };

  return (
    <motion.div 
      initial={false}
      animate={{ 
        width: detailsOpen ? panelWidth : 0,
        opacity: detailsOpen ? 1 : 0,
        marginLeft: detailsOpen ? 0 : -20
      }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      className="bg-bg2/60 backdrop-blur-sm border-l border-border2 flex flex-col h-full overflow-hidden shrink-0"
    >
      <div className="w-[min(88vw,300px)] h-full flex flex-col">
        {!displayNode ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 bg-kovera/10 rounded-2xl flex items-center justify-center mb-4">
              <Info className="w-5 h-5 text-kovera/50" />
            </div>
            <div className="text-sm font-medium text-text2">Select a node</div>
            <p className="text-xs text-text3 mt-2 tracking-wide">to view network metadata</p>
          </div>
        ) : (
          <>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold leading-tight truncate max-w-[180px] text-text">
                    {loading ? 'Loading...' : getPrimaryDisplayName(displayNode)}
                  </h2>
                  <p className="text-[10px] text-text3 font-mono mt-1">id: {displayNode.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)} 
                  className="w-8 h-8 rounded-xl flex items-center justify-center border border-border2 text-text3 hover:text-pink-node hover:border-pink-node/30 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Entity Status */}
                <section>
                  <h4 className="text-[10px] uppercase text-text3 font-semibold mb-3 tracking-widest">
                    Entity Status
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="kovera-card p-3">
                      <div className="text-[10px] text-text3 font-mono">Type</div>
                      <div className="text-sm font-semibold text-kovera truncate">
                        {formatType(displayNode.type)}
                      </div>
                    </div>
                    <div className="kovera-card p-3">
                      <div className="text-[10px] text-text3 font-mono">Label</div>
                      <div className="text-sm font-semibold text-amber-node">
                        {safeLabel(displayNode.label) || '—'}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Address (from node detail API) */}
                {displayNode.address && privacyMode === 'private' && (
                  <section>
                    <h4 className="text-[10px] uppercase text-text3 font-semibold mb-2 tracking-widest flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> Address
                    </h4>
                    <div className="kovera-card p-3 text-xs text-text2 leading-relaxed">
                      {displayNode.address}
                    </div>
                  </section>
                )}

                {/* Network Metrics */}
                <section>
                  <h4 className="text-[10px] uppercase text-text3 font-semibold mb-3 tracking-widest">
                    Network Metrics
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text2 flex items-center gap-1.5">
                        <ArrowDownLeft className="w-3 h-3 text-kovera" />
                        Incoming Likes
                      </span>
                      <span className="text-xl font-bold font-mono text-kovera">
                        {displayNode.incomingLikes ?? displayNode.incomeCount ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text2 flex items-center gap-1.5">
                        <ArrowUpRight className="w-3 h-3 text-pink-node" />
                        Outgoing Likes
                      </span>
                      <span className="text-xl font-bold font-mono text-pink-node">
                        {displayNode.outgoingLikes ?? displayNode.outcomeCount ?? 0}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Dream Addresses (from node detail API) */}
                {Array.isArray(displayNode.dreamAddresses) && displayNode.dreamAddresses.length > 0 && (
                  <section>
                    <h4 className="text-[10px] uppercase text-text3 font-semibold mb-2 tracking-widest flex items-center gap-1.5">
                      <Heart className="w-3 h-3 text-pink-node" /> Dream Addresses
                    </h4>
                    <div className="space-y-1.5">
                      {displayNode.dreamAddresses.map((addr: string, i: number) => (
                        <div key={i} className="kovera-card p-2.5 text-[11px] text-text2 font-mono">
                          {addr}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Shared Address Group */}
                {displayNode.sharedAddressGroup && (
                  <section>
                    <h4 className="text-[10px] uppercase text-text3 font-semibold mb-2 tracking-widest">
                      Shared Address Group
                    </h4>
                    <div className="kovera-card p-2.5 text-[11px] text-text2 font-mono">
                      {displayNode.sharedAddressGroup}
                    </div>
                  </section>
                )}

                {/* Chain Membership (from node detail API) */}
                {Array.isArray(displayNode.inChains) && displayNode.inChains.length > 0 && (
                  <section>
                    <h4 className="text-[10px] uppercase text-text3 font-semibold mb-2 tracking-widest flex items-center gap-1.5">
                      <Link2 className="w-3 h-3 text-purple-node" /> Active Chains
                    </h4>
                    <div className="space-y-1.5">
                      {displayNode.inChains.map((chain: any, i: number) => (
                        <div key={i} className="kovera-card p-2.5 text-[11px] text-kovera font-mono font-semibold">
                          Chain #{i + 1} — {chain.type || 'Unknown'}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Chain Ready Status */}
                <section>
                  <div className="flex justify-between items-center border-t border-border2 pt-4">
                    <span className="text-xs text-text2">Chain Ready</span>
                    <span className={`text-sm font-bold font-mono px-3 py-1 rounded-full ${
                      (displayNode.incomingLikes > 0 || displayNode.incomeCount > 0) 
                        ? 'bg-kovera/20 text-kovera' 
                        : 'bg-white/5 text-text3'
                    }`}>
                      {(displayNode.incomingLikes > 0 || displayNode.incomeCount > 0) ? 'YES' : 'NO'}
                    </span>
                  </div>
                </section>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 bg-bg/40 border-t border-border2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-kovera/10 border border-kovera/20 flex items-center justify-center font-mono text-xs font-bold text-kovera">
                  {safeLabel(displayNode.label) || 'N'}
                </div>
                <div>
                  <div className="text-xs font-semibold text-text">
                    {isUserHomeNode(displayNode)
                      ? getPrimaryDisplayName(displayNode)
                      : (safeLabel(displayNode.name) || formatType(displayNode.type))}
                  </div>
                  <div className="text-[10px] text-text3 font-mono">
                    uid: {displayNode.userId || displayNode.uid || displayNode.id}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default DetailPanel;
