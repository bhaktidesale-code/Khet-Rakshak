/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, ArrowRight, UploadCloud, RefreshCw, ZoomIn, 
  ChevronRight, AlertOctagon, HelpCircle, FileText, CheckCircle2, Sparkles
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface DroneAnalysisProps {
  currentLanguage: Language;
  onNavigate: (view: string) => void;
  onSpeakText: (text: string) => void;
}

export default function DroneAnalysis({
  currentLanguage,
  onNavigate,
  onSpeakText
}: DroneAnalysisProps) {
  const t = translations[currentLanguage];

  // Upload simulation states: 'idle' | 'uploading' | 'processing' | 'done'
  const [stage, setStage] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
  const [selectedDemoFile, setSelectedDemoFile] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);

  // Split screen comparison slide value (NDVI toggle)
  const [showNdviOverlay, setShowNdviOverlay] = useState(false);

  const processingMilestones = [
    'Verifying camera metadata & GPS alignment...',
    'Performing RGB color compensation adjustments...',
    'Extracting Normalised Difference Vegetation Index (NDVI)...',
    'Scanning boundary matrix for visible color drop partitions...',
    'Highlighting suspicious chlorosis spot clusters...',
    'Comparing data trends with registered soil NPK sensors...',
    'Compiling advisory diagnosis & recommendations...'
  ];

  const handleStartAnalysis = (demoFile: string) => {
    setSelectedDemoFile(demoFile);
    setStage('uploading');
    
    // Step 1: Uploading simulation
    setTimeout(() => {
      setStage('processing');
      setProcessingStep(0);
      
      // Step 2: Loop processing steps
      const interval = setInterval(() => {
        setProcessingStep((prev) => {
          if (prev < processingMilestones.length - 1) {
            return prev + 1;
          } else {
            clearInterval(interval);
            setStage('done');
            return prev;
          }
        });
      }, 900);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* Page description */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-emerald-950 dark:text-white">AI Drone Image Analysis</h2>
          <p className="text-xs text-gray-500">Upload drone footage or run simulation checks on previous pilot passes.</p>
        </div>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
          YOLOv8 Engine Ready
        </span>
      </div>

      {/* Stage: Idle - File Upload Selector */}
      {stage === 'idle' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* File drag-drop panel */}
          <div className="md:col-span-8 bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm text-center space-y-6">
            <div className="border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4">
              <UploadCloud className="w-16 h-16 text-emerald-600 animate-bounce" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Drag & drop raw drone footage here</h4>
                <p className="text-xs text-gray-400">Supports RGB JPEG, PNG, TIFF orthomosaic or drone MP4 files.</p>
              </div>
              <button 
                onClick={() => handleStartAnalysis('demo_onion.jpg')}
                className="px-5 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/15"
                id="upload-file-button"
              >
                Browse local files
              </button>
            </div>

            <div className="text-xs text-gray-400 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Accepts up to 2.4 GB raw files. Offline buffering supported.</span>
            </div>
          </div>

          {/* Quick Demo Pre-selected Scan Runs */}
          <div className="md:col-span-4 bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">Run Demonstration Scans</h3>
            <p className="text-xs text-gray-500">Pick pre-loaded raw files captured by Sanjay Patil on 8th July over Pimpalgaon region.</p>
            
            <div className="space-y-2 text-xs">
              {[
                { file: 'onion_wilting_grid.tiff', crop: 'Onion Field Grid B', spots: 'Warning: 2 suspicious areas detected' },
                { file: 'grape_anthracnose_east.tiff', crop: 'Grapes Field Zone A', spots: 'Optimal health score: 91%' }
              ].map((run, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleStartAnalysis(run.file)}
                  className="w-full p-4 rounded-2xl border text-left hover:border-emerald-500 bg-gray-50/50 dark:bg-gray-850 hover:bg-emerald-50/10 transition-all space-y-1 block"
                  id={`demo-scan-${idx}`}
                >
                  <span className="font-bold text-gray-800 dark:text-gray-100 truncate block">{run.file}</span>
                  <p className="text-[11px] text-gray-500">{run.crop} • {run.spots}</p>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Stage: Uploading & Stage: Processing Progress Screen */}
      {(stage === 'uploading' || stage === 'processing') && (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border text-center space-y-6 max-w-xl mx-auto shadow-lg">
          <div className="w-14 h-14 rounded-full border-4 border-t-emerald-600 border-gray-200 animate-spin mx-auto flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-emerald-600" />
          </div>

          <div className="space-y-2">
            <h3 className="font-display font-bold text-base text-gray-900 dark:text-white">
              {stage === 'uploading' ? 'Uploading raw orthomosaic matrix...' : 'AI Pattern Analysis Running...'}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed font-mono">
              {stage === 'uploading' ? 'Sending encrypted binary blocks to cluster servers...' : processingMilestones[processingStep]}
            </p>
          </div>

          {/* Process Timeline steps */}
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-600 h-full transition-all duration-300" 
              style={{ width: `${stage === 'uploading' ? 25 : 30 + (70 * processingStep) / processingMilestones.length}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Stage: Done - AI overlay & diagnostic report summary */}
      {stage === 'done' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Main Visual Dual Comparison Panel */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-gray-100">
              <div>
                <h3 className="font-display font-bold text-base text-gray-900 dark:text-white">NDVI Index Visualiser</h3>
                <p className="text-xs text-gray-500">Toggle original RGB orthomosaic and high precision AI diagnostic heatmap overlay.</p>
              </div>

              {/* Toggle switch */}
              <button 
                onClick={() => setShowNdviOverlay(!showNdviOverlay)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow ${
                  showNdviOverlay 
                    ? 'bg-amber-600 text-white shadow-amber-600/10' 
                    : 'bg-emerald-700 text-white shadow-emerald-700/10'
                }`}
                id="toggle-ndvi-btn"
              >
                <span>{showNdviOverlay ? 'Show Raw RGB image' : 'Show AI NDVI Heatmap'}</span>
              </button>
            </div>

            {/* Simulated Dual Comparison Display */}
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-100 border">
              {showNdviOverlay ? (
                /* Heatmap Representation */
                <div className="w-full h-full relative">
                  <img 
                    src="https://images.unsplash.com/photo-1500651230202-059b853c5e59?auto=format&fit=crop&q=80&w=800" 
                    alt="Heatmap"
                    className="w-full h-full object-cover filter saturate-200 hue-rotate-60"
                    referrerPolicy="no-referrer"
                  />
                  {/* Bounding box overlays */}
                  <div className="absolute top-1/4 left-1/3 w-28 h-20 border-4 border-red-500 bg-red-500/20 rounded flex flex-col justify-between p-1 font-mono text-[9px] text-white">
                    <span className="font-bold bg-red-600 px-1 py-0.5 rounded">BLIGHT_SUSPECT (74%)</span>
                    <span className="text-right">Row 12 Grid C</span>
                  </div>
                </div>
              ) : (
                /* Raw RGB image */
                <img 
                  src="https://images.unsplash.com/photo-1500651230202-059b853c5e59?auto=format&fit=crop&q=80&w=800" 
                  alt="Raw RGB"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>

          {/* Stressed patch comparative zoom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* Box 1: Suspected zoom */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
              <h4 className="font-display font-bold text-sm text-red-700 flex items-center gap-1.5">
                <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" />
                Isolated Defect Zoom (West Grid - Zone C/D)
              </h4>

              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Zoomed portion */}
                <div className="relative rounded-xl overflow-hidden aspect-square border">
                  <img 
                    src="https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=300" 
                    alt="Zoomed issue"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-red-500/10 border-2 border-red-500 flex items-end p-2 text-[8px] font-mono font-bold text-white bg-gradient-to-t from-red-600/60 to-transparent">
                    CHLOROSIS SPOTS
                  </div>
                </div>

                {/* Healthy reference */}
                <div className="relative rounded-xl overflow-hidden aspect-square border">
                  <img 
                    src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=300" 
                    alt="Healthy Leaf"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-emerald-500/10 border-2 border-emerald-500 flex items-end p-2 text-[8px] font-mono font-bold text-white bg-gradient-to-t from-emerald-600/60 to-transparent">
                    HEALTHY REFERENCE
                  </div>
                </div>
              </div>

              <div className="text-xs space-y-1.5">
                <span className="font-bold text-gray-500">Visual Diagnosis:</span>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                  Symptom: Outer ring yellowing of leaves. Probable cause: Early blight fungal infestation induced by stagnant humidity. Confidence level: 74%.
                </p>
              </div>
            </div>

            {/* Box 2: Actions & Expert advice */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="font-display font-bold text-sm text-emerald-950 dark:text-white">Ground Diagnostic Advice</h4>
                
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 text-xs text-amber-800 space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] block">Tier-2 Matching Recommendations:</span>
                  <p>✓ Ground soil moisture is low (16% in Row 12). Increase drip valve pressure.</p>
                  <p>✓ FPC expert advice: Refrain from immediate chemical sprays. Spray light organic bio-fungicide during sunset.</p>
                </div>

                <p className="text-[10px] text-gray-500 leading-relaxed italic border-t border-gray-100 pt-3">
                  “AI-generated results are advisory and should be confirmed through field inspection or an agricultural expert.”
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <button 
                  onClick={() => setStage('idle')}
                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold"
                >
                  Analyze New File
                </button>
                <button 
                  onClick={() => onNavigate('dashboard')}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow shadow-emerald-700/15"
                >
                  View My Farm Map
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
