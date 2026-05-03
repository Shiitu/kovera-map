/**
 * @file frontend/src/components/AdminPanel.tsx
 * @description Admin panel with Kovera green design system.
 */

import React, { useState, useEffect } from 'react';
import { adminApi, authApi, analyticsApi } from '../services/api';
import { Plus, Trash2, Key, Users, Download } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [internalUsers, setInternalUsers] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [newUserId, setNewUserId] = useState('');
  const [tokenLabel, setTokenLabel] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [uRes, tRes] = await Promise.all([
        analyticsApi.getInternalUsers(),
        adminApi.getTokens()
      ]);
      // Assuming analyticsApi returns an array of IDs or objects. Let's map it.
      const users = uRes.data.internalUsers || [];
      setInternalUsers(users.map((id: string) => ({ user_id: id, email: id, added_at: new Date().toISOString() })));
      setTokens(tRes.data);
    } catch (err) {
      console.error('Admin Fetch Failed', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddInternalUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId) return;
    try {
      const currentIds = internalUsers.map(u => u.user_id.toString());
      if (!currentIds.includes(newUserId)) {
        await analyticsApi.updateInternalUsers([...currentIds, newUserId]);
      }
      setNewUserId('');
      fetchData();
    } catch (err) {
      alert('Failed to add internal user');
    }
  };

  const handleRemoveInternalUser = async (id: number | string) => {
    try {
      const currentIds = internalUsers.map(u => u.user_id.toString());
      await analyticsApi.updateInternalUsers(currentIds.filter(userId => userId !== id.toString()));
      fetchData();
    } catch (err) {
      alert('Failed to remove internal user');
    }
  };

  const handleProvisionToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenLabel) return;
    try {
      setLoading(true);
      await authApi.provision({ label: tokenLabel, role: 'user', expires_in_days: 7 });
      setTokenLabel('');
      fetchData();
    } catch (err) {
      alert('Failed to provision token');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await analyticsApi.exportNetworkMd();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `network_map_${Date.now()}.md`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Export failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-6 border-b border-border2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Admin Control</h1>
          <p className="text-text3 text-xs mt-1 tracking-wide">Management Interface · Kovera Systems</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="kovera-btn-outline text-xs flex items-center gap-2 py-2"
          >
            <Download className="w-4 h-4" />
            Export (.MD)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
        {/* Internal Users Manager */}
        <section className="space-y-5">
          <div className="flex items-center gap-2 text-kovera font-semibold uppercase tracking-widest text-[10px]">
            <Users className="w-4 h-4" />
            <span>Internal User Filtering</span>
          </div>
          
          <form onSubmit={handleAddInternalUser} className="flex gap-2">
            <input 
              type="number"
              placeholder="User ID..."
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              className="kovera-input flex-1 font-mono"
            />
            <button className="kovera-btn px-3 py-2">
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="kovera-card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/[0.03] border-b border-border2 text-[10px] uppercase text-text3">
                <tr>
                  <th className="px-4 py-2.5 font-semibold tracking-wider">Email / ID</th>
                  <th className="px-4 py-2.5 font-semibold tracking-wider">Excluded At</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border2 text-xs">
                {internalUsers.map((user, idx) => (
                  <tr key={user.user_id || `user-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-text2 font-mono">{user.email || user.user_id}</td>
                    <td className="px-4 py-3 text-text3">{new Date(user.added_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => handleRemoveInternalUser(user.user_id)}
                        className="text-text3 hover:text-pink-node transition-colors p-1 rounded hover:bg-pink-node/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {internalUsers.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-text3 italic">No internal users defined</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Access Token Provisioning */}
        <section className="space-y-5">
          <div className="flex items-center gap-2 text-amber-node font-semibold uppercase tracking-widest text-[10px]">
            <Key className="w-4 h-4" />
            <span>External Access Tokens</span>
          </div>

          <form onSubmit={handleProvisionToken} className="flex gap-2">
            <input 
              type="text"
              placeholder="Label (e.g. Agent Name)..."
              value={tokenLabel}
              onChange={(e) => setTokenLabel(e.target.value)}
              className="kovera-input flex-1"
            />
            <button 
              disabled={loading}
              className="kovera-btn-outline border-amber-node/30 text-amber-node hover:bg-amber-node/10 px-4 py-2 font-bold text-xs disabled:opacity-50"
            >
              PROVISION
            </button>
          </form>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
            {tokens.map((token, idx) => (
              <div key={token.id || token.token || `token-${idx}`} className="kovera-card p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-text text-sm">{token.label}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${token.role === 'admin' ? 'bg-amber-node/20 text-amber-node' : 'bg-kovera/20 text-kovera'}`}>
                    {token.role}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-text3 truncate bg-bg/50 p-2 rounded-lg select-all cursor-copy border border-border2">
                  {token.token}
                </div>
                <div className="text-[9px] text-text3 flex justify-between uppercase tracking-wider">
                  <span>Created: {new Date(token.created_at).toLocaleDateString()}</span>
                  <span>Expires: {token.expires_at ? new Date(token.expires_at).toLocaleDateString() : 'Never'}</span>
                </div>
              </div>
            ))}
            {tokens.length === 0 && (
              <div className="text-center py-8 text-text3 kovera-card italic text-xs">No tokens generated</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPanel;
