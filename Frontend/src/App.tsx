/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  Menu, X, Globe, User, Bell, ChevronDown, Radio, 
  Sun, Moon, Type, Shield, LayoutDashboard, Map, 
  CalendarClock, BookOpen, CloudSun, AlertTriangle, 
  PhoneCall, FileText, Wallet, Laptop, Settings, HelpCircle,
  Volume2, ShieldAlert, CheckCircle2, Info
} from 'lucide-react';

// Interfaces and Types
import { Language, UserRole, Farm, Booking } from './types';
import { translations } from './translations';

// Custom Core Components
import Navigation from './components/Navigation';
import LandingPage from './components/LandingPage';
import CropHealthWorkflow from './components/CropHealthWorkflow';
import AuthPage from './components/AuthPage';
import ProfileSetup from './components/ProfileSetup';
import FarmSetup, { EmptyFarmState } from './components/FarmSetup';
import AdminAccessManagement from './components/AdminAccessManagement';
import BookingFlow from './components/BookingFlow';
import BookingManagement from './components/BookingManagement';
import SensorDashboard from './components/SensorDashboard';
import CropAdvisory from './components/CropAdvisory';
import ExpertConsultation from './components/ExpertConsultation';
import OtherDashboards from './components/OtherDashboards';
import WalletPayments from './components/WalletPayments';
import { EmptyState, StatusBadge } from './components/Ui';
import {
  AppRole,
  AppUser,
  getApplicationUser,
  logout,
  observeAuth,
  requestDronePilotAccess,
} from './services/authService';
import { firebaseAuth } from './services/firebase';

function toFrontendRole(role: AppRole): UserRole {
  switch (role) {
    case 'DRONE_PILOT': return 'drone_pilot';
    case 'OUTLET_MANAGER': return 'outlet_manager';
    case 'ADMIN': return 'admin';
    case 'FARMER': return 'farmer';
  }
}

function destinationForRole(role: AppRole) {
  if (role === 'DRONE_PILOT') return 'operator-dash';
  if (role === 'OUTLET_MANAGER') return 'manager-dash';
  if (role === 'ADMIN') return 'admin-dash';
  return 'dashboard';
}

function hasCompleteProfile(user: AppUser) {
  return Boolean(user.fullName.trim() && user.village.trim());
}

function isViewAllowed(view: string, role: AppRole) {
  if (view === 'home' || view === 'login' || view === 'profile-setup' || view === 'crop-demo') return true;
  if (role === 'FARMER') {
    return [
      'dashboard', 'farms', 'register', 'booking-flow', 'bookings-list',
      'drone-analysis', 'sensors', 'advisory', 'expert', 'expenses',
    ].includes(view);
  }
  if (role === 'DRONE_PILOT') return view === 'operator-dash';
  if (role === 'OUTLET_MANAGER') return view === 'manager-dash';
  return role === 'ADMIN' && view === 'admin-dash';
}

export default function App() {
  // --- Core Layout & Language States ---
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [currentRole, setCurrentRole] = useState<UserRole>('guest');
  const [identity, setIdentity] = useState<FirebaseUser | null>(null);
  const [authUser, setAuthUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState('');
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [isLargeText, setIsLargeText] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'weak' | 'offline'>('online');
  const [currentView, setCurrentView] = useState<string>('home');
  const currentViewRef = useRef(currentView);
  currentViewRef.current = currentView;
  const intendedDestination = useRef<string | null>(null);
  const pilotApplicationPendingSetup = useRef(false);

  const userName = authUser?.fullName || identity?.displayName || '';
  const userVillage = authUser?.village || '';

  // --- Dynamic Agriculture States ---
  const [registeredFarms, setRegisteredFarms] = useState<Farm[]>([]);
  const [activeFarm, setActiveFarm] = useState<Farm | null>(null);

  // Sync activeFarm when registeredFarms changes or the selected farm is switched
  const handleSelectFarm = (farm: Farm) => {
    setActiveFarm(farm);
  };

  const handleAddFarm = (newFarm: Farm) => {
    setRegisteredFarms([...registeredFarms, newFarm]);
    setActiveFarm(newFarm);
  };

  // --- Live Wallet Balance ---
  // Starts at ₹850, spent when booking, top-up adds money
  const [walletBalance, setWalletBalance] = useState(0);

  // --- Bookings State Ledger ---
  const [bookings, setBookings] = useState<Booking[]>([]);

  const handleBookingConfirm = (newBooking: Booking) => {
    // Append to live ledger
    setBookings([newBooking, ...bookings]);
    
    // Deduct from wallet balance if paid via wallet
    if (newBooking.paymentMethod === 'wallet') {
      setWalletBalance((prev) => Math.max(0, prev - newBooking.price));
    }

    // Automatically route to bookings list tracker
    setCurrentView('bookings-list');
  };

  const handleBookingStatusUpdate = (bookingId: string, nextStatus: Booking['status']) => {
    setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: nextStatus } : b));
  };

  const handleCancelBooking = (bookingId: string) => {
    setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'cancelled', paymentStatus: b.paymentStatus === 'paid' ? 'refunded' : b.paymentStatus } : b));
  };

  // --- Inter-component Query Trigger state ---
  // Connects clicked advisory zone into pathological chat query automatically
  const [expertInitialMessage, setExpertInitialMessage] = useState<string>('');

  const handleTriggerExpertChat = (initialMsg: string) => {
    setExpertInitialMessage(initialMsg);
    setCurrentView('expert');
  };

  // --- Notifications Drawer States ---
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsDialogRef = useRef<HTMLElement>(null);
  const [notifications, setNotifications] = useState<{ id: string; text: string; read: boolean; time: string }[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkNotificationsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = notificationsDialogRef.current;
    dialog?.querySelector<HTMLElement>('button')?.focus();
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setIsNotificationsOpen(false); return; }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll('button:not(:disabled), a[href]')) as HTMLElement[];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleDialogKeys);
    return () => {
      window.removeEventListener('keydown', handleDialogKeys);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isNotificationsOpen]);

  // --- Speech Readout simulator ---
  // Safe text-to-speech fallback if Web Speech API isn't fully supported
  const [activeVoiceSpeakerText, setActiveVoiceSpeakerText] = useState<string | null>(null);

  const handleSpeakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Attempt to map correct accent voices based on selected regional language
      const voices = window.speechSynthesis.getVoices();
      if (currentLanguage === 'hi') {
        const hiVoice = voices.find(v => v.lang.startsWith('hi'));
        if (hiVoice) utterance.voice = hiVoice;
      } else if (currentLanguage === 'mr') {
        const mrVoice = voices.find(v => v.lang.startsWith('mr'));
        if (mrVoice) utterance.voice = mrVoice;
      }
      
      utterance.rate = 0.9; // Slightly slower for elderly/rural users
      
      utterance.onstart = () => {
        setActiveVoiceSpeakerText(text);
      };
      utterance.onend = () => {
        setActiveVoiceSpeakerText(null);
      };
      utterance.onerror = () => {
        setActiveVoiceSpeakerText(null);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Audio fallback simulation toast
      setActiveVoiceSpeakerText(text);
      setTimeout(() => setActiveVoiceSpeakerText(null), 5000);
    }
  };

  // --- Sync theme class with HTML DOM root ---
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('large-text', isLargeText);
    if (currentTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [currentTheme, isLargeText]);

  useEffect(() => {
    const updateNetworkStatus = () => setNetworkStatus(window.navigator.onLine ? 'online' : 'offline');
    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  useEffect(() => {
    if (!firebaseAuth) {
      setAuthLoading(false);
      return;
    }
    return observeAuth((firebaseUser) => {
      setIdentity(firebaseUser);
      if (!firebaseUser) {
        setAuthUser(null);
        setCurrentRole('guest');
        if (currentViewRef.current !== 'home' && currentViewRef.current !== 'login') {
          setCurrentView('home');
        }
        setAuthLoading(false);
        return;
      }
      setAuthLoading(true);
      void getApplicationUser(firebaseUser)
        .then((user) => {
          setAuthUser(user);
          setCurrentRole(toFrontendRole(user.role));
          if (!user.fullName || !user.village) {
            setCurrentView('profile-setup');
          } else if (currentViewRef.current === 'home' || currentViewRef.current === 'login') {
            const intended = intendedDestination.current;
            intendedDestination.current = null;
            setCurrentView(intended && isViewAllowed(intended, user.role) ? intended : destinationForRole(user.role));
          }
        })
        .catch((error: unknown) => {
          console.error('Unable to restore authenticated application session:', error);
          setAuthUser(null);
          const detail = error instanceof Error ? error.message : '';
          setAuthNotice(detail
            ? `Unable to verify your account with the Khet Rakshak server: ${detail}`
            : 'Unable to verify your account with the Khet Rakshak server. Check that the API is available and try again.');
        })
        .finally(() => setAuthLoading(false));
    });
  }, []);

  const handleAuthenticated = async (firebaseUser: FirebaseUser, requestedRole: AppRole) => {
    setAuthNotice('');
    const user = await getApplicationUser(firebaseUser);

    if (requestedRole === 'ADMIN' && user.role !== 'ADMIN') {
      setIdentity(firebaseUser);
      setAuthUser(user);
      setCurrentRole(toFrontendRole(user.role));
      setCurrentView('forbidden');
      throw new Error('This account is not provisioned as an administrator. Contact the platform administrator.');
    }
    if (requestedRole === 'DRONE_PILOT' && user.role === 'FARMER') {
      setIdentity(firebaseUser);
      setAuthUser(user);
      setCurrentRole('farmer');
      if (!hasCompleteProfile(user)) {
        pilotApplicationPendingSetup.current = true;
        setCurrentView('profile-setup');
        return;
      }
      const request = await requestDronePilotAccess(firebaseUser);
      setCurrentView(request.status === 'APPROVED' ? 'operator-dash' : 'pilot-pending');
      return;
    }

    setIdentity(firebaseUser);
    setAuthUser(user);
    setCurrentRole(toFrontendRole(user.role));
    if (!hasCompleteProfile(user)) {
      setCurrentView('profile-setup');
      return;
    }

    const intended = intendedDestination.current;
    intendedDestination.current = null;
    setCurrentView(intended && isViewAllowed(intended, user.role) ? intended : destinationForRole(user.role));
  };

  const handleProfileComplete = async (user: AppUser) => {
    setAuthUser(user);
    setCurrentRole(toFrontendRole(user.role));
    if (pilotApplicationPendingSetup.current && identity) {
      pilotApplicationPendingSetup.current = false;
      try {
        const request = await requestDronePilotAccess(identity);
        setCurrentView(request.status === 'APPROVED' ? 'operator-dash' : 'pilot-pending');
      } catch (error) {
        setAuthNotice(error instanceof Error ? error.message : 'Could not submit the pilot access request.');
        setCurrentView(destinationForRole(user.role));
      }
      return;
    }
    const intended = intendedDestination.current;
    intendedDestination.current = null;
    setCurrentView(intended && isViewAllowed(intended, user.role) ? intended : destinationForRole(user.role));
  };

  const handleNavigate = (view: string) => {
    if (view === 'login' || view === 'home') {
      setCurrentView(view);
      return;
    }
    if (view === 'crop-demo') {
      setCurrentView(view);
      return;
    }
    if (view === 'register') {
      setCurrentView(authUser ? 'register' : 'login');
      return;
    }
    if (!authUser) {
      intendedDestination.current = view;
      setCurrentView('login');
      return;
    }
    if (!isViewAllowed(view, authUser.role)) {
      setCurrentView('forbidden');
      return;
    }
    setCurrentView(view);
  };

  const handleCropAnalysisAccessRequest = () => {
    if (!authUser || !identity) {
      intendedDestination.current = 'crop-demo';
      setCurrentView('login');
      return;
    }
    if (authUser.role !== 'FARMER') {
      setCurrentView('forbidden');
    }
  };

  const handleLogout = async () => {
    if (!identity) return;
    try {
      await logout(identity);
      setAuthNotice('');
    } catch (error) {
      setAuthNotice(error instanceof Error
        ? `Signed out locally, but server-side session revocation could not be confirmed: ${error.message}`
        : 'Signed out locally, but server-side session revocation could not be confirmed.');
    } finally {
      setAuthUser(null);
      setRegisteredFarms([]);
      setActiveFarm(null);
      setBookings([]);
      setCurrentRole('guest');
      setCurrentView('home');
    }
  };

  // Navigation classes for consistent layout structures
  const t = translations[currentLanguage];

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      currentTheme === 'dark' ? 'bg-[#111a14] text-white' : 'bg-[#f7f9f5] text-[#17251c]'
    } ${isLargeText ? 'text-lg font-medium' : 'text-sm'}`}>
      
      {/* 1. Header Navigation Shell */}
      <Navigation
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        currentRole={currentRole}
        onLogout={() => { void handleLogout(); }}
        currentTheme={currentTheme}
        onThemeToggle={() => setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light')}
        isLargeText={isLargeText}
        onLargeTextToggle={() => setIsLargeText(!isLargeText)}
        networkStatus={networkStatus}
        onNetworkStatusChange={setNetworkStatus}
        walletBalance={walletBalance}
        currentView={currentView}
        onViewChange={handleNavigate}
        unreadAlertsCount={unreadCount}
        onOpenNotifications={() => {
          setIsNotificationsOpen(true);
          handleMarkNotificationsRead();
        }}
        userName={userName}
        userVillage={userVillage}
      />

      {/* Dynamic Voice synthesis speaker toast */}
      {activeVoiceSpeakerText && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-emerald-900 text-white px-5 py-4 rounded-2xl shadow-2xl border border-emerald-700 flex items-start gap-3.5 animate-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 animate-bounce">
            <Volume2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-mono font-bold text-emerald-400 tracking-wider block uppercase">SPEAKING ASSISTANT</span>
            <p className="text-xs font-medium leading-relaxed italic">"{activeVoiceSpeakerText}"</p>
          </div>
        </div>
      )}

      {/* Main Grid View Content Router */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {authNotice && (
          <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {authNotice}
          </div>
        )}
        {authLoading && (
          <div role="status" className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center text-sm text-gray-600 shadow dark:bg-gray-900 dark:text-gray-300">
            Checking your secure session…
          </div>
        )}
        
        {/* Guest / Public Home Page View */}
        {!authLoading && currentView === 'home' && (
          <LandingPage
            currentLanguage={currentLanguage}
            onNavigate={handleNavigate}
            currentTheme={currentTheme}
          />
        )}

        {!authLoading && (currentView === 'crop-demo' || (currentView === 'drone-analysis' && authUser?.role === 'FARMER')) && (
          <section className="mx-auto max-w-4xl space-y-5 rounded-3xl border border-[#7b8d80] bg-white p-5 dark:border-[#536458] dark:bg-[#1b2920] sm:p-8" aria-labelledby="crop-demo-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 id="crop-demo-title" className="text-2xl font-bold text-[#17251c] dark:text-white sm:text-3xl">Crop Image Health Check</h1>
                <p className="mt-2 max-w-2xl text-base leading-7 text-[#465449] dark:text-[#c2cec3]">
                  Choose an original cotton or turmeric dataset photo, or upload your own. The current service checks image readability only; no disease diagnosis is available.
                </p>
              </div>
              <button
                type="button"
                  onClick={() => handleNavigate(authUser?.role === 'FARMER' ? 'dashboard' : 'home')}
                className="rounded-xl border border-[#176b3a] px-4 py-2 font-semibold text-[#174c2c] hover:bg-[#f1f7f1] dark:text-[#a5e8b5] dark:hover:bg-[#23372a]"
              >
                Back to home
              </button>
            </div>
            <CropHealthWorkflow
              identity={identity}
              canAnalyze={Boolean(identity && authUser?.role === 'FARMER')}
              onRequestAccess={handleCropAnalysisAccessRequest}
            />
          </section>
        )}

        {!authLoading && currentView === 'login' && (
          <AuthPage
            onAuthenticated={handleAuthenticated}
            onBack={() => {
              intendedDestination.current = null;
              setCurrentView('home');
            }}
          />
        )}

        {!authLoading && currentView === 'profile-setup' && identity && (
          <ProfileSetup identity={identity} onComplete={handleProfileComplete} />
        )}

        {/* Logged-In Farmer views */}
        {!authLoading && currentView === 'register' && authUser?.role === 'FARMER' && (
          <FarmSetup
            onCancel={() => handleNavigate('farms')}
            onSave={(farm) => {
              handleAddFarm(farm);
              handleNavigate('farms');
            }}
          />
        )}

        {!authLoading && authUser?.role === 'FARMER' && (
          <>
            {/* 1. Farmer Cockpit Dashboard */}
            {currentView === 'dashboard' && (
              <section className="mx-auto max-w-5xl space-y-6" aria-labelledby="farmer-home-title">
                <header className="rounded-3xl border border-[#7b8d80] bg-white p-6 dark:border-[#536458] dark:bg-[#1b2920] sm:p-8">
                  <p className="text-base font-semibold text-[#176b3a] dark:text-[#a5e8b5]">{t.welcome}{userName ? `, ${userName}` : ''}</p>
                  <h1 id="farmer-home-title" className="mt-2 text-3xl font-bold leading-tight text-[#17251c] dark:text-white sm:text-4xl">{t.farmer_dashboard}</h1>
                  <p className="mt-2 text-lg text-[#465449] dark:text-[#c2cec3]">{activeFarm ? `${activeFarm.name} | ${activeFarm.location}` : userVillage ? `Village: ${userVillage}` : 'Manage your farm details and find services here.'}</p>
                </header>
                <h2 className="text-2xl font-bold text-[#17251c] dark:text-white">{t.dashboard_prompt}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { title: t.farms, text: t.farm_details, action: 'farms', icon: Map },
                    { title: t.overall_health, text: t.crop_report_missing, action: 'drone-analysis', icon: Shield },
                    { title: t.book_drone, text: t.booking_unavailable, action: 'booking-flow', icon: CalendarClock },
                    { title: t.expert, text: t.expert_unavailable, action: 'expert', icon: PhoneCall },
                  ].map(({ title, text, action, icon: Icon }) => (
                    <button key={title} onClick={() => handleNavigate(action)} className="group flex min-h-32 w-full items-start gap-4 rounded-2xl border border-[#7b8d80] bg-white p-5 text-left shadow-sm transition hover:border-[#176b3a] hover:bg-[#f1f7f1] dark:border-[#536458] dark:bg-[#1b2920] dark:hover:bg-[#23372a] sm:p-6">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e9f3e9] text-[#176b3a] dark:bg-[#263e2e] dark:text-[#a5e8b5]"><Icon aria-hidden="true" className="h-6 w-6" /></span>
                      <span className="min-w-0"><span className="block text-xl font-bold text-[#17251c] dark:text-white">{title}</span><span className="mt-1 block text-base leading-6 text-[#465449] dark:text-[#c2cec3]">{text}</span></span>
                    </button>
                  ))}
                </div>
                <EmptyState title={t.farmer_dashboard} detail={t.session_data_note} />
              </section>
            )}

            {/* 2. Farms selector onboarding page */}
            {currentView === 'farms' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                  <h2 className="font-display font-bold text-lg text-emerald-950 dark:text-white">Registered Land Plots</h2>
                  <p className="text-xs text-gray-500">These farm details stay in this browser session. They are not saved to your account or available on another device.</p>
                  {registeredFarms.length === 0 && <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">No plots have been added in this session yet.</p>}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {registeredFarms.map((f) => (
                      <div 
                        key={f.id} 
                        className={`p-5 rounded-2xl border transition-all ${
                          activeFarm?.id === f.id
                            ? 'bg-emerald-50/50 border-emerald-500 dark:bg-emerald-950/20' 
                            : 'bg-white dark:bg-gray-850 border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{f.name}</h4>
                            <p className="text-xs text-gray-500">{f.location} • {f.area} {f.areaUnit}s</p>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold uppercase">
                            {f.crop}
                          </span>
                        </div>
                        <p className="mt-3 border-t border-dashed pt-3 text-xs text-gray-600">Farm details are saved in this browser session only. Crop health is unavailable until a real scan report is connected.</p>
                        <button 
                          onClick={() => handleSelectFarm(f)}
                          className="w-full mt-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold"
                        >
                          Select as Active Farm
                        </button>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => handleNavigate('register')}
                    className="py-2.5 px-4 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>+ Add Another Plot</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. Multi-Step Drone Booking Flow */}
            {currentView === 'booking-flow' && <UnavailableFeature title="Drone booking" detail="Online booking is not connected to the service yet. No booking has been created. Please contact your local service team to arrange a visit." />}

            {/* 4. Live Telemetry Tracker & Bookings Management */}
            {currentView === 'bookings-list' && (
              <UnavailableFeature title="My bookings" detail="Booking records are not available because the booking service is not connected yet." />
            )}

            {/* 5. AI Drone Analysis & Compare screen */}
            {/* 6. Live Soil Ground Sensors Cockpit */}
            {currentView === 'sensors' && (
              <UnavailableFeature title="Field readings" detail="Sensor readings are not connected for this farm." />
            )}

            {/* 7. Advisory Panel & Task calendar */}
            {currentView === 'advisory' && (
              <UnavailableFeature title="Crop advice" detail="There are no farm scan reports connected to use for crop advice. Advice and detected issues will appear here when supported farm data is available." />
            )}

            {/* 8. Expert Consultation Chatbot & Video */}
            {currentView === 'expert' && (
              <UnavailableFeature title="Ask an expert" detail="Expert messaging and consultation booking are not connected to a service yet." />
            )}

            {/* 9. Wallet & Ledger Panel */}
            {currentView === 'expenses' && (
              <UnavailableFeature title="Payments" detail="Payments and wallet balances are not connected. No payment can be made here." />
            )}
          </>
        )}

        {/* Operator Dashboard view */}
        {!authLoading && authUser?.role === 'DRONE_PILOT' && currentView === 'operator-dash' && (
          <OtherDashboards
            currentLanguage={currentLanguage}
            currentTheme={currentTheme}
            currentRole="drone_pilot"
            identity={identity || undefined}
            userName={userName}
          />
        )}

        {/* Manager Dashboard view */}
        {!authLoading && authUser?.role === 'OUTLET_MANAGER' && currentView === 'manager-dash' && (
          <OtherDashboards
            currentLanguage={currentLanguage}
            currentTheme={currentTheme}
            currentRole="outlet_manager"
          />
        )}

        {/* Admin Dashboard view */}
        {!authLoading && authUser?.role === 'ADMIN' && currentView === 'admin-dash' && (
          <div className="space-y-6">
            {identity && <AdminAccessManagement identity={identity} />}
            <UnavailableFeature title="Bookings and crop reports" detail="Booking records and crop reports are not available yet." />
          </div>
        )}

        {!authLoading && currentView === 'pilot-pending' && (
          <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white p-8 text-center shadow dark:bg-gray-900">
            <h2 className="font-display text-xl font-bold text-amber-800 dark:text-amber-400">Pilot access pending approval</h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Your account remains a farmer account until an administrator approves the drone-pilot request.</p>
            <button
              onClick={() => {
                if (!identity) return;
                void getApplicationUser(identity).then((user) => {
                  setAuthUser(user);
                  setCurrentRole(toFrontendRole(user.role));
                  setCurrentView(user.role === 'DRONE_PILOT'
                    ? hasCompleteProfile(user) ? 'operator-dash' : 'profile-setup'
                    : 'pilot-pending');
                }).catch((error: unknown) => {
                  setAuthNotice(error instanceof Error ? error.message : 'Could not refresh pilot approval.');
                });
              }}
              className="mt-5 rounded-xl border border-emerald-700 px-5 py-3 font-bold text-emerald-800"
            >
              Check approval status
            </button>
            <button onClick={() => handleNavigate('home')} className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Return home</button>
          </div>
        )}

        {!authLoading && currentView === 'forbidden' && (
          <div role="alert" className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow dark:bg-gray-900">
            <h2 className="font-display text-xl font-bold text-red-700">Access denied</h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Your verified account does not have permission to open that section.</p>
            <button onClick={() => handleNavigate(authUser ? destinationForRole(authUser.role) : 'home')} className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Return to your portal</button>
          </div>
        )}

      </main>

      {/* Regional Warnings / Alert Notifications Side drawer panel */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setIsNotificationsOpen(false)}>
          <section ref={notificationsDialogRef} role="dialog" aria-modal="true" aria-labelledby="notifications-title" className={`w-full max-w-md h-full overflow-y-auto p-5 flex flex-col justify-between shadow-2xl ${
            currentTheme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-950'
          }`} onClick={e => e.stopPropagation()}>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 id="notifications-title" className="font-display font-bold text-xl text-emerald-950 dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-5 h-5 text-emerald-600" />
                  Regional Alerts
                </h2>
                <button aria-label="Close notifications" onClick={() => setIsNotificationsOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800 space-y-4 pt-1">
                {notifications.length === 0 && <p className="rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-700">Alerts are not connected for this account yet.</p>}
                {notifications.map((n) => (
                  <div key={n.id} className="pt-3 text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span className="font-mono">{n.time}</span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-red-500 block"></span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
                      {n.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-xs text-gray-500">Alerts and scan reports will appear when those services are connected.</p>
              <button 
                onClick={() => setIsNotificationsOpen(false)}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Close Drawer
              </button>
            </div>

          </section>
        </div>
      )}

    </div>
  );
}

function UnavailableFeature({ title, detail }: { title: string; detail: string }) {
  return <section className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-[#536458] dark:bg-[#1b2920] sm:p-8" aria-labelledby="unavailable-title">
    <StatusBadge status="Not available yet" tone="warning" />
    <h1 id="unavailable-title" className="mt-2 text-2xl font-bold text-stone-900 dark:text-white">{title}</h1>
    <div className="mt-4"><EmptyState title="No information to show" detail={detail} /></div>
  </section>;
}
