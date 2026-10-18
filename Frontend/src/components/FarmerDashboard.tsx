/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, AlertCircle, Calendar, 
  MapPin, ShieldAlert, Sparkles, Sprout, ShieldCheck, 
  Settings, ArrowUpRight, CheckCircle2, ChevronRight, 
  ArrowRight, PhoneCall, Volume2, Info, BookOpen, AlertOctagon, HelpCircle
} from 'lucide-react';
import { Language, ZoneInfo, Alert, Farm } from '../types';
import { translations } from '../translations';

interface FarmerDashboardProps {
  currentLanguage: Language;
  onNavigate: (view: string) => void;
  currentTheme: 'light' | 'dark';
  isLargeText: boolean;
  onSpeakText: (text: string) => void;
  activeFarm: Farm;
  registeredFarms: Farm[];
  onSelectFarm: (farm: Farm) => void;
  onTriggerExpertChat: (initialMsg: string) => void;
}

export default function FarmerDashboard({
  currentLanguage,
  onNavigate,
  currentTheme,
  isLargeText,
  onSpeakText,
  activeFarm,
  registeredFarms,
  onSelectFarm,
  onTriggerExpertChat
}: FarmerDashboardProps) {
  const t = translations[currentLanguage];

  // Interactive Farm Zones state representing Ramesh Patil's Onion field in Pimpalgaon (4.5 acres)
  const initialZones: ZoneInfo[] = [
    { 
      id: 'A', 
      name: 'Zone A - East Grid (1.2 Acres)', 
      healthScore: 92, 
      area: '1.2 Acres', 
      status: 'healthy', 
      droneImage: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=400',
      probableCause: 'Optimal nitrogen & irrigation matching.',
      confidence: 96,
      sensorMoisture: 24,
      sensorNitrogen: 'Medium',
      recommendedAction: 'No immediate action. Maintain current irrigation drip schedule.'
    },
    { 
      id: 'B', 
      name: 'Zone B - North Grid (0.8 Acres)', 
      healthScore: 84, 
      area: '0.8 Acres', 
      status: 'good', 
      droneImage: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=400',
      probableCause: 'Slightly low moisture. Soil sensor reads 19%.',
      confidence: 88,
      sensorMoisture: 19,
      sensorNitrogen: 'Medium',
      recommendedAction: 'Increase irrigation duration in Zone B by 10 minutes.'
    },
    { 
      id: 'C', 
      name: 'Zone C - West Grid (1.1 Acres)', 
      healthScore: 68, 
      area: '1.1 Acres', 
      status: 'stressed', 
      droneImage: 'https://images.unsplash.com/photo-1563514223300-b3b0d2a8494d?auto=format&fit=crop&q=80&w=400',
      defectRegion: 'Discolored yellow patches starting to accumulate in row 12.',
      probableCause: 'Low Nitrogen deficiency combined with moisture drop.',
      confidence: 74,
      sensorMoisture: 16,
      sensorNitrogen: 'Low',
      recommendedAction: 'Inspect Row 12 for soil moisture, apply light organic Nitrogen manure after expert approval.'
    },
    { 
      id: 'D', 
      name: 'Zone D - Center Grid (1.0 Acres)', 
      healthScore: 48, 
      area: '1.0 Acres', 
      status: 'critical', 
      droneImage: 'https://images.unsplash.com/photo-1500651230202-059b853c5e59?auto=format&fit=crop&q=80&w=400',
      defectRegion: 'Widespread circular spot clusters. Suspected early blight or downy mildew visual pattern.',
      probableCause: 'High humidity (74%) and leaf moisture trigger early fungal spots.',
      confidence: 72,
      sensorMoisture: 21,
      sensorNitrogen: 'Medium',
      recommendedAction: 'IMMEDIATE field confirmation required. Avoid instant massive chemical spray until checked by local Krishi officer.'
    },
    { 
      id: 'E', 
      name: 'Zone E - South boundary (0.4 Acres)', 
      healthScore: 0, 
      area: '0.4 Acres', 
      status: 'unscanned', 
      droneImage: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400',
      recommendedAction: 'Not scanned during last drone pass due to power-line clearance hazards.'
    }
  ];

  const [zones, setZones] = useState<ZoneInfo[]>(initialZones);
  const [selectedZone, setSelectedZone] = useState<ZoneInfo>(initialZones[3]); // Default select Zone D (Critical) to demonstrate value

  // Local Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: '1', title: 'Critical Fungal Pattern', description: 'Possible pest-related spot pattern detected in Zone D.', severity: 'critical', zone: 'Zone D', time: 'Yesterday' },
    { id: '2', title: 'Low Soil Moisture Warning', description: 'Soil moisture drop registered below 18% in Zone C.', severity: 'high', zone: 'Zone C', time: '6 Hours ago' },
    { id: '3', title: 'Fertiliser Window', description: 'Optimised stage for onion bulb feeding starting tomorrow.', severity: 'attention', zone: 'Zone B', time: '12 Hours ago' },
    { id: '4', title: 'Heavy Rain Forecast', description: 'Winds and rain may impact drone flight over Nashik on 12th July.', severity: 'info', zone: 'All zones', time: 'Today' }
  ]);

  // Recommended actions completing helper
  const handleCompleteAction = (alertId: string) => {
    setAlerts(alerts.map(a => a.id === alertId ? { ...a, completed: true } : a));
  };

  // Sound read out helper
  const readZoneAdvisory = (zone: ZoneInfo) => {
    const textToSpeak = `${zone.name} health score is ${zone.healthScore || 'not scanned'}. Probable issue: ${zone.probableCause || 'unscanned area'}. Recommended steps: ${zone.recommendedAction}`;
    onSpeakText(textToSpeak);
  };

  return (
    <div className="space-y-6">
      
      {/* Selector & Greetings header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-lg md:text-xl text-emerald-950 dark:text-emerald-100">
              {t.farmer_dashboard} — {activeFarm.name}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
              {activeFarm.crop}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Village: <span className="font-semibold text-gray-800 dark:text-gray-200">Pimpalgaon, Nashik</span> • Sowing: <span className="font-semibold">{activeFarm.sowingDate}</span>
          </p>
        </div>

        {/* Farm Switcher */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-gray-500 shrink-0 hidden sm:inline">Active field:</span>
          <select 
            value={activeFarm.id}
            onChange={(e) => {
              const selected = registeredFarms.find(f => f.id === e.target.value);
              if (selected) onSelectFarm(selected);
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-xs bg-transparent focus:ring-emerald-500 focus:outline-none w-full md:w-48 font-semibold"
            id="farm-select-dropdown"
          >
            {registeredFarms.map((f) => (
              <option key={f.id} value={f.id}>{f.name} ({f.area} Acres)</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Overall Health Circular visual represent */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-gray-500 text-[11px] block">{t.overall_health}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl md:text-2xl font-extrabold text-emerald-800 dark:text-emerald-400">74%</span>
              <span className="text-[10px] font-bold text-amber-600 flex items-center">
                <TrendingDown className="w-3 h-3" /> -3%
              </span>
            </div>
            <span className="text-[9px] text-gray-400 block font-mono">Last scanned: 8 July 2026</span>
          </div>
          {/* Small SVG circle progress */}
          <div className="relative w-14 h-14 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="22" className="stroke-gray-100 dark:stroke-gray-800 fill-none" strokeWidth="4" />
              <circle cx="28" cy="28" r="22" className="stroke-emerald-600 fill-none" strokeWidth="4" strokeDasharray="138" strokeDashoffset={138 - (138 * 74) / 100} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono">74</span>
          </div>
        </div>

        {/* Card 2: Total Cultivated Area */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-1.5">
          <span className="text-gray-500 text-[11px] block">{t.total_area}</span>
          <div className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100">
            {activeFarm.area} <span className="text-xs font-medium text-gray-500">Acres</span>
          </div>
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <Sprout className="w-3 h-3 text-emerald-600" /> Drip Irrigation System Active
          </p>
        </div>

        {/* Card 3: Active Alerts */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-1.5 cursor-pointer" onClick={() => onNavigate('notifications')}>
          <span className="text-gray-500 text-[11px] block">{t.active_alerts}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl md:text-2xl font-extrabold text-red-600 dark:text-red-400">
              {alerts.filter(a => !a.completed).length}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold uppercase">Critical</span>
          </div>
          <p className="text-[10px] text-red-500 font-semibold truncate flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Fungal spot in Zone D
          </p>
        </div>

        {/* Card 4: Soil Status */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-1.5 cursor-pointer" onClick={() => onNavigate('sensors')}>
          <span className="text-gray-500 text-[11px] block">{t.soil_status}</span>
          <div className="text-xl md:text-2xl font-extrabold text-amber-700 dark:text-amber-400">
            21% <span className="text-xs font-medium text-gray-500">Moisture</span>
          </div>
          <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
            ⚠️ Low Nitrogen readings registered
          </p>
        </div>

      </div>

      {/* Main Row: Interactive Farm Map & Click Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Col 1: Clickable Farm map */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-emerald-900 dark:text-emerald-400 flex items-center gap-1.5">
              <MapPin className="w-5 h-5 text-emerald-600" />
              {t.farm_map_title}
            </h3>
            <p className="text-xs text-gray-500">{t.map_instruction}</p>
          </div>

          {/* Interactive HTML Partition Map representation */}
          <div className="relative border border-gray-100 dark:border-gray-800 rounded-2xl bg-gradient-to-br from-emerald-50 to-amber-50/20 dark:from-gray-950 dark:to-emerald-950/20 p-4 h-64 flex flex-col justify-between overflow-hidden">
            
            {/* The Farm field grid representation with clickable styled partitions */}
            <div className="grid grid-cols-5 h-full w-full gap-2 relative">
              
              {/* Zone A: Healthy */}
              <button 
                onClick={() => setSelectedZone(zones[0])}
                className={`col-span-2 rounded-xl transition-all duration-200 p-3 flex flex-col justify-between border-2 text-left relative ${
                  selectedZone.id === 'A' 
                    ? 'bg-emerald-600 text-white border-emerald-400 scale-[1.02] shadow-xl z-10' 
                    : 'bg-emerald-700/80 hover:bg-emerald-700 text-emerald-100 border-transparent'
                }`}
                id="map-zone-A"
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono font-bold text-xs bg-emerald-900/40 px-1.5 py-0.5 rounded text-white">Zone A</span>
                  <span className="text-[10px] font-bold">92%</span>
                </div>
                <div className="text-[10px] font-medium opacity-90 truncate">Healthy Grid</div>
              </button>

              {/* Zone B: Good */}
              <button 
                onClick={() => setSelectedZone(zones[1])}
                className={`col-span-1 rounded-xl transition-all duration-200 p-3 flex flex-col justify-between border-2 text-left relative ${
                  selectedZone.id === 'B' 
                    ? 'bg-emerald-500 text-white border-emerald-300 scale-[1.02] shadow-xl z-10' 
                    : 'bg-emerald-500/80 hover:bg-emerald-500 text-emerald-50 border-transparent'
                }`}
                id="map-zone-B"
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono font-bold text-xs bg-emerald-800/40 px-1.5 py-0.5 rounded text-white">Zone B</span>
                  <span className="text-[10px] font-bold">84%</span>
                </div>
                <div className="text-[10px] font-medium opacity-90 truncate">Good Soil</div>
              </button>

              {/* Zone C: Stressed */}
              <button 
                onClick={() => setSelectedZone(zones[2])}
                className={`col-span-2 rounded-xl transition-all duration-200 p-3 flex flex-col justify-between border-2 text-left relative ${
                  selectedZone.id === 'C' 
                    ? 'bg-amber-600 text-white border-amber-400 scale-[1.02] shadow-xl z-10' 
                    : 'bg-amber-600/80 hover:bg-amber-600 text-amber-50 border-transparent'
                }`}
                id="map-zone-C"
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono font-bold text-xs bg-amber-900/40 px-1.5 py-0.5 rounded text-white font-black">Zone C</span>
                  <span className="text-[10px] font-bold">68%</span>
                </div>
                <div className="text-[10px] font-bold flex items-center gap-1 text-amber-200 animate-pulse">
                  ⚠️ Nitrogen Drop
                </div>
              </button>

              {/* Zone D: Critical */}
              <button 
                onClick={() => setSelectedZone(zones[3])}
                className={`col-span-3 rounded-xl transition-all duration-200 p-3 flex flex-col justify-between border-2 text-left relative ${
                  selectedZone.id === 'D' 
                    ? 'bg-red-600 text-white border-red-300 scale-[1.02] shadow-xl z-10 animate-pulse' 
                    : 'bg-red-600/80 hover:bg-red-600 text-red-50 border-transparent'
                }`}
                id="map-zone-D"
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono font-bold text-xs bg-red-900/40 px-1.5 py-0.5 rounded text-white font-black">Zone D</span>
                  <span className="text-[10px] font-bold">48%</span>
                </div>
                <div className="text-[10px] font-bold flex items-center gap-1 text-red-200">
                  🛑 Fungal pattern found
                </div>
              </button>

              {/* Zone E: Unscanned */}
              <button 
                onClick={() => setSelectedZone(zones[4])}
                className={`col-span-2 rounded-xl transition-all duration-200 p-3 flex flex-col justify-between border-2 text-left relative ${
                  selectedZone.id === 'E' 
                    ? 'bg-gray-600 text-white border-gray-400 scale-[1.02] shadow-xl z-10' 
                    : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 border-transparent'
                }`}
                id="map-zone-E"
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono font-bold text-xs bg-gray-400/40 px-1.5 py-0.5 rounded text-white">Zone E</span>
                  <span className="text-[10px] font-bold">--</span>
                </div>
                <div className="text-[10px] font-medium opacity-90 truncate">Powerlines: Unscanned</div>
              </button>

            </div>

            {/* Map Legends */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-gray-100 dark:border-gray-800 pt-3 text-[10px] font-semibold text-gray-500">
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-700"></span> 90%+ Healthy</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> 80-89% Good</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-600"></span> 60-79% Stressed</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-600"></span> Under 60% Critical</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-400"></span> Unscanned</div>
            </div>

          </div>
        </div>

        {/* Col 2: Zone Details Side panel */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
            <h4 className="font-display font-bold text-sm text-emerald-950 dark:text-white flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                selectedZone.status === 'healthy' ? 'bg-emerald-600' :
                selectedZone.status === 'good' ? 'bg-emerald-400' :
                selectedZone.status === 'stressed' ? 'bg-amber-600' :
                selectedZone.status === 'critical' ? 'bg-red-600' : 'bg-gray-400'
              }`}></span>
              {selectedZone.name}
            </h4>

            {/* Read Aloud button */}
            <button 
              onClick={() => readZoneAdvisory(selectedZone)}
              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 text-[10px] font-bold flex items-center gap-1"
              title="Speak Zone Details"
              id={`read-aloud-${selectedZone.id}`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{t.speak_advisory}</span>
            </button>
          </div>

          {/* Captured drone anomaly image */}
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800 border">
            <img 
              src={selectedZone.droneImage} 
              alt={selectedZone.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {selectedZone.status === 'critical' && (
              <div className="absolute inset-0 border-4 border-red-500 animate-pulse flex items-center justify-center bg-red-500/10">
                <div className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono shadow-md">
                  Pest Abnormality Highlighted
                </div>
              </div>
            )}
            {selectedZone.status === 'stressed' && (
              <div className="absolute inset-0 border-4 border-amber-500 flex items-center justify-center bg-amber-500/10">
                <div className="bg-amber-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono shadow-md">
                  Yellowing / Wilt detected
                </div>
              </div>
            )}
          </div>

          {/* Metadata detail table */}
          <div className="space-y-3.5 text-xs text-gray-700 dark:text-gray-300">
            {selectedZone.status !== 'unscanned' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border">
                    <span className="text-[10px] text-gray-500 block">Health Score</span>
                    <span className="font-extrabold text-sm text-gray-900 dark:text-white">{selectedZone.healthScore} / 100</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border">
                    <span className="text-[10px] text-gray-500 block">Confidence Level</span>
                    <span className="font-extrabold text-sm text-gray-900 dark:text-white">{selectedZone.confidence}%</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border space-y-1.5">
                  <span className="text-[10px] text-gray-500 block">Ground Sensors readings</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-gray-800 dark:text-gray-200">
                    <div>Moisture: <span className="font-bold">{selectedZone.sensorMoisture}%</span></div>
                    <div>Nitrogen: <span className="font-bold">{selectedZone.sensorNitrogen}</span></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 font-bold block">{t.probable_issue}</span>
                  <p className="text-xs font-semibold leading-relaxed text-gray-800 dark:text-gray-200">
                    {selectedZone.probableCause}
                  </p>
                </div>

                <div className="space-y-1 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold block uppercase tracking-wider">{t.recommended_action}</span>
                  <p className="text-xs font-medium leading-relaxed text-emerald-900 dark:text-emerald-300">
                    {selectedZone.recommendedAction}
                  </p>
                </div>

                {/* Actions row */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button 
                    onClick={() => onTriggerExpertChat(`I want an expert to review my drone scans for Zone C & D on Shivar field.`)}
                    className="px-3 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    id="zone-action-expert"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Expert Advice</span>
                  </button>
                  <button 
                    onClick={() => onNavigate('booking-flow')}
                    className="px-3 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-md shadow-emerald-700/10"
                    id="zone-action-reinspect"
                  >
                    <span>Reinspect Grid</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-6 text-center space-y-3">
                <AlertOctagon className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-500">{selectedZone.recommendedAction}</p>
                <button 
                  onClick={() => onNavigate('booking-flow')}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Book New Route Pass
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Recommended Action Items */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <h3 className="font-display font-bold text-base text-emerald-950 dark:text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          Field Check Tasks & Recommended Actions
        </h3>

        <div className="space-y-3">
          {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').map((action) => (
            <div 
              key={action.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                action.completed 
                  ? 'bg-gray-50/50 dark:bg-gray-800/20 border-gray-100 dark:border-gray-800 opacity-60' 
                  : 'bg-red-50/40 dark:bg-red-950/10 border-red-200/50 dark:border-red-900/30'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${action.severity === 'critical' ? 'bg-red-600 animate-ping' : 'bg-amber-500'}`}></span>
                  <h4 className={`text-xs font-bold ${action.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                    {action.title} — {action.zone}
                  </h4>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{action.description}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] text-gray-400 font-mono">{action.time}</span>
                {action.completed ? (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">Completed</span>
                ) : (
                  <button 
                    onClick={() => handleCompleteAction(action.id)}
                    className="px-3 py-1 bg-white dark:bg-gray-800 border border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-bold transition-all"
                    id={`complete-task-${action.id}`}
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Buttons Grid */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">Quick Shortcuts</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => onNavigate('booking-flow')} className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-center hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-all border border-emerald-100/50 space-y-1 cursor-pointer">
            <span className="text-xl block">🚁</span>
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-400">{t.book_drone_btn}</span>
          </button>
          <button onClick={() => onNavigate('sensors')} className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/10 text-center hover:bg-amber-100/20 transition-all border border-amber-100/30 space-y-1 cursor-pointer">
            <span className="text-xl block">📊</span>
            <span className="text-xs font-bold text-amber-900 dark:text-amber-400">{t.view_sensors}</span>
          </button>
          <button onClick={() => onNavigate('advisory')} className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-center hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-all border border-emerald-100/50 space-y-1 cursor-pointer">
            <span className="text-xl block">🌾</span>
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-400">Crop Advice</span>
          </button>
          <button onClick={() => onNavigate('expert')} className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/10 text-center hover:bg-amber-100/20 transition-all border border-amber-100/30 space-y-1 cursor-pointer">
            <span className="text-xl block">👨‍🌾</span>
            <span className="text-xs font-bold text-amber-900 dark:text-amber-400">{t.expert}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
