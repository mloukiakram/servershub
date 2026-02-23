import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, BarChart, Bar } from 'recharts';
import { CATEGORIES } from '../lib/constants';

export default function Dashboard({ servers, isDark }) {
    const providerData = useMemo(() => {
        const counts = {};
        servers.forEach(s => counts[s.provider] = (counts[s.provider] || 0) + 1);
        return Object.keys(counts).map((key, i) => ({
            name: key,
            value: counts[key],
            color: `hsl(${(i * 137.5) % 360}, 70%, 60%)`
        })).sort((a, b) => b.value - a.value);
    }, [servers]);

    const categoryData = useMemo(() => {
        return CATEGORIES.map(c => {
            const count = servers.filter(s => s.category === c.key).length;
            if (count === 0) return null;
            let hslVal = isDark ? '#94a3b8' : '#64748b'; // default
            if (c.key === 'Production') hslVal = isDark ? '#34d399' : '#059669';
            else if (c.key === 'Issues') hslVal = isDark ? '#fb7185' : '#e11d48';
            else if (c.key === 'Others') hslVal = isDark ? '#60a5fa' : '#2563eb';
            else if (c.key === 'Test') hslVal = isDark ? '#a78bfa' : '#7c3aed';
            else if (c.key === 'Low Delivery') hslVal = isDark ? '#fbbf24' : '#d97706';
            return { name: c.label, value: count, fill: hslVal };
        }).filter(Boolean);
    }, [servers, isDark]);

    const activeCount = servers.filter(s => s.status === 'Active').length;
    const healthPercentage = servers.length ? Math.round((activeCount / servers.length) * 100) : 100;

    // Theme-aware Recharts configurations
    const axisTickColor = isDark ? '#94a3b8' : '#64748b';
    const tooltipBg = isDark ? '#0f172a' : '#ffffff';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';
    const healthCircleEmpty = isDark ? '#1e293b' : '#e2e8f0';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-enter">
            {/* Health Overview */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-2xl p-6 shadow-sm dark:shadow-xl relative overflow-hidden group">
                <div className="absolute -inset-2 bg-emerald-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h3 className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wider uppercase mb-5 relative z-10">System Health</h3>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" fill="none" stroke={healthCircleEmpty} strokeWidth="8"></circle>
                            <circle cx="48" cy="48" r="40" fill="none" stroke={healthPercentage > 90 ? (isDark ? "#34d399" : "#10b981") : healthPercentage > 75 ? (isDark ? "#fbbf24" : "#f59e0b") : (isDark ? "#fb7185" : "#f43f5e")} strokeWidth="8" strokeLinecap="round" style={{ strokeDasharray: 251.2, strokeDashoffset: 251.2 - (251.2 * healthPercentage) / 100, transition: 'stroke-dashoffset 1s ease-in-out' }}></circle>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-2xl font-bold text-slate-800 dark:text-white leading-none">{healthPercentage}%</span>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-none dark:shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
                            <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{activeCount} Active</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-rose-500 dark:bg-rose-400 shadow-none dark:shadow-[0_0_10px_rgba(251,113,133,0.5)]"></span>
                            <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{servers.length - activeCount} Needs Attention</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Provider Distribution */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-2xl p-6 shadow-sm dark:shadow-xl lg:col-span-2 relative overflow-hidden group">
                <div className="absolute -inset-2 bg-indigo-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h3 className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wider uppercase mb-2 relative z-10">Provider Distribution</h3>
                <div className="h-48 w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={providerData} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: axisTickColor, fontSize: 12, fontWeight: 500 }} width={120} />
                            <RechartsTooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px', color: tooltipText, boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {providerData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Categories Distribution */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 backdrop-blur-md rounded-2xl p-6 shadow-sm dark:shadow-xl lg:col-span-3 relative overflow-hidden group">
                <div className="absolute -inset-2 bg-violet-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h3 className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wider uppercase mb-2 relative z-10">Servers by Category</h3>
                <div className="h-64 w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={{ stroke: axisTickColor }}>
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(0,0,0,0)" />
                                ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px', color: tooltipText, boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} itemStyle={{ color: tooltipText }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
