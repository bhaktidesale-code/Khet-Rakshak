/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { loginFarmer, registerFarmer } from "../services/authService";
import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Phone, ShieldCheck, MapPin, Sprout, CheckCircle2, 
  ArrowRight, ArrowLeft, Globe, HelpCircle, Lock, Edit, Sparkles
} from 'lucide-react';
import { Language, UserRole, Farm } from '../types';
import { translations } from '../translations';

interface OnboardingFlowProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onLoginSuccess: (user: { name: string; role: UserRole; village: string }) => void;
  onAddFarm: (newFarm: Farm) => void;
  currentTheme: 'light' | 'dark';
}

export default function OnboardingFlow({
  currentLanguage,
  onLanguageChange,
  onLoginSuccess,
  onAddFarm,
  currentTheme
}: OnboardingFlowProps) {
  const t = translations[currentLanguage];

  // Internal routing states: 'role-select' | 'register' | 'login' | 'onboarding'
  const [screen, setScreen] = useState<'role-select' | 'register' | 'login' | 'onboarding'>('role-select');
  const [selectedLoginRole, setSelectedLoginRole] = useState<UserRole>('farmer');

  // Form states
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [district, setDistrict] = useState('Nashik');
  const [village, setVillage] = useState('Pimpalgaon');
  const [pin, setPin] = useState('');
  const [fourDigitPin, setFourDigitPin] = useState('');
  const [farmSize, setFarmSize] = useState('4.5');
  const [sizeUnit, setSizeUnit] = useState<'acre' | 'hectare' | 'guntha'>('acre');
  const [mainCrop, setMainCrop] = useState('Onion');
  const [irrigation, setIrrigation] = useState<'drip' | 'sprinkler' | 'flood' | 'rainfed'>('drip');
  const [aadhaar, setAadhaar] = useState('');
  const [termsChecked, setTermsChecked] = useState(true);

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");

  // Login inputs
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Onboarding Step wizard states: 1 to 9
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [newFarmName, setNewFarmName] = useState('Shivar Farm 2');
  const [newFarmArea, setNewFarmArea] = useState('3.2');
  const [newFarmCrop, setNewFarmCrop] = useState('Grapes');
  const [newFarmSowingDate, setNewFarmSowingDate] = useState('2026-06-15');
  const [sensorEnabled, setSensorEnabled] = useState(true);

  // Boundary canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [boundaryPoints, setBoundaryPoints] = useState<{ x: number; y: number }[]>([]);
  const handleFarmerLogin = async () => {
    try {
      setLoginLoading(true);
      setLoginError("");

      const result = await loginFarmer({
        mobileNumber: loginMobile.trim(),
        password: loginPin,
      });

      onLoginSuccess({
        name: result.farmer.fullName,
        role: "farmer",
        village: result.farmer.village || "",
      });
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleFarmerRegistration = async () => {
    try {
      setRegisterLoading(true);
      setRegisterError("");

      if (!fullName.trim()) {
        throw new Error("Please enter the farmer's full name.");
      }

      if (!/^\d{10}$/.test(mobile.trim())) {
        throw new Error("Please enter a valid 10-digit mobile number.");
      }

      if (!otpSent || otpInput !== "1234") {
        throw new Error("Please verify the mock OTP using 1234.");
      }

      if (!/^\d{4}$/.test(fourDigitPin)) {
        throw new Error("Please create a valid 4-digit login PIN.");
      }

      if (!termsChecked) {
        throw new Error("Please accept the terms and advisory disclaimer.");
      }

      await registerFarmer({
        fullName: fullName.trim(),
        mobileNumber: mobile.trim(),
        password: fourDigitPin,
        preferredLanguage: currentLanguage,
        district: district.trim(),
        village: village.trim(),
      });

      setNewFarmName(`${fullName.trim() || "Farmer"}'s Farm`);
      setNewFarmArea(farmSize);
      setNewFarmCrop(mainCrop);
      setScreen("onboarding");
    } catch (error) {
      setRegisterError(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again."
      );
    } finally {
      setRegisterLoading(false);
    }
  };
  // Pre-fill ramesh patil demo
  const handleDemoFill = (role: UserRole) => {
    if (role === 'farmer') {
      onLoginSuccess({
        name: 'Ramesh Patil',
        role: 'farmer',
        village: 'Pimpalgaon, Nashik'
      });
    } else if (role === 'operator') {
      onLoginSuccess({
        name: 'Sanjay Ghadge (Pilot)',
        role: 'operator',
        village: 'Nashik Region Hub'
      });
    } else if (role === 'manager') {
      onLoginSuccess({
        name: 'Vikram Shinde (Manager)',
        role: 'manager',
        village: 'Nashik Central Warehouse'
      });
    } else if (role === 'admin') {
      onLoginSuccess({
        name: 'Tech Admin',
        role: 'admin',
        village: 'Khet Rakshak HO'
      });
    }
  };

  // Canvas drawing for boundaries
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (boundaryPoints.length < 8) {
      setBoundaryPoints([...boundaryPoints, { x, y }]);
    }
  };

  const clearBoundary = () => {
    setBoundaryPoints([]);
  };

  useEffect(() => {
    if (onboardingStep === 3 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, 300, 200);
      
      // Draw simulated grid background
      ctx.strokeStyle = currentTheme === 'dark' ? '#374151' : '#e5e7eb';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 300; i += 20) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 200); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(300, i); ctx.stroke();
      }

      // Draw active lines
      if (boundaryPoints.length > 0) {
        ctx.strokeStyle = '#059669';
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(boundaryPoints[0].x, boundaryPoints[0].y);
        for (let i = 1; i < boundaryPoints.length; i++) {
          ctx.lineTo(boundaryPoints[i].x, boundaryPoints[i].y);
        }
        if (boundaryPoints.length > 2) {
          ctx.closePath();
          ctx.fill();
        }
        ctx.stroke();

        // Draw node circles
        ctx.fillStyle = '#f59e0b';
        boundaryPoints.forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.5, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    }
  }, [boundaryPoints, onboardingStep, currentTheme]);

  // Submit and save new farm to state
  const handleOnboardingSubmit = () => {
    const latLngBoundary = boundaryPoints.map((pt, idx) => ({
      lat: 20.0821 + (pt.y / 10000),
      lng: 73.9841 + (pt.x / 10000)
    }));

    const mockNewFarm: Farm = {
      id: `farm-${Date.now()}`,
      name: newFarmName,
      location: `${village}, ${district}`,
      area: parseFloat(newFarmArea) || 3.0,
      areaUnit: sizeUnit,
      crop: newFarmCrop,
      sowingDate: newFarmSowingDate,
      irrigationType: irrigation,
      latestHealthScore: 82, // Standard initial health estimation
      lastScanDate: 'Not scanned',
      nextScanDate: 'Scheduled',
      activeAlertsCount: 0,
      boundary: latLngBoundary.length > 2 ? latLngBoundary : [{ lat: 20.0821, lng: 73.9841 }]
    };

    onAddFarm(mockNewFarm);
    onLoginSuccess({
      name: fullName || 'New Farmer',
      role: 'farmer',
      village: `${village}, ${district}`
    });
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-xl space-y-6">
      
      {/* Role Selection Screen */}
      {screen === 'role-select' && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-display font-extrabold text-2xl text-emerald-950 dark:text-white">
              Welcome to {t.app_title}
            </h2>
            <p className="text-xs text-gray-500">Select login category to access the agritech portal.</p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => setScreen('register')}
              className="w-full p-4 rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-all flex items-center justify-between"
              id="select-register-flow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                  🌾
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">{t.register_farmer}</h4>
                  <p className="text-[10px] text-gray-500">New farmer account and farm onboarding.</p>
                </div>
              </div>
              <ChevronRight />
            </button>

            <button
              onClick={() => {
                setLoginError("");
                setScreen("login");
              }}
              className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-left transition-all flex items-center justify-between"
              id="select-login-flow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">Farmer Login</h4>
                  <p className="text-[10px] text-gray-500">Use your registered mobile number and 4-digit PIN.</p>
                </div>
              </div>
              <ChevronRight />
            </button>

            {/* Quick Demo Pre-fills Panel */}
            <div className="border border-dashed border-gray-200 dark:border-gray-800 p-4 rounded-2xl space-y-3">
              <h4 className="text-[10px] font-mono font-bold text-gray-400 block uppercase tracking-widest text-center">Fast Demo Access</h4>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleDemoFill('farmer')} 
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                  id="demo-farmer-patil"
                >
                  Farmer (Patil)
                </button>
                <button 
                  onClick={() => handleDemoFill('operator')} 
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                  id="demo-operator"
                >
                  Drone Pilot
                </button>
                <button 
                  onClick={() => handleDemoFill('manager')} 
                  className="px-3 py-2 bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                  id="demo-manager"
                >
                  Outlet Manager
                </button>
                <button 
                  onClick={() => handleDemoFill('admin')} 
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                  id="demo-admin"
                >
                  System Admin
                </button>
              </div>
            </div>

            <button 
              onClick={() => {
                onLoginSuccess({ name: 'Guest Farmer', role: 'guest', village: 'Demo Region' });
              }}
              className="w-full py-3 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800 text-xs text-center font-semibold text-gray-600 dark:text-gray-400"
              id="continue-guest-btn"
            >
              Continue as Guest (Limited Access)
            </button>
          </div>
        </div>
      )}

      {/* Farmer Login Form */}
      {screen === 'login' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <button
              type="button"
              onClick={() => {
                setLoginError("");
                setScreen('role-select');
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="font-display font-bold text-lg text-emerald-950 dark:text-white">
              Farmer Login
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 dark:text-gray-300">
                Mobile Number
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                value={loginMobile}
                onChange={(e) => setLoginMobile(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                id="login-mobile"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 dark:text-gray-300">
                4-Digit Login PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loginLoading) {
                    void handleFarmerLogin();
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-center font-bold tracking-widest focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                id="login-pin"
              />
            </div>

            {loginError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {loginError}
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleFarmerLogin()}
              disabled={loginLoading || loginMobile.length !== 10 || loginPin.length !== 4}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              id="farmer-login-submit-btn"
            >
              <Lock className="w-4 h-4" />
              <span>{loginLoading ? 'Logging in...' : 'Login to Dashboard'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRegisterError("");
                setScreen('register');
              }}
              className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              New farmer? Create an account
            </button>
          </div>
        </div>
      )}

      {/* Farmer Registration Form */}
      {screen === 'register' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <button onClick={() => setScreen('role-select')} className="p-1 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="font-display font-bold text-lg text-emerald-950 dark:text-white">{t.register_farmer}</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 dark:text-gray-300">Full Name</label>
              <input 
                type="text" 
                placeholder="e.g. Ramesh Patil" 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                id="reg-fullname"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 dark:text-gray-300">Mobile Number (for OTP check)</label>
              <div className="flex gap-2">
                <input 
                  type="tel" 
                  placeholder="9876543210" 
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  id="reg-mobile"
                  inputMode="numeric"
                  maxLength={10}
                />
                <button 
                  type="button"
                  onClick={() => {
                    setRegisterError("");
                    if (!/^\d{10}$/.test(mobile.trim())) {
                      setRegisterError("Enter a valid 10-digit mobile number first.");
                      return;
                    }
                    setOtpSent(true);
                  }}
                  className="px-3 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-[10px] shrink-0"
                >
                  Send OTP
                </button>
              </div>
            </div>

            {otpSent && (
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 animate-in fade-in space-y-1.5">
                <span className="text-[10px] font-bold text-emerald-800 block">OTP sent to {mobile} (Mock: 1234)</span>
                <input 
                  type="text" 
                  placeholder="Enter 4-digit code" 
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-3 py-1.5 rounded-lg border border-emerald-200 bg-white dark:bg-gray-800 text-xs text-center font-bold tracking-widest focus:outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">District</label>
                <input type="text" value={district} onChange={e => setDistrict(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">Village</label>
                <input type="text" value={village} onChange={e => setVillage(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">PIN Code</label>
                <input type="text" placeholder="422001" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">Farmer ID (Optional)</label>
                <input type="text" placeholder="Aadhaar or Land ID" value={aadhaar} onChange={e => setAadhaar(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">Farm Size</label>
                <input type="number" value={farmSize} onChange={e => setFarmSize(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">Unit</label>
                <select value={sizeUnit} onChange={e => setSizeUnit(e.target.value as any)} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent">
                  <option value="acre">Acre</option>
                  <option value="hectare">Hectare</option>
                  <option value="guntha">Guntha</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">Main Crop</label>
                <input type="text" value={mainCrop} onChange={e => setMainCrop(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">Irrigation Mode</label>
                <select value={irrigation} onChange={e => setIrrigation(e.target.value as any)} className="w-full px-3 py-2 rounded-xl border border-gray-200">
                  <option value="drip">Drip</option>
                  <option value="sprinkler">Sprinkler</option>
                  <option value="flood">Flood</option>
                  <option value="rainfed">Rainfed</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 dark:text-gray-300">Create 4-Digit Login PIN</label>
              <input 
                type="password" 
                maxLength={4} 
                placeholder="••••" 
                value={fourDigitPin} 
                onChange={e => setFourDigitPin(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-center font-bold tracking-widest focus:outline-none"
              />
            </div>

            <label className="flex items-start gap-2 pt-2 text-[10px] text-gray-500 cursor-pointer">
              <input type="checkbox" checked={termsChecked} onChange={e => setTermsChecked(e.target.checked)} className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
              <span>I accept the agricultural terms, service policies, and AI advisory disclaimers.</span>
            </label>

            {registerError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {registerError}
              </p>
            )}

            <button
              type="button"
              disabled={registerLoading || !termsChecked}
              onClick={() => void handleFarmerRegistration()}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              id="registration-submit-btn"
            >
              <span>{registerLoading ? 'Creating Account...' : 'Verify & Continue Onboarding'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Multi-Step Farmer Onboarding Steps 1 to 9 */}
      {screen === 'onboarding' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-xs font-mono font-bold text-emerald-700 uppercase">Onboarding Checklist</span>
            <span className="text-xs font-bold text-gray-500">Step {onboardingStep} of 9</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${(onboardingStep / 9) * 100}%` }}></div>
          </div>

          {/* Step 1: Add Farm */}
          {onboardingStep === 1 && (
            <div className="space-y-3.5">
              <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white">Step 1: Name Your Farm Plot</h3>
              <p className="text-xs text-gray-500">Give this plot a clear name to separate from your other fields (e.g. Shivar Farm East).</p>
              <input 
                type="text" 
                value={newFarmName} 
                onChange={e => setNewFarmName(e.target.value)} 
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs focus:outline-none"
              />
            </div>
          )}

          {/* Step 2: Select Farm Location */}
          {onboardingStep === 2 && (
            <div className="space-y-3.5">
              <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white">Step 2: Pin Location</h3>
              <p className="text-xs text-gray-500">Search village location or lock on GPS coordinates.</p>
              <div className="p-4 border rounded-2xl bg-gray-50 dark:bg-gray-850 flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <MapPin className="text-emerald-600 w-5 h-5" />
                  <span>GPS: 20.0821° N, 73.9841° E ({village})</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Locked</span>
              </div>
            </div>
          )}

          {/* Step 3: Draw farm boundary */}
          {onboardingStep === 3 && (
            <div className="space-y-3">
              <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white">Step 3: Draw Field Boundary</h3>
              <p className="text-[11px] text-gray-500">Tap 4 or more points on the virtual grid map below to trace your boundaries.</p>
              
              <div className="flex justify-center">
                <canvas 
                  ref={canvasRef} 
                  width={300} 
                  height={180} 
                  onClick={handleCanvasClick}
                  className="border rounded-2xl bg-[#142618] cursor-crosshair shadow-inner"
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-mono text-[10px] text-gray-400">Nodes drawn: {boundaryPoints.length} / 8</span>
                <button onClick={clearBoundary} className="text-red-500 font-bold hover:underline">Clear Points</button>
              </div>
            </div>
          )}

          {/* Step 4: Enter farm area */}
          {onboardingStep === 4 && (
            <div className="space-y-3.5">
              <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white">Step 4: Confirm Farm Area</h3>
              <p className="text-xs text-gray-500">Verify total size calculation. (Acre size determines scanning price).</p>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  value={newFarmArea} 
                  onChange={e => setNewFarmArea(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs"
                />
                <span className="font-bold text-xs uppercase text-gray-500">Acres</span>
              </div>
            </div>
          )}

          {/* Step 5: Select Crop */}
          {onboardingStep === 5 && (
            <div className="space-y-3">
              <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white">Step 5: Select Crop Variety</h3>
              <p className="text-xs text-gray-500">Choose crop so AI can adjust discoloration thresholds and growth calendars.</p>
              <div className="grid grid-cols-2 gap-2">
                {['Onion', 'Grapes', 'Cotton', 'Wheat', 'Sugarcane', 'Tomato'].map((cr) => (
                  <button 
                    key={cr}
                    onClick={() => setNewFarmCrop(cr)}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      newFarmCrop === cr 
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow' 
                        : 'bg-white dark:bg-gray-800 border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    {cr}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Sowing date */}
          {onboardingStep === 6 && (
            <div className="space-y-3.5">
              <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white">Step 6: Sowing / Planting Date</h3>
              <p className="text-xs text-gray-500">Required to track current crop growth stage.</p>
              <input 
                type="date" 
                value={newFarmSowingDate} 
                onChange={e => setNewFarmSowingDate(e.target.value)} 
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-xs"
              />
            </div>
          )}

          {/* Step 7: Irrigation method */}
          {onboardingStep === 7 && (
            <div className="space-y-3">
              <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white">Step 7: Irrigation Method</h3>
              <p className="text-xs text-gray-500">Helps AI cross-reference water-stress alerts.</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { code: 'drip', label: 'Drip system (Drop-by-drop)' },
                  { code: 'sprinkler', label: 'Sprinkler Spray' },
                  { code: 'flood', label: 'Flood canal' },
                  { code: 'rainfed', label: 'Rain dependent only' }
                ].map((item) => (
                  <button 
                    key={item.code}
                    onClick={() => setIrrigation(item.code as any)}
                    className={`p-3 rounded-xl border text-xs text-left font-bold transition-all ${
                      irrigation === item.code 
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow' 
                        : 'bg-white dark:bg-gray-800 border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 8: Optional sensor information */}
          {onboardingStep === 8 && (
            <div className="space-y-3">
              <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white">Step 8: Soil Sensor Connection</h3>
              <p className="text-xs text-gray-500">Do you have Khet Rakshak soil moisture or NPK ground pins installed?</p>
              
              <label className="flex items-center justify-between p-4 border rounded-2xl bg-gray-50 dark:bg-gray-800 cursor-pointer">
                <div>
                  <h4 className="font-bold text-xs">Activate Ground Sensor Feed</h4>
                  <p className="text-[10px] text-gray-500">Enables automatic Tier-2 ground check matching.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={sensorEnabled} 
                  onChange={e => setSensorEnabled(e.target.checked)}
                  className="rounded text-emerald-600 w-4 h-4 focus:ring-emerald-500"
                />
              </label>
            </div>
          )}

          {/* Step 9: Book first scan */}
          {onboardingStep === 9 && (
            <div className="space-y-3">
              <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white">Step 9: Book First Screening</h3>
              <p className="text-xs text-gray-500">We recommend scheduling a drone flight path within 48 hours to create a base vegetation health map.</p>
              
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs">
                <p className="font-bold text-emerald-800 dark:text-emerald-400">Onboarding Complete!</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Click below to finalize profile creation and jump to your dashboard.</p>
              </div>
            </div>
          )}

          {/* Navigation inside onboarding step */}
          <div className="flex justify-between gap-3 pt-3">
            {onboardingStep > 1 ? (
              <button 
                onClick={() => setOnboardingStep(onboardingStep - 1)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {onboardingStep < 9 ? (
              <button 
                onClick={() => setOnboardingStep(onboardingStep + 1)}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-700/10 ml-auto"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button 
                onClick={handleOnboardingSubmit}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-700/10 ml-auto"
                id="onboarding-finalize-btn"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Finish</span>
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// Simple internal Chevron component used inside modal for speed
function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}