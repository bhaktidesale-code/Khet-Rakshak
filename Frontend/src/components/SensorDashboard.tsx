/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, Sprout, TrendingUp, TrendingDown, Clock, 
  Plus, Table, Info, LineChart, CheckCircle2, ChevronRight, HelpCircle
} from 'lucide-react';
import { Language, SensorData } from '../types';
import { translations } from '../translations';

interface SensorDashboardProps {
  currentLanguage: Language;
  currentTheme: 'light' | 'dark';
}

export default function SensorDashboard({
  currentLanguage,
  currentTheme
}: SensorDashboardProps) {
  const t = translations[currentLanguage];

  // Core sensor metrics state representing active readings
  const [metrics, setMetrics] = useState<Record<string, { value: string; range: string; status: 'normal' | 'low' | 'high'; icon: string }>>({
    moisture: { value: '21%', range: '22% - 28%', status: 'low', icon: '💧' },
    nitrogen: { value: 'Low', range: 'Medium to High', status: 'low', icon: '🧪' },
    phosphorus: { value: 'Medium', range: 'Medium to High', status: 'normal', icon: '🧪' },
    potassium: { value: 'High', range: 'Medium to High', status: 'normal', icon: '🧪' },
    ph: { value: '6.4', range: '6.0 - 7.2', status: 'normal', icon: '🍋' },
    humidity: { value: '69%', range: '50% - 70%', status: 'normal', icon: '☁️' },
    air_temp: { value: '31°C', range: '24°C - 35°C', status: 'normal', icon: '☀️' },
    rainfall: { value: '1.2 mm', range: '0 - 5 mm', status: 'normal', icon: '🌧️' }
  });

  // Zone wise matrix readings
  const [zoneReadings, setZoneReadings] = useState([
    { zone: 'Zone A - East Grid', moisture: '24%', N: 'Medium', P: 'High', K: 'High', pH: '6.5', temp: '29°C', status: 'Optimal' },
    { zone: 'Zone B - North Grid', moisture: '19%', N: 'Medium', P: 'Medium', K: 'High', pH: '6.4', temp: '31°C', status: 'Low Moisture' },
    { zone: 'Zone C - West Grid', moisture: '16%', N: 'Low', P: 'Medium', K: 'Medium', pH: '6.3', temp: '32°C', status: 'Critical' },
    { zone: 'Zone D - Center Grid', moisture: '21%', N: 'Medium', P: 'Medium', K: 'High', pH: '6.4', temp: '30°C', status: 'Fungal Risk' }
  ]);

  // Form states for adding manual reading
  const [manualZone, setManualZone] = useState('Zone C - West Grid');
  const [manualMoisture, setManualMoisture] = useState('18');
  const [manualN, setManualN] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [manualP, setManualP] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [manualK, setManualK] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [manualPH, setManualPH] = useState('6.2');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleInsertManualReading = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update matching zone in zoneReadings matrix
    setZoneReadings(zoneReadings.map((r) => {
      if (r.zone.includes(manualZone.split(' ')[1])) {
        return {
          ...r,
          moisture: `${manualMoisture}%`,
          N: manualN,
          P: manualP,
          K: manualK,
          pH: manualPH,
          status: 'Farmer Verified'
        };
      }
      return r;
    }));

    // If Zone C was edited, update global indicators
    if (manualZone.includes('West')) {
      setMetrics({
        ...metrics,
        moisture: { value: `${manualMoisture}%`, range: '22% - 28%', status: parseInt(manualMoisture) < 22 ? 'low' : 'normal', icon: '💧' },
        nitrogen: { value: manualN, range: 'Medium to High', status: manualN === 'Low' ? 'low' : 'normal', icon: '🧪' }
      });
    }

    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-emerald-950 dark:text-white">Ground Sensor Dashboard</h2>
          <p className="text-xs text-gray-500">Tier-2 verification pins monitoring soil mineral levels and real-time plant root moisture.</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold font-mono uppercase">
          🚨 Simulated Data Active
        </span>
      </div>

      {/* Success Notification pop-up */}
      {showSuccessToast && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          ✓ Ground readings logged successfully. AI crop health score and recommended steps re-calculating...
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Moisture */}
        <div className="bg-white dark:bg-gray-900 p-4.5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Root Moisture</span>
            <span className="text-lg">💧</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl md:text-2xl font-black text-amber-600">{metrics.moisture.value}</span>
            <span className="text-[9px] text-gray-400 font-mono">({metrics.moisture.range})</span>
          </div>
          <p className="text-[10px] text-amber-600 font-medium">⚠️ Deficit detected in Western sections.</p>
        </div>

        {/* Nitrogen */}
        <div className="bg-white dark:bg-gray-900 p-4.5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Nitrogen (N)</span>
            <span className="text-lg">🧪</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl md:text-2xl font-black text-red-600">{metrics.nitrogen.value}</span>
            <span className="text-[9px] text-gray-400 font-mono">(Medium optimal)</span>
          </div>
          <p className="text-[10px] text-red-500 font-semibold">🛑 Low value. Nitrogen feeding required.</p>
        </div>

        {/* Soil pH */}
        <div className="bg-white dark:bg-gray-900 p-4.5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Soil pH</span>
            <span className="text-lg">🍋</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl md:text-2xl font-black text-emerald-800 dark:text-emerald-400">{metrics.ph.value}</span>
            <span className="text-[9px] text-gray-400 font-mono">(6.0 - 7.2)</span>
          </div>
          <p className="text-[10px] text-emerald-600 font-medium">✓ Highly suited for Onion crop variety.</p>
        </div>

        {/* Air Temp */}
        <div className="bg-white dark:bg-gray-900 p-4.5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Air Temp</span>
            <span className="text-lg">☀️</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">{metrics.air_temp.value}</span>
            <span className="text-[9px] text-gray-400 font-mono">(31°C - 34°C)</span>
          </div>
          <p className="text-[10px] text-gray-400 font-mono">Last synced: 10 mins ago</p>
        </div>

      </div>

      {/* Moisture trend visualizer */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <h3 className="font-display font-bold text-sm text-gray-950 dark:text-white flex items-center gap-1.5">
          <LineChart className="w-5 h-5 text-emerald-600" />
          Weekly Soil Moisture Trend (Simulated)
        </h3>

        {/* Custom SVG line chart */}
        <div className="relative h-44 border-b border-l border-gray-100 dark:border-gray-800 pb-2 pl-4 flex items-end">
          {/* SVG representation of a line going down and then recovering */}
          <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 400 100" preserveAspectRatio="none">
            {/* The line path representing moisture going from 26% to 16% and recovery to 21% */}
            <path 
              d="M 10,20 Q 80,40 150,75 T 300,50 T 400,30" 
              fill="none" 
              stroke="#059669" 
              strokeWidth="3.5" 
            />
            {/* Dots */}
            <circle cx="150" cy="75" r="5" fill="#f59e0b" />
            <circle cx="400" cy="30" r="5" fill="#059669" />
          </svg>

          {/* X axis labels */}
          <div className="absolute inset-x-0 bottom-1 flex justify-between px-6 text-[9px] font-mono font-bold text-gray-400 uppercase">
            <span>Mon (26%)</span>
            <span>Wed (22%)</span>
            <span>Fri (16% low)</span>
            <span>Today (21%)</span>
          </div>
        </div>
      </div>

      {/* Row 2: Zonewise Table & Manual reading Injector form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Table representation */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-display font-bold text-sm text-emerald-950 dark:text-white">Zone-Wise Soil Matrix</h3>
            <span className="text-[10px] text-gray-400 font-mono">4 active grids telemetry</span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase font-mono text-[9px] tracking-widest pb-2">
                  <th className="py-2.5 font-bold">Zone Grid</th>
                  <th className="py-2.5 font-bold">Moisture</th>
                  <th className="py-2.5 font-bold">Nitrogen</th>
                  <th className="py-2.5 font-bold">Phosphorus</th>
                  <th className="py-2.5 font-bold">Potassium</th>
                  <th className="py-2.5 font-bold">pH</th>
                  <th className="py-2.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {zoneReadings.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-3 font-semibold text-gray-900 dark:text-white">{r.zone}</td>
                    <td className="py-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">{r.moisture}</td>
                    <td className={`py-3 font-bold ${r.N === 'Low' ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{r.N}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">{r.P}</td>
                    <td className="py-3 text-gray-700 dark:text-gray-300">{r.K}</td>
                    <td className="py-3 font-mono text-gray-700 dark:text-gray-300">{r.pH}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        r.status === 'Optimal' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'Critical' ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manual reading injector form */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">Manual Reading Log</h3>
            <p className="text-xs text-gray-500">No telemetry sensors? Input physical soil lab test values to sync diagnostics.</p>
          </div>

          <form onSubmit={handleInsertManualReading} className="space-y-3.5 text-xs">
            
            <div className="space-y-1">
              <label className="font-semibold text-gray-500">Select Zone</label>
              <select 
                value={manualZone}
                onChange={e => setManualZone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200"
              >
                <option value="Zone A - East Grid">Zone A (Healthy East)</option>
                <option value="Zone B - North Grid">Zone B (Good North)</option>
                <option value="Zone C - West Grid">Zone C (Stressed West)</option>
                <option value="Zone D - Center Grid">Zone D (Critical Center)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-500">Soil Moisture (%)</label>
              <input 
                type="number" 
                value={manualMoisture} 
                onChange={e => setManualMoisture(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200"
                id="manual-moisture-input"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-gray-400 text-[10px]">Nitrogen (N)</label>
                <select value={manualN} onChange={e => setManualN(e.target.value as any)} className="w-full px-2 py-1.5 border rounded-lg">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-400 text-[10px]">Phosphorus (P)</label>
                <select value={manualP} onChange={e => setManualP(e.target.value as any)} className="w-full px-2 py-1.5 border rounded-lg">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-400 text-[10px]">Potassium (K)</label>
                <select value={manualK} onChange={e => setManualK(e.target.value as any)} className="w-full px-2 py-1.5 border rounded-lg">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-500">Soil pH</label>
              <input 
                type="number" 
                step="0.1" 
                value={manualPH} 
                onChange={e => setManualPH(e.target.value)} 
                className="w-full px-3 py-2 rounded-xl border border-gray-200"
                id="manual-ph-input"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow shadow-emerald-700/15"
              id="manual-reading-submit-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Update Diagnostics</span>
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
