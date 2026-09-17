/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import ecoGridBgImg from './assets/images/eco_grid_district_1784886799261.jpg';
import L from 'leaflet';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LayoutDashboard, 
  Building2, 
  BarChart3, 
  FileText, 
  Settings, 
  Zap, 
  Search, 
  Bell, 
  HelpCircle, 
  ChevronDown, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Sparkles,
  FileDown,
  Clock,
  Battery,
  Activity,
  Wind,
  Sun,
  Globe,
  Thermometer,
  Shield,
  Lightbulb,
  Camera,
  ArrowUp,
  ArrowDown,
  Pause,
  Plus,
  Table,
  Database,
  Minus,
  DoorClosed,
  Video,
  Monitor,
  User,
  History,
  Lock,
  LogOut,
  SlidersHorizontal,
  CloudSun,
  Menu,
  X,
  ChevronRight,
  Trash2,
  Files,
  Cpu,
  Settings2,
  Moon,
  MapPin,
  Compass,
  RefreshCw,
  Cloud,
  Eye,
  Maximize2,
  Calendar,
  ArrowRight,
  ChevronLeft,
  Leaf,
  TreePine,
  Car,
  Wrench,
  CreditCard
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { CiiEnergieLogo } from './components/CiiEnergieLogo';
import { CityWeatherWidget, POPULAR_CITIES, type WeatherCity } from './components/CityWeatherWidget';
import { auth, db, googleProvider, signInWithPopup, onAuthStateChanged } from './lib/firebase';
import type { FirebaseAuthUser } from './lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, collection, addDoc, deleteDoc } from 'firebase/firestore';

// --- Types ---
type ViewType = 'dashboard' | 'buildings' | 'analytics' | 'reports' | 'gtb' | 'settings';

interface BuildingStats {
  id: string | number;
  name: string;
  location: string;
  status: 'OPTIMAL' | 'ALERTE' | 'ATTENTION' | 'NORMAL';
  consumption: string | number;
  cost?: number;
  variation?: number;
  type?: string;
  occupancy?: string;
  economy?: string;
  trend?: string;
  surface?: string;
}

// --- Translations ---
const translations = {
  fr: {
    dashboard: 'Tableau de bord',
    buildings: 'Parc Immobilier',
    analytics: 'Analyses',
    reports: 'Rapports',
    gtb: 'Contrôles GTB',
    settings: 'Paramètres',
    userProfile: 'Profil Utilisateur',
    accountVerified: 'Compte Vérifié',
    yourName: 'Votre nom',
    yourRole: 'Votre rôle',
    emailAddress: 'Adresse Email',
    twoFactor: 'Authentification 2FA',
    enabled: 'Activé',
    disabled: 'Désactivé',
    preferencesIA: 'Préférences & IA',
    emailAlerts: 'Alertes Email',
    pushNotifications: 'Notifications Push',
    language: 'Langue du système',
    signout: 'Déconnexion',
    export: 'Export Rapports',
    totalConsumption: 'Consommation Totale',
    activityPeak: "Pic d'activité",
    globalEconomy: 'Économie Globale',
    vsLastMonth: 'vs mois dernier',
    alertThreshold: 'Alerte Seuil',
    normal: 'Normal',
    targetReached: 'Objectif atteint',
    allSites: 'Tous les sites',
    building: 'Bâtiment',
    efficiency: 'Efficacité',
    co2Emissions: 'Emissions CO2',
    greenMix: 'Mix Vert',
    anomalies: 'Anomalies',
    settingsDesc: 'Configurez les alertes, utilisateurs et intégrations de votre solution EcoGrid.',
    emailAlertsDesc: 'Bilan hebdo et alertes critiques.',
    pushNotificationsDesc: 'Alertes système en temps réel.'
  },
  en: {
    dashboard: 'Dashboard',
    buildings: 'Real Estate',
    analytics: 'Analytics',
    reports: 'Reports',
    gtb: 'BMS Controls',
    settings: 'Settings',
    userProfile: 'User Profile',
    accountVerified: 'Account Verified',
    yourName: 'Your name',
    yourRole: 'Your role',
    emailAddress: 'Email Address',
    twoFactor: '2FA Authentication',
    enabled: 'Enabled',
    disabled: 'Disabled',
    preferencesIA: 'Preferences & AI',
    emailAlerts: 'Email Alerts',
    pushNotifications: 'Push Notifications',
    language: 'System Language',
    signout: 'Sign Out',
    export: 'Export Reports',
    totalConsumption: 'Total Consumption',
    activityPeak: 'Peak Activity',
    globalEconomy: 'Global Savings',
    vsLastMonth: 'vs last month',
    alertThreshold: 'Alert Threshold',
    normal: 'Normal',
    targetReached: 'Target reached',
    allSites: 'All Sites',
    building: 'Building',
    efficiency: 'Efficiency',
    co2Emissions: 'CO2 Emissions',
    greenMix: 'Green Mix',
    anomalies: 'Anomalies',
    settingsDesc: 'Configure alerts, users and integrations for your EcoGrid solution.',
    emailAlertsDesc: 'Weekly breakdown and critical alerts.',
    pushNotificationsDesc: 'Real-time system alerts.'
  }
};

// --- Helpers ---
const parseEnergy = (val: any) => {
  if (typeof val === 'number') return val;
  const s = String(val);
  const numeric = parseFloat(s.replace(/,/g, '').replace(/[^0-9.]/g, '')) || 0;
  return s.includes('MWh') ? numeric * 1000 : numeric;
};

// --- Mock Data ---
const BAR_DATA = [
  { name: 'Bât. A', value: 4200, status: 'optimal' },
  { name: 'Bât. B', value: 4800, status: 'optimal' },
  { name: 'Bât. C', value: 3900, status: 'optimal' },
  { name: 'Bât. D', value: 6800, status: 'alert' },
  { name: 'Bât. E', value: 4500, status: 'optimal' },
  { name: 'Bât. F', value: 3200, status: 'optimal' },
  { name: 'Bât. G', value: 7500, status: 'alert' },
  { name: 'Bât. H', value: 4900, status: 'optimal' },
  { name: 'Bât. I', value: 5200, status: 'optimal' },
  { name: 'Bât. J', value: 4100, status: 'optimal' },
];

const TABLE_DATA: BuildingStats[] = [
  { id: '1', name: 'Bâtiment A', location: '1 Place Georges Frêche, 34267 Montpellier (Hôtel de Ville)', status: 'OPTIMAL', consumption: '12,450 kWh', economy: '15%', trend: '-2.4%', type: 'Bureaux', occupancy: '92%' },
  { id: '2', name: 'Bâtiment G', location: '1000 Rue de la Vieille Poste, 34000 Montpellier (Millénaire Tech)', status: 'ALERTE', consumption: '24,200 kWh', economy: '5%', trend: '+18.2%', type: 'Logistique', occupancy: '45%' },
  { id: '3', name: 'Bâtiment J', location: '209 Avenue des Apothicaires, 34090 Montpellier (Euromédecine)', status: 'ATTENTION', consumption: '15,890 kWh', economy: '12%', trend: '+5.1%', type: 'R&D', occupancy: '78%' },
  { id: '4', name: 'Bâtiment B', location: "Place du Nombre d'Or, 34000 Montpellier (Espace Antigone)", status: 'OPTIMAL', consumption: '11,120 kWh', economy: '18%', trend: '-0.8%', type: 'Bureaux', occupancy: '88%' },
];

const ANALYTICS_TREND = [
  { name: 'Lun', cons: 4000, goal: 4200 },
  { name: 'Mar', cons: 4500, goal: 4200 },
  { name: 'Mer', cons: 3800, goal: 4200 },
  { name: 'Jeu', cons: 5200, goal: 4200 },
  { name: 'Ven', cons: 4800, goal: 4200 },
  { name: 'Sam', cons: 2800, goal: 3000 },
  { name: 'Dim', cons: 2400, goal: 3000 },
];

const ESG_DATA = [
  { name: 'Score', value: 75 },
  { name: 'Remainder', value: 25 },
];

const BUILDING_HISTORY: Record<string, { name: string, value: number }[]> = {
  '1': [
    { name: 'Lun', value: 420 }, { name: 'Mar', value: 440 }, { name: 'Mer', value: 390 },
    { name: 'Jeu', value: 480 }, { name: 'Ven', value: 460 }, { name: 'Sam', value: 310 }, { name: 'Dim', value: 290 }
  ],
  '2': [
    { name: 'Lun', value: 820 }, { name: 'Mar', value: 890 }, { name: 'Mer', value: 950 },
    { name: 'Jeu', value: 1100 }, { name: 'Ven', value: 1050 }, { name: 'Sam', value: 780 }, { name: 'Dim', value: 720 }
  ],
  '3': [
    { name: 'Lun', value: 520 }, { name: 'Mar', value: 540 }, { name: 'Mer', value: 590 },
    { name: 'Jeu', value: 680 }, { name: 'Ven', value: 660 }, { name: 'Sam', value: 410 }, { name: 'Dim', value: 390 }
  ],
  '4': [
    { name: 'Lun', value: 380 }, { name: 'Mar', value: 390 }, { name: 'Mer', value: 350 },
    { name: 'Jeu', value: 420 }, { name: 'Ven', value: 410 }, { name: 'Sam', value: 280 }, { name: 'Dim', value: 250 }
  ],
};

const REPORT_LIST = [
  { id: 1, name: 'Audit Énergétique Annuel 2025', date: '15 Avril 2026', size: '2.4 MB', type: 'PDF' },
  { id: 2, name: 'Rapport RSE Trimestriel Q1', date: '02 Avril 2026', size: '1.8 MB', type: 'DOCX' },
  { id: 3, name: 'Analyse de Pic de Charge - Bât. G', date: '28 Mars 2026', size: '940 KB', type: 'PDF' },
  { id: 4, name: 'Suivi Smart-Grid - Mars 2026', date: '14 Mars 2026', size: '3.1 MB', type: 'XLSX' },
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const LoginView = ({ onLogin, onGuest }: { onLogin: () => void, onGuest: () => void }) => (
  <div className="min-h-screen flex items-center justify-center p-4 font-sans relative overflow-hidden bg-slate-900">
    <GlobalWindFarmBackground skyTheme="auto" />
    <div className="w-full max-w-md bg-white/95 rounded-[3rem] p-10 md:p-12 shadow-2xl border border-white/80 flex flex-col items-center text-center relative z-10">
      <div className="mb-6">
        <CiiEnergieLogo align="center" size="lg" />
      </div>
      <p className="text-slate-500 font-semibold mb-8 text-xs uppercase tracking-[0.12em] leading-relaxed">
        L'énergie d'aujourd'hui<br />Le climat de demain
      </p>
      
      <div className="w-full space-y-4">
        <button 
          onClick={onLogin}
          className="w-full flex items-center justify-center gap-4 bg-emerald-950 text-white py-5 rounded-2xl font-bold transition-all active:scale-[0.98] shadow-xl shadow-emerald-950/20 hover:bg-emerald-900"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity="0.8" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity="0.6" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity="0.7" />
          </svg>
          <span className="tracking-tight">Connexion Google</span>
        </button>

        <button 
          onClick={onGuest}
          className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 py-5 rounded-2xl font-bold text-slate-600 transition-all active:scale-[0.98] text-sm"
        >
          Accès Démo Invité
        </button>
      </div>

      <div className="mt-12 flex flex-col items-center gap-2">
        <div className="h-px w-12 bg-slate-100" />
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] leading-relaxed">
          CII ENERGIE • PRO VERSION
        </p>
      </div>
    </div>
  </div>
);

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all group relative",
      active ? "bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    <Icon className={cn("w-5 h-5 transition-colors", active ? "text-emerald-700" : "group-hover:text-slate-700")} />
    <span className={cn("font-semibold text-sm tracking-tight", active ? "font-bold" : "font-medium")}>{label}</span>
    {active && (
      <motion.div 
        layoutId="active-indicator" 
        className="absolute left-0 w-1 h-5 bg-emerald-600 rounded-r-full" 
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}
  </div>
);

const MetricCard = ({ title, value, subValue, trend, icon: Icon, color = "emerald" }: { title: string, value: string, subValue: string, trend?: string, icon: any, color?: "emerald" | "amber" | "rose" }) => {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/85 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/60 shadow-md flex flex-col gap-2.5 group hover:shadow-lg transition-all active:scale-[0.99] relative overflow-hidden h-full"
    >
      <div className="flex justify-between items-start relative z-10">
        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em] leading-none">{title}</span>
        <div className={cn("p-1.5 rounded-lg transition-transform group-hover:scale-110 shrink-0", colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-xl sm:text-2xl font-bold font-display text-slate-900 leading-tight mb-1 truncate">{value}</h3>
        <div className="flex items-center gap-1.5">
          {trend && (
            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0", trend.startsWith('-') ? "text-emerald-700 bg-emerald-100/50" : "text-rose-700 bg-rose-100/50")}>
              {trend}
            </span>
          )}
          <span className="text-[10px] text-slate-500 font-medium truncate">{subValue}</span>
        </div>
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-slate-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
};

const Tag = ({ status }: { status: BuildingStats['status'] }) => {
  const styles = {
    OPTIMAL: "bg-emerald-50 text-emerald-700 border-emerald-100",
    ATTENTION: "bg-amber-50 text-amber-700 border-amber-100",
    ALERTE: "bg-rose-50 text-rose-700 border-rose-100"
  };
  return (
    <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase border", styles[status])}>
      {status}
    </span>
  );
};

const useWindowSize = () => {
  const [size, setSize] = React.useState({ width: window.innerWidth, height: window.innerHeight });
  React.useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
};

const ViewContainer = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98 }}
    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    className="p-2 sm:p-3 space-y-3 max-w-5xl mx-auto w-full"
  >
    {children}
  </motion.div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md p-3 px-4 rounded-xl shadow-2xl border border-slate-800 text-white">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
        <p className="text-base font-bold font-display">
          {payload[0].value.toLocaleString()} <span className="text-emerald-400 font-medium">kWh</span>
        </p>
      </div>
    );
  }
  return null;
};

// --- Content Sections ---

interface SettingsViewProps {
  userProfile: { name: string; email: string; photo: string; role: string };
  onProfileChange: (field: string, value: string) => void;
  settings: { notificationsEmail: boolean; notificationsPush: boolean; twoFactorAuth: boolean; autoOptimize: boolean; darkMode: boolean; language: string };
  toggleSetting: (key: any) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handlePhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

const SettingsView = ({ userProfile, onProfileChange, settings, setSettings, toggleSetting, fileInputRef, handlePhotoUpload }: SettingsViewProps) => {
  const t = translations[settings.language as keyof typeof translations] || translations.fr;

  return (
    <ViewContainer>
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t.settings}</h2>
        <p className="text-sm text-slate-400 font-medium mt-1">{t.settingsDesc}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-200/60 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
              <User className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
              {t.userProfile}
            </h3>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">{t.accountVerified}</span>
          </div>
          
          <div className="flex gap-4 md:gap-6 items-center p-5 md:p-6 bg-slate-50 rounded-2xl mb-8 border border-slate-100">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-white shadow-md ring-1 ring-slate-100">
                <img src={userProfile.photo} alt="User" className="w-full h-full object-cover" />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-emerald-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer backdrop-blur-[1px]"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5 overflow-hidden">
              <div className="relative">
                 <input 
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => onProfileChange('name', e.target.value)}
                  placeholder={t.yourName}
                  className="font-bold text-slate-800 text-lg md:text-xl bg-transparent border-none outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/10 rounded-lg px-2 py-1 w-full transition-all block placeholder:text-slate-300 h-[36px] items-center flex"
                />
              </div>
              <div className="relative">
                <input 
                  type="text"
                  value={userProfile.role}
                  onChange={(e) => onProfileChange('role', e.target.value)}
                  placeholder={t.yourRole}
                  className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] bg-transparent border-none outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/10 rounded-lg px-2 py-0.5 w-full transition-all block placeholder:text-slate-300 h-[24px] items-center flex"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center p-4 rounded-xl hover:bg-slate-50/50 transition-colors">
              <span className="text-xs md:text-sm font-semibold text-slate-500">{t.emailAddress}</span>
              <input 
                type="email"
                value={userProfile.email}
                onChange={(e) => onProfileChange('email', e.target.value)}
                placeholder="votre@email.com"
                className="text-xs md:text-sm font-bold text-right bg-transparent border-none outline-none focus:bg-slate-100 focus:ring-2 focus:ring-emerald-500/10 rounded-lg px-3 py-1.5 transition-all text-slate-700 min-w-[200px]"
              />
            </div>
            <div className="h-px bg-slate-50 mx-4" />
            <div className="flex justify-between items-center p-4 rounded-xl hover:bg-slate-50/50 transition-colors">
              <span className="text-xs md:text-sm font-semibold text-slate-500">{t.twoFactor}</span>
              <button 
                onClick={() => toggleSetting('twoFactorAuth')}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black rounded-lg uppercase transition-all shadow-sm flex items-center gap-2",
                  settings.twoFactorAuth ? "bg-emerald-600 text-white shadow-emerald-200" : "bg-slate-100 text-slate-400"
                )}
              >
                {settings.twoFactorAuth ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                {settings.twoFactorAuth ? t.enabled : t.disabled}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-200/60 shadow-sm transition-all hover:shadow-md flex flex-col gap-6">
          <div>
            <h3 className="text-base md:text-lg font-bold mb-8 flex items-center gap-2">
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
              {t.preferencesIA}
            </h3>
            <div className="space-y-4">
              <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-emerald-100 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm text-emerald-600">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.emailAlerts}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{t.emailAlertsDesc}</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleSetting('notificationsEmail')}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative shrink-0 ring-offset-2 focus:ring-2 focus:ring-emerald-500/20",
                    settings.notificationsEmail ? "bg-emerald-600 shadow-inner" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ",
                    settings.notificationsEmail ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-emerald-100 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm text-emerald-600">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.pushNotifications}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{t.pushNotificationsDesc}</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleSetting('notificationsPush')}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative shrink-0 ring-offset-2 focus:ring-2 focus:ring-emerald-500/20",
                    settings.notificationsPush ? "bg-emerald-600 shadow-inner" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                    settings.notificationsPush ? "right-1" : "left-1"
                  )} />
                </button>
              </div>


            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 mt-auto">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              {t.language}
            </h3>
            <div className="flex bg-slate-100 p-1 rounded-xl w-full">
              <button 
                onClick={() => setSettings((prev: any) => ({ ...prev, language: 'fr' }))}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                  settings.language === 'fr' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Français
              </button>
              <button 
                onClick={() => setSettings((prev: any) => ({ ...prev, language: 'en' }))}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                  settings.language === 'en' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </div>

    </ViewContainer>
  );
};

const EnergyMixCard = React.memo(({ language, buildingsList, isGlobal, selectedBuilding }: { language: string, buildingsList: any[], isGlobal: boolean, selectedBuilding: any }) => {
  const totalKwh = React.useMemo(() => isGlobal 
    ? buildingsList.reduce((acc, b) => acc + parseEnergy(b.consumption), 0)
    : parseEnergy(selectedBuilding?.consumption || 0), [isGlobal, buildingsList, selectedBuilding]);
  
  const energyMixData = React.useMemo(() => {
    const buildingsCount = buildingsList.length || 1;
    const greenScore = isGlobal 
      ? (buildingsList.filter(b => b.status === "OPTIMAL").length / buildingsCount)
      : (selectedBuilding?.status === "OPTIMAL" ? 1 : 0.5);

    const solarPct = Math.min(50, 20 + (greenScore * 25));
    const windPct = Math.min(30, 10 + (greenScore * 15));
    const gridPct = 100 - solarPct - windPct - 5;
    const cogenerationPct = 5;

    return [
      { name: language === 'fr' ? 'Solaire' : 'Solar', value: solarPct, color: '#10b981', gradient: 'url(#solarGradient)' },
      { name: language === 'fr' ? 'Éolien' : 'Wind', value: windPct, color: '#7ec22a', gradient: 'url(#windGradient)' },
      { name: language === 'fr' ? 'Réseau' : 'Grid', value: gridPct, color: '#334155', gradient: 'url(#gridGradient)' },
      { name: 'Cogénération', value: cogenerationPct, color: '#f59e0b', gradient: 'url(#cogenGradient)' }
    ];
  }, [language, buildingsList, isGlobal, selectedBuilding]);

  return (
    <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-white/60 shadow-md p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="min-w-0 pr-4">
          <h3 className="text-lg font-bold font-display text-slate-800 truncate">{language === 'fr' ? "Réseau Mixte" : 'Mix Network'}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 truncate">
            {language === 'fr' ? `Analyse : ${isGlobal ? 'Parc Global' : selectedBuilding?.name}` : `Analysis: ${isGlobal ? 'Global' : selectedBuilding?.name}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-100 shrink-0">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Live</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <defs>
                <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="windGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7ec22a" stopOpacity={1} />
                  <stop offset="100%" stopColor="#65a30d" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#475569" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1e293b" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="cogenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
                </linearGradient>
              </defs>
              <Pie 
                data={energyMixData} 
                cx="50%" 
                cy="50%" 
                innerRadius="62%" 
                outerRadius="88%" 
                paddingAngle={4} 
                dataKey="value"
                stroke="none"
              >
                {energyMixData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.gradient} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl sm:text-2xl font-bold font-display text-slate-900 leading-none">
              {totalKwh > 1000 ? (totalKwh/1000).toFixed(1) : totalKwh.toLocaleString()}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 text-center">
              {totalKwh > 1000 ? 'MWH' : 'KWH'}
            </span>
          </div>
        </div>

        <div className="w-full space-y-4 sm:space-y-5">
          {energyMixData.map((item) => (
            <div key={item.name} className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wide truncate">{item.name}</span>
                </div>
                <span className="text-xs sm:text-sm font-bold font-display text-slate-900">{Math.round(item.value)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

interface AutoAnomalyType {
  id: string;
  buildingId: string;
  buildingName: string;
  type: 'density' | 'occupancy';
  titleFr: string;
  titleEn: string;
  descFr: string;
  descEn: string;
  severity: 'high' | 'medium';
}

const AutoAnomalyScannerCard = React.memo(({ language, buildingsList, onSelectBuilding, onOptimize }: { language: string, buildingsList: any[], onSelectBuilding: (id: string) => void, onOptimize: () => void }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0); // 0: idle, 1: scanning, 2: processing, 3: completed
  const isFr = language === 'fr';

  // Detect anomalies programmatically from building parameters in real time!
  const detectedAnomalies = React.useMemo(() => {
    const list: AutoAnomalyType[] = [];
    buildingsList.forEach(b => {
      const kwh = parseEnergy(b.consumption);
      const surfaceStr = String(b.surface || '').replace(/[^0-9.]/g, '');
      const surface = parseFloat(surfaceStr) || 1000;
      const density = kwh / surface;

      // Rule A: Intensive density > 20 kWh/m2
      if (density > 20) {
        list.push({
          id: `da-density-${b.id}`,
          buildingId: b.id.toString(),
          buildingName: b.name,
          type: 'density',
          titleFr: 'Surconsommation (Intensité)',
          titleEn: 'Excessive Intensity Rate',
          descFr: `La densité atteint ${density.toFixed(1)} kWh/m² (seuil max conseillé: 20). Risque élevé d'inefficacité CVC.`,
          descEn: `Density is ${density.toFixed(1)} kWh/m² (target limit: 20). High risk of HVAC mismatch.`,
          severity: 'high'
        });
      }

      // Rule B: Active load mismatch (occupancy < 50% and high consumption)
      const occupancyPrct = parseInt(String(b.occupancy).replace(/[^0-9]/g, '')) || 100;
      if (occupancyPrct < 50 && kwh > 15000) {
        list.push({
          id: `da-occupancy-${b.id}`,
          buildingId: b.id.toString(),
          buildingName: b.name,
          type: 'occupancy',
          titleFr: 'Inoccupation Active Détectée',
          titleEn: 'Unoccupied Active Load',
          descFr: `Consommation de pointe (${kwh.toLocaleString()} kWh) relevée alors que le site est à ${occupancyPrct}% de présence.`,
          descEn: `Peak active load (${kwh.toLocaleString()} kWh) measured while presence rate is only ${occupancyPrct}%.`,
          severity: 'medium'
        });
      }
    });
    return list;
  }, [buildingsList]);

  const handleStartScan = () => {
    setIsScanning(true);
    setScanStep(1);
    
    setTimeout(() => {
      setScanStep(2);
      setTimeout(() => {
        setScanStep(3);
        setTimeout(() => {
          setIsScanning(false);
          setScanStep(0);
        }, 800);
      }, 800);
    }, 800);
  };

  return (
    <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-white/60 shadow-md p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="min-w-0 pr-4">
          <h3 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-600 animate-pulse" />
            {isFr ? "Scanner d'Anomalies IA" : "AI Anomaly Scanner"}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5 truncate">
            {isFr ? "Diagnostic automatique du parc" : "Automated portfolio diagnostics"}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full shrink-0">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{isFr ? "ACTIF" : "SCANNER"}</span>
        </div>
      </div>

      {isScanning ? (
        <div className="py-8 flex flex-col items-center justify-center text-center gap-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 p-4 min-h-[160px]">
          <div className="relative flex items-center justify-center w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin" />
            <Cpu className="w-5 h-5 text-emerald-600 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {scanStep === 1 && (isFr ? "Calcul des indices d'intensité..." : "Computing density rates...")}
              {scanStep === 2 && (isFr ? "Vérification inoccupation vs charge..." : "Checking vacancy vs active load...")}
              {scanStep === 3 && (isFr ? "Évaluation des anomalies..." : "Analyzing abnormal risk factors...")}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {isFr ? "Diagnostic automatique EcoGrid" : "EcoGrid automated analysis"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {detectedAnomalies.length === 0 ? (
            <div className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100/40 text-center py-6 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100/50 flex items-center justify-center text-emerald-600 mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">{isFr ? "Aucune anomalie détectée" : "No anomalies detected"}</h4>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[220px]">
                {isFr ? "Tous les bâtiments fonctionnent parfaitement sous les seuils cibles de l'IA." : "All structures operate comfortably below active alert limits."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isFr ? "Anomalies Automatiques" : "Automatic anomalies"}</span>
                <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{detectedAnomalies.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {detectedAnomalies.map((anom) => (
                  <div key={anom.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150/50 flex flex-col gap-2 hover:border-rose-100 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AlertTriangle className={cn("w-3.5 h-3.5 shrink-0", anom.severity === 'high' ? "text-rose-500" : "text-amber-500")} />
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide leading-tight truncate">{isFr ? anom.titleFr : anom.titleEn}</span>
                      </div>
                      <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded shrink-0", anom.severity === 'high' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>
                        {anom.severity === 'high' ? "CRITIQUE" : "ALERTE"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal font-medium">{isFr ? anom.descFr : anom.descEn}</p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                      <button onClick={() => onSelectBuilding(anom.buildingId)} className="text-[9px] font-bold text-slate-400 hover:text-emerald-700 uppercase tracking-wider flex items-center gap-1 transition-colors">
                        {isFr ? `Voir: ${anom.buildingName}` : `Inspect: ${anom.buildingName}`}
                      </button>
                      <button onClick={onOptimize} className="text-[9px] font-black text-emerald-700 hover:text-emerald-800 hover:underline uppercase tracking-wider flex items-center gap-1 transition-colors">
                        <Sparkles className="w-2.5 h-2.5" />
                        {isFr ? "Optimisation IA" : "AI Optimize"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleStartScan}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/50 rounded-xl text-xs font-bold transition-all active:scale-[0.98] group"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:scale-110 transition-transform" />
            {isFr ? "Lancer Diagnostic IA Manuel" : "Run manual AI scan"}
          </button>
        </div>
      )}
    </div>
  );
});
AutoAnomalyScannerCard.displayName = 'AutoAnomalyScannerCard';

const WEATHER_CITIES = [
  { id: 'bordeaux', name: 'Bordeaux (Parc Aquitaine)', lat: 44.8378, lon: -0.5792, region: 'Sud-Ouest' },
  { id: 'brest', name: 'Brest (Côte Bretonne)', lat: 48.3904, lon: -4.4861, region: 'Bretagne' },
  { id: 'paris', name: 'Paris (Île-de-France)', lat: 48.8566, lon: 2.3522, region: 'Île-de-France' },
  { id: 'marseille', name: 'Marseille (PACA)', lat: 43.2965, lon: 5.3698, region: 'Méditerranée' },
  { id: 'lyon', name: 'Lyon (Rhône-Alpes)', lat: 45.7640, lon: 4.8357, region: 'Rhône-Alpes' },
];

export const GlobalWindFarmBackground = React.memo(({
  windSpeed = 28,
  skyTheme = 'auto',
}: {
  windSpeed?: number;
  skyTheme?: 'auto' | 'sunrise' | 'day' | 'sunset' | 'night';
  rotationDuration?: number;
  cloudCover?: number;
}) => {
  // Real-time hour calculation that updates automatically
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 15000); // Check local time every 15s
    return () => clearInterval(timer);
  }, []);

  const activeTheme = React.useMemo<'sunrise' | 'day' | 'sunset' | 'night'>(() => {
    if (skyTheme && skyTheme !== 'auto') return skyTheme;
    if (currentHour >= 6 && currentHour < 9) return 'sunrise';
    if (currentHour >= 9 && currentHour < 18) return 'day';
    if (currentHour >= 18 && currentHour < 22) return 'sunset';
    return 'night';
  }, [skyTheme, currentHour]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. Base Crisp Photorealistic Background Image - Static */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${ecoGridBgImg})` }}
      />

      {/* 2. Real Day/Night Cycle Atmospheric Color Tint Overlays - Static */}
      <div 
        className={cn(
          "absolute inset-0",
          activeTheme === 'day' && "bg-gradient-to-b from-sky-400/20 via-sky-200/10 to-slate-900/40",
          activeTheme === 'sunrise' && "bg-gradient-to-b from-slate-950/60 via-amber-500/25 to-rose-900/35",
          activeTheme === 'sunset' && "bg-gradient-to-b from-indigo-950/60 via-rose-600/30 to-amber-600/35",
          activeTheme === 'night' && "bg-gradient-to-b from-slate-950/80 via-indigo-950/70 to-slate-900/80"
        )}
      />

      {/* 3. Celestial Objects (Moon and Stars for Night only) */}
      {activeTheme === 'night' && (
        <>
          <div className="absolute top-[10%] right-[18%] w-20 h-20 rounded-full bg-slate-100 shadow-[0_0_60px_rgba(226,232,240,0.85)] flex items-center justify-center overflow-hidden pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-slate-950 translate-x-4 -translate-y-1" />
          </div>
          {/* Static Star Field at Night */}
          <div className="absolute inset-0 pointer-events-none opacity-85">
            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  top: `${(i * 13) % 60}%`,
                  left: `${(i * 29) % 100}%`,
                  opacity: 0.35 + ((i % 6) * 0.12)
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* 4. Static Floating Clouds */}
      <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
        <svg className="w-full h-full">
          <g>
            <path d="M 50 100 Q 70 60 110 70 Q 140 40 180 60 Q 210 50 230 80 Q 250 110 210 110 L 70 110 Z" fill="white" opacity="0.7" />
            <path d="M 550 60 Q 570 30 600 40 Q 630 20 670 35 Q 700 25 720 50 Q 740 80 700 80 L 570 80 Z" fill="white" opacity="0.5" />
          </g>
        </svg>
      </div>
    </div>
  );
});
GlobalWindFarmBackground.displayName = 'GlobalWindFarmBackground';

const WindTurbineFieldCard = React.memo(({ 
  language,
  isBgActive,
  setIsBgActive
}: { 
  language: string;
  isBgActive?: boolean;
  setIsBgActive?: (val: boolean) => void;
}) => {
  const isFr = language === 'fr';

  const [selectedCityId, setSelectedCityId] = useState<string>('bordeaux');
  const [windSpeed, setWindSpeed] = useState<number>(34);
  const [temp, setTemp] = useState<number>(22);
  const [cloudCover, setCloudCover] = useState<number>(25);
  const [windDir, setWindDir] = useState<number>(180);
  const [humidity, setHumidity] = useState<number>(55);
  const [isDayApi, setIsDayApi] = useState<boolean>(true);
  
  const [skyMode, setSkyMode] = useState<'auto' | 'sunrise' | 'day' | 'sunset' | 'night'>('auto');
  const [isLiveWind, setIsLiveWind] = useState<boolean>(true);
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch real live weather from Open-Meteo
  const fetchCityWeather = React.useCallback(async (cityId: string) => {
    const city = WEATHER_CITIES.find(c => c.id === cityId) || WEATHER_CITIES[0];
    setIsApiLoading(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,is_day,cloud_cover,wind_speed_10m,wind_direction_10m`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.current) {
          setWindSpeed(Math.round(data.current.wind_speed_10m || 28));
          setTemp(Math.round(data.current.temperature_2m || 20));
          setCloudCover(data.current.cloud_cover ?? 30);
          setWindDir(data.current.wind_direction_10m ?? 180);
          setHumidity(data.current.relative_humidity_2m ?? 50);
          setIsDayApi(data.current.is_day === 1);
          setLastUpdated(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch (e) {
      console.warn("Weather API fallback used");
    } finally {
      setIsApiLoading(false);
    }
  }, []);

  // Fetch on mount or city change
  useEffect(() => {
    fetchCityWeather(selectedCityId);
  }, [selectedCityId, fetchCityWeather]);

  // Periodic ambient fluctuation if Live Mode ON
  useEffect(() => {
    if (!isLiveWind) return;
    const interval = setInterval(() => {
      setWindSpeed(prev => {
        const delta = (Math.random() - 0.48) * 2.8;
        const next = Math.max(0, Math.min(95, prev + delta));
        return parseFloat(next.toFixed(1));
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [isLiveWind]);

  // Calculate effective sky theme
  const effectiveSkyTheme = React.useMemo<'sunrise' | 'day' | 'sunset' | 'night'>(() => {
    if (skyMode !== 'auto') return skyMode;
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 9) return 'sunrise';
    if (hour >= 9 && hour < 18) return 'day';
    if (hour >= 18 && hour < 22) return 'sunset';
    return 'night';
  }, [skyMode]);

  // Power output calculations
  const powerMw = React.useMemo(() => {
    if (windSpeed < 3 || windSpeed > 90) return 0;
    if (windSpeed >= 45) return 7.5;
    const ratio = windSpeed / 45;
    return parseFloat((7.5 * Math.pow(ratio, 2.7)).toFixed(2));
  }, [windSpeed]);

  const co2SavedPerHour = Math.round(powerMw * 1000 * 0.42);
  const capacityFactor = Math.min(100, Math.round((powerMw / 7.5) * 100));

  // Blade rotation duration in seconds per turn
  const rotationDuration = React.useMemo(() => {
    if (windSpeed < 2 || windSpeed > 90) return 0;
    const sec = 14 / (windSpeed / 5);
    return Math.max(0.35, parseFloat(sec.toFixed(2)));
  }, [windSpeed]);

  // Wind speed label status
  const windStatusLabel = React.useMemo(() => {
    if (windSpeed < 3) return isFr ? "Calme plat" : "Calm";
    if (windSpeed < 15) return isFr ? "Vent doux" : "Light breeze";
    if (windSpeed < 35) return isFr ? "Brise optimale" : "Optimal wind";
    if (windSpeed < 65) return isFr ? "Vent fort" : "Strong wind";
    if (windSpeed <= 90) return isFr ? "Bourrasques" : "High gusts";
    return isFr ? "Mise en sécurité" : "Storm shutdown";
  }, [windSpeed, isFr]);

  const activeCity = WEATHER_CITIES.find(c => c.id === selectedCityId) || WEATHER_CITIES[0];

  return (
    <div className="mb-10 text-slate-900 font-sans">
      <style>{`
        @keyframes turbineSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes cloudDrift {
          0% { transform: translateX(-20%); }
          100% { transform: translateX(120%); }
        }
        @keyframes windParticle {
          0% { transform: translateX(-30%) translateY(0px); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translateX(130%) translateY(10px); opacity: 0; }
        }
      `}</style>

      {/* Luminora Sub-Header Bar with Navigation & Live Weather Selectors */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 mb-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-emerald-600 font-display">Luminora</span>
          </div>

          <div className="hidden sm:flex items-center gap-6 text-sm font-semibold text-slate-600 ml-6">
            <span className="text-slate-900 font-bold border-b-2 border-emerald-500 pb-0.5 cursor-pointer">Dashboard</span>
            <span className="hover:text-emerald-600 cursor-pointer transition-colors">Project</span>
            <span className="hover:text-emerald-600 cursor-pointer transition-colors">Analytics</span>
            <span className="hover:text-emerald-600 cursor-pointer transition-colors flex items-center gap-1">Reports <ChevronDown className="w-3.5 h-3.5" /></span>
            <span className="hover:text-emerald-600 cursor-pointer transition-colors flex items-center gap-1">Asset <ChevronDown className="w-3.5 h-3.5" /></span>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <div className="relative">
            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 outline-none border border-slate-200 cursor-pointer pr-8 transition-all"
            >
              {WEATHER_CITIES.map(c => (
                <option key={c.id} value={c.id}>📍 {c.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => fetchCityWeather(selectedCityId)}
            disabled={isApiLoading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 active:scale-95 transition-all"
            title={isFr ? "Actualiser météo" : "Refresh weather"}
          >
            <RefreshCw className={cn("w-4 h-4", isApiLoading && "animate-spin text-emerald-600")} />
          </button>

          {/* Sky Theme Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[
              { id: 'auto', label: '⚡ Auto' },
              { id: 'sunrise', label: '🌅' },
              { id: 'day', label: '☀️' },
              { id: 'sunset', label: '🌇' },
              { id: 'night', label: '🌙' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setSkyMode(m.id as any)}
                className={cn(
                  "px-2 py-1 text-xs rounded-lg transition-all",
                  skyMode === m.id ? "bg-white shadow-sm text-emerald-600 font-bold" : "text-slate-500 hover:text-slate-900"
                )}
                title={m.id}
              >
                {m.label}
              </button>
            ))}
          </div>

          {setIsBgActive && (
            <button
              onClick={() => setIsBgActive(!isBgActive)}
              className={cn(
                "text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 border",
                isBgActive 
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-sm" 
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
              )}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              {isFr ? (isBgActive ? "Plein écran : ON" : "Fond : Inactif") : (isBgActive ? "Full Sky: ON" : "Sky: Off")}
            </button>
          )}
        </div>
      </div>

      {/* Main Luminora Hero Card (Sky + Landscape + Giant Wind Turbine) */}
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-200/80 bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-100 min-h-[380px] sm:min-h-[420px] p-6 sm:p-10 flex flex-col justify-between text-slate-900">
        
        {/* Dynamic Sky Ambient Layer */}
        <div className={cn(
          "absolute inset-0 transition-all duration-1000 pointer-events-none z-0",
          effectiveSkyTheme === 'day' && "bg-gradient-to-b from-sky-400 via-sky-200 to-emerald-200/90",
          effectiveSkyTheme === 'sunset' && "bg-gradient-to-b from-indigo-900 via-rose-700 to-amber-500",
          effectiveSkyTheme === 'night' && "bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950",
          effectiveSkyTheme === 'sunrise' && "bg-gradient-to-b from-indigo-950 via-rose-800 to-amber-400"
        )} />

        {/* Floating Clouds Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40 z-0">
          <svg className="w-full h-full">
            <g style={{ animation: `cloudDrift ${Math.max(12, 120 / (windSpeed || 1))}s linear infinite` }}>
              <path d="M 50 80 Q 70 40 110 50 Q 140 20 180 40 Q 210 30 230 60 Q 250 90 210 90 L 70 90 Z" fill="white" opacity="0.8" />
              <path d="M 500 50 Q 520 20 550 30 Q 580 10 620 25 Q 650 15 670 40 Q 690 70 650 70 L 520 70 Z" fill="white" opacity="0.6" />
            </g>
          </svg>
        </div>

        {/* Foreground 3D Rolling Green Landscape & Giant Wind Turbines */}
        <div className="absolute bottom-0 inset-x-0 h-[280px] sm:h-[340px] pointer-events-none z-10">
          <svg className="w-full h-full" viewBox="0 0 1000 350" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lumHill1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={effectiveSkyTheme === 'night' ? '#047857' : '#34d399'} />
                <stop offset="100%" stopColor={effectiveSkyTheme === 'night' ? '#022c22' : '#10b981'} />
              </linearGradient>
              <linearGradient id="lumHill2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={effectiveSkyTheme === 'night' ? '#065f46' : '#10b981'} />
                <stop offset="100%" stopColor={effectiveSkyTheme === 'night' ? '#011612' : '#047857'} />
              </linearGradient>
              <linearGradient id="lumTower" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>

            {/* Back Hills */}
            <path d="M 0 240 Q 250 180 550 210 T 1000 190 L 1000 350 L 0 350 Z" fill="url(#lumHill1)" opacity="0.85" />
            
            {/* Front Hills */}
            <path d="M 0 270 Q 300 200 650 250 T 1000 220 L 1000 350 L 0 350 Z" fill="url(#lumHill2)" />

            {/* Background Small Turbines */}
            <g transform="translate(180, 210) scale(0.65)">
              <polygon points="-4,0 4,0 6,100 -6,100" fill="url(#lumTower)" />
              <ellipse cx="0" cy="0" rx="5" ry="3" fill="#ffffff" />
              <g style={{ transformOrigin: '0px 0px', animation: rotationDuration > 0 ? `turbineSpin ${rotationDuration * 1.1}s linear infinite` : 'none' }}>
                {[0, 120, 240].map((deg) => (
                  <path key={deg} d="M 0 0 L -2 -50 Q 0 -58 2 -50 Z" fill="#ffffff" transform={`rotate(${deg})`} />
                ))}
              </g>
            </g>

            {/* MAIN GIANT TURBINE ON THE RIGHT (Matching Luminora reference photo) */}
            <g transform="translate(730, 220)">
              {/* Tower */}
              <polygon points="-9,0 9,0 14,240 -14,240" fill="url(#lumTower)" />
              <ellipse cx="0" cy="0" rx="12" ry="7" fill="#ffffff" />
              <circle cx="0" cy="-5" r="3" fill="#ef4444" className="animate-pulse" />
              
              {/* Spinning Blades */}
              <g style={{ transformOrigin: '0px 0px', animation: rotationDuration > 0 ? `turbineSpin ${rotationDuration}s linear infinite` : 'none' }}>
                {[0, 120, 240].map((deg) => (
                  <path key={deg} d="M 0 0 L -5 -160 Q 0 -180 5 -160 Z" fill="#ffffff" transform={`rotate(${deg})`} filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.15))" />
                ))}
                <circle cx="0" cy="0" r="7" fill="#0f172a" />
              </g>
            </g>
          </svg>
        </div>

        {/* Content Overlay (Left Hand Side) */}
        <div className="relative z-20 max-w-xl">
          <h1 className={cn(
            "text-2xl sm:text-4xl md:text-5xl font-extrabold font-display tracking-tight mb-3 leading-tight",
            effectiveSkyTheme === 'night' ? "text-white" : "text-slate-900"
          )}>
            {isFr ? "Tableau de Bord Portefeuille Énergies" : "Renewal Energy Portfolio Dashboard"}
          </h1>
          
          <p className={cn(
            "text-xs sm:text-sm font-medium mb-6 max-w-lg leading-relaxed",
            effectiveSkyTheme === 'night' ? "text-slate-300" : "text-slate-700"
          )}>
            {isFr
              ? "Obtenez des analyses en temps réel sur l'ensemble de vos actifs renouvelables, pour des décisions optimisées et une performance accrue."
              : "Gain real-time insights across global renewable energy investments, enabling smarter decisions, optimized performance"}
          </p>

          {/* Segmented Generation Progress Bar (Pills style from Luminora design) */}
          <div className="mb-6">
            <div className="flex items-center gap-1 sm:gap-1.5 mb-2">
              {[...Array(20)].map((_, idx) => {
                const isActive = idx < Math.round((capacityFactor / 100) * 20);
                return (
                  <div 
                    key={idx} 
                    className={cn(
                      "h-6 sm:h-7 flex-1 rounded-md transition-all duration-500",
                      isActive 
                        ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" 
                        : "bg-white/40 backdrop-blur-sm"
                    )} 
                  />
                );
              })}
            </div>
          </div>

          {/* Hero Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
            <div>
              <p className={cn("text-[10px] font-bold uppercase tracking-wider", effectiveSkyTheme === 'night' ? "text-slate-400" : "text-slate-600")}>
                {isFr ? "Production Actuelle" : "Current Generation"}
              </p>
              <p className={cn("text-lg sm:text-xl font-extrabold font-mono mt-0.5", effectiveSkyTheme === 'night' ? "text-emerald-400" : "text-slate-900")}>
                {Math.round(powerMw * 3640 || 27300)} <span className="text-xs font-semibold">KW</span>
              </p>
            </div>

            <div>
              <p className={cn("text-[10px] font-bold uppercase tracking-wider", effectiveSkyTheme === 'night' ? "text-slate-400" : "text-slate-600")}>
                {isFr ? "Fréquence Réseau" : "Grid Frequency"}
              </p>
              <p className={cn("text-lg sm:text-xl font-extrabold font-mono mt-0.5", effectiveSkyTheme === 'night' ? "text-emerald-400" : "text-slate-900")}>
                50.02 <span className="text-xs font-semibold">HZ</span>
              </p>
            </div>

            <div>
              <p className={cn("text-[10px] font-bold uppercase tracking-wider", effectiveSkyTheme === 'night' ? "text-slate-400" : "text-slate-600")}>
                {isFr ? "Facteur de Charge" : "Load Factor"}
              </p>
              <p className={cn("text-lg sm:text-xl font-extrabold font-mono mt-0.5", effectiveSkyTheme === 'night' ? "text-emerald-400" : "text-slate-900")}>
                {capacityFactor > 0 ? capacityFactor : 87.3}%
              </p>
            </div>

            <div>
              <p className={cn("text-[10px] font-bold uppercase tracking-wider", effectiveSkyTheme === 'night' ? "text-slate-400" : "text-slate-600")}>
                {isFr ? "Rendement Système" : "System Efficiency"}
              </p>
              <p className={cn("text-lg sm:text-xl font-extrabold font-mono mt-0.5", effectiveSkyTheme === 'night' ? "text-emerald-400" : "text-slate-900")}>
                94.8%
              </p>
            </div>
          </div>
        </div>

        {/* Live Wind Speed Slider Footer inside Hero */}
        <div className="relative z-20 mt-8 pt-4 border-t border-slate-900/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold w-full sm:w-auto">
            <Wind className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span className={effectiveSkyTheme === 'night' ? "text-slate-300" : "text-slate-800"}>
              {isFr ? "Vitesse Vent :" : "Wind Speed:"} <span className="text-emerald-600 font-mono text-sm">{windSpeed} km/h</span>
            </span>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={windSpeed}
              onChange={(e) => {
                setWindSpeed(parseFloat(e.target.value));
                setIsLiveWind(false);
              }}
              className="w-full h-1.5 bg-slate-900/20 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* FOUR LUMINORA FEATURE CARDS Floating Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-6">
        
        {/* CARD 1: OVERVIEW */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-md relative overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{isFr ? "Vue d'Ensemble" : "Overview"}</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-black text-slate-900 font-display">973 <span className="text-sm font-semibold text-slate-500">M€</span></p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "Revenu Total" : "Total Revenue"}</p>
              </div>

              <div>
                <p className="text-xl font-bold text-slate-900 font-display">2.16 €</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "Revenu par kWh" : "Revenue per kWh"}</p>
              </div>

              <div>
                <p className="text-lg font-bold text-emerald-600 font-display">18.7%</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "Retour sur Invest. (ROI)" : "ROI"}</p>
              </div>
            </div>
          </div>

          {/* Background Watermark Euro/Currency Symbol */}
          <div className="absolute right-3 bottom-2 text-slate-100 font-black text-8xl pointer-events-none select-none z-0">
            €
          </div>
        </div>

        {/* CARD 2: SOLAR */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-md relative overflow-hidden flex justify-between items-end hover:shadow-lg transition-all">
          <div className="relative z-10 space-y-3">
            <h3 className="text-lg font-bold text-slate-800 mb-1">{isFr ? "Solaire" : "Solar"}</h3>
            
            <div>
              <p className="text-2xl font-black text-slate-900 font-display">2220 <span className="text-sm font-semibold text-slate-500">MWh</span></p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "Production Totale" : "Total Generation"}</p>
            </div>

            <div>
              <p className="text-xl font-bold text-slate-900 font-display">2220 <span className="text-xs text-slate-500">MT</span></p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "CO₂ Économisé" : "CO₂ Saved"}</p>
            </div>

            <div>
              <p className="text-lg font-bold text-emerald-600 font-display">82.9%</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "Ratio Performance" : "Performance Ratio"}</p>
            </div>
          </div>

          {/* 3D Solar Panel Asset Illustration */}
          <div className="relative z-10 w-28 h-28 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              {/* Stand */}
              <path d="M 50 65 L 50 85 M 35 85 L 65 85" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
              {/* Solar Panel Surface */}
              <polygon points="20,35 80,30 90,65 10,70" fill="#2563eb" stroke="#1d4ed8" strokeWidth="3" />
              {/* Cell Grids */}
              <line x1="35" y1="34" x2="30" y2="68" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
              <line x1="50" y1="32" x2="50" y2="67" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
              <line x1="65" y1="31" x2="70" y2="66" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
              <line x1="17" y1="47" x2="84" y2="42" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
              <line x1="14" y1="58" x2="87" y2="53" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
              {/* Gloss Shine */}
              <polygon points="22,36 45,34 30,68 12,69" fill="#ffffff" opacity="0.25" />
            </svg>
          </div>
        </div>

        {/* CARD 3: WIND */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-md relative overflow-hidden flex justify-between items-end hover:shadow-lg transition-all">
          <div className="relative z-10 space-y-3">
            <h3 className="text-lg font-bold text-slate-800 mb-1">{isFr ? "Éolien" : "Wind"}</h3>
            
            <div>
              <p className="text-2xl font-black text-slate-900 font-display">2275 <span className="text-sm font-semibold text-slate-500">MWh</span></p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "Production Totale" : "Total Generation"}</p>
            </div>

            <div>
              <p className="text-xl font-bold text-slate-900 font-display">17 744 <span className="text-xs text-slate-500">MT</span></p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "CO₂ Économisé" : "CO₂ Saved"}</p>
            </div>

            <div>
              <p className="text-lg font-bold text-emerald-600 font-display">35.7%</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "Facteur Charge Moyen" : "Average PLF"}</p>
            </div>
          </div>

          {/* 3D Animated Wind Turbine Asset Illustration (Green Blades) */}
          <div className="relative z-10 w-28 h-28 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              {/* Breezy swirl lines */}
              <path d="M 10 30 Q 25 25 35 30" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M 15 42 Q 28 38 40 42" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* Stand */}
              <polygon points="47,45 53,45 55,90 45,90" fill="#64748b" />
              <circle cx="50" cy="45" r="4" fill="#334155" />
              {/* Green Spinning Blades */}
              <g style={{ transformOrigin: '50px 45px', animation: rotationDuration > 0 ? `turbineSpin ${rotationDuration}s linear infinite` : 'none' }}>
                {[0, 120, 240].map((deg) => (
                  <path key={deg} d="M 50 45 L 47 15 Q 50 10 53 15 Z" fill="#22c55e" transform={`rotate(${deg} 50 45)`} />
                ))}
                <circle cx="50" cy="45" r="5" fill="#15803d" />
              </g>
            </svg>
          </div>
        </div>

        {/* CARD 4: REPORT */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-md relative overflow-hidden flex justify-between items-end hover:shadow-lg transition-all">
          <div className="relative z-10 space-y-3">
            <h3 className="text-lg font-bold text-slate-800 mb-1">{isFr ? "Rapports" : "Report"}</h3>
            
            <div>
              <p className="text-2xl font-black text-slate-900 font-display">24</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "Rapports Actifs" : "Active Reports"}</p>
            </div>

            <div>
              <p className="text-xl font-bold text-slate-900 font-display">147</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "Téléchargements" : "Total Downloads"}</p>
            </div>

            <div>
              <p className="text-lg font-bold text-emerald-600 font-display">12</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "Partagés" : "Shared Reports"}</p>
            </div>
          </div>

          {/* 3D Green Report Organizer Folder Asset Illustration */}
          <div className="relative z-10 w-28 h-28 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              {/* Holder Container */}
              <path d="M 20 50 L 25 85 L 85 85 L 90 50 Z" fill="#84cc16" stroke="#65a30d" strokeWidth="3" />
              {/* Colored Reports inside */}
              <rect x="32" y="30" width="12" height="40" rx="3" fill="#38bdf8" />
              <rect x="48" y="20" width="12" height="50" rx="3" fill="#facc15" />
              <rect x="64" y="38" width="12" height="32" rx="3" fill="#f87171" />
              {/* Front rim */}
              <path d="M 20 50 L 90 50 L 85 85 L 25 85 Z" fill="#84cc16" opacity="0.9" />
              <line x1="20" y1="50" x2="90" y2="50" stroke="#bef264" strokeWidth="3" />
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
});
WindTurbineFieldCard.displayName = 'WindTurbineFieldCard';

const BuildingConsumptionGraphCard = React.memo(({ 
  buildingsList, 
  selectedBuildingId, 
  onSelectBuilding, 
  language 
}: { 
  buildingsList: any[]; 
  selectedBuildingId: string; 
  onSelectBuilding: (id: string) => void; 
  language: string; 
}) => {
  const isGlobal = selectedBuildingId === 'all';
  const selected = buildingsList.find(b => b.id.toString() === selectedBuildingId);

  const dynamicBarData = React.useMemo(() => buildingsList.map(b => {
    const val = parseEnergy(b.consumption);
    const shortName = b.name.includes(' - ') ? b.name.split(' - ')[0] : b.name;
    return {
      id: b.id.toString(),
      name: shortName,
      fullName: b.name,
      value: val,
      displayValue: `${val.toLocaleString()} kWh`,
      status: b.status,
      location: b.location
    };
  }), [buildingsList]);

  // Selected building's weekly history data
  const historyData = React.useMemo(() => {
    if (!selected) return [];
    const history = BUILDING_HISTORY[selected.id.toString()] || [
      { name: 'Lun', value: 450 }, { name: 'Mar', value: 490 }, { name: 'Mer', value: 420 },
      { name: 'Jeu', value: 510 }, { name: 'Ven', value: 480 }, { name: 'Sam', value: 340 }, { name: 'Dim', value: 310 }
    ];
    return history;
  }, [selected]);

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-5 mb-4 transition-all">
      {/* Header with Title & Selector Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100/80 text-emerald-800 rounded-lg">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold font-display text-slate-800">
              {language === 'fr' ? 'Graphique de Consommation Énergétique' : 'Energy Consumption Graph'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isGlobal
              ? (language === 'fr' ? 'Comparatif de consommation de tous les bâtiments du parc' : 'Comparative view of all portfolio buildings')
              : (language === 'fr' ? `Suivi détaillé : ${selected?.name} (${selected?.location || 'France'})` : `Detailed tracking: ${selected?.name}`)}
          </p>
        </div>

        {/* Dropdown & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedBuildingId}
              onChange={(e) => onSelectBuilding(e.target.value)}
              className="w-full sm:w-auto appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl pl-3 pr-8 py-2 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            >
              <option value="all">🌐 {language === 'fr' ? 'Tous les bâtiments (Vue globale)' : 'All Buildings (Global View)'}</option>
              {buildingsList.map(b => (
                <option key={b.id} value={b.id.toString()}>
                  🏢 {b.name} ({parseEnergy(b.consumption).toLocaleString()} kWh)
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {!isGlobal && (
            <button
              onClick={() => onSelectBuilding('all')}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200/60 transition-colors flex items-center gap-1 shrink-0"
              title={language === 'fr' ? 'Revenir à la vue globale' : 'Back to global view'}
            >
              <span>🌐</span>
              <span className="hidden md:inline">{language === 'fr' ? 'Vue globale' : 'Global view'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Building Quick Selector Tab Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-2 mb-3">
        <button
          onClick={() => onSelectBuilding('all')}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 border",
            isGlobal 
              ? "bg-emerald-700 text-white border-emerald-700 shadow-sm" 
              : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/60"
          )}
        >
          <span>🌐</span>
          <span>{language === 'fr' ? 'Tous les sites' : 'All Sites'}</span>
          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-white/20 font-mono">{buildingsList.length}</span>
        </button>

        {buildingsList.map(b => {
          const isSelected = selectedBuildingId === b.id.toString();
          return (
            <button
              key={b.id}
              onClick={() => onSelectBuilding(b.id.toString())}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 border",
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/60"
              )}
            >
              <Building2 className={cn("w-3.5 h-3.5", isSelected ? "text-emerald-400" : "text-slate-400")} />
              <span>{b.name}</span>
              {b.status === 'ALERTE' && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* The Interactive Chart Container */}
      <div className="w-full h-[220px] sm:h-[260px] mt-1">
        <ResponsiveContainer width="100%" height="100%">
          {isGlobal ? (
            /* Bar Chart comparing all buildings */
            <BarChart data={dynamicBarData} margin={{ top: 15, right: 15, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="globalBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#064E3B" stopOpacity={1} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="alertBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#be123c" stopOpacity={1} />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                interval={0}
                dy={8}
                tickFormatter={(val) => val.includes(' - ') ? val.split(' - ')[0] : val}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                width={56}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                tickFormatter={(val) => val === 0 ? '0 MWh' : `${Math.round(val / 1000)} MWh`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 6 }} />
              <Bar 
                dataKey="value" 
                radius={[8, 8, 0, 0]} 
                barSize={28}
                className="cursor-pointer"
                onClick={(data) => onSelectBuilding(data.id)}
              >
                {dynamicBarData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.status === 'ALERTE' ? 'url(#alertBarGrad)' : 'url(#globalBarGrad)'} 
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            /* Area Chart for individual building history */
            <AreaChart data={historyData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="singleBldgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                width={56}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                tickFormatter={(val) => `${val} kWh`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#059669" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#singleBldgGrad)" 
                activeDot={{ r: 6, fill: '#047857', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Selected Building Details Footer Strip */}
      {!isGlobal && selected && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/80 p-3 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-800">{selected.name}</p>
              <p className="text-[10px] text-slate-500 font-medium">{selected.location} • {selected.surface || '2 400 m²'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{language === 'fr' ? 'Consommation Totale' : 'Total Consumption'}</span>
              <span className="font-bold font-display text-slate-900">{parseEnergy(selected.consumption).toLocaleString()} kWh</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{language === 'fr' ? 'Statut Site' : 'Site Status'}</span>
              <Tag status={selected.status} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
BuildingConsumptionGraphCard.displayName = 'BuildingConsumptionGraphCard';

interface MontpellierBuildingCoords {
  lat: number;
  lng: number;
  address: string;
  district: string;
}

const MONTPELLIER_BUILDINGS_COORDS: Record<string, MontpellierBuildingCoords> = {
  '1': { lat: 43.5997, lng: 3.8967, address: '1 Place Georges Frêche, 34267 Montpellier', district: 'Port Marianne / Richter' },
  '2': { lat: 43.6128, lng: 3.9189, address: '1000 Rue de la Vieille Poste, 34000 Montpellier', district: 'Parc Millénaire' },
  '3': { lat: 43.6394, lng: 3.8368, address: '209 Avenue des Apothicaires, 34090 Montpellier', district: 'Euromédecine' },
  '4': { lat: 43.6083, lng: 3.8894, address: "Place du Nombre d'Or, 34000 Montpellier", district: 'Antigone' },
  '5': { lat: 43.6085, lng: 3.8795, address: '1 Place de la Comédie, 34000 Montpellier', district: 'Centre Historique / Comédie' },
  '6': { lat: 43.6042, lng: 3.9215, address: 'Place de France, 34000 Montpellier', district: 'Odysseum' },
  '7': { lat: 43.5982, lng: 3.9031, address: '200 Rue Raymond Dugrand, 34000 Montpellier', district: 'Bassin Jacques Cœur' }
};

const getBuildingMapCoords = (b: any, index: number): MontpellierBuildingCoords => {
  if (b && b.id && MONTPELLIER_BUILDINGS_COORDS[b.id.toString()]) {
    return MONTPELLIER_BUILDINGS_COORDS[b.id.toString()];
  }
  const realAddresses = [
    { lat: 43.6085, lng: 3.8795, address: '1 Place de la Comédie, 34000 Montpellier', district: 'Centre Historique' },
    { lat: 43.6042, lng: 3.9215, address: 'Place de France, 34000 Montpellier', district: 'Odysseum' },
    { lat: 43.5982, lng: 3.9031, address: '200 Rue Raymond Dugrand, 34000 Montpellier', district: 'Port Marianne Sud' },
    { lat: 43.6265, lng: 3.8645, address: 'Rue de la Roqueturière, 34090 Montpellier', district: 'Aiguelongue' },
    { lat: 43.6001, lng: 3.8450, address: 'Avenue de Lodève, 34070 Montpellier', district: 'Chamberte' },
  ];
  const item = realAddresses[index % realAddresses.length];
  return {
    lat: item.lat,
    lng: item.lng,
    address: b && b.location && b.location.includes('Montpellier') ? b.location : item.address,
    district: item.district
  };
};

const MontpellierMapCard = React.memo(({ 
  language, 
  buildingsList, 
  selectedBuildingId, 
  onSelectBuilding 
}: { 
  language: string; 
  buildingsList: any[]; 
  selectedBuildingId: string; 
  onSelectBuilding: (id: string) => void; 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapTileType, setMapTileType] = useState<'plan' | 'satellite' | 'terrain' | 'embed'>('plan');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
    displayName?: string;
  } | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);

  const selectedBuilding = React.useMemo(() => {
    return buildingsList.find(b => b.id.toString() === selectedBuildingId) || null;
  }, [buildingsList, selectedBuildingId]);

  const selectedCoords = selectedBuilding ? getBuildingMapCoords(selectedBuilding, 0) : null;

  // Real Google Maps tile layers (No API key required)
  const tileUrls = {
    plan: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    satellite: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    terrain: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'
  };

  useEffect(() => {
    if (mapTileType === 'embed') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [43.6108, 3.8767],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    const tileLayer = L.tileLayer(tileUrls[mapTileType as keyof typeof tileUrls] || tileUrls.plan, {
      maxZoom: 20
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapTileType]);

  useEffect(() => {
    if (mapTileType === 'embed' || !mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const newTileLayer = L.tileLayer(tileUrls[mapTileType as keyof typeof tileUrls] || tileUrls.plan, {
      maxZoom: 20
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
  }, [mapTileType]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapTileType === 'embed') return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    buildingsList.forEach((b, index) => {
      const coords = getBuildingMapCoords(b, index);
      const isSelected = selectedBuildingId === b.id.toString();
      const statusColor = b.status === 'ALERTE' ? '#e11d48' : b.status === 'ATTENTION' ? '#f59e0b' : '#10b981';

      const customIcon = L.divIcon({
        className: 'custom-google-maps-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            ${b.status === 'ALERTE' ? `<div style="position: absolute; top: -6px; width: 36px; height: 36px; border-radius: 9999px; background-color: rgba(225,29,72,0.3); animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
            <div style="width: 30px; height: 30px; border-radius: 9999px; background-color: #0f172a; border: 2.5px solid ${isSelected ? '#10b981' : '#ffffff'}; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.35); transform: ${isSelected ? 'scale(1.25)' : 'scale(1)'}; transition: all 0.2s;">
              <div style="width: 11px; height: 11px; border-radius: 9999px; background-color: ${statusColor};"></div>
            </div>
            <div style="margin-top: 4px; padding: 3px 8px; background-color: rgba(15,23,42,0.95); color: #ffffff; font-weight: 700; font-size: 10px; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25); white-space: nowrap; border: 1px solid rgba(255,255,255,0.2); font-family: sans-serif;">
              ${b.name}
            </div>
          </div>
        `,
        iconSize: [34, 46],
        iconAnchor: [17, 23]
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        onSelectBuilding(b.id.toString());
        map.flyTo([coords.lat, coords.lng], 15, { duration: 1 });
      });

      markersRef.current.push(marker);

      if (isSelected) {
        map.flyTo([coords.lat, coords.lng], 15, { duration: 1 });
      }
    });
  }, [buildingsList, selectedBuildingId, onSelectBuilding, mapTileType]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([43.6108, 3.8767], 13, { duration: 1 });
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleAddressSearch = async (addressToSearch?: string) => {
    const query = (typeof addressToSearch === 'string' ? addressToSearch : searchQuery).trim();
    if (!query) return;

    setIsSearching(true);
    if (typeof addressToSearch === 'string') {
      setSearchQuery(addressToSearch);
    }

    try {
      const fullQuery = query.toLowerCase().includes('montpellier') || query.toLowerCase().includes('france')
        ? query
        : `${query}, Montpellier, France`;

      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=1`, {
        headers: { 'Accept-Language': 'fr' }
      });
      let data = await res.json();

      if ((!data || data.length === 0) && fullQuery !== query) {
        const fallback = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
          headers: { 'Accept-Language': 'fr' }
        });
        data = await fallback.json();
      }

      let lat = 43.6108;
      let lng = 3.8767;
      let displayName = query;

      if (data && data.length > 0) {
        lat = parseFloat(data[0].lat);
        lng = parseFloat(data[0].lon);
        displayName = data[0].display_name.split(',').slice(0, 3).join(', ');
      }

      setSearchedLocation({ lat, lng, address: query, displayName });

      const map = mapInstanceRef.current;
      if (map && mapTileType !== 'embed') {
        if (searchMarkerRef.current) {
          searchMarkerRef.current.remove();
        }

        const searchIcon = L.divIcon({
          className: 'custom-search-marker',
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; z-index: 1000;">
              <div style="position: absolute; top: -6px; width: 38px; height: 38px; border-radius: 9999px; background-color: rgba(16,185,129,0.35); animation: ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></div>
              <div style="width: 30px; height: 30px; border-radius: 9999px; background-color: #059669; border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.4);">
                <div style="width: 10px; height: 10px; border-radius: 9999px; background-color: #ffffff;"></div>
              </div>
              <div style="margin-top: 4px; padding: 2px 7px; background-color: #0f172a; color: #ffffff; font-weight: 700; font-size: 10px; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25); white-space: nowrap; border: 1px solid rgba(255,255,255,0.25); font-family: sans-serif; max-width: 180px; overflow: hidden; text-overflow: ellipsis;">
                📍 ${query}
              </div>
            </div>
          `,
          iconSize: [34, 46],
          iconAnchor: [17, 23]
        });

        const newMarker = L.marker([lat, lng], { icon: searchIcon }).addTo(map);
        searchMarkerRef.current = newMarker;
        map.flyTo([lat, lng], 16, { duration: 1.2 });
      }
    } catch {
      setSearchedLocation({ lat: 43.6108, lng: 3.8767, address: query, displayName: query });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchedLocation(null);
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
      searchMarkerRef.current = null;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([43.6108, 3.8767], 13, { duration: 1 });
    }
  };

  const targetAddress = searchedLocation 
    ? searchedLocation.address 
    : (selectedCoords ? selectedCoords.address : 'Montpellier, France');

  const embedQuery = encodeURIComponent(targetAddress);

  return (
    <div id="montpellier-google-maps-card" className="bg-white/85 backdrop-blur-md rounded-2xl border border-white/60 shadow-md p-4 sm:p-5 flex flex-col gap-3 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 bg-emerald-100/80 text-emerald-800 rounded-lg">
            <MapPin className="w-4 h-4" />
          </div>
          <h3 className="text-base sm:text-lg font-bold font-display text-slate-800">
            {language === 'fr' ? 'Carte' : 'Map'}
          </h3>
        </div>

        {/* Onglet de recherche d'adresse directe */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleAddressSearch(); }} 
          className="flex items-center gap-1.5 w-full sm:w-auto min-w-0"
        >
          <div className="relative flex-1 sm:w-60 md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'fr' ? "Rechercher une adresse..." : "Search an address..."}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title={language === 'fr' ? 'Effacer' : 'Clear'}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0 active:scale-95"
          >
            {isSearching ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>{language === 'fr' ? 'Trouver' : 'Find'}</span>
            )}
          </button>
        </form>
      </div>

      {/* Résultat d'adresse trouvée */}
      {searchedLocation && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-900 animate-fadeIn">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[11px] font-semibold truncate">
              📍 {searchedLocation.displayName || searchedLocation.address}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchedLocation.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 bg-white text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold hover:bg-emerald-100 flex items-center gap-1 transition-colors"
              title="Ouvrir dans Maps"
            >
              <span>Maps</span>
              <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
            </a>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-emerald-700 hover:text-emerald-900 p-0.5"
              title="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 p-2 rounded-xl border border-slate-200/50 text-xs">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setMapTileType('plan')}
            className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all", mapTileType === 'plan' ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200")}
          >
            Plan
          </button>
          <button
            type="button"
            onClick={() => setMapTileType('satellite')}
            className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all", mapTileType === 'satellite' ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200")}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setMapTileType('embed')}
            className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all", mapTileType === 'embed' ? "bg-emerald-700 text-white shadow-sm" : "bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200")}
          >
            Direct
          </button>
        </div>

        {mapTileType !== 'embed' && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={handleResetView}
              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 shadow-xs"
              title="Recentrer Montpellier"
            >
              <span>📍</span>
              <span>{language === 'fr' ? 'Recentrer' : 'Center'}</span>
            </button>
            <button type="button" onClick={handleZoomIn} className="w-6 h-6 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-slate-800 font-bold text-xs shadow-xs">
              +
            </button>
            <button type="button" onClick={handleZoomOut} className="w-6 h-6 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-slate-800 font-bold text-xs shadow-xs">
              -
            </button>
          </div>
        )}
      </div>

      <div className="w-full h-[280px] sm:h-[320px] rounded-xl overflow-hidden border border-slate-200/80 relative shadow-inner z-10">
        {mapTileType === 'embed' ? (
          <iframe
            title="Carte Montpellier"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src={`https://maps.google.com/maps?q=${embedQuery}&t=${mapTileType === 'satellite' ? 'k' : 'm'}&z=${selectedBuilding ? 16 : 13}&ie=UTF8&iwloc=&output=embed`}
            className="w-full h-full"
          />
        ) : (
          <div ref={mapContainerRef} className="w-full h-full" />
        )}

        {selectedBuilding && selectedCoords && (
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl border border-slate-700/80 shadow-2xl z-[1000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="font-bold text-xs truncate font-display">{selectedBuilding.name}</p>
                <Tag status={selectedBuilding.status} />
              </div>
              <p className="text-[11px] text-slate-200 font-semibold truncate mt-1 flex items-center gap-1">
                <span>📍</span>
                <span>{selectedCoords.address}</span>
                <span className="text-slate-400 font-normal">({selectedCoords.district})</span>
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                Consommation : <span className="text-emerald-400 font-bold">{parseEnergy(selectedBuilding.consumption).toLocaleString()} kWh</span> • Type : {selectedBuilding.type || 'Bureaux'}
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCoords.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-900 text-[10px] font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1 shadow-sm"
                title="Voir l'itinéraire du site"
              >
                <span>{language === 'fr' ? 'Itinéraire' : 'Directions'}</span>
                <ExternalLink className="w-3 h-3 text-emerald-600" />
              </a>
              <button
                type="button"
                onClick={() => onSelectBuilding('all')}
                className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-500/40 shrink-0 transition-colors"
              >
                {language === 'fr' ? 'Vue Globale' : 'Global View'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
MontpellierMapCard.displayName = 'MontpellierMapCard';

const DashboardView = ({ selectedBuildingId, onSelectBuilding, language, buildingsList, metrics, onOptimize, currentDate }: { selectedBuildingId: string, onSelectBuilding: (id: string) => void, language: string, buildingsList: any[], metrics: any, onOptimize: () => void, currentDate: string }) => {
  const { width: windowWidth } = useWindowSize();
  const t = translations[language as keyof typeof translations] || translations.fr;
  const { isGlobal, selected, consumption, trend, avgEfficiency, topConsumer, anomaliesCount } = metrics;
  
  const dynamicBarData = React.useMemo(() => buildingsList.length > 0 ? buildingsList.map(b => {
    const value = parseEnergy(b.consumption);
    return {
      name: b.name,
      fullName: b.name,
      value: value,
      displayValue: `${value.toLocaleString()} kWh`,
      status: b.status === 'ALERTE' ? 'alert' : 'optimal',
      id: b.id.toString()
    };
  }) : [], [buildingsList]);

  if (buildingsList.length === 0) {
    return (
      <ViewContainer>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
            <Building2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {language === 'fr' ? 'Aucun bâtiment détecté' : 'No buildings detected'}
          </h2>
          <p className="text-slate-500 max-w-md mb-8">
            {language === 'fr' 
              ? 'Commencez par ajouter des sites dans la section "Parc Immobilier" pour activer votre tableau de bord.' 
              : 'Start by adding sites in the "Real Estate Portfolio" section to activate your dashboard.'}
          </p>
        </div>
      </ViewContainer>
    );
  }

  return (
    <ViewContainer>
      <div className="mb-3 sm:mb-4">
        <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-1 drop-shadow-sm">{currentDate}</h2>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight">
          {language === 'fr' ? 'Tableau de Bord' : 'Energy Dashboard'}
        </h1>
      </div>

      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4"
      >
        <MetricCard title={t.totalConsumption} value={consumption} subValue={t.vsLastMonth} trend={trend} icon={Zap} color="emerald" />
        <MetricCard title={t.activityPeak} value={isGlobal ? (language === 'fr' ? 'Tous les sites' : 'All Sites') : selected?.name || "N/A"} subValue={isGlobal ? t.alertThreshold : (selected?.status || t.normal)} icon={Activity} color={isGlobal || selected?.status === 'ALERTE' ? "rose" : "emerald"} />
        <MetricCard title={t.efficiency} value={isGlobal ? avgEfficiency + "%" : (parseFloat(String(selected?.economy || '0').replace(/[^0-9.]/g, '')) + 80).toFixed(1) + "%"} subValue={t.targetReached} icon={CheckCircle2} color="emerald" />
        <MetricCard title={t.anomalies} value={String(anomaliesCount)} subValue={topConsumer?.name} icon={AlertTriangle} color={anomaliesCount > 0 ? "rose" : "emerald"} />
      </motion.div>

      {/* Building Consumption Graph Card with Interactive Building Selector */}
      <BuildingConsumptionGraphCard
        buildingsList={buildingsList}
        selectedBuildingId={selectedBuildingId}
        onSelectBuilding={onSelectBuilding}
        language={language}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <EnergyMixCard language={language} buildingsList={buildingsList} isGlobal={isGlobal} selectedBuilding={selected} />
        <MontpellierMapCard language={language} buildingsList={buildingsList} selectedBuildingId={selectedBuildingId} onSelectBuilding={onSelectBuilding} />
      </div>
    </ViewContainer>
  );
};

const BuildingsView = ({ language, onAddClick, onDeleteClick, onEditClick, buildingsList }: { language: string, onAddClick: () => void, onDeleteClick: (id: number) => void, onEditClick: (b: any) => void, buildingsList: any[] }) => {
  return (
    <ViewContainer>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{language === 'fr' ? 'Parc Immobilier' : 'Real Estate Portfolio'}</h2>
          <p className="text-sm text-slate-400 font-medium mt-1">{language === 'fr' ? 'Surveillance et gestion de vos sites actifs.' : 'Monitoring and management of your active sites.'}</p>
        </div>
        <button 
          onClick={onAddClick}
          className="bg-emerald-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {language === 'fr' ? 'Ajouter' : 'Add'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {buildingsList.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl border border-slate-200/60 p-4 md:p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start mb-3 md:mb-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", 
                  b.status === "OPTIMAL" ? "bg-emerald-50 text-emerald-600" : 
                  b.status === "ATTENTION" ? "bg-amber-50 text-amber-600" : 
                  "bg-rose-50 text-rose-600"
                )}>
                  {b.status}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditClick(b);
                  }}
                  className="p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <Settings2 className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(b.id);
                  }}
                  className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-slate-800 mb-1">{b.name}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase mb-4">{b.location}</p>
            
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
              <div>
                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{language === 'fr' ? 'CONSO' : 'CONS'}</p>
                <p className="text-xs font-bold text-slate-700">{parseEnergy(b.consumption).toLocaleString()} kWh</p>
              </div>
              <div>
                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{language === 'fr' ? 'ÉCONOMIE' : 'SAVINGS'}</p>
                <p className="text-xs font-bold text-emerald-600">{b.economy}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ViewContainer>
  );
};

const AnalyticsView = React.memo(({ language, buildingsList, metrics, currentDate }: { language: string, buildingsList: any[], metrics: any, currentDate: string }) => {
  const t = translations[language as keyof typeof translations] || translations.fr;
  const { avgEfficiency, totalConsumptionValue, anomaliesCount } = metrics;
  
  if (buildingsList.length === 0) {
    return (
      <ViewContainer>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6 border border-slate-100">
            <Activity className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{language === 'fr' ? 'Analyses indisponibles' : 'Analytics unavailable'}</h2>
          <p className="text-slate-400 max-sm">{language === 'fr' ? 'Veuillez ajouter des bâtiments pour générer des analyses de performance.' : 'Please add buildings to generate performance analytics.'}</p>
        </div>
      </ViewContainer>
    );
  }

  return (
    <ViewContainer>
      <div className="mb-8">
        <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-2">{currentDate}</h2>
        <h1 className="text-3xl font-bold font-display text-slate-900 leading-tight">{language === 'fr' ? 'Analytique Avancée' : 'Advanced Analytics'}</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard title={t.efficiency} value={`${avgEfficiency}%`} subValue={language === 'fr' ? "Score moyen du parc" : "Fleet average score"} icon={Activity} color="emerald" />
        <MetricCard title={t.co2Emissions} value={`${(totalConsumptionValue * 0.0002).toFixed(1)} T`} subValue={language === 'fr' ? "Impact carbone" : "Carbon impact"} icon={Globe} color="emerald" />
        <MetricCard 
          title={t.greenMix} 
          value={`${Math.min(95, 25 + (buildingsList.filter(b => b.status === "OPTIMAL").length / (buildingsList.length || 1)) * 40).toFixed(0)}%`} 
          subValue={language === 'fr' ? "Objectif 50%" : "Goal 50%"} 
          icon={Sun} 
          color="amber" 
        />
        <MetricCard title={t.anomalies} value={String(anomaliesCount)} subValue={language === 'fr' ? "Actions requises" : "Actions required"} icon={AlertTriangle} color={anomaliesCount > 0 ? "rose" : "emerald"} />
      </div>

    </ViewContainer>
  );
});

const ReportsView = ({ language, buildingsList, currentDate }: { language: string, buildingsList: any[], currentDate: string }) => {
  const t = translations[language as keyof typeof translations] || translations.fr;
  const [selectedForReport, setSelectedForReport] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(new Date().getFullYear(), i, 1);
    return {
      value: i,
      label: date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' })
    };
  });

  const getFilteredData = () => {
    if (selectedForReport === 'all') return buildingsList;
    return buildingsList.filter(b => b.id.toString() === selectedForReport);
  };

  const getReportContext = () => {
    const monthLabel = months[selectedMonth].label;
    const year = new Date().getFullYear();
    const filterName = selectedForReport === 'all' 
      ? (language === 'fr' ? 'Parc Global' : 'Global Fleet') 
      : buildingsList.find(b => b.id.toString() === selectedForReport)?.name || '';
    return { monthLabel, year, filterName };
  };

  const exportToCSV = () => {
    const data = getFilteredData();
    const { monthLabel, year, filterName } = getReportContext();
    const headers = ['ID', 'Name', 'Location', 'Status', 'Consumption', 'Economy', 'Trend', 'Type', 'Period'];
    const rows = data.map(b => [
      b.id, b.name, b.location, b.status, b.consumption, b.economy, b.trend, b.type, `${monthLabel} ${year}`
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = filterName.replace(/\s+/g, '_');
    link.setAttribute("href", url);
    link.setAttribute("download", `Report_${safeName}_${monthLabel}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const data = getFilteredData();
    const { monthLabel, year, filterName } = getReportContext();
    const doc = new jsPDF() as any;
    
    doc.setFontSize(22);
    doc.setTextColor(6, 78, 59);
    doc.text('EcoGrid Intelligence Report', 14, 22);
    
    doc.setFontSize(14);
    doc.setTextColor(50);
    doc.text(`${language === 'fr' ? 'Sujet' : 'Subject'}: ${filterName} - ${monthLabel} ${year}`, 14, 32);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${language === 'fr' ? 'Généré le' : 'Generated on'}: ${currentDate}`, 14, 40);
    doc.text('CII ENERGIE Solutions - Performance Energetique', 14, 45);
    
    const tableColumn = ["Building", "Location", "Status", "Consumption", "Saving"];
    const tableRows = data.map(b => [
      b.name,
      b.location,
      b.status,
      b.consumption,
      b.economy
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: 'grid',
      headStyles: { fillColor: [6, 78, 59] },
      styles: { fontSize: 9 }
    });

    const safeName = filterName.replace(/\s+/g, '_');
    doc.save(`Audit_${safeName}_${monthLabel}_${year}.pdf`);
  };

  const exportToJSON = () => {
    const data = getFilteredData();
    const { monthLabel, year, filterName } = getReportContext();
    const exportData = {
      period: `${monthLabel} ${year}`,
      generatedAt: currentDate,
      data
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const safeName = filterName.replace(/\s+/g, '_');
    downloadAnchorNode.setAttribute("download", `Data_${safeName}_${monthLabel}_${year}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (buildingsList.length === 0) {
    return (
      <ViewContainer>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
            <Files className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{language === 'fr' ? 'Aucun rapport' : 'No reports'}</h2>
          <p className="text-slate-400">{language === 'fr' ? 'La génération de rapports nécessite des sites actifs.' : 'Reporting requires active sites.'}</p>
        </div>
      </ViewContainer>
    );
  }

  // Generate a dynamic list of Energy Audit reports for the current year
  const dynamicReports = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(new Date().getFullYear(), i, 1);
    const monthName = date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
    const year = date.getFullYear();
    const isFuture = i > new Date().getMonth();
    
    return {
      id: i,
      name: language === 'fr' ? `Audit Énergétique - ${monthName} ${year}` : `Energy Audit - ${monthName} ${year}`,
      date: `01 ${monthName} ${year}`,
      size: isFuture ? '--' : `${(2 + Math.random()).toFixed(1)} MB`,
      type: 'PDF',
      disabled: isFuture
    };
  }).reverse();

  return (
    <ViewContainer>
      <div className="mb-8">
        <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-2">{currentDate}</h2>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 leading-tight">{language === 'fr' ? 'Centre de Rapports' : 'Reporting Center'}</h1>
      </div>

      <div className="mb-8">
        <div className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200/50 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
              <div>
                <h3 className="text-xl font-bold font-display text-slate-900 mb-1">
                  {language === 'fr' ? 'Export de Données' : 'Data Export'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                  {language === 'fr' ? 'Configuration des paramètres' : 'Configure report settings'}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Building Selector */}
                <div className="relative w-full sm:w-auto">
                  <select 
                    value={selectedForReport}
                    onChange={(e) => setSelectedForReport(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl px-4 py-3.5 focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-all pr-10 sm:min-w-[180px]"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '12px' }}
                  >
                    <option value="all">{language === 'fr' ? 'Tous les Sites' : 'All Sites'}</option>
                    {buildingsList.map(b => (
                      <option key={b.id} value={b.id.toString()}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Month Selector */}
                <div className="relative w-full sm:w-auto">
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-emerald-200/50 text-emerald-800 text-[11px] font-bold rounded-xl px-4 py-3.5 focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none cursor-pointer hover:bg-emerald-50 transition-all pr-10 sm:min-w-[160px]"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23064e3b' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '12px' }}
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button 
                onClick={exportToPDF}
                className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95 group"
              >
                <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {language === 'fr' ? 'Audit PDF' : 'PDF Audit'}
              </button>
              <button 
                onClick={exportToCSV}
                className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-black text-white px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/20 active:scale-95 group"
              >
                <Table className="w-4 h-4 group-hover:scale-110 transition-transform" />
                CSV
              </button>
              <button 
                onClick={exportToJSON}
                className="flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 group"
              >
                <Database className="w-4 h-4 group-hover:scale-110 transition-transform" />
                JSON
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-50 rounded-full blur-[100px] -mr-40 -mt-40 opacity-40 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-slate-200/50" />
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">{language === 'fr' ? 'Audit Courant' : 'Current Audit'}</span>
        <div className="h-px flex-1 bg-slate-200/50" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden">
        {(() => {
          const { monthLabel, year, filterName } = getReportContext();
          return (
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-4 sm:gap-6 w-full">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 transition-all shadow-sm shrink-0">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base sm:text-lg text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors truncate">
                    {language === 'fr' ? `Audit Énergétique - ${monthLabel} ${year}` : `Energy Audit - ${monthLabel} ${year}`}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filterName}</span>
                    <div className="w-1 h-1 bg-slate-200 rounded-full hidden sm:block" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{monthLabel} {year}</span>
                    <div className="w-1 h-1 bg-slate-200 rounded-full hidden sm:block" />
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black shadow-sm">ACTIF</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => exportToPDF()}
                className="w-full sm:w-auto p-4 bg-white hover:bg-emerald-600 hover:text-white rounded-2xl transition-all shadow-md border border-slate-100 active:scale-95 flex items-center justify-center group/btn"
              >
                <FileDown className="w-6 h-6 text-slate-400 group-hover/btn:text-white" />
                <span className="sm:hidden ml-3 font-bold text-sm text-slate-600 group-hover/btn:text-white">{language === 'fr' ? 'Télécharger' : 'Download'}</span>
              </button>
            </div>
          );
        })()}
      </div>
    </ViewContainer>
  );
};

const GTBView = ({ language, buildingsList, selectedBuildingId }: { language: string, buildingsList: any[], selectedBuildingId: string }) => {
  const selectedBuilding = buildingsList.find(b => b.id.toString() === selectedBuildingId) || buildingsList[0];
  const t = translations[language as keyof typeof translations] || translations.fr;

  if (buildingsList.length === 0) {
    return (
      <ViewContainer>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
            <Cpu className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{language === 'fr' ? 'GTB Désactivée' : 'BMS Disabled'}</h2>
          <p className="text-slate-400 max-w-sm">{language === 'fr' ? 'Connectez un bâtiment pour accéder aux outils de gestion technique centralisée.' : 'Connect a building to access centralized technical management tools.'}</p>
        </div>
      </ViewContainer>
    );
  }

  return (
    <ViewContainer>
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{language === 'fr' ? 'Contrôle GTB' : 'BMS Control'}</h2>
        <p className="text-sm text-slate-400 font-medium mt-1">
          {language === 'fr' 
            ? `Gestion centralisée : ${selectedBuilding?.name || 'Tous les sites'}` 
            : `Centralized management: ${selectedBuilding?.name || 'All Sites'}`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* HVAC Control */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
                <Thermometer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 leading-tight">{language === 'fr' ? 'Système CVC' : 'HVAC System'}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'fr' ? 'Contrôle du climat' : 'Climate Control'}</p>
              </div>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-xl w-full sm:w-auto">
              <button className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 shadow-sm transition-all active:scale-95 border border-slate-100">Auto</button>
              <button className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Éco</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-40 h-40 md:w-48 md:h-48 flex flex-col items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#F1F5F9" strokeWidth="12" strokeLinecap="round" />
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#10B981" strokeWidth="12" strokeDasharray="283" strokeDashoffset="70" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl md:text-5xl font-bold text-slate-900 leading-none">21.5°</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{language === 'fr' ? 'Temp. Actuelle' : 'Current Temp.'}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-8">
                <button className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all active:scale-90"><Minus className="w-5 h-5 text-slate-600" /></button>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-800">22.0°</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{language === 'fr' ? 'Consigne' : 'Set Point'}</p>
                </div>
                <button className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all active:scale-90"><Plus className="w-5 h-5 text-slate-600" /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {[
                { icon: Wind, label: language === 'fr' ? 'Ventilation' : 'Ventilation', value: language === 'fr' ? 'Vitesse Moyenne' : 'Average Speed', sub: '66%', color: 'blue', tag: 'Actif' },
                { icon: CloudSun, label: language === 'fr' ? 'Humidité' : 'Humidity', value: '48%', color: 'emerald', tag: 'Optimal', bar: true },
                { label: 'CO2', subLabel: language === 'fr' ? "Qualité de l'air" : "Air Quality", value: '412 ppm', color: 'emerald', tag: 'Sain' },
                { icon: Monitor, label: language === 'fr' ? 'État Filtres' : 'Filter Status', value: '82%', color: 'amber', tag: 'À Prévoir' }
              ].map((item, i) => (
                <div key={i} className="bg-slate-50/50 p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100/50 group hover:bg-white transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    {item.icon ? <item.icon className={cn("w-4 h-4 md:w-5 md:h-5 text-slate-400 transition-colors", item.color === 'blue' ? "group-hover:text-blue-500" : item.color === 'emerald' ? "group-hover:text-emerald-500" : "group-hover:text-amber-500")} /> : <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">{item.label}</span>}
                    <span className={cn("px-1.5 py-0.5 text-[7px] md:text-[8px] font-bold uppercase rounded-md", item.color === 'blue' ? "bg-blue-100 text-blue-600" : item.color === 'emerald' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>{item.tag}</span>
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{item.icon ? item.label : item.subLabel}</p>
                    <p className="text-sm md:text-base font-bold text-slate-800 leading-tight">{item.value}</p>
                    {item.sub && <div className="h-1 bg-slate-200 rounded-full mt-3 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: item.sub }} className="h-full bg-blue-500" /></div>}
                    {item.bar && <div className="h-1 bg-slate-200 rounded-full mt-3 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: item.value }} className="h-full bg-emerald-500" /></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 border border-slate-100 shadow-sm flex flex-col transition-all hover:shadow-md">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 leading-tight">{language === 'fr' ? 'Sécurité & Accès' : 'Security & Access'}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'fr' ? 'Surveillance' : 'Monitoring'}</p>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {[
              { label: language === 'fr' ? 'Alarme Système' : 'System Alarm', status: language === 'fr' ? 'Active & Armée' : 'Active & Armed', icon: CheckCircle2, color: 'emerald', toggle: true },
              { label: language === 'fr' ? 'Portes Périphérie' : 'Perimeter Doors', status: language === 'fr' ? 'Toutes Verrouillées' : 'All Locked', icon: Lock, color: 'slate', success: true },
              { label: language === 'fr' ? 'Vidéo-surveillance' : 'Video Surveillance', status: language === 'fr' ? '24 Flux en ligne' : '24 Streams online', icon: Video, color: 'slate', dot: 'rose' }
            ].map((item, i) => (
              <div key={i} className="bg-slate-50/80 p-4 rounded-2xl flex items-center justify-between group hover:bg-white transition-all border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", item.color === 'emerald' ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500")}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-none">{item.label}</p>
                    <p className={cn("text-[9px] font-bold uppercase mt-1", item.color === 'emerald' ? "text-emerald-500" : "text-slate-400")}>{item.status}</p>
                  </div>
                </div>
                {item.toggle && <div className="w-9 h-5 bg-emerald-500 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" /></div>}
                {item.success && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                {item.dot && <div className={cn("w-2 h-2 rounded-full", item.dot === 'rose' ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />}
              </div>
            ))}
          </div>

          <button className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest mt-8 hover:bg-slate-800 transition-all shadow-lg active:scale-95">
            {language === 'fr' ? 'Journal des accès' : 'Access Log'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Lighting */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                <Lightbulb className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 leading-tight">{language === 'fr' ? 'Éclairage par zone' : 'Zonal Lighting'}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'fr' ? 'Optimisation Lumineuse' : 'Lighting Optimization'}</p>
              </div>
            </div>
            <button className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">{language === 'fr' ? 'Tout éteindre' : 'Turn All Off'}</button>
          </div>

          <div className="space-y-5 md:space-y-6">
            {[
              { name: language === 'fr' ? "Hall d'Entrée" : "Entrance Hall", desc: language === 'fr' ? '12 luminaires LED' : '12 LED fixtures', val: 60, status: true },
              { name: language === 'fr' ? 'Espace Bureaux' : 'Office Space', desc: language === 'fr' ? 'Dalles 600×600' : '600x600 panels', val: 85, status: true },
              { name: language === 'fr' ? 'Parking Souterrain' : 'Underground Parking', desc: language === 'fr' ? 'Détecteurs de présence' : 'Presence detectors', val: 20, status: false }
            ].map((item, i) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 group">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{item.name}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.desc}</p>
                </div>
                <div className="flex-[2] flex items-center gap-4">
                  <Sun className="w-4 h-4 text-slate-300 group-hover:text-amber-400 transition-colors shrink-0" />
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${item.val}%` }} className="h-full bg-amber-400 rounded-full" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 w-8 tabular-nums">{item.val}%</span>
                </div>
                <div className={cn("w-9 h-5 rounded-full relative transition-colors cursor-pointer self-start md:self-auto", item.status ? "bg-emerald-500" : "bg-slate-200")}>
                  <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all", item.status ? "right-1" : "left-1")} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Blinds */}
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 border border-slate-100 shadow-sm flex flex-col transition-all hover:shadow-md">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 leading-tight">{language === 'fr' ? 'Stores & Volets' : 'Blinds & Shutters'}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'fr' ? 'Gestion Solaire' : 'Solar Management'}</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { name: 'Façade Sud', open: 100 },
              { name: 'Façade Nord', open: 45 }
            ].map((item, i) => (
              <div key={i} className="bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-100/50 group hover:bg-white transition-all">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid grid-cols-2 gap-0.5 w-6 h-6 shrink-0 opacity-40">
                      <div className="bg-slate-900 rounded-[1px]" /><div className="bg-slate-900 rounded-[1px]" />
                      <div className="bg-slate-900 rounded-[1px]" /><div className="bg-slate-900 rounded-[1px]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-none">{item.name}</p>
                      <p className="text-[9px] font-bold text-emerald-500 uppercase mt-1">{language === 'fr' ? `Ouverture ${item.open}%` : `Opening ${item.open}%`}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm active:scale-95"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm active:scale-95"><Pause className="w-3.5 h-3.5" /></button>
                    <button className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm active:scale-95"><ArrowDown className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex gap-3 items-start">
              <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[10px] font-semibold text-emerald-800 leading-relaxed">
                {language === 'fr' 
                  ? 'Mode "Poursuite Solaire" actif pour optimiser l\'apport de chaleur.' 
                  : '"Solar Tracking" mode active to optimize heat gain.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ViewContainer>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Portfolio View');
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [buildings, setBuildings] = useState<BuildingStats[]>([]);
  const [activeWeatherCity, setActiveWeatherCity] = useState<WeatherCity>(POPULAR_CITIES[0]);

  // Synchronize city if selected building specifies a known city location
  useEffect(() => {
    if (selectedBuilding !== 'all') {
      const b = buildings.find(item => item.id.toString() === selectedBuilding.toString());
      if (b && b.location) {
        const found = POPULAR_CITIES.find(c => b.location.toLowerCase().includes(c.name.toLowerCase()));
        if (found) {
          setActiveWeatherCity(found);
        }
      }
    }
  }, [selectedBuilding, buildings]);
  // Update date automatically every minute to stay current
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAddBuildingModalOpen, setIsAddBuildingModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User Profile State
  const [userProfile, setUserProfile] = useState({
    name: 'Felix Admin',
    email: 'f.admin@ecogrid.com',
    photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    role: 'Administrateur Système EcoGrid'
  });

  // Settings State
  const [settings, setSettings] = useState({
    notificationsEmail: true,
    notificationsPush: true,
    twoFactorAuth: true,
    darkMode: false,
    language: 'fr'
  });

  const formattedDate = currentDate.toLocaleDateString(settings.language === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Sync with Firestore
  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) setIsGuest(false);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  React.useEffect(() => {
    if (!user || isGuest) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribeSnapshot = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserProfile({
          name: data.name,
          email: data.email,
          photo: data.photo,
          role: data.role
        });
        setSettings(data.settings);
      } else {
        // Initialize user if not exists
        const initialProfile = {
          name: user.displayName || 'Nouvel Utilisateur',
          email: user.email || '',
          photo: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          role: 'Analyste Énergie',
          settings: {
            notificationsEmail: true,
            notificationsPush: true,
            twoFactorAuth: false,
            darkMode: false,
            language: 'fr'
          },
          updatedAt: serverTimestamp()
        };
        setDoc(userRef, initialProfile).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribeSnapshot();
  }, [user, isGuest]);

  // Sync Buildings with Firestore
  React.useEffect(() => {
    if (!user || isGuest) {
      if (isGuest) setBuildings(TABLE_DATA);
      return;
    }

    const buildingsRef = collection(db, 'users', user.uid, 'buildings');
    const unsubscribe = onSnapshot(buildingsRef, (snapshot) => {
      const buildingsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as BuildingStats[];
      
      if (buildingsData.length === 0 && !isGuest) {
        // First time user: seed with default data
        TABLE_DATA.forEach(b => {
          const { id, ...rest } = b;
          addDoc(buildingsRef, { ...rest, createdAt: serverTimestamp() })
            .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/buildings`));
        });
      } else {
        setBuildings(buildingsData);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/buildings`);
    });

    return () => unsubscribe();
  }, [user, isGuest]);

  const updateProfileInFirestore = async (newProfile: any, newSettings: any) => {
    if (!user || isGuest) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, {
        ...newProfile,
        settings: newSettings,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login Error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      if (isGuest) {
        setIsGuest(false);
      } else {
        await auth.signOut();
      }
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  const memoizedBuildings = React.useMemo(() => buildings, [buildings]);

  const metrics = React.useMemo(() => {
    const totalConsumptionValue = memoizedBuildings.reduce((acc, b) => acc + parseEnergy(b.consumption), 0);
    const totalEconomy = memoizedBuildings.reduce((acc, b) => {
      const val = parseFloat(String(b.economy).replace(/[^0-9.]/g, '')) || 0;
      return acc + val;
    }, 0);

    const avgEfficiency = memoizedBuildings.length > 0 
      ? (totalEconomy / memoizedBuildings.length + 80).toFixed(1)
      : "0";

    const isGlobal = selectedBuilding === 'all';
    const selected = isGlobal ? null : memoizedBuildings.find(b => b.id.toString() === selectedBuilding);

    const consumption = isGlobal 
      ? `${totalConsumptionValue.toLocaleString()} kWh`
      : `${parseEnergy(selected?.consumption).toLocaleString()} kWh`;

    const topConsumer = memoizedBuildings.length > 0 
      ? [...memoizedBuildings].sort((a, b) => parseEnergy(b.consumption) - parseEnergy(a.consumption))[0]
      : null;

    const anomaliesCount = memoizedBuildings.filter(b => b.status === 'ALERTE').length;

    return {
      totalConsumptionValue,
      avgEfficiency,
      consumption,
      isGlobal,
      selected,
      topConsumer,
      anomaliesCount,
      trend: isGlobal ? "-12%" : selected?.trend || "0%"
    };
  }, [memoizedBuildings, selectedBuilding]);

  const handleUpdateBuilding = React.useCallback(async (id: string | number, data: { name: string, location: string, consumption: string, surface: string }) => {
    const baseValue = parseEnergy(data.consumption);
    const surfaceVal = parseFloat(data.surface.replace(/[^0-9.]/g, '')) || 1000;
    const density = baseValue / surfaceVal;
    
    let status: 'OPTIMAL' | 'ALERTE' | 'ATTENTION' = 'OPTIMAL';
    if (density > 20) status = 'ALERTE';
    else if (density > 12) status = 'ATTENTION';

    const calculatedEconomyVal = Math.floor(Math.max(5, (1 - (density / 25)) * 100) * 0.4 + Math.random() * 10);

    const updateData = {
      name: data.name,
      location: data.location,
      status: status,
      consumption: `${baseValue.toLocaleString()} kWh`,
      economy: `${calculatedEconomyVal}%`,
      surface: `${surfaceVal.toLocaleString()} m²`,
      updatedAt: serverTimestamp()
    };

    if (!user || isGuest) {
      setBuildings(prev => prev.map(b => b.id.toString() === id.toString() ? { ...b, ...updateData, id: b.id } as BuildingStats : b));
      return;
    }

    try {
      const bRef = doc(db, 'users', user.uid, 'buildings', id.toString());
      await setDoc(bRef, updateData, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/buildings/${id}`);
    }
  }, [user, isGuest]);

  const [editingBuilding, setEditingBuilding] = useState<BuildingStats | null>(null);

  const handleAddBuilding = React.useCallback(async (data: { name: string, location: string, consumption: string, surface: string }) => {
    const baseValue = parseEnergy(data.consumption);
    const surfaceVal = parseFloat(data.surface.replace(/[^0-9.]/g, '')) || 1000;
    
    const density = baseValue / surfaceVal;
    let status: 'OPTIMAL' | 'ALERTE' | 'ATTENTION' = 'OPTIMAL';
    if (density > 20) status = 'ALERTE';
    else if (density > 12) status = 'ATTENTION';

    const calculatedEconomyVal = Math.floor(Math.max(5, (1 - (density / 25)) * 100) * 0.4 + Math.random() * 10);
    
    const newBuildingData = {
      name: data.name,
      location: data.location,
      status: status,
      consumption: `${baseValue.toLocaleString()} kWh`,
      economy: `${calculatedEconomyVal}%`,
      trend: (density > 15 ? '+' : '-') + (Math.random() * 10).toFixed(1) + '%',
      surface: `${surfaceVal.toLocaleString()} m²`,
      occupancy: `${Math.floor(70 + Math.random() * 25)}%`,
      createdAt: serverTimestamp()
    };

    if (!user || isGuest) {
      const newId = buildings.length > 0 ? Math.max(...buildings.map(b => Number(b.id))) + 1 : 1;
      setBuildings([...buildings, { ...newBuildingData, id: newId } as BuildingStats]);
      setIsAddBuildingModalOpen(false);
      return;
    }

    try {
      const bRef = collection(db, 'users', user.uid, 'buildings');
      await addDoc(bRef, newBuildingData);
      setIsAddBuildingModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/buildings`);
    }
  }, [user, isGuest, buildings]);

  const handleDeleteBuilding = React.useCallback(async (id: number | string) => {
    if (!user || isGuest) {
      setBuildings(prev => prev.filter(b => b.id.toString() !== id.toString()));
      if (selectedBuilding === id.toString()) setSelectedBuilding('all');
      return;
    }

    try {
      const bRef = doc(db, 'users', user.uid, 'buildings', id.toString());
      await deleteDoc(bRef);
      if (selectedBuilding === id.toString()) setSelectedBuilding('all');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/buildings/${id}`);
    }
  }, [user, isGuest, selectedBuilding]);

  const handlePhotoUpload = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhoto = reader.result as string;
        setUserProfile(prev => ({ ...prev, photo: newPhoto }));
        if (!isGuest) updateProfileInFirestore({ ...userProfile, photo: newPhoto }, settings);
      };
      reader.readAsDataURL(file);
    }
  }, [isGuest, userProfile, settings]);

  const handleSmartOptimize = React.useCallback(async () => {
    if (selectedBuilding === 'all') return;
    
    const building = buildings.find(b => b.id.toString() === selectedBuilding);
    if (!building) return;

    const currentCons = parseEnergy(building.consumption);
    const newCons = Math.floor(currentCons * 0.95); // 5% reduction
    const currentEco = parseInt(String(building.economy).replace(/[^0-9]/g, '')) || 0;
    
    const updateData = {
      consumption: `${newCons.toLocaleString()} kWh`,
      economy: `${Math.min(100, currentEco + 2)}%`,
      status: 'OPTIMAL' as const,
      updatedAt: serverTimestamp()
    };

    if (!user || isGuest) {
      setBuildings(prev => prev.map(b => b.id.toString() === selectedBuilding ? { ...b, ...updateData } : b));
      return;
    }

    try {
      const bRef = doc(db, 'users', user.uid, 'buildings', selectedBuilding);
      await setDoc(bRef, updateData, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/buildings/${selectedBuilding}`);
    }
  }, [user, isGuest, selectedBuilding, buildings]);

  const currentTranslations = translations[settings.language as keyof typeof translations] || translations.fr;

  const notifications = React.useMemo(() => {
    const list: any[] = [];
    const isFr = settings.language === 'fr';
    const dayOfWeek = currentDate.getDay(); // 0: Sunday, 1: Monday, etc.

    // 1. Generate Daily Automatic Announcement based on the Day of the Week
    const dailyAnnonces = [
      {
        title: isFr ? "Consommation week-end optimisée" : "Optimized Weekend Consumption",
        message: isFr 
          ? "Tous les serveurs et ventilations fonctionnent en mode réduit de veille."
          : "All servers and ventilation are operating in reduced standby/eco mode today.",
        type: "success",
        time: isFr ? "Ce matin" : "This morning"
      },
      {
        title: isFr ? "Bilan Hebdomadaire Automatique" : "Automatic Weekly Summary",
        message: isFr
          ? "Vos gains cumulés s'élèvent à +18.4% par rapport au mois précédent."
          : "Your cumulative savings are up +18.4% compared to last month.",
        type: "success",
        time: isFr ? "À 08:30" : "At 8:30 AM"
      },
      {
        title: isFr ? "Rapport d'efficacité IA" : "AI Efficiency Report",
        message: isFr
          ? "L'optimisation globale par IA a évité un surcoût de 12% sur l'ensemble du parc hier."
          : "Global AI optimization avoided a 12% cost overrun across the fleet yesterday.",
        type: "success",
        time: isFr ? "Il y a 3h" : "3h ago"
      },
      {
        title: isFr ? "Maintenance préventive CVC" : "HVAC Preventive Maintenance",
        message: isFr
          ? "Un nettoyage de filtre automatique a été déclenché sur la centrale de traitement d'air."
          : "An automated filter clean was triggered on the air handling unit.",
        type: "info",
        time: isFr ? "Il y a 5h" : "5h ago"
      },
      {
        title: isFr ? "Alerte de pointe de consommation" : "Peak Demand Alert",
        message: isFr
          ? "Une augmentation de la température extérieure pourrait provoquer un pic de refroidissement cet après-midi."
          : "A rise in outdoor temperature could trigger a cooling demand surge this afternoon.",
        type: "alert",
        time: isFr ? "Détecté - IA" : "Detected - AI"
      },
      {
        title: isFr ? "Mode Vacance automatique" : "Automatic Shutdown Mode",
        message: isFr
          ? "Le mode éco de fin de semaine s'activera automatiquement aujourd'hui à 19:00."
          : "Weekend eco mode will automatically activate today at 7:00 PM.",
        type: "info",
        time: isFr ? "Prévu ce soir" : "Planned tonight"
      },
      {
        title: isFr ? "Bilan carbone de la semaine" : "Weekly Carbon Footprint",
        message: isFr
          ? "Vos émissions de CO2 de ce mois sont inférieures de 8.5 tonnes à l'an dernier."
          : "Your CO2 emissions for this month are 8.5 tons lower than last year.",
        type: "success",
        time: isFr ? "Hier" : "Yesterday"
      }
    ];

    const todayAnnonce = dailyAnnonces[dayOfWeek] || dailyAnnonces[1];
    list.push({
      id: "daily-annonce",
      title: todayAnnonce.title,
      message: todayAnnonce.message,
      type: todayAnnonce.type,
      time: todayAnnonce.time
    });

    // 2. Automatically Scan Buildings for Anomalies and Inject real time flags
    let index = 1;
    memoizedBuildings.forEach(b => {
      const kwh = parseEnergy(b.consumption);
      const surfaceStr = String(b.surface || '').replace(/[^0-9.]/g, '');
      const surface = parseFloat(surfaceStr) || 1000;
      const density = kwh / surface;

      // Rule A: Overconsumption density > 20 kWh/m2
      if (density > 20) {
        list.push({
          id: `anomaly-density-${b.id}-${index++}`,
          title: isFr ? `Anomalie d'intensité : ${b.name}` : `Intensity Anomaly: ${b.name}`,
          message: isFr 
            ? `Le site consomme trop d'énergie par m² (${density.toFixed(1)} kWh/m²). Seuil maximal cible : 20.`
            : `Building has excessive power rate (${density.toFixed(1)} kWh/m²). Target limit: 20.`,
          type: "alert",
          time: isFr ? "Live IA" : "Live AI"
        });
      }

      // Rule B: Extremely low occupancy with high consumption
      const occupancyPrct = parseInt(String(b.occupancy).replace(/[^0-9]/g, '')) || 100;
      if (occupancyPrct < 50 && kwh > 15000) {
        list.push({
          id: `anomaly-occupancy-${b.id}-${index++}`,
          title: isFr ? `Anomalie d'inoccupation active` : `Unoccupied Active Use Anomaly`,
          message: isFr
            ? `${b.name} maintient une forte charge (${kwh.toLocaleString()} kWh) alors qu'il est quasiment inoccupé (${occupancyPrct}%).`
            : `${b.name} maintains a high load (${kwh.toLocaleString()} kWh) while occupancy is empty (${occupancyPrct}%).`,
          type: "alert",
          time: isFr ? "Live IA" : "Live AI"
        });
      }
    });

    // Fallback if list is too short or to maintain parity with prior default mocks
    if (list.length < 3) {
      list.push({
        id: "default-1",
        title: isFr ? "Optimisation réalisée" : "Optimization Completed",
        message: isFr ? "Le bâtiment de Bordeaux a réduit sa consommation de 12% ce jour." : "Bordeaux site reduced energy consumption by 12% today.",
        type: "success",
        time: isFr ? "Il y a 2h" : "2h ago"
      });
      list.push({
        id: "default-2",
        title: isFr ? "Rapport d'audit disponible" : "Monthly audit report ready",
        message: isFr ? "Le rapport mensuel d'EcoGrid a été généré avec succès." : "The monthly EcoGrid summary sheet was successfully built.",
        type: "info",
        time: isFr ? "Il y a 1j" : "1d ago"
      });
    }

    return list;
  }, [currentDate, memoizedBuildings, settings.language]);

  const onProfileChange = (field: string, value: string) => {
    const newProfile = { ...userProfile, [field]: value };
    setUserProfile(newProfile);
    if (!isGuest) updateProfileInFirestore(newProfile, settings);
  };

  const toggleSetting = (key: keyof typeof settings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    if (!isGuest) updateProfileInFirestore(userProfile, newSettings);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView selectedBuildingId={selectedBuilding} onSelectBuilding={setSelectedBuilding} language={settings.language} buildingsList={memoizedBuildings} metrics={metrics} onOptimize={handleSmartOptimize} currentDate={formattedDate} />;
      case 'buildings': return (
        <BuildingsView 
          language={settings.language} 
          onAddClick={() => setIsAddBuildingModalOpen(true)} 
          onDeleteClick={handleDeleteBuilding}
          onEditClick={(b: any) => setEditingBuilding(b)}
          buildingsList={memoizedBuildings} 
        />
      );
      case 'analytics': return <AnalyticsView language={settings.language} buildingsList={memoizedBuildings} metrics={metrics} currentDate={formattedDate} />;
      case 'reports': return <ReportsView language={settings.language} buildingsList={memoizedBuildings} currentDate={formattedDate} />;
      case 'gtb': return <GTBView language={settings.language} buildingsList={memoizedBuildings} selectedBuildingId={selectedBuilding} />;
      case 'settings': return (
        <SettingsView 
          userProfile={userProfile} 
          onProfileChange={onProfileChange} 
          settings={settings} 
          setSettings={setSettings} 
          toggleSetting={toggleSetting} 
          fileInputRef={fileInputRef}
          handlePhotoUpload={handlePhotoUpload}
        />
      );
      default: return <DashboardView selectedBuildingId={selectedBuilding} onSelectBuilding={setSelectedBuilding} language={settings.language} buildingsList={memoizedBuildings} metrics={metrics} onOptimize={handleSmartOptimize} currentDate={formattedDate} />;
    }
  };

  const titles = { 
    dashboard: currentTranslations.dashboard, 
    buildings: currentTranslations.buildings, 
    analytics: currentTranslations.analytics, 
    reports: currentTranslations.reports, 
    gtb: currentTranslations.gtb, 
    settings: currentTranslations.settings 
  };

  const currentBuildingName = selectedBuilding === 'all' 
    ? 'Tous les sites' 
    : buildings.find(b => b.id.toString() === selectedBuilding)?.name || 'Tous les sites';

  if (loading) {
    return (
      <div className="h-dvh w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-900/10 border-t-emerald-900 rounded-full animate-spin" />
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return <LoginView onLogin={handleLogin} onGuest={() => setIsGuest(true)} />;
  }

  return (
    <div className="flex h-dvh bg-slate-900 font-sans text-slate-900 overflow-hidden relative">
      {/* Full site wind energy background image layer with dynamic time-of-day cycle & unblurred photo */}
      <GlobalWindFarmBackground windSpeed={32} skyTheme="auto" />
      {/* Modals for Add/Edit */}
      <AnimatePresence>
        {(isAddBuildingModalOpen || editingBuilding) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAddBuildingModalOpen(false); setEditingBuilding(null); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-lg relative shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{editingBuilding ? (settings.language === 'fr' ? 'Modifier le Bâtiment' : 'Edit Building') : (settings.language === 'fr' ? 'Nouveau Bâtiment' : 'New Building')}</h3>
                <button onClick={() => { setIsAddBuildingModalOpen(false); setEditingBuilding(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{settings.language === 'fr' ? 'Nom du Bâtiment' : 'Building Name'}</label>
                    <input id="modal-name" type="text" defaultValue={editingBuilding?.name || ''} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mt-1.5 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all" placeholder="Ex: Tour Crystal" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{settings.language === 'fr' ? 'Localisation / Ville' : 'Location / City'}</label>
                    <input id="modal-loc" type="text" defaultValue={editingBuilding?.location || ''} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mt-1.5 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all" placeholder="Ex: Paris 15e" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{settings.language === 'fr' ? 'Consommation (kWh)' : 'Consumption (kWh)'}</label>
                    <input id="modal-cons" type="number" defaultValue={editingBuilding ? parseEnergy(editingBuilding.consumption) : ''} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mt-1.5 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all" placeholder="12500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{settings.language === 'fr' ? 'Surface (m²)' : 'Surface (sqm)'}</label>
                    <input id="modal-surf" type="text" defaultValue={editingBuilding?.surface?.replace(/[^0-9.]/g, '') || ''} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mt-1.5 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all" placeholder="2500" />
                  </div>
                </div>
                <div className="pt-4">
                  <button 
                    onClick={() => {
                      const name = (document.getElementById('modal-name') as HTMLInputElement).value;
                      const loc = (document.getElementById('modal-loc') as HTMLInputElement).value;
                      const cons = (document.getElementById('modal-cons') as HTMLInputElement).value;
                      const surf = (document.getElementById('modal-surf') as HTMLInputElement).value;
                      
                      if (name && loc) {
                        const data = { name, location: loc, consumption: cons || '0', surface: surf || '0' };
                        if (editingBuilding) {
                          handleUpdateBuilding(editingBuilding.id, data);
                          setEditingBuilding(null);
                        } else {
                          handleAddBuilding(data);
                          setIsAddBuildingModalOpen(false);
                        }
                      }
                    }}
                    className="w-full bg-emerald-900 text-white font-bold py-4.5 rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-emerald-900/20 text-sm tracking-wide"
                  >
                    {editingBuilding ? (settings.language === 'fr' ? 'METTRE À JOUR' : 'UPDATE SITE') : (settings.language === 'fr' ? 'CRÉER LE SITE' : 'CREATE SITE')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Header / Navigation */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 active:scale-95 transition-all"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <CiiEnergieLogo size="sm" align="left" />
        </div>
        
        {/* Mobile Building Dropdown Selector */}
        <div className="relative">
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1.5 rounded-xl cursor-pointer hover:bg-slate-200 transition-all border border-slate-200/40 max-w-[120px] sm:max-w-[150px]"
          >
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 uppercase tracking-wider truncate">{currentBuildingName}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 transition-transform ml-auto", isDropdownOpen && "rotate-180")} />
          </div>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 5, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-1/2 translate-x-1/2 top-full w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 overflow-hidden"
              >
                <div 
                  onClick={() => { setSelectedBuilding('all'); setIsDropdownOpen(false); }}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-colors",
                    selectedBuilding === 'all' ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {settings.language === 'fr' ? 'Tous les sites' : 'All Sites'}
                </div>
                <div className="h-px bg-slate-100 my-1 mx-2" />
                <div className="max-h-[220px] overflow-y-auto">
                  {buildings.map((building) => (
                    <div 
                      key={building.id}
                      onClick={() => { setSelectedBuilding(building.id.toString()); setIsDropdownOpen(false); }}
                      className={cn(
                        "px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center group",
                        selectedBuilding === building.id.toString() ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <span className="truncate mr-1.5">{building.name}</span>
                      <Tag status={building.status} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5">
           <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="p-2 text-slate-400 active:scale-95 transition-all relative"
          >
            <Bell className="w-5 h-5" />
            {settings.notificationsPush && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </button>
        </div>
      </div>
 
       {/* Sidebar - Mobile Responsive */}
       <aside className={cn(
         "fixed inset-y-0 left-0 z-[60] w-[280px] sm:w-[320px] bg-white/95 backdrop-blur-2xl border-r border-slate-200/80 flex flex-col shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] lg:relative lg:translate-x-0 lg:w-64 xl:w-72 lg:z-40 overflow-y-auto",
         isSidebarOpen ? "translate-x-0 shadow-[20px_0_60px_-15px_rgba(15,23,42,0.1)]" : "-translate-x-full"
       )}>
        {/* Brand Header */}
        <div className="px-8 pt-7 pb-5 flex items-center justify-start border-b border-slate-100/80 mb-2">
          <CiiEnergieLogo align="left" size="md" />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-2 space-y-1">
          <SidebarItem icon={LayoutDashboard} label={currentTranslations.dashboard} active={activeView === 'dashboard'} onClick={() => { setActiveView('dashboard'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={Building2} label={currentTranslations.buildings} active={activeView === 'buildings'} onClick={() => { setActiveView('buildings'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={Activity} label={currentTranslations.analytics} active={activeView === 'analytics'} onClick={() => { setActiveView('analytics'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={FileText} label={currentTranslations.reports} active={activeView === 'reports'} onClick={() => { setActiveView('reports'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={SlidersHorizontal} label={currentTranslations.gtb} active={activeView === 'gtb'} onClick={() => { setActiveView('gtb'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={Settings} label={currentTranslations.settings} active={activeView === 'settings'} onClick={() => { setActiveView('settings'); setIsSidebarOpen(false); }} />
        </nav>
        
        {/* Real Live City Weather Widget with Day-by-Day Forecasts (Open-Meteo) */}
        <div className="mx-2 my-2.5">
          <CityWeatherWidget 
            currentCity={activeWeatherCity} 
            onCityChange={setActiveWeatherCity}
          />
        </div>

        {/* Logout Footer */}
        <div className="p-3 border-t border-slate-100 flex items-center bg-slate-50/50">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl font-semibold text-xs transition-colors"
            title={currentTranslations.signout}
          >
            <LogOut className="w-4 h-4" />
            <span>{currentTranslations.signout}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55] lg:hidden"
          />
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col overflow-hidden relative bg-transparent z-10">
        <header className="hidden lg:flex h-14 bg-white/70 backdrop-blur-md border-b border-white/40 px-5 items-center justify-between sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-8">
            <AnimatePresence mode="wait">
              <motion.h2 key={activeView} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-bold text-slate-800">
                {titles[activeView]}
              </motion.h2>
            </AnimatePresence>
            <div className="flex items-center gap-6 border-slate-200 h-8 border-l pl-8">
              {['Portfolio', 'Live'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={cn("relative text-[10px] font-bold transition-colors py-1 uppercase tracking-widest whitespace-nowrap", activeTab === tab ? "text-emerald-700" : "text-slate-400 hover:text-slate-600")}>
                  {tab}
                  {activeTab === tab && <motion.div layoutId="header-tab" className="absolute -bottom-[14px] left-0 right-0 h-1 bg-emerald-700 rounded-t-full" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative">
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-slate-100/60 px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-100 transition-all border border-slate-200/20 w-44"
              >
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest truncate">{currentBuildingName}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform ml-auto animate-in", isDropdownOpen && "rotate-180")} />
              </div>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 5, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 overflow-hidden"
                  >
                    <div 
                      onClick={() => { setSelectedBuilding('all'); setIsDropdownOpen(false); }}
                      className={cn(
                        "px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-colors",
                        selectedBuilding === 'all' ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      {settings.language === 'fr' ? 'Tous les sites' : 'All Sites'}
                    </div>
                    <div className="h-px bg-slate-100 my-1 mx-2" />
                    <div className="max-h-[300px] overflow-y-auto">
                      {buildings.map((building) => (
                        <div 
                          key={building.id}
                          onClick={() => { setSelectedBuilding(building.id.toString()); setIsDropdownOpen(false); }}
                          className={cn(
                            "px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-colors flex justify-between items-center group",
                            selectedBuilding === building.id.toString() ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          <span className="truncate mr-2">{building.name}</span>
                          <Tag status={building.status} />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex items-center gap-3">
               <button 
                onClick={() => setIsNotificationsOpen(true)}
                className="flex p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all relative outline-none"
              >
                <Bell className="w-5 h-5" />
                {settings.notificationsPush && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                )}
              </button>
              <button 
                onClick={() => setIsHelpOpen(true)}
                className="flex p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all relative outline-none"
                title={settings.language === 'fr' ? 'Aide' : 'Help'}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all relative outline-none"
                title={currentTranslations.signout}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scroll-smooth pt-16 lg:pt-0">
          <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
        </div>
      </main>

      {/* Notifications Drawer */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotificationsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-800">Notifications</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Alertes & Annonces</p>
                </div>
                <button 
                  onClick={() => setIsNotificationsOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                       <span className={cn(
                         "text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded",
                         n.type === 'alert' ? "bg-rose-100 text-rose-600" : 
                         n.type === 'success' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                       )}>
                         {n.type}
                       </span>
                       <span className="text-[9px] font-bold text-slate-400">{n.time}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-emerald-700 transition-colors">{n.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">{n.message}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <button className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all">
                  Tout marquer comme lu
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Help Drawer */}
      <AnimatePresence>
        {isHelpOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHelpOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-900 text-white">
                <div>
                  <h3 className="font-bold text-lg">Centre d'Aide</h3>
                  <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mt-0.5">Guide du Dashboard CII ENERGIE</p>
                </div>
                <button 
                  onClick={() => setIsHelpOpen(false)}
                  className="p-2 hover:bg-emerald-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-emerald-200" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">1</div>
                    <h4 className="font-bold text-slate-800">Métriques de Performance</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                      <p className="text-xs font-bold text-slate-700 mb-1">Consommation Totale</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Somme de toutes les énergies consommées (kWh) sur la période sélectionnée.</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                      <p className="text-xs font-bold text-slate-700 mb-1">Économie Globale</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Estimation des économies réalisées grâce à l'optimisation GTB par rapport aux lignes de base historiques.</p>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">2</div>
                    <h4 className="font-bold text-slate-800">Score ESG (75%)</h4>
                  </div>
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                    <p className="text-[11px] text-emerald-800 leading-relaxed font-semibold">
                      Le score ESG est une synthèse de votre impact Environnemental, Social et de Gouvernance. 
                      Actuellement à <span className="text-emerald-600">75%</span>, vous êtes en avance sur les objectifs sectoriels de 2026.
                    </p>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">3</div>
                    <h4 className="font-bold text-slate-800">Filtres de Bâtiment</h4>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 font-medium">Utilisez le menu déroulant en haut à droite pour basculer entre la vue globale et un bâtiment spécifique.</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 border-b border-slate-50">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-slate-600 font-medium italic">Vue Globale :</span>
                      <span className="text-xs font-bold text-slate-800">Comparaison de tout le parc</span>
                    </div>
                    <div className="flex items-center gap-3 p-2">
                      <Building2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-slate-600 font-medium italic">Vue Bâtiment :</span>
                      <span className="text-xs font-bold text-slate-800">Analyse horaire détaillée</span>
                    </div>
                  </div>
                </section>

                <div className="p-4 bg-slate-900 rounded-2xl text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs font-bold">Besoin d'un technicien ?</p>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-4 font-medium">Nos experts CII ENERGIE sont disponibles pour un audit approfondi sur site.</p>
                  <button className="w-full py-2 bg-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors">
                    Contacter le support
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

