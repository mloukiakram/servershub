import React from 'react';
import { X } from 'lucide-react';
import { CATEGORIES, STATUS_OPTIONS } from '../lib/constants';

export default function AddServerModal({ isOpen, onClose, editingId, newServerForm, setNewServerForm, onSubmit }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-enter" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl dark:shadow-indigo-500/10 w-full max-w-md overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{editingId ? 'Edit Server Metadata' : 'Add New Server'}</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={onSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">ID</label>
                        <input required disabled={!!editingId} className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg px-4 py-2.5 text-base font-mono focus:ring-1 focus:ring-violet-500/50 outline-none transition-all disabled:opacity-50 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm dark:shadow-none" value={newServerForm.id} onChange={e => setNewServerForm({ ...newServerForm, id: e.target.value })} placeholder="e.g. sl2100" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Provider</label>
                        <input required className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg px-4 py-2.5 text-base focus:ring-1 focus:ring-violet-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm dark:shadow-none" value={newServerForm.provider} onChange={e => setNewServerForm({ ...newServerForm, provider: e.target.value })} placeholder="Provider Name" />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Category</label>
                            <div className="relative">
                                <select className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-violet-500/50 outline-none transition-all appearance-none shadow-sm dark:shadow-none" value={newServerForm.category} onChange={e => setNewServerForm({ ...newServerForm, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c.key} value={c.key} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">{c.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</label>
                            <div className="relative">
                                <select className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-violet-500/50 outline-none transition-all appearance-none shadow-sm dark:shadow-none" value={newServerForm.status} onChange={e => setNewServerForm({ ...newServerForm, status: e.target.value })}>
                                    {STATUS_OPTIONS.map(status => <option key={status} value={status} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">{status}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 mt-8">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="px-7 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-md dark:shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all hover:scale-[1.02] active:scale-95">{editingId ? 'Save Changes' : 'Create Server'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
