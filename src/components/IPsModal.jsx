import React, { useState, useRef } from 'react';
import { Network, Search, Plus, Trash2, Link, Unlink, Copy, Loader2, CheckCircle2, AlertOctagon, X } from 'lucide-react';

export default function IPsModal({ server, onClose, onAutoSave, copyToClipboard, syncState }) {
    const [globalDomains, setGlobalDomains] = useState(server.global_domains || "");
    const [ipList, setIpList] = useState(server.ip_data || []);
    const [ipSearch, setIpSearch] = useState('');

    const timeoutRef = useRef(null);

    // Debounced Auto-Save
    const triggerSave = (newGlobalDomains, newIpList) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            onAutoSave({
                ...server,
                global_domains: newGlobalDomains,
                ip_data: newIpList
            });
        }, 500); // 500ms debounce
    };

    const handleGlobalDomainsChange = (val) => {
        setGlobalDomains(val);
        triggerSave(val, ipList);
    };

    const handleAddIp = () => {
        const newList = [...ipList, { id: `ip_${Date.now()}`, address: '', useGlobal: true, customDomains: '' }];
        setIpList(newList);
        triggerSave(globalDomains, newList);
    };

    const handleRemoveIp = (idToRemove) => {
        const newList = ipList.filter(ip => ip.id !== idToRemove);
        setIpList(newList);
        triggerSave(globalDomains, newList);
    };

    const handleChangeIp = (idToUpdate, field, value) => {
        const newList = ipList.map(ip => ip.id === idToUpdate ? { ...ip, [field]: value } : ip);
        setIpList(newList);
        triggerSave(globalDomains, newList);
    };

    const globalDomainCount = globalDomains.split('\n').filter(d => d.trim() !== '').length;

    const filteredIps = ipList.filter(ip =>
        ip.address.toLowerCase().includes(ipSearch.toLowerCase()) ||
        (ip.customDomains && ip.customDomains.toLowerCase().includes(ipSearch.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-enter" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl dark:shadow-indigo-500/10 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Network size={20} className="text-violet-500 dark:text-violet-400" />
                                IPs & Domains
                            </h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Server: <span className="font-mono text-violet-600 dark:text-violet-300">{server.id}</span></p>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-2"></div>
                        {syncState === 'saving' && <span className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-full ring-1 ring-slate-200 dark:ring-slate-700/50"><Loader2 size={14} className="animate-spin text-violet-500 dark:text-violet-400" /> Saving...</span>}
                        {syncState === 'saved' && <span className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full ring-1 ring-emerald-200 dark:ring-emerald-500/20 animate-enter"><CheckCircle2 size={14} /> Saved</span>}
                        {syncState === 'error' && <span className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-full ring-1 ring-rose-200 dark:ring-rose-500/20 animate-enter"><AlertOctagon size={14} /> Failed Sync</span>}
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors relative z-10" aria-label="Close modal"><X size={20} /></button>
                </div>

                {/* Content Grid */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* Left Column: Global Domains */}
                    <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/30 flex flex-col">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Global Domain List</h4>
                                <p className="text-xs text-slate-500 mt-0.5">Shared across linked IPs</p>
                            </div>
                            <span className="bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300 text-xs font-bold px-2 py-1 rounded-md ring-1 ring-violet-200 dark:ring-violet-500/20">{globalDomainCount} Domains</span>
                        </div>
                        <div className="p-5 flex-1 flex flex-col min-h-[250px] md:min-h-0 bg-slate-50/50 dark:bg-transparent">
                            <textarea
                                className="w-full flex-1 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-sm font-mono text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 custom-scroll resize-none shadow-sm dark:shadow-none"
                                value={globalDomains}
                                onChange={(e) => handleGlobalDomainsChange(e.target.value)}
                                placeholder="Paste global domains here...&#10;(One per line)"
                                spellCheck="false"
                            />
                            <button
                                onClick={() => copyToClipboard(globalDomains, "Global Domains")}
                                className="mt-3 w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 hover:text-slate-900 dark:hover:text-white"
                            >
                                <Copy size={16} className="text-slate-400 dark:text-slate-500" /> Copy Global Domains
                            </button>
                        </div>
                    </div>

                    {/* Right Column: IPs */}
                    <div className="w-full md:w-2/3 overflow-y-auto custom-scroll p-6 space-y-4 bg-slate-50 dark:bg-slate-950/30">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Server IP Addresses</h4>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                    <input type="text" placeholder="Find IP..." value={ipSearch} onChange={e => setIpSearch(e.target.value)} className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-violet-500/30 outline-none w-32 focus:w-48 transition-all shadow-sm dark:shadow-none" />
                                </div>
                                <button
                                    onClick={handleAddIp}
                                    className="text-sm font-bold text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200 flex items-center gap-1 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 ring-1 ring-violet-200 dark:ring-violet-500/20 px-3 py-1.5 rounded-lg transition-colors dark:shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                                >
                                    <Plus size={16} /> Add IP
                                </button>
                            </div>
                        </div>

                        {filteredIps.length === 0 && (
                            <div className="py-10 text-center text-sm font-medium text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No IPs found.</div>
                        )}

                        {filteredIps.map((ipObj, index) => {
                            const cCount = ipObj.customDomains ? ipObj.customDomains.split('\n').filter(d => d.trim() !== '').length : 0;

                            return (
                                <div key={ipObj.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:border-violet-300 dark:group-hover:border-violet-500/30 transition-colors">
                                    <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                        <div className="flex-1 flex items-center gap-3">
                                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-5">{index + 1}.</span>
                                            <input
                                                className="flex-1 max-w-sm bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-md px-3 py-1.5 text-sm font-mono text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm dark:shadow-none"
                                                value={ipObj.address}
                                                onChange={(e) => handleChangeIp(ipObj.id, 'address', e.target.value)}
                                                placeholder="e.g. 192.168.1.1"
                                            />
                                        </div>
                                        <button onClick={() => handleRemoveIp(ipObj.id)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400 rounded-md transition-colors" aria-label={`Remove IP ${ipObj.address || 'Empty'}`}><Trash2 size={16} /></button>
                                    </div>

                                    <div className="p-4 bg-white dark:bg-slate-900/40 relative">
                                        {/* Link Toggle button overlay */}
                                        <div className="flex justify-center mb-4">
                                            <button
                                                onClick={() => handleChangeIp(ipObj.id, 'useGlobal', !ipObj.useGlobal)}
                                                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm ${ipObj.useGlobal ? 'bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-500/10 dark:border-violet-500/30 dark:text-violet-300 dark:glow-violet' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700'}`}
                                            >
                                                {ipObj.useGlobal ? <Link size={14} /> : <Unlink size={14} />}
                                                {ipObj.useGlobal ? 'Linked to Global Domains' : 'Using Custom Domains'}
                                            </button>
                                        </div>

                                        {/* State: Linked */}
                                        {ipObj.useGlobal && (
                                            <div className="py-4 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/10 flex flex-col items-center justify-center gap-2">
                                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">This IP uses the <span className="text-violet-600 dark:text-violet-400 font-bold">{globalDomainCount}</span> Global Domains.</p>
                                            </div>
                                        )}

                                        {/* State: Unlinked (Custom) */}
                                        {!ipObj.useGlobal && (
                                            <div className="space-y-2 animate-enter">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Custom Domain List <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] ring-1 ring-slate-200 dark:ring-slate-700">{cCount} Domains</span></label>
                                                    <button onClick={() => copyToClipboard(ipObj.customDomains, "Custom Domains")} className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 transition-colors"><Copy size={12} /> Copy Custom</button>
                                                </div>
                                                <textarea
                                                    className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-sm font-mono text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 custom-scroll shadow-sm dark:shadow-none"
                                                    rows="4"
                                                    value={ipObj.customDomains}
                                                    onChange={(e) => handleChangeIp(ipObj.id, 'customDomains', e.target.value)}
                                                    placeholder="Paste custom domains for this specific IP...&#10;(One per line)"
                                                    spellCheck="false"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-between items-center text-sm text-slate-500">
                    <p>Changes are auto-saved seamlessly.</p>
                    <button onClick={onClose} className="px-5 py-2.5 font-bold text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-black dark:hover:text-white rounded-lg transition-all shadow-sm focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500">Done Editing</button>
                </div>
            </div>
        </div>
    );
}
