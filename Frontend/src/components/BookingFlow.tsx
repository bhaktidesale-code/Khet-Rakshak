/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CheckCircle2, Calendar, User, Clock, Wallet, Info, 
  MapPin, ShieldCheck, ArrowRight, ArrowLeft, AlertTriangle,
  QrCode, FileText, ChevronRight, HelpCircle
} from 'lucide-react';
import { Language, Farm, Booking } from '../types';
import { translations } from '../translations';

interface BookingFlowProps {
  currentLanguage: Language;
  registeredFarms: Farm[];
  activeFarm: Farm;
  onBookingConfirm: (newBooking: Booking) => void;
  onNavigate: (view: string) => void;
}

export default function BookingFlow({
  currentLanguage,
  registeredFarms,
  activeFarm,
  onBookingConfirm,
  onNavigate
}: BookingFlowProps) {
  const t = translations[currentLanguage];

  // Steps: 1 (Farm/Service), 2 (Slot/Operator), 3 (Payment), 4 (Receipt)
  const [step, setStep] = useState(1);

  // Selections
  const [selectedFarm, setSelectedFarm] = useState<Farm>(activeFarm);
  const [serviceType, setServiceType] = useState<'basic' | 'ai_report' | 'sensor_confirm' | 'reinspection' | 'seasonal' | 'emergency'>('ai_report');
  const [customArea, setCustomArea] = useState(selectedFarm.area.toString());
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('Morning (08:00 AM - 11:00 AM)');
  const [selectedDate, setSelectedDate] = useState('2026-07-12');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash' | 'card' | 'netbanking' | 'wallet' | 'fpc'>('upi');

  // Pricing calculations
  const calculatePrice = () => {
    const area = parseFloat(customArea) || 1.0;
    
    const baseFee = 0; // Base price is always free
    const perAcreRate = 20; // Set per acre price to 20 rupees
    const travelFee = 20; // Travel fee always 20 rupees
    let sensorFee = 0;

    if (serviceType === 'sensor_confirm') {
      sensorFee = 150;
    }

    const areaCharge = Math.round(area * perAcreRate);
    const subtotal = baseFee + areaCharge + travelFee + sensorFee;
    const discount = isGroupBooking ? Math.round(subtotal * 0.15) : 0; // 15% cooperative discount
    const total = subtotal - discount;

    return {
      baseFee,
      areaCharge,
      travelFee,
      sensorFee,
      discount,
      total
    };
  };

  const pricing = calculatePrice();

  // Mock slot data
  const timeSlots = [
    { name: 'Morning (08:00 AM - 11:00 AM)', desc: 'Optimal light conditions, low wind speed.', status: 'available' },
    { name: 'Midday (11:00 AM - 02:00 PM)', desc: 'High light, check battery temp limits.', status: 'available' },
    { name: 'Evening (03:00 PM - 06:00 PM)', desc: 'Good light, potential wind speed warning.', status: 'available' },
    { name: 'Early Morning (06:00 AM - 08:00 AM)', desc: 'Limited light, high dew index.', status: 'booked' }
  ];

  // Mock operator assigned based on date
  const operator = {
    id: 'op-123',
    name: 'Sanjay Ghadge',
    experience: '3+ Years (Certified Drone Pilot)',
    rating: 4.8,
    languages: ['Marathi', 'Hindi', 'English'],
    drone: 'Krishicopter V2 (DGCA Approved RGB Enterprise)'
  };

  const [finalBooking, setFinalBooking] = useState<Booking | null>(null);

  const handleBookNow = () => {
    const mockBooking: Booking = {
      id: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
      farmId: selectedFarm.id,
      farmName: selectedFarm.name,
      crop: selectedFarm.crop,
      serviceType: serviceType,
      area: parseFloat(customArea) || selectedFarm.area,
      price: pricing.total,
      outletId: 'nashik-central',
      dateTime: selectedDate,
      timeSlot: selectedSlot,
      operatorId: operator.id,
      operatorName: operator.name,
      status: 'pending',
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'upi' || paymentMethod === 'wallet' ? 'paid' : 'pending',
      travelFee: pricing.travelFee,
      areaCharge: pricing.areaCharge,
      sensorFee: pricing.sensorFee,
      discount: pricing.discount
    };

    setFinalBooking(mockBooking);
    onBookingConfirm(mockBooking);
    setStep(4);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Step Header */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-emerald-950 dark:text-white">Book Drone Checkup</h2>
          <p className="text-xs text-gray-500">Scan and analyze crops for timely intervention.</p>
        </div>
        {step < 4 && (
          <span className="text-xs font-bold text-emerald-700 font-mono">Step {step} of 3</span>
        )}
      </div>

      {/* Step 1: Farm and Service Picker */}
      {step === 1 && (
        <div className="space-y-6">
          
          {/* Farm selection */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">1. Select Plot & Area</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Select Farm</label>
                <select 
                  value={selectedFarm.id}
                  onChange={(e) => {
                    const farm = registeredFarms.find(f => f.id === e.target.value);
                    if (farm) {
                      setSelectedFarm(farm);
                      setCustomArea(farm.area.toString());
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-transparent font-medium"
                >
                  {registeredFarms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.crop})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Area to scan (Acres)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={customArea}
                  onChange={e => setCustomArea(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-transparent font-semibold"
                />
              </div>
            </div>

            {/* Cooperative / Group discount toggle */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 cursor-pointer text-xs">
              <input 
                type="checkbox" 
                checked={isGroupBooking} 
                onChange={e => setIsGroupBooking(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-emerald-800 dark:text-emerald-400">Cooperative / Group Discount (15% Off)</span>
                <p className="text-[10px] text-gray-500">Select this if you are booking with 3 or more neighboring fields.</p>
              </div>
            </label>
          </div>

          {/* Service picker */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">2. Choose Scanning Service</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                { type: 'basic', title: 'Basic Drone Screening', desc: 'Provides general vegetation index map & visual defect patch count.', rate: '₹20/acre' },
                { type: 'ai_report', title: 'Drone Checkup with AI Analysis', desc: 'Identifies probable stress zones, disease spots & crop confidence indices.', rate: '₹20/acre' },
                { type: 'sensor_confirm', title: 'Two-Tier Ground Sensor Confirmation', desc: 'Triggers local operators to check soil NPK & moisture levels on identified stressed spots.', rate: '₹20/acre' },
                { type: 'emergency', title: 'Emergency Inspection (Urgent)', desc: 'Ensures drone pilot visits your village within 24 hours to check severe sudden wilting.', rate: '₹20/acre' }
              ].map((s) => (
                <button 
                  key={s.type}
                  onClick={() => setServiceType(s.type as any)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    serviceType === s.type 
                      ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/20' 
                      : 'bg-white dark:bg-gray-850 border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 dark:text-emerald-200">{s.title}</span>
                      {serviceType === s.type && <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>}
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed">{s.desc}</p>
                  </div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 mt-3 block">{s.rate}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pricing receipt table */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">{t.price_breakdown}</h3>
            
            <div className="text-xs divide-y divide-gray-100 dark:divide-gray-800 space-y-2.5 pt-1">
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-500">{t.area_charge} ({customArea} Acres)</span>
                <span className="font-bold text-gray-800 dark:text-white">₹{pricing.areaCharge}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-500">{t.travel_fee} (to village)</span>
                <span className="font-bold text-gray-800 dark:text-white">₹{pricing.travelFee}</span>
              </div>
              {pricing.sensorFee > 0 && (
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-gray-500">{t.sensor_fee}</span>
                  <span className="font-bold text-gray-800 dark:text-white">₹{pricing.sensorFee}</span>
                </div>
              )}
              {pricing.discount > 0 && (
                <div className="flex justify-between items-center py-1.5 text-emerald-700 dark:text-emerald-400">
                  <span>{t.discount} (15%)</span>
                  <span className="font-extrabold">-₹{pricing.discount}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2.5 text-sm font-bold text-emerald-900 dark:text-emerald-400">
                <span>{t.total_price}</span>
                <span className="font-black text-base">₹{pricing.total}</span>
              </div>
            </div>

            <button 
              onClick={() => setStep(2)}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20"
              id="booking-step1-next"
            >
              <span>Choose Slot & Operator</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* Step 2: Slot and Operator Picker */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Calendar Picker */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">1. Select Booking Date</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Pick Date</label>
                <input 
                  type="date" 
                  value={selectedDate}
                  min="2026-07-11"
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200"
                />
              </div>

              {/* Nearest Outlet summary */}
              <div className="p-3 bg-gray-50 rounded-xl border text-[11px] leading-relaxed">
                <span className="font-bold text-emerald-800 block">Recommended Outlet:</span>
                <p>Khet Rakshak Service Centre - Nashik Hub (2.4 km from your village)</p>
              </div>
            </div>

            {/* Weather Alert simulation */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-xs text-amber-800 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="font-medium">
                Note: Flights on 12th July depend on morning wind speeds. If rain exceeds limits, the operator will contact you to reschedule. No cancellation charge.
              </p>
            </div>
          </div>

          {/* Slot picker */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">2. Select Time Slot</h3>
            
            <div className="space-y-2 text-xs">
              {timeSlots.map((s, idx) => (
                <button 
                  key={idx}
                  disabled={s.status === 'booked'}
                  onClick={() => setSelectedSlot(s.name)}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                    s.status === 'booked' 
                      ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed opacity-50' 
                      : selectedSlot === s.name 
                      ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/30 font-bold' 
                      : 'bg-white dark:bg-gray-850 border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-gray-900 dark:text-white">{s.name}</span>
                    <p className="text-[10px] text-gray-500">{s.desc}</p>
                  </div>
                  <span className="text-[10px] font-bold font-mono">
                    {s.status === 'booked' ? '❌ Booked' : '✓ Available'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Assigned Operator details */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">3. Assigned Drone Operator</h3>
            
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-850 border text-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-base shrink-0">
                SG
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 dark:text-white">{operator.name}</h4>
                <p className="text-gray-500 text-[11px]">{operator.experience} • Rating: ⭐ {operator.rating}</p>
                <p className="text-gray-500 text-[11px]">Languages: {operator.languages.join(', ')}</p>
                <p className="text-gray-500 text-[11px] font-mono">Drone: {operator.drone}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setStep(1)}
                className="w-1/3 py-3.5 border rounded-xl text-xs font-semibold"
              >
                Back
              </button>
              <button 
                onClick={() => setStep(3)}
                className="w-2/3 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                id="booking-step2-next"
              >
                <span>Continue to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Step 3: Payment Checkout */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">Select Payment Mode</h3>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { code: 'upi', label: 'UPI / PhonePe / BHIM QR', icon: '📱' },
                { code: 'wallet', label: 'Farmer Wallet Balance', icon: '💼' },
                { code: 'cash', label: 'Pay Cash After Screening', icon: '💵' },
                { code: 'fpc', label: 'Sponsored by local FPC', icon: '🏢' }
              ].map((m) => (
                <button 
                  key={m.code}
                  onClick={() => setPaymentMethod(m.code as any)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    paymentMethod === m.code 
                      ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/20' 
                      : 'bg-white dark:bg-gray-850 border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span className="font-bold text-gray-900 dark:text-white mt-3 block">{m.label}</span>
                </button>
              ))}
            </div>

            {/* UPI QR Mockup */}
            {paymentMethod === 'upi' && (
              <div className="p-5 border border-dashed rounded-2xl bg-gray-50 dark:bg-gray-850 flex flex-col items-center justify-center space-y-3 animate-in fade-in">
                <QrCode className="w-28 h-28 text-gray-800" />
                <span className="text-[10px] font-mono text-gray-500">Scan to pay exactly ₹{pricing.total} with any UPI App</span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex gap-2">
              <button 
                onClick={() => setStep(2)}
                className="w-1/3 py-3.5 border rounded-xl text-xs font-semibold"
              >
                Back
              </button>
              <button 
                onClick={handleBookNow}
                className="w-2/3 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 animate-pulse"
                id="confirm-pay-and-book"
              >
                <span>{t.confirm_and_pay} (₹{pricing.total})</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Step 4: Booking Confirmation Receipt */}
      {step === 4 && finalBooking && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl space-y-6 text-center animate-in zoom-in-95 duration-200">
          
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-100/30">
            ✓
          </div>

          <div className="space-y-1">
            <h3 className="font-display font-extrabold text-xl text-emerald-950 dark:text-white">Booking Confirmed!</h3>
            <p className="text-xs text-gray-500">Service schedule requested successfully.</p>
          </div>

          {/* Receipt details */}
          <div className="border rounded-2xl p-4 text-xs space-y-2.5 text-left bg-gray-50 dark:bg-gray-850 font-sans">
            <div className="flex justify-between">
              <span className="text-gray-400">Booking ID:</span>
              <span className="font-bold font-mono text-emerald-800 dark:text-emerald-400">{finalBooking.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Target plot:</span>
              <span className="font-bold">{finalBooking.farmName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Crop:</span>
              <span className="font-bold">{finalBooking.crop}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Area size:</span>
              <span className="font-bold">{finalBooking.area} Acres</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Date & Slot:</span>
              <span className="font-bold">{finalBooking.dateTime} • {finalBooking.timeSlot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Drone Pilot:</span>
              <span className="font-bold">{finalBooking.operatorName}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200/50 pt-2 text-emerald-700 dark:text-emerald-400 font-bold">
              <span>Total Paid:</span>
              <span className="text-sm font-extrabold">₹{finalBooking.price}</span>
            </div>
          </div>

          {/* Prep instructions block */}
          <div className="p-4 rounded-xl bg-amber-50/50 text-left border border-amber-100 text-xs text-amber-800 space-y-1">
            <span className="font-bold block uppercase tracking-wider text-[9px] text-amber-900">Pre-flight Checklist for farmer:</span>
            <p>1. Please clear any transient cattle or tall mobile vehicles before pilot arrival.</p>
            <p>2. Keep irrigation valves closed 2 hours before scanning to optimize vegetation indexes.</p>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="w-1/2 py-3.5 border rounded-xl text-xs font-semibold"
            >
              Back to Dashboard
            </button>
            <button 
              onClick={() => onNavigate('bookings-list')}
              className="w-1/2 py-3.5 bg-emerald-700 text-white font-bold rounded-xl text-xs"
              id="view-live-bookings-list"
            >
              Track Active Service
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
