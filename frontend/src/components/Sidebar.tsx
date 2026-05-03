/**
 * @file frontend/src/components/Sidebar.tsx
 * @description Sidebar: Chain Status + grouped Node Filters, Chain List, admin actions.
 */

import React from 'react';
import { useNetworkContext } from '../context/NetworkContext';
import ChainList from './ChainList';
import { motion } from 'motion/react';
import {
  Home,
  Building2,
  Landmark,
  UserCheck,
  Repeat,
  RotateCw,
  Layers,
  Clock,
  Zap
} from 'lucide-react';

type FilterRow = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; color: string };

const Sidebar: React.FC = () => {
  const {
    filter,
    setFilter,
    graphData,
    networkStats,
    sidebarOpen,
    refreshGeocode,
    refreshing,
    isAdmin,
    chainStatusFilter,
    setChainStatusFilter
  } = useNetworkContext();
  const panelWidth = 'min(85vw, 250px)';

  const chainStatusOptions: {
    value: 0 | 1 | 2 | 3;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }[] = [
    { value: 0, label: 'All', icon: Layers, color: 'bg-kovera' },
    { value: 2, label: 'Chains idle', icon: Clock, color: 'bg-amber-node' },
    { value: 3, label: 'Actively pursuing', icon: Zap, color: 'bg-purple-node' }
  ];

  const filterAll: FilterRow = { key: 'All', label: 'All Nodes', icon: Home, color: 'bg-kovera' };

  const groupProperty: FilterRow[] = [
    { key: 'User Homes', label: 'User Homes', icon: Home, color: 'bg-blue-node' },
    { key: 'Public Listings', label: 'Public Listings', icon: Building2, color: 'bg-green-500' },
    { key: 'Off-Market Properties', label: 'Off-Market/Pocket', icon: Landmark, color: 'bg-emerald-300' }
  ];

  const groupPeople: FilterRow[] = [
    { key: 'Pure Buyers', label: 'Pure Buyers', icon: UserCheck, color: 'bg-amber-node' },
    { key: 'Swappers', label: 'Swappers', icon: Repeat, color: 'bg-purple-node' },
    { key: 'Pure Sellers', label: 'Pure Sellers', icon: Home, color: 'bg-cyan-400' },
    { key: 'Dream Anchors', label: 'Dream Anchors', icon: Landmark, color: 'bg-pink-node' }
  ];

  const getCount = (key: string): string | number => {
    const list = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
    if (!list.length && key !== 'All') return '—';
    const t = (n: any) => String(n.type || '').toLowerCase();
    switch (key) {
      case 'All':
        return networkStats?.nodes?.total ?? list.length;
      case 'User Homes':
        return networkStats?.nodes?.userHome ?? list.filter(n => ['user_home', 'swapper', 'pure_seller'].includes(t(n))).length;
      case 'Public Listings':
        return list.filter(n => t(n) === 'public_listing' || (t(n) === 'seeded_listing' && String(n.listingCategory || n.source || '').toLowerCase() !== 'off_market')).length;
      case 'Off-Market Properties':
        return list.filter(n => t(n) === 'pocket_listing' || (t(n) === 'seeded_listing' && String(n.listingCategory || n.source || '').toLowerCase() === 'off_market')).length;
      case 'Pure Buyers':
        return networkStats?.nodes?.pureBuyer ?? list.filter(n => t(n) === 'pure_buyer').length;
      case 'Swappers':
        return list.filter(n => t(n) === 'swapper' || (t(n) === 'user_home' && n.personType === 'swapper')).length;
      case 'Pure Sellers':
        return list.filter(n => t(n) === 'pure_seller' || (t(n) === 'user_home' && n.personType === 'pure_seller')).length;
      case 'Dream Anchors':
        return list.filter(n => t(n) === 'dream_anchor' || (t(n) === 'dream_address' && n.dreamHomeSource === 'dream_anchor')).length;
      default:
        return '—';
    }
  };

  const filterButtonClass = (selected: boolean) =>
    `w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
      selected
        ? 'bg-kovera/10 border border-kovera/30 text-kovera font-medium'
        : 'text-text2 hover:bg-white/3 border border-transparent'
    }`;

  const renderFilterRow = (f: FilterRow) => {
    const Icon = f.icon;
    const count = getCount(f.key);
    return (
      <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={filterButtonClass(filter === f.key)}>
        <span className="flex items-center gap-2.5 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${f.color}`} />
          <Icon className="w-3.5 h-3.5 opacity-60 shrink-0" />
          <span className="truncate text-left">{f.label}</span>
        </span>
        <span className="font-mono text-[10px] text-text3 tabular-nums shrink-0">{count}</span>
      </button>
    );
  };

  return (
    <motion.div
      initial={false}
      animate={{
        width: sidebarOpen ? panelWidth : 0,
        opacity: sidebarOpen ? 1 : 0,
        marginRight: sidebarOpen ? 0 : -20
      }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      className="bg-bg2/60 backdrop-blur-sm border-r border-border2 flex flex-col h-full overflow-hidden shrink-0"
    >
      <div className="p-4 flex-1 space-y-5 overflow-y-auto w-[min(85vw,250px)]">
        {/* Node Filters */}
        <section>
          <h3 className="text-[10px] uppercase text-text3 font-semibold mb-3 tracking-widest">Node Filters</h3>
          <div className="space-y-1">
            {renderFilterRow(filterAll)}
          </div>

          <div className="h-px bg-border2 my-3" aria-hidden />

          <div className="space-y-1">{groupProperty.map(renderFilterRow)}</div>

          <div className="h-px bg-border2 my-3" aria-hidden />

          <div className="space-y-1">{groupPeople.map(renderFilterRow)}</div>

          <div className="h-px bg-border2 mt-3" aria-hidden />
        </section>

        {/* Chain Status — centered between Node Filters and Chain list */}
        <section>
          <h3 className="text-[10px] uppercase text-text3 font-semibold mb-3 tracking-widest">Chain Status</h3>
          <div className="space-y-1">
            {chainStatusOptions.map((opt) => {
              const Icon = opt.icon;
              const selected = chainStatusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setChainStatusFilter(opt.value)}
                  className={filterButtonClass(selected)}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${opt.color}`} />
                    <Icon className="w-3.5 h-3.5 opacity-60 shrink-0" />
                    <span className="truncate text-left">{opt.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="h-px bg-border2" aria-hidden />

        <section className="flex flex-col overflow-hidden">
          <h3 className="text-[10px] uppercase text-text3 font-semibold mb-3 tracking-widest">Active Move Chains</h3>
          <ChainList />
        </section>

        {isAdmin && (
          <section>
            <h3 className="text-[10px] uppercase text-text3 font-semibold mb-3 tracking-widest">System Actions</h3>
            <button
              onClick={refreshGeocode}
              disabled={refreshing}
              className="w-full kovera-btn-outline text-[11px] py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Geocoding...' : 'Refresh Geocode'}
            </button>
            <p className="text-[9px] text-text3 mt-1.5 px-1 leading-relaxed">
              Re-geocodes all addresses and refreshes the network map coordinates.
            </p>
          </section>
        )}
      </div>

      <div className="p-4 border-t border-border2 text-[10px] text-text3 font-mono leading-relaxed space-y-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-kovera animate-pulse" />
          <span>CONNECTED</span>
        </div>
        <div>
          GEOCODING: <span className="text-kovera">OK</span>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
