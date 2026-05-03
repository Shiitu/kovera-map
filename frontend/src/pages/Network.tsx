/**
 * @file frontend/src/pages/Network.tsx
 */

import React from 'react';
import { useNetworkContext } from '../context/NetworkContext';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import DetailPanel from '../components/DetailPanel';
import NetworkCanvas from '../components/NetworkCanvas';
import Legend from '../components/Legend';
import { Link } from 'react-router-dom';
import { Settings, Zap } from 'lucide-react';

const NetworkPortal: React.FC = () => {
  const { isAdmin, loading, error } = useNetworkContext();

  return (
    <div className="h-screen flex flex-col bg-bg text-text overflow-hidden">
      <TopBar />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 relative flex flex-col border-r border-border2 overflow-hidden">
          {/* Admin Navigation */}
          {isAdmin && (
            <Link 
              to="/admin" 
              className="absolute top-4 right-4 z-40 p-2.5 bg-bg2/80 backdrop-blur-sm border border-border2 rounded-xl text-text3 hover:text-kovera hover:border-kovera/30 transition-all"
              title="Admin Control"
            >
              <Settings className="w-4 h-4" />
            </Link>
          )}

          <NetworkCanvas />
          <Legend />

          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 bg-bg/50 backdrop-blur-[2px] flex items-center justify-center z-50 pointer-events-none">
              <div className="kovera-card px-6 py-4 flex items-center gap-4 shadow-2xl">
                <div className="w-4 h-4 border-2 border-kovera border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium uppercase tracking-widest text-text2">Syncing Network…</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50">
              <div className="kovera-card border-pink-node/20 px-4 py-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-pink-node rounded-full animate-pulse" />
                <span className="text-[10px] text-pink-node font-mono">{error.toUpperCase()}</span>
              </div>
            </div>
          )}
        </main>

        <DetailPanel />
      </div>
    </div>
  );
};

export default NetworkPortal;
