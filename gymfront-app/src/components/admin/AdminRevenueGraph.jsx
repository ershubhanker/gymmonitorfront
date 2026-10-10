// src/components/admin/AdminRevenueGraph.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp, Calendar, IndianRupee, BarChart3, Layers,
  RefreshCw, Crown, Building2, Users, ArrowUpRight, CheckCircle2
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

function fmtINR(val) {
  if (val == null) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

export default function AdminRevenueGraph() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [timeframe, setTimeframe] = useState('monthly'); // 'monthly' | 'yearly'
  const [revenueMetric, setRevenueMetric] = useState('software'); // 'software' | 'total'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);

  const fetchAnalytics = useCallback(async (yearToFetch = selectedYear) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/dashboard/revenue-analytics?year=${yearToFetch}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load revenue analytics:', err);
      toast.error('Failed to load revenue analytics');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchAnalytics(selectedYear);
  }, [fetchAnalytics, selectedYear]);

  // Current items to chart based on monthly or yearly
  const chartItems = useMemo(() => {
    if (!data) return [];
    if (timeframe === 'monthly') {
      return data.monthly || [];
    }
    return data.yearly || [];
  }, [data, timeframe]);

  // Find max value for chart scaling
  const maxVal = useMemo(() => {
    if (!chartItems.length) return 1000;
    const values = chartItems.map((item) =>
      revenueMetric === 'software' ? item.software_revenue || 0 : item.total_revenue || 0
    );
    const m = Math.max(...values, 0);
    return m === 0 ? 1000 : m * 1.15; // 15% head room
  }, [chartItems, revenueMetric]);

  // Peak period
  const peakItem = useMemo(() => {
    if (!chartItems.length) return null;
    let max = -1;
    let best = null;
    chartItems.forEach((item) => {
      const v = revenueMetric === 'software' ? item.software_revenue : item.total_revenue;
      if (v > max) {
        max = v;
        best = item;
      }
    });
    return max > 0 ? best : null;
  }, [chartItems, revenueMetric]);

  const summary = data?.summary || {};

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl text-white shadow-md shadow-purple-900/40">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                Revenue & Software Plan Analytics
                <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  Live SaaS
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Gym owner software subscription plans & custom pricing turnover
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Monthly vs Yearly Switcher */}
          <div className="flex items-center bg-gray-800/80 p-1 rounded-xl border border-gray-700">
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                timeframe === 'monthly'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly View
            </button>
            <button
              onClick={() => setTimeframe('yearly')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                timeframe === 'yearly'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly View
            </button>
          </div>

          {/* Metric Switcher */}
          <div className="flex items-center bg-gray-800/80 p-1 rounded-xl border border-gray-700">
            <button
              onClick={() => setRevenueMetric('software')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                revenueMetric === 'software'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Show Software SaaS Plan subscriptions from gym owners"
            >
              Software Plans
            </button>
            <button
              onClick={() => setRevenueMetric('total')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                revenueMetric === 'total'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Show Software Plans + Member payments turnover"
            >
              Total Turnover
            </button>
          </div>

          {/* Year selector (when in monthly view) */}
          {timeframe === 'monthly' && data?.available_years && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {data.available_years.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => fetchAnalytics(selectedYear)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            title="Refresh revenue data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Key Metric Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Current MRR</span>
            <Crown className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-white">{fmtINR(summary.current_mrr || 0)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Monthly Recurring Revenue</p>
        </div>

        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Annual Run Rate</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <p className="text-xl font-bold text-purple-300">{fmtINR(summary.current_arr || 0)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">ARR (MRR × 12)</p>
        </div>

        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Software Revenue</span>
            <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400">{fmtINR(summary.total_software_revenue || 0)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Paid by gym owners</p>
        </div>

        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Paid Gyms</span>
            <Building2 className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-bold text-white">
            {summary.paid_gyms_count || 0}
            <span className="text-xs text-gray-500 font-normal"> / {summary.total_gyms || 0} total</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {summary.free_gyms_count || 0} gym(s) on Free plan
          </p>
        </div>

        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Plan Price</span>
            <BarChart3 className="h-3.5 w-3.5 text-pink-400" />
          </div>
          <p className="text-xl font-bold text-pink-300">{fmtINR(summary.avg_plan_price || 0)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Per paid gym/month</p>
        </div>
      </div>

      {/* Main Interactive Graph Canvas */}
      <div className="relative pt-2">
        {/* Peak Callout Badge */}
        {peakItem && (
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="text-gray-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Peak Period: <strong className="text-white">{peakItem.label}</strong> with{' '}
              <span className="text-emerald-400 font-bold">
                {fmtINR(revenueMetric === 'software' ? peakItem.software_revenue : peakItem.total_revenue)}
              </span>
            </span>
            <div className="flex items-center gap-3 text-[11px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gradient-to-t from-purple-600 to-indigo-500" />
                <span>Software SaaS Plan Revenue</span>
              </div>
              {revenueMetric === 'total' && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gradient-to-t from-teal-600 to-emerald-500" />
                  <span>Member Turnover</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SVG/HTML Chart Container */}
        <div className="h-64 w-full flex items-end gap-2 pt-6 pb-2 px-1 border-b border-gray-800 relative select-none">
          {/* Horizontal Grid Guidelines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-gray-600 w-full" />
            <div className="border-b border-gray-600 w-full" />
            <div className="border-b border-gray-600 w-full" />
            <div className="border-b border-gray-600 w-full" />
          </div>

          {/* Bar Columns */}
          {chartItems.map((item, index) => {
            const val = revenueMetric === 'software' ? item.software_revenue || 0 : item.total_revenue || 0;
            const heightPct = Math.min(100, Math.max(4, (val / maxVal) * 100));
            const isHovered = hoveredItem === index;
            const isPeak = peakItem?.label === item.label && val > 0;

            return (
              <div
                key={item.label || index}
                onMouseEnter={() => setHoveredItem(index)}
                onMouseLeave={() => setHoveredItem(null)}
                className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
              >
                {/* Hover Tooltip Card */}
                {isHovered && (
                  <div className="absolute bottom-full mb-3 z-30 bg-gray-950 border border-gray-700/80 rounded-xl p-3 shadow-2xl min-w-[170px] pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                    <p className="text-xs font-bold text-white border-b border-gray-800 pb-1 mb-1.5 flex items-center justify-between">
                      <span>{item.label}</span>
                      {isPeak && (
                        <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/70 px-1.5 py-0.2 rounded">
                          Peak
                        </span>
                      )}
                    </p>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between items-center text-gray-300">
                        <span className="text-purple-400">Software Plans:</span>
                        <span className="font-bold text-white">{fmtINR(item.software_revenue)}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-300">
                        <span className="text-teal-400">Member Turnover:</span>
                        <span className="font-medium text-gray-200">{fmtINR(item.member_turnover)}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-300 pt-1 border-t border-gray-800 font-semibold">
                        <span>Total Revenue:</span>
                        <span className="text-emerald-400">{fmtINR(item.total_revenue)}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-500 pt-0.5 text-[10px]">
                        <span>Active Paid Gyms:</span>
                        <span className="text-gray-300">{item.paid_gyms ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount on top of bar on hover or peak */}
                {(isHovered || isPeak) && val > 0 && (
                  <span className="text-[10px] font-bold text-purple-300 mb-1 transition-all whitespace-nowrap">
                    {fmtINR(val)}
                  </span>
                )}

                {/* Bar Element */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full max-w-[42px] rounded-t-lg transition-all duration-300 ${
                    isHovered
                      ? 'bg-gradient-to-t from-purple-500 to-pink-500 ring-2 ring-purple-400/50 shadow-lg shadow-purple-900/50 scale-105'
                      : isPeak
                      ? 'bg-gradient-to-t from-purple-600 via-indigo-600 to-cyan-400 shadow-md shadow-purple-900/30'
                      : val > 0
                      ? 'bg-gradient-to-t from-purple-700/80 to-indigo-600/80 group-hover:from-purple-600 group-hover:to-indigo-500'
                      : 'bg-gray-800/50 group-hover:bg-gray-700/60'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="flex items-center justify-between gap-2 pt-2 px-1">
          {chartItems.map((item, index) => (
            <div key={item.label || index} className="flex-1 text-center">
              <span
                className={`text-[11px] font-medium transition-colors block truncate ${
                  hoveredItem === index ? 'text-purple-400 font-bold' : 'text-gray-400'
                }`}
              >
                {item.short_label || item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
