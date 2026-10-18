/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Volume2, Mic, Calendar, Clock, AlertTriangle, CheckCircle2, 
  HelpCircle, Sprout, ChevronRight, Info, BookOpen
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface CropAdvisoryProps {
  currentLanguage: Language;
  onSpeakText: (text: string) => void;
  onNavigate: (view: string) => void;
}

export default function CropAdvisory({
  currentLanguage,
  onSpeakText,
  onNavigate
}: CropAdvisoryProps) {
  const t = translations[currentLanguage];

  // Calendar toggle view: 'timeline' | 'calendar'
  const [calendarView, setCalendarView] = useState<'timeline' | 'calendar'>('timeline');

  // Mic state simulation
  const [isListening, setIsListening] = useState(false);
  const [voiceQueryText, setVoiceQueryText] = useState('');

  // Sowing Onion June 12th 2026. Current time is July 10th 2026.
  // Crop stage: Vegetative stage (Onion bulb formation starting shortly)
  const [calendarTasks, setCalendarTasks] = useState([
    { id: '1', day: 'July 11', stage: 'Vegetative Feed', task: 'Check Zone C soil moisture. Apply light compost manure.', status: 'pending' },
    { id: '2', day: 'July 15', stage: 'Pest Scouting', task: 'Scout Zone D row 12 for purple blotch fungal marks.', status: 'pending' },
    { id: '3', day: 'July 20', stage: 'Irrigation Check', task: 'Verify drip lines uniformity. Flush silt filters.', status: 'pending' },
    { id: '4', day: 'July 28', stage: 'Bulb Formation Feed', task: 'Apply Potash nutrient feed to optimize bulb weight.', status: 'pending' },
    { id: '5', day: 'June 12', stage: 'Sowing Day', task: 'Planted Onion bulb sets. Configured initial drip grid.', status: 'completed' },
    { id: '6', day: 'July 08', stage: 'Drone Scan 1', task: 'First drone aerial screen. Identified Zone D anomaly.', status: 'completed' }
  ]);

  const advisories = [
    {
      id: 'adv-1',
      category: 'Irrigation Deficit',
      problem: 'Water stress identified in Zone C (Western parcel).',
      why: 'Soil sensor reads 16% moisture. Dry soil reduces nutrient intake.',
      evidence: 'Drone: Dull visual yellowing patterns. Sensor: Low moisture.',
      recom: 'Increase drip irrigation duration in Zone C by 12 minutes daily. Ensure lateral pipe valves are cleared.',
      dont: 'Do not flood the field. Stagnant pools in summer heat will rot onion roots.',
      priority: 'High',
      timeframe: 'Next 24 Hours'
    },
    {
      id: 'adv-2',
      category: 'Fungal Spot Risk',
      problem: 'Suspicious spot clustering in Zone D.',
      why: 'Warm soil coupled with stagnant high humidity (74%) creates optimal conditions for mildew fungus.',
      evidence: 'Drone: Visual circular spots. Operator check: Wet leaf conditions.',
      recom: 'Consult a cooperative officer to examine row 12. If confirmed, spray light bio-agent Trichoderma viride.',
      dont: 'Do not spray chemical fungicides until an expert validates the species in person.',
      priority: 'Critical',
      timeframe: 'Immediate'
    },
    {
      id: 'adv-3',
      category: 'Nutrient Imbalance',
      problem: 'Nitrogen deficiency matching.',
      why: 'Onion leaves require high early nitrogen for vegetative shoot expansion.',
      evidence: 'Sensor: Nitrogen reads Low. Drone: General pale coloring.',
      recom: 'Incorporate neem-coated urea or composted manure near drip lines in Zone C.',
      dont: 'Do not over-apply nitrogen. Excess nitrogen will cause large leaves but very small hollow onion bulbs.',
      priority: 'Attention',
      timeframe: 'Within 3 days'
    }
  ];

  // Voice simulator trigger
  const handleMicTrigger = () => {
    setIsListening(true);
    setVoiceQueryText('Listening to voice query...');
    
    setTimeout(() => {
      setIsListening(false);
      setVoiceQueryText('Question detected: "How much watering does onion need in vegetative stage?"');
      
      // Speak back response
      const reply = "Onions in the vegetative stage require soil moisture between 22 and 26 percent. Water light and frequently through drip irrigation, avoiding pooling.";
      onSpeakText(reply);
    }, 2500);
  };

  const handleToggleTask = (tId: string) => {
    setCalendarTasks(calendarTasks.map(t => t.id === tId ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));
  };

  return (
    <div className="space-y-6">
      
      {/* Page description */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-emerald-950 dark:text-white">Smart Crop Advisories</h2>
          <p className="text-xs text-gray-500">AI recommendations compiled from drone aerial mapping and ground soil sensor cross-analysis.</p>
        </div>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
          Advisory Level: Checked
        </span>
      </div>

      {/* Voice Assistant Section */}
      <div className="bg-gradient-to-br from-emerald-850 to-emerald-950 text-white p-5 rounded-3xl space-y-4 shadow-lg relative overflow-hidden border border-emerald-800">
        <div className="space-y-1 relative z-10">
          <h3 className="font-display font-bold text-base text-emerald-300">Voice Assistant "Krishi Bol"</h3>
          <p className="text-xs text-emerald-100">Tap microphone and ask crop queries in Marathi, Hindi, or English.</p>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          {/* Circular big mic */}
          <button 
            onClick={handleMicTrigger}
            className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse scale-110 shadow-lg shadow-red-500/30' 
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
            id="mic-simulation-btn"
          >
            <Mic className="w-6 h-6" />
          </button>

          <div className="space-y-1 text-xs">
            {voiceQueryText ? (
              <p className="font-mono font-semibold text-amber-300">{voiceQueryText}</p>
            ) : (
              <p className="text-emerald-100">Click the mic button to speak. e.g., "Onion water needs"</p>
            )}
            {isListening && <p className="text-[10px] text-red-200 animate-pulse font-bold">🎙️ Voice lock active...</p>}
          </div>
        </div>
      </div>

      {/* Advisories Grid cards */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">Actionable Advisory Cards</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {advisories.map((adv) => (
            <div 
              key={adv.id} 
              className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 font-bold rounded-full text-[9px] uppercase tracking-wider">
                    {adv.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    adv.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                    adv.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {adv.priority}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-gray-950 dark:text-white">{adv.problem}</h4>
                  <p className="text-gray-500 text-[11px] leading-relaxed">{adv.why}</p>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-850 rounded-xl space-y-1 border border-gray-100">
                  <span className="text-[9px] font-mono font-bold text-gray-400 uppercase">Drone & Sensor Evidence:</span>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400">{adv.evidence}</p>
                </div>

                <div className="space-y-1 text-emerald-800 dark:text-emerald-400">
                  <span className="font-bold block text-[10px] uppercase">✓ WHAT TO DO:</span>
                  <p className="font-medium text-[11px] leading-relaxed">{adv.recom}</p>
                </div>

                <div className="space-y-1 text-red-700">
                  <span className="font-bold block text-[10px] uppercase">❌ WHAT NOT TO DO:</span>
                  <p className="font-semibold text-[11px] leading-relaxed">{adv.dont}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-4 flex items-center justify-between">
                <span className="text-[9px] text-gray-400 font-mono">Target: {adv.timeframe}</span>
                <button 
                  onClick={() => onSpeakText(`${adv.problem}. ${adv.recom}`)}
                  className="p-1.5 rounded-lg hover:bg-gray-50 text-emerald-700 text-[11px] font-bold flex items-center gap-1 shrink-0"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Crop Calendar timeline */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div>
            <h3 className="font-display font-bold text-sm text-emerald-950 dark:text-white">Onion Crop Growth Calendar</h3>
            <p className="text-xs text-gray-500">Milestone timeline tracking based on planting date (June 12th).</p>
          </div>

          {/* View switcher */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold">
            <button onClick={() => setCalendarView('timeline')} className={`px-3 py-1.5 rounded-lg ${calendarView === 'timeline' ? 'bg-white text-emerald-900 shadow-sm' : 'text-gray-500'}`}>Timeline View</button>
            <button onClick={() => setCalendarView('calendar')} className={`px-3 py-1.5 rounded-lg ${calendarView === 'calendar' ? 'bg-white text-emerald-900 shadow-sm' : 'text-gray-500'}`}>Monthly View</button>
          </div>
        </div>

        {calendarView === 'timeline' ? (
          <div className="space-y-4 text-xs">
            {calendarTasks.map((task) => (
              <div 
                key={task.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  task.status === 'completed' 
                    ? 'bg-gray-50/50 dark:bg-gray-800/15 border-gray-100 opacity-60' 
                    : 'bg-emerald-50/20 border-emerald-100/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 font-mono text-center flex flex-col items-center justify-center font-bold text-[9px] shrink-0 text-gray-600 dark:text-gray-300">
                    <span>{task.day.split(' ')[0]}</span>
                    <span className="text-xs">{task.day.split(' ')[1]}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 font-mono uppercase tracking-wider">{task.stage}</span>
                    <p className="font-bold text-gray-900 dark:text-white">{task.task}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                  {task.status === 'completed' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">Done</span>
                  ) : (
                    <button 
                      onClick={() => handleToggleTask(task.id)}
                      className="px-3 py-1 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-full text-[10px] font-bold transition-colors"
                      id={`calendar-done-${task.id}`}
                    >
                      Mark Done
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Calendar grid view */
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-gray-500">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="py-2 bg-gray-50 dark:bg-gray-850 rounded font-bold uppercase text-[8px] tracking-wider">{day}</div>
            ))}
            {/* Blank offset */}
            <div /> <div /> <div />
            {Array.from({ length: 30 }).map((_, idx) => {
              const dayNum = idx + 1;
              const hasTask = dayNum === 11 || dayNum === 15 || dayNum === 20;
              return (
                <div 
                  key={idx} 
                  className={`p-3 border rounded-xl flex flex-col justify-between h-14 ${
                    hasTask 
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-sm' 
                      : 'bg-white dark:bg-gray-900 border-gray-100 text-gray-700'
                  }`}
                >
                  <span className="text-left text-[9px] font-bold font-mono">{dayNum}</span>
                  {hasTask && (
                    <span className="text-[7px] text-right bg-amber-600 text-white px-1 py-0.5 rounded block scale-95 uppercase font-black truncate">Task</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
