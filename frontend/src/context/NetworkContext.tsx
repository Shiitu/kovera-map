/**
 * @file frontend/src/context/NetworkContext.tsx
 * @description Provides global state for the Network Map Portal.
 * Integrates all Kovera network API endpoints including:
 * - GET graph, stats, chains, clusters, address-cycles, node detail
 * - PUT internal-users (toggle exclude)
 * - POST refresh (geocode refresh)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { analyticsApi } from '../services/api';
import { normalizeChainsFromApi } from '../utils/chainPaths';

interface NetworkContextType {
  graphData: any;
  networkStats: any;
  agentMetrics: {
    agentsSignedUp: number;
    linkedClients: number;
    offMarketListings: number;
  };
  clusters: any[];
  addressCycles: any[];
  excludeInternal: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  selectedNode: any | null;
  activeChain: any | null;
  filter: string;
  chainStatusFilter: 0 | 1 | 2 | 3;
  privacyMode: 'public' | 'private';
  role: 'admin' | 'user' | null;
  isAdmin: boolean;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  detailsOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  toggleDetails: () => void;
  toggleExcludeInternal: () => void;
  setSelectedNode: (node: any | null) => void;
  setActiveChain: (chain: any | null) => void;
  setFilter: (filter: string) => void;
  setChainStatusFilter: (value: 0 | 1 | 2 | 3) => void;
  togglePrivacyMode: () => void;
  refreshGraph: () => Promise<void>;
  regenerateGraph: () => Promise<void>;
  refreshGeocode: () => Promise<void>;
  logout: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [graphData, setGraphData] = useState<any>(null);
  const [networkStats, setNetworkStats] = useState<any>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [addressCycles, setAddressCycles] = useState<any[]>([]);
  const [excludeInternal, setExcludeInternal] = useState<boolean>(
    localStorage.getItem('kovera_exclude_internal') !== 'false'
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNodeState] = useState<any | null>(null);
  const [activeChain, setActiveChain] = useState<any | null>(null);
  const [filter, setFilter] = useState('All');
  const [chainStatusFilter, setChainStatusFilter] = useState<0 | 1 | 2 | 3>(
    (Number(localStorage.getItem('kovera_chain_status_filter')) as 0 | 1 | 2 | 3) || 0
  );
  const [privacyMode, setPrivacyMode] = useState<'public' | 'private'>(
    (localStorage.getItem('kovera_privacy_mode') as 'public' | 'private') || 'private'
  );
  const [role, setRole] = useState<'admin' | 'user' | null>(
    (localStorage.getItem('kovera_role') as 'admin' | 'user') || null
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('kovera_theme') as 'light' | 'dark') || 'dark'
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    localStorage.getItem('kovera_sidebar_open') === 'true'
  );
  const [detailsOpen, setDetailsOpen] = useState<boolean>(
    localStorage.getItem('kovera_details_open') === 'true'
  );

  const isAdmin = role === 'admin';
  const agentMetrics = useMemo(() => {
    const nodes = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
    const edges = Array.isArray(graphData?.edges) ? graphData.edges : [];

    const fallbackAgents = new Set(
      nodes
        .filter((n: any) => ['user_home', 'pure_buyer'].includes(String(n.type || '').toLowerCase()))
        .map((n: any) => n.uid || n.userId || n.id)
    ).size;
    const fallbackLinkedClients = edges.filter((e: any) => String(e.type || '').toUpperCase() === 'LIKE').length;
    const fallbackOffMarket = nodes.filter(
      (n: any) =>
        String(n.type || '').toLowerCase() === 'seeded_listing' &&
        String(n.listingCategory || n.source || '').toLowerCase() === 'off_market'
    ).length;

    return {
      agentsSignedUp: Number(networkStats?.agents?.signedUp ?? networkStats?.agentsSignedUp ?? fallbackAgents ?? 0),
      linkedClients: Number(networkStats?.agents?.linkedClients ?? networkStats?.linkedClients ?? fallbackLinkedClients ?? 0),
      offMarketListings: Number(networkStats?.agents?.offMarketListings ?? networkStats?.offMarketListings ?? fallbackOffMarket ?? 0)
    };
  }, [graphData, networkStats]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('kovera_theme', newTheme);
  }, [theme]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => {
      const newVal = !prev;
      localStorage.setItem('kovera_sidebar_open', String(newVal));
      return newVal;
    });
  }, []);

  const toggleDetails = useCallback(() => {
    setDetailsOpen(prev => {
      const newVal = !prev;
      localStorage.setItem('kovera_details_open', String(newVal));
      return newVal;
    });
  }, []);

  const setSelectedNode = useCallback((node: any | null) => {
    setSelectedNodeState(node);
    const shouldOpen = Boolean(node);
    setDetailsOpen(shouldOpen);
    localStorage.setItem('kovera_details_open', String(shouldOpen));
  }, []);

  const toggleExcludeInternal = useCallback(() => {
    setExcludeInternal(prev => {
      const newVal = !prev;
      localStorage.setItem('kovera_exclude_internal', String(newVal));
      return newVal;
    });
  }, []);

  const togglePrivacyMode = useCallback(() => {
    setPrivacyMode(prev => {
      const next = prev === 'private' ? 'public' : 'private';
      localStorage.setItem('kovera_privacy_mode', next);
      return next;
    });
  }, []);

  // Handle theme sync with document
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  /**
   * Fetch all network data in parallel:
   * 1. Graph (nodes + edges) — uses excludeInternal toggle
   * 2. Chains
   * 3. Stats
   * 4. Clusters
   * 5. Address Cycles
   */
  const fetchAllData = useCallback(async (excludeInternalVal: boolean, refresh = false, chainFilter: 0 | 1 | 2 | 3 = 0) => {
    setLoading(true);
    try {
      const [graphRes, chainsRes, statsRes, clustersRes, cyclesRes] = await Promise.allSettled([
        analyticsApi.getNetworkGraph(excludeInternalVal, refresh, chainFilter),
        analyticsApi.getNetworkChains(2),
        analyticsApi.getNetworkStats(),
        analyticsApi.getNetworkClusters(3),
        analyticsApi.getAddressCycles()
      ]);

      if (graphRes.status === 'fulfilled') {
        const payload = graphRes.value.data || {};
        const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
        const edges = Array.isArray(payload.edges) ? payload.edges : [];
        const rawChains =
          chainsRes.status === 'fulfilled' && Array.isArray(chainsRes.value.data?.chains)
            ? chainsRes.value.data.chains
            : [];
        const chainsData = normalizeChainsFromApi(rawChains, nodes);
        setGraphData({
          nodes,
          edges,
          chains: chainsData,
        });
      }

      if (statsRes.status === 'fulfilled') setNetworkStats(statsRes.value.data);
      if (clustersRes.status === 'fulfilled') {
        const cl = clustersRes.value.data?.clusters;
        setClusters(Array.isArray(cl) ? cl : []);
      }
      if (cyclesRes.status === 'fulfilled') {
        const cy = cyclesRes.value.data?.cycles;
        setAddressCycles(Array.isArray(cy) ? cy : []);
      }

      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch network data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshGraph = useCallback(async () => {
    await fetchAllData(excludeInternal, false, chainStatusFilter);
  }, [fetchAllData, excludeInternal, chainStatusFilter]);

  const regenerateGraph = async () => {
    if (!isAdmin) return;
    await fetchAllData(excludeInternal, true, chainStatusFilter);
  };

  /**
   * POST /analytics/network/refresh — triggers geocode refresh on server,
   * then reloads all data with fresh coordinates.
   */
  const refreshGeocode = async () => {
    setRefreshing(true);
    try {
      await analyticsApi.refreshGeocode();
      // After geocode completes, fetch fresh data
      await fetchAllData(excludeInternal, true, chainStatusFilter);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Geocode refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('kovera_token');
    localStorage.removeItem('kovera_role');
    setRole(null);
    setGraphData(null);
    setNetworkStats(null);
    setClusters([]);
    setAddressCycles([]);
    window.location.href = '/network';
  };

  useEffect(() => {
    fetchAllData(excludeInternal, false, chainStatusFilter);
  }, [excludeInternal, chainStatusFilter, fetchAllData]);

  return (
    <NetworkContext.Provider
      value={{
        graphData,
        networkStats,
        agentMetrics,
        clusters,
        addressCycles,
        excludeInternal,
        loading,
        refreshing,
        error,
        selectedNode,
        activeChain,
        filter,
        chainStatusFilter,
        privacyMode,
        role,
        isAdmin,
        theme,
        sidebarOpen,
        detailsOpen,
        toggleTheme,
        toggleSidebar,
        toggleDetails,
        toggleExcludeInternal,
        setSelectedNode,
        setActiveChain,
        setFilter,
        setChainStatusFilter: (value) => {
          setChainStatusFilter(value);
          localStorage.setItem('kovera_chain_status_filter', String(value));
        },
        togglePrivacyMode,
        refreshGraph,
        regenerateGraph,
        refreshGeocode,
        logout
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkContext = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetworkContext must be used within a NetworkProvider');
  }
  return context;
};
