import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Server, Activity, Search, Plus, Trash2, Edit2,
  ArrowRight, Copy, CheckSquare, Square, X,
  LayoutGrid, List, ChevronDown, ChevronUp,
  Network, CheckCircle2, AlertOctagon, Clock,
  Loader2, Download, BarChart2, Sun, Moon, RefreshCw
} from 'lucide-react';

import { supabase } from './lib/supabase';
import { CATEGORIES, STATUS_OPTIONS } from './lib/constants';
import IPsModal from './components/IPsModal';
import AddServerModal from './components/AddServerModal';
import Dashboard from './components/Dashboard';

export default function App() {
  const [servers, setServers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('serverViewMode') || 'list');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showDashboard, setShowDashboard] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  // Theme Logic
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Shift-Click State
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

  // UI Modals
  const [toast, setToast] = useState(null);
  const [isIPModalOpen, setIsIPModalOpen] = useState(false);
  const [isAddServerModalOpen, setIsAddServerModalOpen] = useState(false);
  const [activeServerId, setActiveServerId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // UI State
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState('bottom');
  const [newServerForm, setNewServerForm] = useState({ id: '', provider: '', category: 'Production', status: 'Active' });
  const [syncState, setSyncState] = useState('idle'); // idle, saving, saved, error
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
  const [isBulkStatusMenuOpen, setIsBulkStatusMenuOpen] = useState(false);

  useEffect(() => {
    const closeMenus = () => { setIsBulkMenuOpen(false); setIsBulkStatusMenuOpen(false); setOpenMenuId(null); };
    document.addEventListener('click', closeMenus);
    document.addEventListener('scroll', closeMenus, true);
    return () => {
      document.removeEventListener('click', closeMenus);
      document.removeEventListener('scroll', closeMenus, true);
    };
  }, []);

  useEffect(() => localStorage.setItem('serverViewMode', viewMode), [viewMode]);

  const activeServer = servers.find(s => s.id === activeServerId);

  useEffect(() => {
    fetchServers();
  }, []);

  const handleManualPing = async () => {
    setIsPinging(true);
    showToast("Starting manual ping...", "success");
    try {
      const response = await fetch('/.netlify/functions/ping-manual', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Ping Failed (${response.status})`);
      }
      const result = await response.json();
      showToast(`Ping complete! Updated ${result.updated} servers.`, "success");
      fetchServers();
    } catch (err) {
      console.warn("Ping Error:", err);
      // Show actual error message rather than hardcoded string
      showToast(err.message === "Failed to fetch" ? "Network error connecting to Ping function." : err.message, "error");
    } finally {
      setIsPinging(false);
    }
  };

  const fetchServers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('servers').select('*').order('created_at', { ascending: false });
      if (error && error.code === '42P01') showToast("Database not setup yet.", "error");
      else if (error) throw error;
      else setServers(data || []);
    } catch (error) {
      showToast("Failed to fetch servers", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredServers = useMemo(() => {
    let data = [...servers];
    if (activeTab !== 'ALL') data = data.filter(s => s.category === activeTab);
    if (searchQuery.trim()) {
      const terms = searchQuery.toLowerCase().split(/[\s,]+/).filter(t => t.length > 0);
      if (terms.length > 0) {
        data = data.filter(s => {
          const id = s.id.toLowerCase();
          const provider = s.provider.toLowerCase();
          const ips = s.ip_data ? s.ip_data.map(ip => ip.address.toLowerCase()) : [];
          return terms.some(term => id.includes(term) || provider.includes(term) || ips.some(ip => ip.includes(term)));
        });
      }
    }
    if (sortConfig.key) {
      data.sort((a, b) => {
        const aValue = (a[sortConfig.key] || '').toString().toLowerCase();
        const bValue = (b[sortConfig.key] || '').toString().toLowerCase();
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [servers, activeTab, searchQuery, sortConfig]);

  const stats = useMemo(() => ({
    total: servers.length,
    issues: servers.filter(s => s.category === 'Issues').length,
    prod: servers.filter(s => s.category === 'Production').length
  }), [servers]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const openIPsModal = (serverId) => { setActiveServerId(serverId); setIsIPModalOpen(true); };
  const copyToClipboard = (text, label = "text") => { if (text) navigator.clipboard.writeText(text).then(() => showToast(`Copied ${label}`)); };
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const triggerAutoSave = async (updatedServer) => {
    setSyncState('saving');
    setServers(prev => prev.map(s => s.id === updatedServer.id ? updatedServer : s));
    try {
      const { error } = await supabase.from('servers').update({ global_domains: updatedServer.global_domains, ip_data: updatedServer.ip_data, updated_at: new Date().toISOString() }).eq('id', updatedServer.id);
      if (error) throw error;
      setSyncState('saved');
      setTimeout(() => setSyncState('idle'), 2000);
    } catch (err) {
      setSyncState('error');
      showToast("Failed to save", "error");
    }
  };

  const handleCreateServer = async (e) => {
    e.preventDefault();
    if (servers.find(s => s.id === newServerForm.id)) return showToast("Server ID already exists!", "error");
    const newServer = { id: newServerForm.id, provider: newServerForm.provider, category: newServerForm.category, status: newServerForm.status, global_domains: "", ip_data: [] };
    try {
      setSyncState('saving');
      const { error } = await supabase.from('servers').insert([newServer]);
      if (error) throw error;
      setServers([newServer, ...servers]);
      setIsAddServerModalOpen(false);
      setNewServerForm({ id: '', provider: '', category: 'Production', status: 'Active' });
      setSyncState('saved');
      setTimeout(() => setSyncState('idle'), 2000);
      showToast("Server added successfully!");
    } catch (err) {
      setSyncState('error');
      showToast("Failed to add server", "error");
    }
  };

  const handleDeleteServer = async (id) => {
    if (!confirm(`Permanently delete server ${id}?`)) return;
    try {
      setSyncState('saving');
      const { error } = await supabase.from('servers').delete().eq('id', id);
      if (error) throw error;
      setServers(servers.filter(s => s.id !== id));
      setSyncState('saved');
      setTimeout(() => setSyncState('idle'), 2000);
      showToast("Server deleted");
    } catch (err) {
      setSyncState('error');
      showToast("Failed to delete", "error");
    }
  };

  const handleSelection = (e, index, id) => {
    const newSet = new Set(selectedIds);
    if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = filteredServers.slice(start, end + 1).map(s => s.id);
      if (newSet.has(id)) rangeIds.forEach(i => newSet.delete(i));
      else rangeIds.forEach(i => newSet.add(i));
    } else {
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    }
    setSelectedIds(newSet);
    setLastSelectedIndex(index);
  };

  const toggleAllInView = () => {
    const allIds = filteredServers.map(s => s.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
    const newSet = new Set(selectedIds);
    if (allSelected) allIds.forEach(id => newSet.delete(id));
    else allIds.forEach(id => newSet.add(id));
    setSelectedIds(newSet);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Provider', 'Category', 'Status', 'IPs', 'Global Domains'];
    const dataToExport = selectedIds.size > 0 ? servers.filter(s => selectedIds.has(s.id)) : filteredServers;
    const rows = dataToExport.map(s => [s.id, `"${s.provider}"`, s.category, s.status, `"${(s.ip_data || []).map(ip => ip.address).join(', ')}"`, `"${(s.global_domains || '').replace(/\n/g, ', ')}"`]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `servers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateMultipleServersAndSave = async (updatesFn) => {
    setSyncState('saving');
    const idsToUpdate = Array.from(selectedIds);
    setServers(prev => prev.map(s => idsToUpdate.includes(s.id) ? { ...s, ...updatesFn(s) } : s));
    try {
      const updates = updatesFn({});
      const { error } = await supabase.from('servers').update({ ...updates, updated_at: new Date().toISOString() }).in('id', idsToUpdate);
      if (error) throw error;
      setSyncState('saved');
      setTimeout(() => setSyncState('idle'), 2000);
      setSelectedIds(new Set());
      setIsBulkMenuOpen(false);
      setIsBulkStatusMenuOpen(false);
      showToast("Updated servers");
    } catch (err) {
      setSyncState('error');
      showToast("Failed to bulk update", "error");
    }
  };

  const handleMove = async (id, cat) => {
    setSyncState('saving');
    setServers(prev => prev.map(s => s.id === id ? { ...s, category: cat } : s));
    try {
      const { error } = await supabase.from('servers').update({ category: cat, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      setSyncState('saved');
      setTimeout(() => setSyncState('idle'), 2000);
      setOpenMenuId(null);
      showToast(`Moved to ${cat}`);
    } catch (err) {
      setSyncState('error');
      showToast("Failed to move server", "error");
    }
  };

  const handleBulkMove = (cat) => updateMultipleServersAndSave(() => ({ category: cat }));
  const handleBulkStatus = (status) => updateMultipleServersAndSave(() => ({ status: status }));

  const handleBulkCopy = () => {
    copyToClipboard(Array.from(selectedIds).join('\n'), `${selectedIds.size} IDs`);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Permanently remove ${selectedIds.size} servers?`)) return;
    setSyncState('saving');
    const ids = Array.from(selectedIds);
    setServers(prev => prev.filter(s => !ids.includes(s.id)));
    try {
      const { error } = await supabase.from('servers').delete().in('id', ids);
      if (error) throw error;
      setSyncState('saved');
      setTimeout(() => setSyncState('idle'), 2000);
      setSelectedIds(new Set());
      showToast("Servers deleted");
    } catch (err) {
      setSyncState('error');
      showToast("Failed to delete", "error");
    }
  };

  const openEditModal = (s) => {
    setNewServerForm({ id: s.id, provider: s.provider, category: s.category, status: s.status });
    setEditingId(s.id);
    setIsAddServerModalOpen(true);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (editingId) {
      setSyncState('saving');
      const newProps = { provider: newServerForm.provider, category: newServerForm.category, status: newServerForm.status };
      setServers(prev => prev.map(s => s.id === editingId ? { ...s, ...newProps } : s));
      try {
        const { error } = await supabase.from('servers').update({ ...newProps, updated_at: new Date().toISOString() }).eq('id', editingId);
        if (error) throw error;
        setSyncState('saved');
        setTimeout(() => setSyncState('idle'), 2000);
        showToast("Server updated!");
      } catch (err) {
        setSyncState('error');
        showToast("Update failed", "error");
      }
      setIsAddServerModalOpen(false);
      setEditingId(null);
    } else {
      handleCreateServer(e);
    }
  };

  const handleMenuToggle = (e, serverId) => {
    e.stopPropagation();
    if (openMenuId === serverId) {
      setOpenMenuId(null);
    } else {
      const buttonRect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      setMenuPosition(spaceBelow < 250 ? 'top' : 'bottom');
      setOpenMenuId(serverId);
    }
  };

  const StatusBadge = ({ status }) => {
    let styles = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50";
    let Icon = Activity;
    if (status === 'Active') { styles = "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"; Icon = CheckCircle2; }
    else if (status === 'Down') { styles = "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 dark:drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]"; Icon = AlertOctagon; }
    else if (status === 'Timed Out') { styles = "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20"; Icon = Clock; }
    return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide uppercase ${styles}`}><Icon size={14} strokeWidth={2.5} />{status}</span>;
  };

  const CategoryBadge = ({ cat }) => {
    const c = CATEGORIES.find(c => c.key === cat) || CATEGORIES[4];
    return <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${c.color}`}><span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]"></span>{c.label}</span>;
  };

  const SortableHeader = ({ label, sortKey }) => (
    <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group select-none text-slate-500 dark:text-slate-400" onClick={() => requestSort(sortKey)}>
      <div className="flex items-center gap-1">{label} <span className={`transition-opacity ${sortConfig.key === sortKey ? 'opacity-100 text-violet-600 dark:text-violet-400' : 'opacity-0 group-hover:opacity-40'}`}>{sortConfig.key === sortKey && sortConfig.direction === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</span></div>
    </th>
  );

  const HoverIPTooltip = ({ server }) => {
    const extraIps = server.ip_data?.slice(1) || [];
    if (extraIps.length === 0) return null;
    return (
      <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover/ipbadge:opacity-100 group-hover/ipbadge:visible transition-all z-20 w-64 translate-y-2 group-hover/ipbadge:translate-y-0 text-slate-800 dark:text-slate-200">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Additional IPs ({extraIps.length})</div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scroll pr-1">
          {extraIps.map((ip, i) => (
            <div key={i} className="flex items-center justify-between text-sm group/row"><span className="font-mono text-slate-700 dark:text-slate-300 group-hover/row:text-violet-600 dark:group-hover/row:text-violet-300 transition-colors">{ip.address || 'Empty IP'}</span><button onClick={(e) => { e.stopPropagation(); copyToClipboard(ip.address, 'IP'); }} className="text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors opacity-0 group-hover/row:opacity-100"><Copy size={12} /></button></div>
          ))}
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-medium pb-20"><Loader2 className="animate-spin mr-3 text-violet-600 dark:text-violet-500" size={24} /> Connecting to Supabase...</div>;

  return (
    <div className="flex flex-col min-h-screen relative bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 selection:bg-violet-500/30 font-sans tracking-tight transition-colors duration-300">
      {toast && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-spring-up"><div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.1)] dark:shadow-[0_0_30px_rgba(0,0,0,0.5)] border backdrop-blur-md ${toast.type === 'error' ? 'bg-rose-50/90 dark:bg-rose-950/80 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300' : 'bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white'}`}>{toast.type === 'error' ? <AlertOctagon size={20} /> : <CheckCircle2 size={20} className="text-emerald-500 dark:text-emerald-400" />}<span className="text-sm font-bold">{toast.message}</span></div></div>}

      {syncState === 'saving' && <div className="fixed top-0 left-0 w-full h-1 bg-slate-200 dark:bg-slate-800 z-50"><div className="h-full bg-violet-600 dark:bg-violet-500 animate-pulse w-full glow-violet"></div></div>}

      <header className="bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 backdrop-blur-xl">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 p-2.5 rounded-xl text-violet-600 dark:text-violet-400 glow-violet shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"><Server size={24} strokeWidth={2.5} /></div>
              <div><h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">Server Monitor</h1><span className="text-xs font-medium text-slate-500 dark:text-slate-500 tracking-wider">Powered by Supabase</span></div>
            </div>
            <div className="hidden md:flex h-10 w-px bg-slate-200 dark:bg-slate-800"></div>

            <button onClick={() => setShowDashboard(!showDashboard)} className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all focus:outline-none ${showDashboard ? 'bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]' : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
              <BarChart2 size={18} /> {showDashboard ? 'Close Dashboard' : 'Open Dashboard'}
            </button>
            {!showDashboard && (
              <div className="hidden lg:flex gap-6 text-sm font-bold animate-enter">
                <div className="flex flex-col"><span className="text-slate-500 text-xs uppercase tracking-wider">Total</span><span className="text-slate-900 dark:text-white text-lg leading-none">{stats.total}</span></div>
                <div className="flex flex-col"><span className="text-emerald-700 dark:text-emerald-500/80 text-xs uppercase tracking-wider">Active</span><span className="text-emerald-600 dark:text-emerald-400 text-lg leading-none">{stats.prod}</span></div>
                <div className="flex flex-col"><span className="text-rose-700 dark:text-rose-500/80 text-xs uppercase tracking-wider">Issues</span><span className="text-rose-600 dark:text-rose-400 text-lg leading-none">{stats.issues}</span></div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80 group">
              <label htmlFor="search-input" className="sr-only">Search Servers</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 group-focus-within:text-violet-600 dark:group-focus-within:text-violet-400 transition-colors" size={18} />
              <input id="search-input" type="text" placeholder="Search IDs, IPs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 pr-8 h-11 w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all placeholder:text-slate-500 dark:placeholder:text-slate-500 shadow-inner dark:shadow-[none]" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"><span className="sr-only">Clear Search</span><X size={16} /></button>}
            </div>

            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-md transition-all text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 focus:outline-none focus:ring-2 focus:ring-violet-500">
                <span className="sr-only">Toggle Theme</span>
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
              <button onClick={() => { setViewMode('list'); setShowDashboard(false); }} className={`p-2 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 ${viewMode === 'list' && !showDashboard ? 'bg-slate-200 dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
                <span className="sr-only">List View</span>
                <List size={20} />
              </button>
              <button onClick={() => { setViewMode('grid'); setShowDashboard(false); }} className={`p-2 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 ${viewMode === 'grid' && !showDashboard ? 'bg-slate-200 dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
                <span className="sr-only">Grid View</span>
                <LayoutGrid size={20} />
              </button>
            </div>

            <button onClick={() => { setEditingId(null); setNewServerForm({ id: '', provider: '', category: 'Production', status: 'Active' }); setIsAddServerModalOpen(true); }} className="h-11 px-5 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-lg transition-all shadow-[0_4px_10px_rgba(124,58,237,0.3)] dark:shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:scale-[1.02] active:scale-95"><Plus size={18} /> <span className="hidden sm:inline">Add</span></button>
          </div>
        </div>
        <div className="px-6 pb-0 flex gap-2 overflow-x-auto custom-scroll border-t border-slate-200 dark:border-slate-800/50 pt-3 relative z-20">
          <button onClick={() => setActiveTab('ALL')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full border transition-all whitespace-nowrap mb-3 ${activeTab === 'ALL' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 shadow-sm' : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-700 dark:hover:text-slate-300'}`}>All Servers</button>
          {CATEGORIES.map(cat => {
            const count = servers.filter(s => s.category === cat.key).length;
            const isActive = activeTab === cat.key;
            return <button key={cat.key} onClick={() => setActiveTab(cat.key)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full border transition-all whitespace-nowrap mb-3 flex items-center gap-2 ${isActive ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-700 dark:hover:text-slate-300'}`}>{cat.label}<span className={`px-1.5 py-0.5 rounded text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500'}`}>{count}</span></button>
          })}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scroll p-6 pb-32">
        {showDashboard ? (
          <Dashboard servers={filteredServers} isDark={isDark} />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <button onClick={toggleAllInView} className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 w-max shadow-sm">
                {filteredServers.length > 0 && filteredServers.every(s => selectedIds.has(s.id)) ? <CheckSquare size={18} className="text-violet-600 dark:text-violet-500" /> : <Square size={18} />} Select All <span className="text-slate-400 dark:text-slate-500">({filteredServers.length})</span>
              </button>
              <div className="flex items-center gap-3">
                <button onClick={handleManualPing} disabled={isPinging} className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 w-max shadow-sm disabled:opacity-50">
                  <RefreshCw size={16} className={isPinging ? "animate-spin text-violet-600 dark:text-violet-400" : ""} /> {isPinging ? 'Checking...' : 'Check Down Servers'}
                </button>
                <button onClick={exportCSV} className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 w-max shadow-sm"><Download size={16} /> Export CSV {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</button>
              </div>
            </div>

            {viewMode === 'list' ? (
              <div className="bg-white/80 dark:bg-slate-900/50 rounded-2xl shadow-sm dark:shadow-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden backdrop-blur-sm animate-enter">
                <table className="w-full text-left text-base">
                  <thead className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 w-14"></th>
                      <SortableHeader label="Server ID" sortKey="id" />
                      <th className="px-6 py-4">IP Addresses</th>
                      <SortableHeader label="Provider" sortKey="provider" />
                      <SortableHeader label="Category" sortKey="category" />
                      <SortableHeader label="Status" sortKey="status" />
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredServers.map((server, index) => {
                      const mainIp = server.ip_data && server.ip_data.length > 0 ? server.ip_data[0].address : "Configure IPs";
                      const extraIps = server.ip_data && server.ip_data.length > 1 ? server.ip_data.length - 1 : 0;
                      const isSelected = selectedIds.has(server.id);

                      return (
                        <tr key={server.id} onClick={(e) => { if (!e.target.closest('button')) handleSelection(e, index, server.id); }} className={`group transition-colors cursor-pointer ${isSelected ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                          <td className="px-6 py-4"><button className={`transition-colors flex ${isSelected ? 'text-violet-600 dark:text-violet-500' : 'text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400'}`}>{isSelected ? <CheckSquare size={20} /> : <Square size={20} />}</button></td>
                          <td className="px-6 py-4"><span onClick={(e) => { e.stopPropagation(); copyToClipboard(server.id, 'ID'); }} className="font-mono font-bold text-slate-900 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500/50 transition-colors pb-0.5">{server.id}</span></td>
                          <td className="px-6 py-4">
                            <button onClick={(e) => { e.stopPropagation(); openIPsModal(server.id); }} className="flex items-center gap-2 group/btn hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 -ml-3 rounded-lg transition-colors text-left border border-transparent hover:border-slate-300 dark:hover:border-slate-700" aria-label={`Manage IPs for ${server.id}`}>
                              <Network size={14} className="text-slate-500 dark:text-slate-400 group-hover/btn:text-violet-700 dark:group-hover/btn:text-violet-400 transition-colors" />
                              <span className={`${server.ip_data?.length ? 'font-mono text-slate-700 dark:text-slate-300 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white' : 'text-slate-400 dark:text-slate-500 italic text-sm'}`}>{mainIp}</span>
                              {extraIps > 0 && (
                                <div className="relative inline-block group/ipbadge">
                                  <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded group-hover/btn:bg-violet-100 dark:group-hover/btn:bg-violet-500/20 group-hover/btn:text-violet-600 dark:group-hover/btn:text-violet-300 transition-colors">+{extraIps}</span>
                                  <HoverIPTooltip server={server} />
                                </div>
                              )}
                              <Edit2 size={12} className="opacity-0 group-hover/btn:opacity-100 text-violet-500 dark:text-violet-400 transition-opacity ml-1" />
                            </button>
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">{server.provider}</td>
                          <td className="px-6 py-4"><CategoryBadge cat={server.category} /></td>
                          <td className="px-6 py-4"><StatusBadge status={server.status} /></td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); openEditModal(server); }} className="p-2 text-slate-500 hover:text-violet-700 dark:hover:text-violet-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500" aria-label={`Edit Server ${server.id}`}><Edit2 size={16} /></button>

                              <div className="relative">
                                <button onClick={(e) => handleMenuToggle(e, server.id)} className={`p-2 rounded-lg transition-colors ${openMenuId === server.id ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}><ArrowRight size={16} /></button>
                                {openMenuId === server.id && (
                                  <div className={`absolute right-0 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 animate-spring-up py-1.5 ${menuPosition === 'top' ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'}`}>
                                    <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 mb-1 text-left">Move to...</div>
                                    {CATEGORIES.filter(c => c.key !== server.category).map(c => (
                                      <button key={c.key} onClick={(e) => { e.stopPropagation(); handleMove(server.id, c.key); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-3 font-medium"><span className={`w-2 h-2 rounded-full ${c.color.split(' ')[0].replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`}></span>{c.label}</button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredServers.length === 0 && <tr><td colSpan="7" className="py-20 text-center text-slate-500">{searchQuery || activeTab !== 'ALL' ? 'No servers match your filters.' : 'No servers found. Start by adding one!'}</td></tr>}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 relative animate-enter">
                {filteredServers.map((server, index) => {
                  const isSelected = selectedIds.has(server.id);
                  const mainIp = server.ip_data && server.ip_data.length > 0 ? server.ip_data[0].address : "-";
                  const extraIps = server.ip_data && server.ip_data.length > 1 ? server.ip_data.length - 1 : 0;

                  return (
                    <div key={server.id} onClick={(e) => { if (!e.target.closest('button')) handleSelection(e, index, server.id); }} className={`group relative bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl dark:shadow-none dark:hover:shadow-2xl cursor-pointer overflow-hidden ${isSelected ? 'border-violet-400 dark:border-violet-500/50 shadow-[0_4px_20px_rgba(139,92,246,0.15)] dark:shadow-[0_0_20px_rgba(139,92,246,0.15)] glow-violet' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                      {isSelected && <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/10 dark:bg-violet-500/20 blur-2xl rounded-full"></div>}
                      <div className="flex justify-between items-start mb-5 relative z-10">
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); handleSelection(e, index, server.id); }} className={`transition-colors ${isSelected ? 'text-violet-600 dark:text-violet-500' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}>{isSelected ? <CheckSquare size={20} /> : <Square size={20} />}</button>
                          <span onClick={(e) => { e.stopPropagation(); copyToClipboard(server.id, 'ID'); }} className="font-mono font-bold text-lg text-slate-900 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer">{server.id}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(server); }} className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100"><Edit2 size={16} /></button>
                      </div>

                      <div className="space-y-3 mb-6 relative z-10">
                        <button onClick={(e) => { e.stopPropagation(); openIPsModal(server.id); }} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-left bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-500/50 p-2 rounded-lg w-full group/ip">
                          <Network size={14} className="group-hover/ip:text-violet-600 dark:group-hover/ip:text-violet-400" />
                          <span className={`font-mono ${mainIp === '-' && 'italic'}`}>{mainIp}</span>
                          {extraIps > 0 && <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded ml-auto">+{extraIps} IPs</span>}
                        </button>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate" title={server.provider}>{server.provider}</div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-4 relative z-10">
                        <StatusBadge status={server.status} />
                        <div className="relative">
                          <button onClick={(e) => handleMenuToggle(e, server.id)} className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 py-1.5 px-3 rounded-lg border transition-colors ${openMenuId === server.id ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white'}`}>Actions <ChevronUp size={12} /></button>
                          {openMenuId === server.id && (
                            <div className={`absolute right-0 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 animate-spring-up py-1.5 ${menuPosition === 'top' ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'}`}>
                              <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 mb-1 text-left">Move to...</div>
                              {CATEGORIES.filter(c => c.key !== server.category).map(c => (
                                <button key={c.key} onClick={(e) => { e.stopPropagation(); handleMove(server.id, c.key); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-3 font-medium"><span className={`w-2 h-2 rounded-full ${c.color.split(' ')[0].replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`}></span>{c.label}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-spring-up">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-slate-900 dark:text-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] px-3 py-3 flex items-center gap-4 border border-violet-200 dark:border-violet-500/20 ring-1 ring-slate-200 dark:ring-white/5">
            <div className="pl-4 pr-3 flex items-center gap-4 border-r border-slate-200 dark:border-slate-700 mr-1"><span className="font-bold text-sm bg-violet-600 shadow-[0_0_15px_rgba(124,58,237,0.5)] px-3 py-1.5 rounded-lg text-white">{selectedIds.size} Selected</span><button onClick={() => setSelectedIds(new Set())} className="text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-bold transition-colors uppercase tracking-wider text-xs">Clear</button></div>
            <div className="relative"><button onClick={(e) => { e.stopPropagation(); setIsBulkMenuOpen(!isBulkMenuOpen); setIsBulkStatusMenuOpen(false); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${isBulkMenuOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>Move <ChevronUp size={16} /></button>{isBulkMenuOpen && (<div className="absolute bottom-full left-0 mb-4 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden py-2 text-slate-800 dark:text-slate-200 animate-spring-up origin-bottom-left">{CATEGORIES.map(c => (<button key={c.key} onClick={(e) => { e.stopPropagation(); handleBulkMove(c.key); }} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 font-medium"><span className={`w-2 h-2 rounded-full ${c.color.split(' ')[0].replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`}></span> {c.label}</button>))}</div>)}</div>
            <div className="relative"><button onClick={(e) => { e.stopPropagation(); setIsBulkStatusMenuOpen(!isBulkStatusMenuOpen); setIsBulkMenuOpen(false); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${isBulkStatusMenuOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>Status <ChevronUp size={16} /></button>{isBulkStatusMenuOpen && (<div className="absolute bottom-full left-0 mb-4 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden py-2 text-slate-800 dark:text-slate-200 animate-spring-up origin-bottom-left">{STATUS_OPTIONS.map(status => (<button key={status} onClick={(e) => { e.stopPropagation(); handleBulkStatus(status); }} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 font-bold tracking-wide uppercase transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0">{status}</button>))}</div>)}</div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <button onClick={handleBulkCopy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors" title="Copy IDs"><Copy size={18} /></button>
            <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500 hover:text-rose-700 dark:hover:text-white text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500 transition-all shadow-[0_0_15px_rgba(244,63,94,0.1)]" title="Delete"><Trash2 size={18} /></button>
          </div>
        </div>
      )}

      {isIPModalOpen && activeServer && <IPsModal server={activeServer} onClose={() => setIsIPModalOpen(false)} onAutoSave={triggerAutoSave} copyToClipboard={copyToClipboard} syncState={syncState} />}
      <AddServerModal isOpen={isAddServerModalOpen} onClose={() => setIsAddServerModalOpen(false)} editingId={editingId} newServerForm={newServerForm} setNewServerForm={setNewServerForm} onSubmit={handleSaveModal} />
    </div>
  );
}
