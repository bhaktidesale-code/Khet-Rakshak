/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CheckCircle2, Clock, Phone, AlertTriangle, Calendar, 
  MapPin, RefreshCw, XCircle, ChevronRight, HelpCircle
} from 'lucide-react';
import { Language, Booking } from '../types';
import { translations } from '../translations';

interface BookingManagementProps {
  currentLanguage: Language;
  bookings: Booking[];
  onStatusUpdate: (bookingId: string, nextStatus: Booking['status']) => void;
  onCancelBooking: (bookingId: string) => void;
}

export default function BookingManagement({
  currentLanguage,
  bookings,
  onStatusUpdate,
  onCancelBooking
}: BookingManagementProps) {
  const t = translations[currentLanguage];
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'cancelled'>('active');
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<Booking | null>(bookings[0] || null);

  // Status timeline steps
  const steps: { status: Booking['status']; label: string }[] = [
    { status: 'pending', label: 'Received' },
    { status: 'confirmed', label: 'Approved' },
    { status: 'assigned', label: 'Pilot Assigned' },
    { status: 'travelling', label: 'Pilot Travelling' },
    { status: 'started', label: 'Flight Started' },
    { status: 'uploading', label: 'Footage Uploading' },
    { status: 'completed', label: 'Report Ready' }
  ];

  // Filter bookings based on tab
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return b.status !== 'completed' && b.status !== 'cancelled';
    if (activeTab === 'completed') return b.status === 'completed';
    if (activeTab === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Status index helper for timeline matching
  const getStatusIndex = (status: Booking['status']) => {
    return steps.findIndex(s => s.status === status);
  };

  // Simulation advance helper
  const handleAdvanceStatus = (bId: string, currentStatus: Booking['status']) => {
    const idx = steps.findIndex(s => s.status === currentStatus);
    if (idx !== -1 && idx < steps.length - 1) {
      const nextStatus = steps[idx + 1].status;
      onStatusUpdate(bId, nextStatus);
      // Auto update detail preview
      const updated = bookings.find(b => b.id === bId);
      if (updated) {
        setSelectedBookingDetail({ ...updated, status: nextStatus });
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Filters & Grid header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h2 className="font-display font-bold text-lg text-emerald-950 dark:text-white">Drone Service Bookings</h2>
          <p className="text-xs text-gray-500">Track and manage drone scouting and flight patterns.</p>
        </div>

        {/* Tab filters */}
        <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {(['active', 'completed', 'cancelled', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                activeTab === tab 
                  ? 'bg-white dark:bg-gray-700 text-emerald-900 dark:text-white shadow-sm' 
                  : 'text-gray-500'
              }`}
              id={`booking-tab-${tab}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Col 1: Bookings list cards */}
        <div className="lg:col-span-6 space-y-4">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((b) => (
              <div 
                key={b.id}
                onClick={() => setSelectedBookingDetail(b)}
                className={`p-5 rounded-3xl border text-xs space-y-4 transition-all cursor-pointer ${
                  selectedBookingDetail?.id === b.id 
                    ? 'bg-white dark:bg-gray-900 border-emerald-500 shadow-lg ring-1 ring-emerald-500/10' 
                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm hover:border-gray-200'
                }`}
                id={`booking-card-${b.id}`}
              >
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="font-mono text-gray-400 font-bold uppercase tracking-wider">{b.id}</span>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">{b.farmName}</h4>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize ${getStatusColor(b.status)}`}>
                    {b.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-gray-600 dark:text-gray-400 border-t border-b border-gray-100/50 dark:border-gray-800 py-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400">Date & Slot</span>
                    <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{b.dateTime} • {b.timeSlot.split(' ')[0]}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400">Price & Method</span>
                    <p className="font-bold text-gray-800 dark:text-gray-200">₹{b.price} ({b.paymentMethod.toUpperCase()})</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Pilot: <span className="font-bold text-gray-700 dark:text-gray-300">{b.operatorName}</span></span>
                  <div className="flex gap-2">
                    {/* Demo presenter advance shortcut */}
                    {b.status !== 'completed' && b.status !== 'cancelled' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdvanceStatus(b.id, b.status);
                        }}
                        className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 rounded-md border border-emerald-200/50 font-bold hover:bg-emerald-100 text-[10px] flex items-center gap-1 animate-pulse"
                        title="Presentation Mode: Advance status"
                        id={`advance-status-${b.id}`}
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Advance Flight Status</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border text-center space-y-3 opacity-80">
              <span className="text-3xl block">🚁</span>
              <p className="text-xs text-gray-500">No matching bookings found.</p>
            </div>
          )}
        </div>

        {/* Col 2: Live status progress timeline visualizer */}
        <div className="lg:col-span-6 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
          {selectedBookingDetail ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="font-display font-extrabold text-base text-emerald-950 dark:text-white">Active Status Timeline</h3>
                <p className="text-xs text-gray-500">Real-time telemetry feedback for Booking {selectedBookingDetail.id}.</p>
              </div>

              {/* Graphical line steps */}
              <div className="relative pl-6 space-y-6">
                {/* Connector line */}
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-gray-800"></div>

                {steps.map((st, sIdx) => {
                  const isActive = getStatusIndex(selectedBookingDetail.status) >= sIdx;
                  const isCurrent = selectedBookingDetail.status === st.status;
                  
                  return (
                    <div key={st.status} className="relative flex items-start gap-4">
                      {/* Bullet icon */}
                      <div className={`absolute -left-[22px] w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                        isCurrent ? 'bg-amber-500 border-amber-300 scale-125 shadow-md shadow-amber-500/30' :
                        isActive ? 'bg-emerald-600 border-emerald-400' : 'bg-gray-200 border-transparent dark:bg-gray-800'
                      }`} />

                      <div className="space-y-1">
                        <span className={`text-xs font-bold ${
                          isCurrent ? 'text-amber-600 font-extrabold animate-pulse' :
                          isActive ? 'text-emerald-800 dark:text-emerald-400' : 'text-gray-400'
                        }`}>
                          {st.label}
                        </span>
                        {isCurrent && (
                          <p className="text-[10px] text-gray-500 leading-relaxed">
                            {st.status === 'pending' && 'Booking registered. Waiting for outlet team confirmation.'}
                            {st.status === 'confirmed' && 'Approved. Flight route uploaded to regional operator database.'}
                            {st.status === 'assigned' && 'Operator assigned. Batteries charged, pre-flight safety grid checked.'}
                            {st.status === 'travelling' && 'Operator currently on road to Pimpalgaon village node.'}
                            {st.status === 'started' && 'Drone currently airborne over farm boundary.'}
                            {st.status === 'uploading' && 'Transferring high resolution images to Khet Rakshak Cloud.'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Status footer with action buttons */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex flex-col gap-2">
                {selectedBookingDetail.status === 'completed' ? (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-center text-xs text-emerald-800 dark:text-emerald-400 font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Drone Scan complete! Diagnostic report available.</span>
                  </div>
                ) : selectedBookingDetail.status === 'cancelled' ? (
                  <div className="p-4 rounded-xl bg-red-50 text-center text-xs text-red-800 font-bold">
                    This booking was cancelled. Refund processed if paid online.
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onCancelBooking(selectedBookingDetail.id)}
                      className="w-1/2 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all"
                      id={`cancel-booking-btn-${selectedBookingDetail.id}`}
                    >
                      Cancel Visit
                    </button>
                    <button 
                      onClick={() => alert('Reschedule flow simulated. Please choose a different date.')}
                      className="w-1/2 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all"
                    >
                      Reschedule
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 text-xs">
              Select a booking card from the list to trace live status.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
