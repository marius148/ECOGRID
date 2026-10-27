/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  TrendingUp,
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
  FileSpreadsheet,
  Clock,
  Battery,
  Activity,
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
  Volume2,
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
  CreditCard,
  Flame,
  Mail,
  EyeOff,
  UserPlus,
  LogIn,
  KeyRound,
  Fan,
  Wind
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
import { GTBExecutiveView, cleanGtbText } from './components/GTBExecutiveView';
import { LoginView } from './components/LoginView';
import { InterventionsPlanningView } from './components/InterventionsPlanningView';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { DecretTertiaireModule } from './components/DecretTertiaireModule';
import { GtbPointsMatrixTable } from './components/GtbPointsMatrixTable';
import { 
  AutoAnomalyScannerCard, 
  detectSystemAnomalies, 
  getBuildingAnomalyStatus, 
  type AnomalyItem 
} from './components/AnomalyDetector';
import { getBuildingColorTheme, BUILDING_PALETTES } from './utils/buildingThemes';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged 
} from './lib/firebase';
import type { FirebaseAuthUser } from './lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, collection, addDoc, deleteDoc } from 'firebase/firestore';

// --- Types ---
type ViewType = 'dashboard' | 'buildings' | 'analytics' | 'reports' | 'gtb' | 'planning' | 'settings';

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
  unitsCount?: number;
  powerWinterKw?: number;
  powerSummerKw?: number;
  powerHeatwaveKw?: number;
  consumptionYearMwh?: number;
}

interface GTBEquipment {
  location: string;
  category: string;
  name: string;
  brandModel: string;
  quantity: string | number;
  protocol: string;
  pointType: string;
  status: string;
}

// --- Translations ---
const translations = {
  fr: {
    dashboard: 'Tableau de bord',
    buildings: 'Parc Immobilier',
    analytics: 'Analyses',
    reports: 'Rapports',
    gtb: 'Contrôles GTB',
    planning: 'Planning Interventions',
    settings: 'Paramètres',
    userProfile: 'Profil Utilisateur',
    accountVerified: 'Compte Vérifié',
    yourName: 'Votre nom',
    yourRole: 'Votre rôle',
    emailAddress: 'Adresse Email',
    twoFactor: 'Authentification 2FA',
    enabled: 'Activé',
    disabled: 'Désactivé',
    preferencesAutomation: 'Automatismes & Seuils',
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
    settingsDesc: 'Configurez les alertes, utilisateurs et intégrations de votre plateforme CII ENERGIE.',
    emailAlertsDesc: 'Bilan hebdo et alertes critiques.',
    pushNotificationsDesc: 'Alertes système en temps réel.'
  },
  en: {
    dashboard: 'Dashboard',
    buildings: 'Real Estate',
    analytics: 'Analytics',
    reports: 'Reports',
    gtb: 'BMS Controls',
    planning: 'Intervention Schedule',
    settings: 'Settings',
    userProfile: 'User Profile',
    accountVerified: 'Account Verified',
    yourName: 'Your name',
    yourRole: 'Your role',
    emailAddress: 'Email Address',
    twoFactor: '2FA Authentication',
    enabled: 'Enabled',
    disabled: 'Disabled',
    preferencesAutomation: 'Automations & Thresholds',
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
    settingsDesc: 'Configure alerts, users and integrations for your CII ENERGIE platform.',
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

// Formateur fiable évitant toute traduction erronée en "chauve-souris" par les navigateurs
export const formatBuildingName = (name?: string, id?: string | number): string => {
  if (!name) {
    if (id) {
      const match = String(id).match(/\d+/);
      return match ? `Bâtiment ${parseInt(match[0], 10)}` : `Bâtiment ${id}`;
    }
    return 'Bâtiment';
  }
  const clean = name.trim();
  // Remplace "bat-5", "bat 5", "BAT-05", "chauve-souris-5", "chauve-souris 5" par "Bâtiment 5"
  const m = clean.match(/^(?:bat|chauve[- ]?souris)[- ]?0*(\d+)/i);
  if (m) {
    return `Bâtiment ${parseInt(m[1], 10)}`;
  }
  return clean;
};

export const cleanBuildingLocation = (loc?: string, id?: string | number): string => {
  if (!loc) return 'Rue de Malbosc, 34080 Montpellier';
  const cleaned = String(loc)
    .replace(/\s*\(Bâtiment\s*\d+\)/gi, '')
    .replace(/\s*\(Batiment\s*\d+\)/gi, '')
    .replace(/\s*\(Bât\.\s*\d+\)/gi, '')
    .replace(/\b(?:bat|chauve[- ]?souris)[- ]?0*(\d+)\b/gi, '')
    .trim();
  return cleaned || 'Rue de Malbosc, 34080 Montpellier';
};

// Détection automatique du statut d'anomalie pour un bâtiment basée sur les seuils réels du Google Sheet
export const isBuildingInAnomaly = (b: any): boolean => {
  if (!b) return false;
  const status = String(b.status || '').toUpperCase();
  if (status === 'ALERTE') return true;

  const kwh = parseEnergy(b.consumption);
  const type = String(b.type || '').toLowerCase();
  const surface = parseFloat(String(b.surface || '').replace(/[^0-9.]/g, '')) || 1000;
  const isT1 = type.includes('t1') || type.includes('étudiant') || type.includes('etudiant') || surface < 1000;
  const nominal = isT1 ? 114 : 196;

  if (nominal > 0 && kwh > 0) {
    const deltaPrct = ((kwh - nominal) / nominal) * 100;
    if (deltaPrct >= 20) return true; // Surconsommation >= +20%
    if (deltaPrct <= -50) return true; // Sous-consommation anormale / rupture
  }
  return false;
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

const GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSzA9anmbi31SQYS9-Qzo1oFGEagoJ6GcDljSYd7kJe8OCLzyujYZnTmpYlM92ljA/pub?output=csv";

const TABLE_DATA: BuildingStats[] = [
  { id: 'BAT-01', name: 'Bâtiment 1', location: 'Rue de Malbosc, 34080 Montpellier', status: 'OPTIMAL', consumption: '196 kWh', economy: '16%', trend: '-2.1%', type: 'T3 Familial', occupancy: '95%', unitsCount: 20, powerWinterKw: 16.4, powerSummerKw: 4.1, powerHeatwaveKw: 7.2, consumptionYearMwh: 71.4, surface: '1 300 m²' },
  { id: 'BAT-02', name: 'Bâtiment 2', location: 'Rue de Malbosc, 34080 Montpellier', status: 'ALERTE', consumption: '286 kWh', economy: '4%', trend: '+28.4%', type: 'T3 Familial', occupancy: '92%', unitsCount: 20, powerWinterKw: 24.8, powerSummerKw: 6.2, powerHeatwaveKw: 9.8, consumptionYearMwh: 104.2, surface: '1 300 m²' },
  { id: 'BAT-03', name: 'Bâtiment 3', location: 'Rue de Malbosc, 34080 Montpellier', status: 'OPTIMAL', consumption: '196 kWh', economy: '16%', trend: '-2.1%', type: 'T3 Familial', occupancy: '95%', unitsCount: 20, powerWinterKw: 16.4, powerSummerKw: 4.1, powerHeatwaveKw: 7.2, consumptionYearMwh: 71.4, surface: '1 300 m²' },
  { id: 'BAT-04', name: 'Bâtiment 4', location: 'Rue de Malbosc, 34080 Montpellier', status: 'ATTENTION', consumption: '14 kWh', economy: '26%', trend: '-88.5%', type: 'T3 Familial', occupancy: '94%', unitsCount: 20, powerWinterKw: 1.2, powerSummerKw: 1.0, powerHeatwaveKw: 1.1, consumptionYearMwh: 5.1, surface: '1 300 m²' },
  { id: 'BAT-05', name: 'Bâtiment 5', location: 'Rue de Malbosc, 34080 Montpellier', status: 'OPTIMAL', consumption: '196 kWh', economy: '16%', trend: '-2.1%', type: 'T3 Familial', occupancy: '95%', unitsCount: 20, powerWinterKw: 16.4, powerSummerKw: 4.1, powerHeatwaveKw: 7.2, consumptionYearMwh: 71.4, surface: '1 300 m²' },
  { id: 'BAT-06', name: 'Bâtiment 6', location: 'Rue de Malbosc, 34080 Montpellier', status: 'OPTIMAL', consumption: '114 kWh', economy: '18%', trend: '-1.8%', type: 'T1bis Étudiant', occupancy: '98%', unitsCount: 20, powerWinterKw: 10.2, powerSummerKw: 4.1, powerHeatwaveKw: 7.2, consumptionYearMwh: 41.6, surface: '750 m²' },
  { id: 'BAT-07', name: 'Bâtiment 7', location: 'Rue de Malbosc, 34080 Montpellier', status: 'ALERTE', consumption: '172 kWh', economy: '7%', trend: '+35.1%', type: 'T1bis Étudiant', occupancy: '96%', unitsCount: 20, powerWinterKw: 15.4, powerSummerKw: 5.8, powerHeatwaveKw: 8.9, consumptionYearMwh: 62.8, surface: '750 m²' },
  { id: 'BAT-08', name: 'Bâtiment 8', location: 'Rue de Malbosc, 34080 Montpellier', status: 'OPTIMAL', consumption: '114 kWh', economy: '18%', trend: '-2.4%', type: 'T1bis Étudiant', occupancy: '98%', unitsCount: 20, powerWinterKw: 10.2, powerSummerKw: 4.1, powerHeatwaveKw: 7.2, consumptionYearMwh: 41.6, surface: '750 m²' },
  { id: 'BAT-09', name: 'Bâtiment 9', location: 'Rue de Malbosc, 34080 Montpellier', status: 'OPTIMAL', consumption: '114 kWh', economy: '18%', trend: '-1.5%', type: 'T1bis Étudiant', occupancy: '98%', unitsCount: 20, powerWinterKw: 10.2, powerSummerKw: 4.1, powerHeatwaveKw: 7.2, consumptionYearMwh: 41.6, surface: '750 m²' },
  { id: 'BAT-10', name: 'Bâtiment 10', location: 'Rue de Malbosc, 34080 Montpellier', status: 'OPTIMAL', consumption: '114 kWh', economy: '18%', trend: '-3.1%', type: 'T1bis Étudiant', occupancy: '98%', unitsCount: 20, powerWinterKw: 10.2, powerSummerKw: 4.1, powerHeatwaveKw: 7.2, consumptionYearMwh: 41.6, surface: '750 m²' },
];

const GTB_INITIAL_EQUIPMENT: GTBEquipment[] = [
  { location: "Bâtiments", category: "CVC - Chauffage/Froid", name: "PAC VRV IV+ Réversible", brandModel: "DAIKIN REYQ8U", quantity: 10, protocol: "BACnet / IP", pointType: "Commande & Alarme", status: "Actif" },
  { location: "Bâtiments", category: "CVC - Distribution", name: "Boîtier BS Box multi-ports", brandModel: "DAIKIN BS16Q14AV1B", quantity: 40, protocol: "Modbus RTU", pointType: "Régulation débit", status: "Actif" },
  { location: "Bâtiments", category: "CVC - Confort", name: "Unités Gainables Logements", brandModel: "DAIKIN FXSQ-A", quantity: 200, protocol: "Bus KNX", pointType: "Consigne & Température", status: "Actif" },
  { location: "Bâtiments", category: "CVC - ECS", name: "Hydrobox ECS Individuelle", brandModel: "DAIKIN HXHD", quantity: 200, protocol: "Modbus RTU", pointType: "Sonde Température", status: "Actif" },
  { location: "Bâtiments", category: "CVC - Ventilation", name: "Centrale VMC Hygro B", brandModel: "Motorisation EC", quantity: 10, protocol: "Modbus RTU", pointType: "Débit & Alarme Filtre", status: "Alarme" },
  { location: "Bâtiments", category: "GTB - Comptage", name: "Compteur Électrique Linky/Modbus", brandModel: "Enedis / Schneider", quantity: 200, protocol: "Modbus / RS485", pointType: "Télérelève kWh", status: "Défaut" },
  { location: "Bâtiments", category: "GTB - Comptage", name: "Compteur Eau Froide", brandModel: "Compteur Télérelevé", quantity: 200, protocol: "M-Bus", pointType: "Index Volumétrique m3", status: "Actif" },
  { location: "Sous-stations", category: "GTB - Comptage", name: "Compteur Énergie Thermique (CET)", brandModel: "Siemens / Kamstrup", quantity: 10, protocol: "M-Bus", pointType: "Énergie Chaud/Froid", status: "Actif" },
  { location: "Bâtiments", category: "Sécurité", name: "Trappes Désenfumage SSI", brandModel: "Norme NF S61-937", quantity: 10, protocol: "TOR (SSI)", pointType: "Report Alarme / Position", status: "Actif" },
  { location: "Zone Technique", category: "Production ENR", name: "Champ Photovoltaïque 1296 kWc", brandModel: "Modules 500 Wc", quantity: 2592, protocol: "Modbus TCP", pointType: "Puissance & Tension", status: "Actif" },
  { location: "Zone Technique", category: "Production ENR", name: "Onduleurs Triphasés 110 kVA", brandModel: "SMA / Huawei", quantity: 10, protocol: "Modbus TCP", pointType: "Rendement & État", status: "Actif" },
  { location: "Zone Technique", category: "Stockage ENR", name: "Batterie LFP 1000 kWh", brandModel: "Pack Lithium LFP", quantity: 1, protocol: "CANbus / Modbus", pointType: "SOC / Charge / Surchauffe", status: "Actif" },
  { location: "Centrale Énergie", category: "Trigénération", name: "Cogénération Biométhane 100 kWe", brandModel: "TEDOM Cento / 2G", quantity: 1, protocol: "OPC-UA / Modbus", pointType: "Puissance / Temp / Rendement", status: "Actif" },
  { location: "Centrale Énergie", category: "Trigénération", name: "Machine Absorption LiBr 70 kW", brandModel: "Absorption Eau/LiBr", quantity: 1, protocol: "Modbus RTU", pointType: "COP & Temp Eau Glacée", status: "Actif" },
  { location: "Local GTC", category: "Supervision", name: "Serveur Central GTC Class B", brandModel: "GTC EN ISO 52120-1", quantity: 1, protocol: "OPC-UA / REST", pointType: "Supervision 91 Points", status: "Actif" },
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

const MetricCard = ({ 
  title, 
  value, 
  subValue, 
  extraInfo,
  trend, 
  icon: Icon, 
  color = "emerald" 
}: { 
  title: string; 
  value: string; 
  subValue: string; 
  extraInfo?: React.ReactNode;
  trend?: string; 
  icon: any; 
  color?: "emerald" | "amber" | "rose";
}) => {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-3 group hover:border-slate-300 transition-all h-full min-w-0"
    >
      <div className="flex justify-between items-start min-w-0">
        <span className="text-slate-500 text-xs font-medium truncate mr-2">{title}</span>
        <div className={cn("p-1.5 rounded-lg shrink-0", colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="text-xl sm:text-2xl font-bold font-display text-slate-900 leading-tight mb-1 truncate tracking-tight">{value}</h3>
        <div className="flex items-center gap-1.5 flex-wrap min-w-0 text-xs">
          {trend && (
            <span className={cn("font-semibold px-1.5 py-0.2 rounded shrink-0", trend.startsWith('-') ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50")}>
              {trend}
            </span>
          )}
          <span className="text-slate-500 font-medium truncate min-w-0">{subValue}</span>
        </div>
        {extraInfo && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            {extraInfo}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Tag = ({ status }: { status: BuildingStats['status'] }) => {
  const styles = {
    OPTIMAL: "bg-emerald-50 text-emerald-800 border-emerald-200",
    ATTENTION: "bg-amber-50 text-amber-800 border-amber-200",
    ALERTE: "bg-rose-50 text-rose-800 border-rose-200"
  };
  const labels: Record<string, string> = {
    OPTIMAL: "Nominal",
    ATTENTION: "Surveillance",
    ALERTE: "Alerte"
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border", styles[status])}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", status === 'ALERTE' ? 'bg-rose-600' : status === 'ATTENTION' ? 'bg-amber-600' : 'bg-emerald-600')} />
      <span>{labels[status] || status}</span>
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

const ViewContainer = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98 }}
    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    className={cn("p-3 sm:p-4 md:p-6 space-y-4 max-w-7xl mx-auto w-full min-w-0", className)}
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
  googleSheetsUrl?: string;
  onUpdateGoogleSheetsUrl?: (url: string) => void;
  onForceSync?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: string;
}

const SettingsView = ({ 
  userProfile, 
  onProfileChange, 
  settings, 
  setSettings, 
  toggleSetting, 
  fileInputRef, 
  handlePhotoUpload,
  googleSheetsUrl,
  onUpdateGoogleSheetsUrl,
  onForceSync,
  isSyncing,
  lastSyncTime
}: SettingsViewProps) => {
  const t = translations[settings.language as keyof typeof translations] || translations.fr;
  const [localSheetUrl, setLocalSheetUrl] = useState(googleSheetsUrl || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (googleSheetsUrl) setLocalSheetUrl(googleSheetsUrl);
  }, [googleSheetsUrl]);

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
                className="text-xs md:text-sm font-bold text-right bg-transparent border-none outline-none focus:bg-slate-100 focus:ring-2 focus:ring-emerald-500/10 rounded-lg px-3 py-1.5 transition-all text-slate-700 w-full max-w-[180px] sm:max-w-xs"
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
              {t.preferencesAutomation}
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

        {/* Intégration & Télémétrie Google Sheets */}
        <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-200/60 shadow-sm transition-all hover:shadow-md lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  {settings.language === 'fr' ? 'Liaison & Télémétrie Google Sheets' : 'Google Sheets Telemetry Link'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {settings.language === 'fr' 
                    ? 'Détection automatique des dérives énergétiques et des alarmes calculée en direct depuis votre feuille de calcul.' 
                    : 'Automated energy drift and alarm detection computed live from your spreadsheet.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>{settings.language === 'fr' ? 'Synchronisé' : 'Connected'}</span>
              </span>
              <button
                type="button"
                onClick={onForceSync}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-700", isSyncing && "animate-spin")} />
                <span>{isSyncing ? '...' : (settings.language === 'fr' ? 'Actualiser' : 'Sync')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                {settings.language === 'fr' ? 'URL de publication Google Sheets (Format CSV) :' : 'Published Google Sheets CSV URL:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localSheetUrl}
                  onChange={(e) => setLocalSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdateGoogleSheetsUrl?.(localSheetUrl);
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 3000);
                  }}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs shrink-0"
                >
                  {saveSuccess ? (settings.language === 'fr' ? 'Enregistré ✓' : 'Saved ✓') : (settings.language === 'fr' ? 'Enregistrer' : 'Save')}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                {settings.language === 'fr'
                  ? 'Pour lier une feuille : Fichier > Partager > Publier sur le web > Sélectionner Format CSV.'
                  : 'To link a sheet: File > Share > Publish to web > Select CSV format.'}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-700">{settings.language === 'fr' ? 'Dernière relève :' : 'Last telemetry poll:'}</p>
                <p className="font-mono text-emerald-800 font-bold mt-0.5">{lastSyncTime || (settings.language === 'fr' ? 'En direct' : 'Live')}</p>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {settings.language === 'fr' ? 'Fréquence : actualisation automatique toutes les 60 secondes.' : 'Frequency: auto refreshed every 60s.'}
              </p>
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
  
  const isAnom = isBuildingInAnomaly(selectedBuilding);
  const bTheme = getBuildingColorTheme(selectedBuilding?.id, selectedBuilding?.status, isAnom);
  const primaryColor = isGlobal ? '#047857' : (isAnom ? '#be123c' : '#047857');
  const secondaryColor = isGlobal ? '#064e3b' : (isAnom ? '#881337' : '#064e3b');

  const energyMixData = React.useMemo(() => {
    const buildingsCount = buildingsList.length || 1;
    const greenScore = isGlobal 
      ? (buildingsList.filter(b => b.status === "OPTIMAL").length / buildingsCount)
      : (selectedBuilding?.status === "OPTIMAL" ? 1 : 0.5);

    const solarPct = Math.min(65, 30 + (greenScore * 30));
    const cogenerationPct = 8;
    const gridPct = Math.max(10, 100 - solarPct - cogenerationPct);

    return [
      { name: language === 'fr' ? 'Solaire / Auto-prod.' : 'Solar / Self-gen.', value: solarPct, color: primaryColor, gradient: 'url(#solarGradient)' },
      { name: language === 'fr' ? 'Réseau' : 'Grid', value: gridPct, color: '#334155', gradient: 'url(#gridGradient)' },
      { name: language === 'fr' ? 'Cogénération' : 'Cogeneration', value: cogenerationPct, color: '#f59e0b', gradient: 'url(#cogenGradient)' }
    ];
  }, [language, buildingsList, isGlobal, selectedBuilding, primaryColor]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="min-w-0 pr-4">
          <h3 className="text-lg font-bold font-display text-slate-800 truncate">{language === 'fr' ? "Réseau Mixte" : 'Mix Network'}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate">
            {language === 'fr' ? `Analyse : ${isGlobal ? 'Parc Global' : selectedBuilding?.name}` : `Analysis: ${isGlobal ? 'Global' : selectedBuilding?.name}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-100 shrink-0">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Live</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center outline-none select-none">
          <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
            <PieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }} style={{ outline: 'none' }} tabIndex={-1}>
              <defs>
                <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primaryColor} stopOpacity={1} />
                  <stop offset="100%" stopColor={secondaryColor} stopOpacity={0.85} />
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

        <div className="w-full space-y-3 sm:space-y-3.5 pt-1">
          {energyMixData.map((item) => (
            <div key={item.name} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wide truncate">
                  {item.name}
                </span>
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

const WEATHER_CITIES = [
  { id: 'bordeaux', name: 'Bordeaux (Parc Aquitaine)', lat: 44.8378, lon: -0.5792, region: 'Sud-Ouest' },
  { id: 'brest', name: 'Brest (Côte Bretonne)', lat: 48.3904, lon: -4.4861, region: 'Bretagne' },
  { id: 'paris', name: 'Paris (Île-de-France)', lat: 48.8566, lon: 2.3522, region: 'Île-de-France' },
  { id: 'marseille', name: 'Marseille (PACA)', lat: 43.2965, lon: 5.3698, region: 'Méditerranée' },
  { id: 'lyon', name: 'Lyon (Rhône-Alpes)', lat: 45.7640, lon: 4.8357, region: 'Rhône-Alpes' },
];

export const GlobalDistrictBackground = React.memo(({
  skyTheme = 'auto',
}: {
  skyTheme?: 'auto' | 'sunrise' | 'day' | 'sunset' | 'night';
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

      {/* 3. Celestial Objects (Stars field at Night only - Moon removed) */}
      {activeTheme === 'night' && (
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
      )}
    </div>
  );
});
GlobalDistrictBackground.displayName = 'GlobalDistrictBackground';


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

  const dynamicBarData = React.useMemo(() => buildingsList.map((b, idx) => {
    const val = parseEnergy(b.consumption);
    const match = (b.id || '').toString().match(/\d+/) || (b.name || '').toString().match(/\d+/);
    const num = match ? parseInt(match[0], 10) : (idx + 1);
    const bName = formatBuildingName(b.name, b.id || num);
    const isAnom = isBuildingInAnomaly(b);
    return {
      id: b.id.toString(),
      name: bName,
      batLabel: bName,
      fullName: `${bName}${b.type ? ` (${b.type})` : ''}`,
      value: val,
      displayValue: `${val.toLocaleString()} kWh`,
      status: b.status,
      isAnomaly: isAnom,
      location: cleanBuildingLocation(b.location, b.id || num)
    };
  }), [buildingsList]);

  // Selected building's daily kWh computed directly from Google Sheets
  const dailyKwh = React.useMemo(() => {
    return selected ? parseEnergy(selected.consumption) || 196 : 196;
  }, [selected]);

  // Selected building's 7-day weekly bar chart data derived from Google Sheet data
  const buildingWeeklyData = React.useMemo(() => {
    if (!selected) return [];
    const daysConfig = [
      { day: 'Lun', factor: 0.99, label: language === 'fr' ? 'Lundi' : 'Monday' },
      { day: 'Mar', factor: 1.02, label: language === 'fr' ? 'Mardi' : 'Tuesday' },
      { day: 'Mer', factor: 1.00, label: language === 'fr' ? 'Mercredi' : 'Wednesday' },
      { day: 'Jeu', factor: 1.03, label: language === 'fr' ? 'Jeudi' : 'Thursday' },
      { day: 'Ven', factor: 0.98, label: language === 'fr' ? 'Vendredi' : 'Friday' },
      { day: 'Sam', factor: 0.95, label: language === 'fr' ? 'Samedi' : 'Saturday' },
      { day: 'Dim', factor: 1.03, label: language === 'fr' ? 'Dimanche' : 'Sunday' },
    ];

    return daysConfig.map(d => {
      const v = Math.round(dailyKwh * d.factor);
      return {
        id: selected.id.toString(),
        name: d.day,
        dayLabel: d.label,
        fullName: `${d.label} — ${selected.name}`,
        value: v,
        displayValue: `${v.toLocaleString()} kWh/j`,
        status: selected.status
      };
    });
  }, [selected, dailyKwh, language]);

  const ChartCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      const data = entry.payload;
      const bldg = selected || buildingsList.find(b => b.id.toString() === data.id);
      const isAnomalyDetected = data.isAnomaly || data.status === 'ALERTE' || (bldg && isBuildingInAnomaly(bldg));
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs z-50 min-w-[210px]">
          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-slate-700/80">
            <span className="font-bold text-emerald-400">{data.fullName || data.name}</span>
            <span className={cn(
              "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase",
              isAnomalyDetected ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
            )}>
              {isAnomalyDetected 
                ? (language === 'fr' ? '⚠️ ANOMALIE CONSO' : '⚠️ ANOMALY') 
                : (language === 'fr' ? '✓ MODE NORMAL' : '✓ NORMAL')}
            </span>
          </div>
          <div className="space-y-1 text-slate-300 text-[11px]">
            <p className="flex justify-between">
              <span>{language === 'fr' ? 'Conso du jour :' : 'Daily Consumption :'}</span>
              <span className="font-bold text-white font-mono">{data.displayValue || `${entry.value} kWh/j`}</span>
            </p>
            <p className="flex justify-between text-slate-400 text-[10px]">
              <span>{language === 'fr' ? 'Régime :' : 'Regime :'}</span>
              <span className={cn("font-bold font-mono", isAnomalyDetected ? "text-rose-400" : "text-emerald-400")}>
                {isAnomalyDetected 
                  ? (language === 'fr' ? 'Dérive / Surconsommation' : 'Drift / Overconsumption') 
                  : (language === 'fr' ? 'Nominal conforme' : 'Nominal compliant')}
              </span>
            </p>
            <p className="flex justify-between text-slate-400 text-[10px]">
              <span>{language === 'fr' ? 'Moyenne nominale :' : 'Nominal Average :'}</span>
              <span className="font-semibold text-emerald-300 font-mono">{dailyKwh.toLocaleString()} kWh/j</span>
            </p>
            {bldg?.powerWinterKw !== undefined && (
              <p className="flex justify-between pt-1 border-t border-slate-800 text-[10px]">
                <span className="text-slate-400">Besoin Hiver :</span>
                <span className="font-bold text-slate-100 font-sans">{bldg.powerWinterKw} kW</span>
              </p>
            )}
            {bldg?.powerSummerKw !== undefined && (
              <p className="flex justify-between text-[10px]">
                <span className="text-slate-400">Besoin Été :</span>
                <span className="font-bold text-slate-100 font-sans">{bldg.powerSummerKw} kW</span>
              </p>
            )}
            {bldg?.powerHeatwaveKw !== undefined && (
              <p className="flex justify-between text-[10px]">
                <span className="text-slate-400">Pic Canicule :</span>
                <span className="font-bold text-emerald-400 font-sans">{bldg.powerHeatwaveKw} kW</span>
              </p>
            )}
            {bldg?.consumptionYearMwh !== undefined && (
              <p className="flex justify-between text-[10px]">
                <span>Conso Annuelle :</span>
                <span className="font-bold text-emerald-300 font-mono">{bldg.consumptionYearMwh} MWh/an</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-5 mb-4 transition-all">
      {/* Header with Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100/80 text-emerald-800 rounded-lg">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold font-display text-slate-800">
              {isGlobal 
                ? (language === 'fr' ? 'Graphique de Consommation Énergétique' : 'Energy Consumption Graph')
                : (language === 'fr' ? `Graphique de Consommation — ${selected?.name}` : `Consumption Graph — ${selected?.name}`)}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isGlobal
              ? (language === 'fr' ? 'Comparatif de consommation de tous les bâtiments du parc (Bâtiment 1 à Bâtiment 10)' : 'Comparative view of all portfolio buildings (Building 1 to 10)')
              : (language === 'fr' ? `Suivi journalier : ${formatBuildingName(selected?.name, selected?.id)}` : `Daily tracking: ${formatBuildingName(selected?.name, selected?.id)}`)}
          </p>
        </div>

        {!isGlobal && (
          <button
            type="button"
            onClick={() => onSelectBuilding('all')}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200/60 transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
            title={language === 'fr' ? 'Revenir à la vue globale' : 'Back to global view'}
          >
            <span>🌐</span>
            <span>{language === 'fr' ? 'Vue globale (Tous les bâtiments)' : 'Global view (All buildings)'}</span>
          </button>
        )}
      </div>

      {/* The Interactive Chart Container */}
      {(() => {
        const isSelectedAnom = selected ? isBuildingInAnomaly(selected) : false;
        return (
          <div className="w-full h-[260px] sm:h-[300px] mt-1 min-w-0 outline-none focus:outline-none select-none">
            <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
              {isGlobal ? (
                /* Bar Chart comparing all buildings: only buildings with detected anomaly get alert color, otherwise standard normal color */
                <BarChart 
                  data={dynamicBarData} 
                  margin={{ top: 15, right: 15, left: 10, bottom: 25 }}
                  style={{ outline: 'none' }}
                  tabIndex={-1}
                >
                  <defs>
                    {/* Normal Mode Gradient - Forest Green CII ENERGIE */}
                    <linearGradient id="globalBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#064E3B" stopOpacity={1} />
                      <stop offset="100%" stopColor="#047857" stopOpacity={0.85} />
                    </linearGradient>
                    {/* Anomaly Detected Gradient - Vivid Alert Red */}
                    <linearGradient id="alertBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#be123c" stopOpacity={1} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={{ stroke: '#cbd5e1' }} 
                    tickLine={false} 
                    tick={{ fill: '#334155', fontSize: 10, fontWeight: 700 }}
                    interval={0}
                    dy={6}
                    tickFormatter={(val: string) => {
                      if (typeof window !== 'undefined') {
                        if (window.innerWidth < 640) {
                          return val.replace(/^Bâtiment\s*/i, 'B');
                        }
                        if (window.innerWidth < 1024) {
                          return val.replace(/^Bâtiment\s*/i, 'Bât. ');
                        }
                      }
                      return val;
                    }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    width={56}
                    tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)} MWh` : `${val} kWh`}
                  />
                  <Tooltip content={<ChartCustomTooltip />} cursor={{ fill: '#f8fafc', radius: 6 }} isAnimationActive={false} />
                  <Bar 
                    dataKey="value" 
                    radius={[8, 8, 0, 0]} 
                    maxBarSize={36}
                    className="cursor-pointer"
                    onClick={(entry: any) => {
                      const targetId = entry?.id || entry?.payload?.id || entry?.activePayload?.[0]?.payload?.id;
                      if (targetId) onSelectBuilding(targetId);
                    }}
                  >
                    {dynamicBarData.map((entry, index) => {
                      const hasAnomaly = entry.isAnomaly || entry.status === 'ALERTE';
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={hasAnomaly ? 'url(#alertBarGrad)' : 'url(#globalBarGrad)'} 
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              ) : (
                /* Bar Chart for individual building showing the 7 days of the week: alert color if anomaly, normal green otherwise */
                <BarChart 
                  data={buildingWeeklyData} 
                  margin={{ top: 15, right: 15, left: 10, bottom: 25 }}
                  style={{ outline: 'none' }}
                  tabIndex={-1}
                >
                  <defs>
                    <linearGradient id="singleBldgNormalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#064E3B" stopOpacity={1} />
                      <stop offset="100%" stopColor="#047857" stopOpacity={0.85} />
                    </linearGradient>
                    <linearGradient id="singleBldgAlertGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#be123c" stopOpacity={1} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={{ stroke: '#cbd5e1' }} 
                    tickLine={false} 
                    tick={{ fill: '#334155', fontSize: 10, fontWeight: 700 }}
                    interval={0}
                    dy={6}
                    tickFormatter={(val: string) => {
                      if (typeof window !== 'undefined' && window.innerWidth < 640) {
                        return val.slice(0, 3);
                      }
                      return val;
                    }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    width={56}
                    tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
                    tickFormatter={(val) => `${val} kWh`}
                  />
                  <Tooltip content={<ChartCustomTooltip />} cursor={{ fill: '#f8fafc', radius: 6 }} isAnimationActive={false} />
                  <Bar 
                    dataKey="value" 
                    radius={[8, 8, 0, 0]} 
                    maxBarSize={44}
                  >
                    {buildingWeeklyData.map((day, idx) => (
                      <Cell 
                        key={`day-${idx}`} 
                        fill={isSelectedAnom 
                          ? (day.isPeak ? '#881337' : 'url(#singleBldgAlertGrad)') 
                          : (day.isPeak ? '#064e3b' : 'url(#singleBldgNormalGrad)')} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        );
      })()}
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
  '1': { lat: 43.6326, lng: 3.8310, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  '2': { lat: 43.6329, lng: 3.8314, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  '3': { lat: 43.6332, lng: 3.8318, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  '4': { lat: 43.6335, lng: 3.8322, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  '5': { lat: 43.6338, lng: 3.8326, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  '6': { lat: 43.6341, lng: 3.8330, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  '7': { lat: 43.6344, lng: 3.8334, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  '8': { lat: 43.6347, lng: 3.8338, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  '9': { lat: 43.6350, lng: 3.8342, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  '10': { lat: 43.6353, lng: 3.8346, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  'BAT-01': { lat: 43.6326, lng: 3.8310, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  'BAT-02': { lat: 43.6329, lng: 3.8314, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  'BAT-03': { lat: 43.6332, lng: 3.8318, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  'BAT-04': { lat: 43.6335, lng: 3.8322, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  'BAT-05': { lat: 43.6338, lng: 3.8326, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  'BAT-06': { lat: 43.6341, lng: 3.8330, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  'BAT-07': { lat: 43.6344, lng: 3.8334, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  'BAT-08': { lat: 43.6347, lng: 3.8338, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  'BAT-09': { lat: 43.6350, lng: 3.8342, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
  'BAT-10': { lat: 43.6353, lng: 3.8346, address: 'Rue de Malbosc, 34080 Montpellier', district: 'Quartier Malbosc' },
};

const getBuildingMapCoords = (b: any, index: number): MontpellierBuildingCoords => {
  if (b) {
    const rawId = (b.id || '').toString();
    if (MONTPELLIER_BUILDINGS_COORDS[rawId]) return MONTPELLIER_BUILDINGS_COORDS[rawId];
    const match = rawId.match(/\d+/) || (b.name || '').toString().match(/\d+/);
    if (match && MONTPELLIER_BUILDINGS_COORDS[match[0]]) {
      return MONTPELLIER_BUILDINGS_COORDS[match[0]];
    }
  }
  const idx = index + 1;
  const latOffset = (idx * 0.0003);
  const lngOffset = (idx * 0.0004);
  return {
    lat: 43.6325 + latOffset,
    lng: 3.8308 + lngOffset,
    address: b && b.location ? cleanBuildingLocation(b.location, idx) : `Rue de Malbosc, 34080 Montpellier (Bâtiment ${idx})`,
    district: 'Quartier Malbosc'
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
      center: [43.6335, 3.8322],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    const tileLayer = L.tileLayer(tileUrls[mapTileType as keyof typeof tileUrls] || tileUrls.plan, {
      maxZoom: 20
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

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

    if (selectedBuildingId === 'all') {
      // Vue d'ensemble du parc : aucun empilement de marqueurs pour préserver la lisibilité de la carte
      const centerCoords = { lat: 43.6338, lng: 3.8326 };
      map.flyTo([centerCoords.lat, centerCoords.lng], 15, { duration: 1 });
    } else {
      const bIndex = buildingsList.findIndex(b => b.id.toString() === selectedBuildingId);
      const b = buildingsList[bIndex] || buildingsList[0];
      if (b) {
        const coords = getBuildingMapCoords(b, bIndex >= 0 ? bIndex : 0);
        const isAnom = isBuildingInAnomaly(b);
        const statusColor = isAnom ? '#e11d48' : b.status === 'ATTENTION' ? '#f59e0b' : '#10b981';
        
        const markerHtml = isAnom ? `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="position: absolute; top: -5px; width: 38px; height: 38px; border-radius: 9999px; background-color: #f43f5e; opacity: 0.6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 28px; height: 28px; border-radius: 9999px; background-color: #be123c; border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(225,29,72,0.5); z-index: 10;">
              <div style="width: 9px; height: 9px; border-radius: 9999px; background-color: #ffffff;"></div>
            </div>
            <div style="margin-top: 4px; padding: 3px 8px; background-color: #be123c; color: #ffffff; font-weight: 800; font-size: 11px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); white-space: nowrap; font-family: 'Plus Jakarta Sans', sans-serif;">
              🚨 ${formatBuildingName(b.name, b.id)} (Anomalie Détectée)
            </div>
          </div>
        ` : `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="width: 26px; height: 26px; border-radius: 9999px; background-color: #0f172a; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
              <div style="width: 8px; height: 8px; border-radius: 9999px; background-color: ${statusColor};"></div>
            </div>
            <div style="margin-top: 4px; padding: 3px 8px; background-color: #0f172a; color: #ffffff; font-weight: 700; font-size: 11px; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); white-space: nowrap; font-family: 'Plus Jakarta Sans', sans-serif;">
              ${formatBuildingName(b.name, b.id)}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-google-maps-marker',
          html: markerHtml,
          iconSize: [36, 48],
          iconAnchor: [18, 14]
        });
        const marker = L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(map);
        markersRef.current.push(marker);
        map.flyTo([coords.lat, coords.lng], 16, { duration: 1 });
      }
    }
  }, [buildingsList, selectedBuildingId, onSelectBuilding, mapTileType]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([43.6335, 3.8322], 15, { duration: 1 });
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

      let lat = 43.6335;
      let lng = 3.8322;
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
      setSearchedLocation({ lat: 43.6335, lng: 3.8322, address: query, displayName: query });
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
      mapInstanceRef.current.flyTo([43.6335, 3.8322], 15, { duration: 1 });
    }
  };

  const targetAddress = searchedLocation 
    ? searchedLocation.address 
    : (selectedCoords ? selectedCoords.address : 'Rue de Malbosc, 34080 Montpellier, France');

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
          <div className="relative flex-1 min-w-[130px] max-w-full sm:max-w-[220px]">
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

const DashboardView = ({ 
  selectedBuildingId, 
  onSelectBuilding, 
  language, 
  buildingsList, 
  metrics, 
  onOptimize, 
  currentDate,
  isSyncing,
  lastSyncTime,
  onForceSync,
  onNavigateView,
  gtbEquipments,
  gtbControls,
  onFixGtbSetpoint,
  onSimulateScenario
}: { 
  selectedBuildingId: string; 
  onSelectBuilding: (id: string) => void; 
  language: string; 
  buildingsList: any[]; 
  metrics: any; 
  onOptimize: () => void; 
  currentDate: string;
  isSyncing?: boolean;
  lastSyncTime?: string;
  onForceSync?: () => void;
  onNavigateView?: (view: ViewType) => void;
  gtbEquipments?: any[];
  gtbControls?: {
    heatingSetpoint?: number;
    coolingSetpoint?: number;
    globalMode?: string;
  };
  onFixGtbSetpoint?: (heating: number, cooling: number) => void;
  onSimulateScenario?: (scenario: 'high' | 'low' | 'gtb' | 'reset') => void;
}) => {
  const { width: windowWidth } = useWindowSize();
  const t = translations[language as keyof typeof translations] || translations.fr;
  const { 
    isGlobal, 
    selected, 
    consumption, 
    trend, 
    avgEfficiency, 
    topConsumer, 
    anomaliesCount,
    totalHeatingPowerKw,
    selectedHeatingPowerKw
  } = metrics;
  
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
      <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-emerald-800 mb-0.5">{currentDate}</p>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight">
            {language === 'fr' ? 'Tableau de Bord' : 'Energy Dashboard'}
          </h1>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onNavigateView && (
            <button
              type="button"
              onClick={() => onNavigateView('planning')}
              className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-emerald-800 font-semibold bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
              title={language === 'fr' ? 'Consulter le planning des interventions' : 'View interventions schedule'}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>{language === 'fr' ? 'Planning' : 'Planning'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const doc = new jsPDF() as any;
              doc.setFontSize(20);
              doc.setTextColor(35, 107, 51);
              doc.text('CII ENERGIE - Bilan de Supervision Énergétique', 14, 22);
              
              doc.setFontSize(11);
              doc.setTextColor(50);
              const filterLabel = isGlobal ? (language === 'fr' ? 'Parc Global (10 Bâtiments)' : 'All Sites (10 Buildings)') : (selected?.name || 'Bâtiment');
              doc.text(`Périmètre: ${filterLabel} | Date: ${currentDate}`, 14, 32);
              doc.text('Supervision continue des puissances et consommations GTB Classe B', 14, 38);

              const tableColumn = ["Site", "Type", "Hiver (kW)", "Été (kW)", "Conso (kWh/j)", "Statut"];
              const tableRows = (isGlobal ? buildingsList : [selected].filter(Boolean)).map(b => [
                b.name,
                b.type || 'Tertiaire',
                b.powerWinterKw ? `${b.powerWinterKw} kW` : '--',
                b.powerSummerKw ? `${b.powerSummerKw} kW` : '--',
                `${parseEnergy(b.consumption).toLocaleString()} kWh`,
                b.status
              ]);

              autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 46,
                theme: 'grid',
                headStyles: { fillColor: [35, 107, 51] },
                styles: { fontSize: 9 }
              });

              doc.save(`CII_ENERGIE_Bilan_${isGlobal ? 'Global' : selected?.id || 'Site'}_${new Date().toISOString().slice(0, 10)}.pdf`);
            }}
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-emerald-800 font-semibold bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
            title={language === 'fr' ? 'Télécharger le bilan PDF' : 'Download PDF Report'}
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>{language === 'fr' ? 'Bilan PDF' : 'PDF Report'}</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className={cn("w-2 h-2 rounded-full", isSyncing ? "bg-amber-500 animate-spin" : "bg-emerald-600")} />
            <span>{language === 'fr' ? 'Télémétrie en direct' : 'Live Telemetry'}</span>
            {onForceSync && (
              <button
                type="button"
                onClick={onForceSync}
                disabled={isSyncing}
                title={language === 'fr' ? 'Actualiser les données de télémétrie' : 'Sync telemetry'}
                className="ml-1 p-0.5 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-700 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin text-emerald-600")} />
              </button>
            )}
          </div>
        </div>
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
        <MetricCard 
          title={isGlobal ? (language === 'fr' ? 'Puissance Chauffage Totale' : 'Total Heating Power') : (language === 'fr' ? 'Puissance Chauffage Site' : 'Site Heating Power')} 
          value={isGlobal 
            ? `${Math.round(totalHeatingPowerKw || 133).toLocaleString('fr-FR')} kW` 
            : `${selectedHeatingPowerKw !== undefined ? `${selectedHeatingPowerKw} kW` : (selected?.powerWinterKw !== undefined ? `${selected.powerWinterKw} kW` : '16,4 kW')}`
          } 
          subValue={isGlobal 
            ? (language === 'fr' 
                ? `Conso électrique : ${consumption}/j` 
                : `Electricity consumption: ${consumption}/d`)
            : (language === 'fr'
                ? `Conso électrique : ${consumption}/j`
                : `Electricity consumption: ${consumption}/d`)
          } 
          extraInfo={
            <div className="flex items-center justify-between w-full text-[10px] text-slate-600">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <span>⚡</span>
                <span>{language === 'fr' ? 'Conso journalière (Google Sheet) :' : 'Daily Conso (Google Sheet):'}</span>
              </span>
              <span className="font-bold text-[#236b33] font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 shadow-2xs">
                {consumption}
              </span>
            </div>
          }
          trend={trend} 
          icon={Flame} 
          color="emerald" 
        />
        <MetricCard title={t.activityPeak} value={isGlobal ? (language === 'fr' ? 'Tous les sites' : 'All Sites') : formatBuildingName(selected?.name, selected?.id) || "N/A"} subValue={isGlobal ? t.alertThreshold : (selected?.status || t.normal)} icon={Activity} color={isGlobal || selected?.status === 'ALERTE' ? "rose" : "emerald"} />
        <MetricCard title={t.efficiency} value={isGlobal ? avgEfficiency + "%" : (parseFloat(String(selected?.economy || '0').replace(/[^0-9.]/g, '')) + 80).toFixed(1) + "%"} subValue={t.targetReached} icon={CheckCircle2} color="emerald" />
        <MetricCard title={t.anomalies} value={String(anomaliesCount)} subValue={topConsumer ? formatBuildingName(topConsumer.name, topConsumer.id) : undefined} icon={AlertTriangle} color={anomaliesCount > 0 ? "rose" : "emerald"} />
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

const BuildingsView = ({ 
  language, 
  onAddClick, 
  onDeleteClick, 
  onEditClick, 
  buildingsList,
  selectedBuildingId,
  onSelectBuilding,
  onNavigateView,
  isSyncing,
  lastSyncTime,
  onForceSync
}: { 
  language: string; 
  onAddClick: () => void; 
  onDeleteClick: (id: number) => void; 
  onEditClick: (b: any) => void; 
  buildingsList: any[];
  selectedBuildingId?: string;
  onSelectBuilding?: (id: string) => void;
  onNavigateView?: (view: ViewType) => void;
  isSyncing?: boolean;
  lastSyncTime?: string;
  onForceSync?: () => void;
}) => {
  return (
    <ViewContainer>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 font-display">{language === 'fr' ? 'Parc Immobilier' : 'Real Estate Portfolio'}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold bg-white px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs">
              <span className={cn("w-2 h-2 rounded-full", isSyncing ? "bg-amber-500 animate-spin" : "bg-emerald-500")} />
              <span>{language === 'fr' ? 'Télémétrie active' : 'Live Telemetry'}</span>
              {onForceSync && (
                <button
                  onClick={onForceSync}
                  disabled={isSyncing}
                  title={language === 'fr' ? "Actualiser la télémétrie" : "Refresh telemetry"}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-700 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin text-emerald-600")} />
                </button>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {language === 'fr' ? 'Surveillance, puissances thermiques et consommations du parc.' : 'Monitoring, thermal power and portfolio consumption.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {selectedBuildingId && selectedBuildingId !== 'all' && (
            <button
              onClick={() => onSelectBuilding?.('all')}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              {language === 'fr' ? 'Désélectionner' : 'Clear selection'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const headers = ['ID', 'Nom', 'Type', 'Hiver_kW', 'Été_kW', 'Pic_Canicule_kW', 'Conso_kWh_j', 'Annuel_MWh', 'Statut'];
              const rows = buildingsList.map(b => [
                b.id,
                b.name,
                b.type || 'Tertiaire',
                b.powerWinterKw ?? '--',
                b.powerSummerKw ?? '--',
                b.powerHeatwaveKw ?? '--',
                parseEnergy(b.consumption),
                b.consumptionYearMwh ?? '--',
                b.status
              ]);
              const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.setAttribute("href", url);
              link.setAttribute("download", `CII_ENERGIE_Parc_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            title={language === 'fr' ? 'Exporter la liste en CSV' : 'Export to CSV'}
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === 'fr' ? 'Exporter' : 'Export'}</span>
          </button>
          <button 
            onClick={onAddClick}
            className="bg-emerald-900 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm hover:bg-emerald-800 active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {language === 'fr' ? 'Ajouter' : 'Add'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {buildingsList.map((b) => {
          const isSelected = selectedBuildingId === b.id.toString();
          const isAnom = isBuildingInAnomaly(b);

          return (
            <div 
              key={b.id} 
              onClick={() => onSelectBuilding?.(b.id.toString())}
              className={cn(
                "rounded-2xl p-4 md:p-5 transition-all group relative overflow-hidden flex flex-col justify-between cursor-pointer bg-white",
                isAnom 
                  ? "border-2 border-rose-500 ring-4 ring-rose-500/20 shadow-lg shadow-rose-950/10 hover:border-rose-600 hover:shadow-xl" 
                  : isSelected 
                    ? "border-2 border-emerald-600 ring-4 ring-emerald-500/20 shadow-xl shadow-emerald-950/10" 
                    : "border border-slate-200/80 hover:border-emerald-400 hover:shadow-md"
              )}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    isAnom 
                      ? "bg-rose-600 text-white shadow-xs" 
                      : isSelected 
                        ? "bg-emerald-600 text-white shadow-xs" 
                        : "bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600"
                  )}>
                    {isAnom ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <Building2 className="w-5 h-5" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isAnom ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-2xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        {language === 'fr' ? 'Anomalie' : 'Anomaly'}
                      </span>
                    ) : isSelected && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
                        Actif
                      </span>
                    )}
                    <Tag status={b.status} />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditClick(b);
                      }}
                      className="p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      title="Éditer"
                    >
                      <Settings2 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteClick(b.id);
                      }}
                      className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {b.type && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold",
                      isAnom ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-emerald-50 text-emerald-800"
                    )}>
                      {b.type}
                    </span>
                  </div>
                )}

                <h3 className={cn(
                  "font-bold mb-3 transition-colors",
                  isAnom ? "text-rose-950 font-extrabold" : "text-slate-900 group-hover:text-emerald-800"
                )}>
                  {formatBuildingName(b.name, b.id)}
                </h3>

                {(b.powerWinterKw !== undefined || b.powerSummerKw !== undefined) && (
                  <div className={cn(
                    "rounded-xl p-2.5 mb-3 text-xs space-y-1.5 border transition-all",
                    isAnom ? "bg-rose-50/80 border-rose-200" : "bg-emerald-50/40 border-emerald-100/90 shadow-2xs"
                  )}>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-[11px] font-medium text-slate-600">Besoin Hiver :</span>
                      <span className="font-bold text-slate-900 font-sans tracking-tight">
                        {b.powerWinterKw ?? '--'} <span className="text-[10px] font-semibold text-slate-500">kW</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-[11px] font-medium text-slate-600">Besoin Été :</span>
                      <span className="font-bold text-slate-900 font-sans tracking-tight">
                        {b.powerSummerKw ?? '--'} <span className="text-[10px] font-semibold text-slate-500">kW</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-[11px] font-medium text-slate-600">Pic Canicule :</span>
                      <span className="font-bold text-emerald-950 font-sans tracking-tight">
                        {b.powerHeatwaveKw ?? '--'} <span className="text-[10px] font-bold text-emerald-700">kW</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <div className={cn(
                  "pt-3 border-t mb-3 flex items-center justify-between",
                  isAnom ? "border-rose-200" : "border-slate-100"
                )}>
                  <div>
                    <p className={cn(
                      "text-[9px] font-bold uppercase tracking-wider",
                      isAnom ? "text-rose-700 font-extrabold" : "text-slate-400"
                    )}>
                      {language === 'fr' ? 'CONSO ÉLEC' : 'ELEC CONS'}
                    </p>
                    <p className={cn(
                      "text-xs font-mono inline-block mt-0.5",
                      isAnom 
                        ? "text-rose-700 bg-rose-200/90 border border-rose-300 px-2 py-0.5 rounded-md font-extrabold shadow-2xs" 
                        : "font-bold text-slate-900"
                    )}>
                      {parseEnergy(b.consumption).toLocaleString()} kWh/j
                    </p>
                  </div>
                  {b.consumptionYearMwh && (
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {language === 'fr' ? 'ANNUEL' : 'ANNUAL'}
                      </p>
                      <p className={cn(
                        "text-xs font-semibold font-mono mt-0.5",
                        isAnom ? "text-rose-700 font-bold" : "text-emerald-700"
                      )}>
                        {b.consumptionYearMwh} MWh/an
                      </p>
                    </div>
                  )}
                </div>

                {/* Boutons d'Action & Communication Croisée */}
                {onNavigateView && (
                  <div className={cn(
                    "pt-2 border-t grid grid-cols-4 gap-1 sm:gap-1.5",
                    isAnom ? "border-rose-200" : "border-slate-100/70"
                  )}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBuilding?.(b.id.toString());
                        onNavigateView('dashboard');
                      }}
                      className={cn(
                        "py-1.5 px-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer",
                        isAnom 
                          ? "bg-rose-600 hover:bg-rose-700 text-white shadow-xs" 
                          : "bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200"
                      )}
                      title="Voir au Tableau de Bord"
                    >
                      <LayoutDashboard className={cn("w-3 h-3", isAnom ? "text-white" : "text-emerald-600")} />
                      <span>{isAnom ? (language === 'fr' ? 'Alerte' : 'Alert') : (language === 'fr' ? 'Bord' : 'Dash')}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBuilding?.(b.id.toString());
                        onNavigateView('gtb');
                      }}
                      className="py-1.5 px-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 border border-slate-200 cursor-pointer"
                      title="Contrôles GTB de ce bâtiment"
                    >
                      <SlidersHorizontal className="w-3 h-3 text-emerald-600" />
                      <span>GTB</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBuilding?.(b.id.toString());
                        onNavigateView('planning');
                      }}
                      className="py-1.5 px-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 border border-slate-200 cursor-pointer"
                      title={language === 'fr' ? 'Planning des interventions de ce bâtiment' : 'Interventions schedule'}
                    >
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      <span>{language === 'fr' ? 'Plan' : 'Plan'}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBuilding?.(b.id.toString());
                        onNavigateView('analytics');
                      }}
                      className="py-1.5 px-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 border border-slate-200 cursor-pointer"
                      title="Analyses détaillées"
                    >
                      <BarChart3 className="w-3 h-3 text-emerald-600" />
                      <span>Analyses</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ViewContainer>
  );
};

const AnalyticsView = React.memo(({ 
  language, 
  buildingsList, 
  metrics, 
  currentDate,
  selectedBuildingId,
  onSelectBuilding,
  onNavigateView,
  isSyncing,
  lastSyncTime,
  onForceSync
}: { 
  language: string; 
  buildingsList: any[]; 
  metrics: any; 
  currentDate: string;
  selectedBuildingId?: string;
  onSelectBuilding?: (id: string) => void;
  onNavigateView?: (view: ViewType) => void;
  isSyncing?: boolean;
  lastSyncTime?: string;
  onForceSync?: () => void;
}) => {
  const t = translations[language as keyof typeof translations] || translations.fr;
  const { avgEfficiency, totalConsumptionValue, anomaliesCount, totalHeatingPowerKw } = metrics;
  
  const isGlobal = !selectedBuildingId || selectedBuildingId === 'all';
  const [analyticsTab, setAnalyticsTab] = useState<'supervision' | 'decret'>('supervision');
  const selected = useMemo(() => {
    if (isGlobal) return null;
    return buildingsList.find(b => b.id.toString() === selectedBuildingId.toString()) || null;
  }, [buildingsList, selectedBuildingId, isGlobal]);

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider sm:tracking-widest mb-1 drop-shadow-sm">{currentDate}</h2>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight">
            {language === 'fr' ? 'Analytique & Performance Énergétique' : 'Energy Analytics & Performance'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isGlobal 
              ? (language === 'fr' ? 'Supervision consolidée sur l’ensemble du parc (10 bâtiments)' : 'Consolidated fleet performance (10 buildings)')
              : (language === 'fr' ? `Données réelles et télémétrie : ${formatBuildingName(selected?.name, selected?.id)}` : `Real telemetry data: ${formatBuildingName(selected?.name, selected?.id)}`)
            }
          </p>
        </div>

        {/* Indicateur de statut de connexion */}
        <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold bg-white/90 px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-2xs self-start sm:self-auto backdrop-blur-xs">
          <span className={cn("w-2 h-2 rounded-full", isSyncing ? "bg-amber-500 animate-spin" : "bg-emerald-500")} />
          <span>{language === 'fr' ? 'Télémétrie en direct' : 'Live Telemetry'}</span>
          {onForceSync && (
            <button
              onClick={onForceSync}
              disabled={isSyncing}
              title={language === 'fr' ? "Actualiser la télémétrie" : "Refresh"}
              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-700 transition cursor-pointer"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin text-emerald-600")} />
            </button>
          )}
        </div>
      </div>

      {/* Liste déroulante épurée pour la sélection de bâtiment */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 mb-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <label htmlFor="analytics-building-select" className="text-xs font-bold text-slate-800 block">
              {language === 'fr' ? 'Périmètre d’analyse :' : 'Analysis Scope:'}
            </label>
            <span className="text-[11px] text-slate-500 font-normal">
              {language === 'fr' ? 'Sélectionnez un site ou l’ensemble du parc' : 'Select a site or the whole portfolio'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <select
              id="analytics-building-select"
              value={selectedBuildingId || 'all'}
              onChange={(e) => onSelectBuilding?.(e.target.value)}
              className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-600 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-600/20 text-slate-800 font-semibold text-xs sm:text-sm rounded-xl px-3.5 py-2 pr-9 shadow-2xs cursor-pointer transition-all"
            >
              <option value="all">
                {language === 'fr' ? '🏢 Tout le Parc (10 Bâtiments - 133 kW)' : '🏢 All Portfolio (10 Sites - 133 kW)'}
              </option>
              <optgroup label={language === 'fr' ? 'Bâtiments du Site' : 'Site Buildings'}>
                {buildingsList.map(b => {
                  const isAnom = isBuildingInAnomaly(b);
                  return (
                    <option key={b.id} value={b.id.toString()}>
                      {isAnom ? '⚠️ ' : '🏢 '}
                      {formatBuildingName(b.name, b.id)}
                      {isAnom ? (language === 'fr' ? ' [Alerte]' : ' [Alert]') : ''}
                      {` (${b.powerWinterKw ?? '--'} kW)`}
                    </option>
                  );
                })}
              </optgroup>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {!isGlobal && (
            <button
              onClick={() => onSelectBuilding?.('all')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              title={language === 'fr' ? 'Revenir à tout le parc' : 'Back to portfolio'}
            >
              {language === 'fr' ? 'Tout le Parc' : 'All Sites'}
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setAnalyticsTab('supervision')}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer",
            analyticsTab === 'supervision'
              ? "bg-[#236b33] text-white shadow-2xs"
              : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80"
          )}
        >
          <Activity className="w-4 h-4" />
          <span>{language === 'fr' ? 'Supervision des Charges & Puissances' : 'Load Profiles & Demands'}</span>
        </button>

        <button
          onClick={() => setAnalyticsTab('decret')}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer",
            analyticsTab === 'decret'
              ? "bg-[#236b33] text-white shadow-2xs"
              : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80"
          )}
        >
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>{language === 'fr' ? 'Trajectoire Décret Tertiaire & BACS' : 'Tertiary Decree & BACS Trajectory'}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
            -40%
          </span>
        </button>
      </div>

      {analyticsTab === 'decret' ? (
        <DecretTertiaireModule 
          language={language as any}
          buildingName={isGlobal ? (language === 'fr' ? 'Parc Global (10 Sites)' : 'All Sites (10 Sites)') : formatBuildingName(selected?.name, selected?.id)}
          buildingSurface={selected ? (parseFloat(String(selected.surface || '').replace(/[^0-9.]/g, '')) || 1300) : 10250}
          currentAnnualConsumptionMwh={selected?.consumptionYearMwh || 71}
          winterDemandKw={selected?.powerWinterKw || 133}
          selectedBuildingId={selectedBuildingId}
        />
      ) : (
        <>


          {/* Détail d'Analyse Spécifique quand un bâtiment est sélectionné */}
          {selected ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
              {/* Fiche Technique & Données Réelles du Site */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">{formatBuildingName(selected.name, selected.id)}</h3>
                        <p className="text-xs text-slate-500 font-medium">{selected.type || (language === 'fr' ? 'Bâtiment Tertiaire' : 'Commercial Building')}</p>
                      </div>
                    </div>
                    <Tag status={selected.status} />
                  </div>

                  {/* Puissances Thermiques Réelles */}
                  <div className="grid grid-cols-3 gap-3 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 mb-4">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">{language === 'fr' ? 'Besoin Hiver' : 'Winter Load'}</p>
                      <p className="text-lg font-bold text-slate-900 font-display mt-0.5">{selected.powerWinterKw ?? '--'} <span className="text-xs font-normal text-slate-500">kW</span></p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">{language === 'fr' ? 'Besoin Été' : 'Summer Load'}</p>
                      <p className="text-lg font-bold text-slate-900 font-display mt-0.5">{selected.powerSummerKw ?? '--'} <span className="text-xs font-normal text-slate-500">kW</span></p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">{language === 'fr' ? 'Pic Canicule' : 'Heatwave Peak'}</p>
                      <p className="text-lg font-bold text-emerald-900 font-display mt-0.5">{selected.powerHeatwaveKw ?? '--'} <span className="text-xs font-normal text-emerald-700">kW</span></p>
                    </div>
                  </div>

                  {/* Données réelles du bâtiment */}
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                    {language === 'fr' ? 'Données Réelles du Site' : 'Site Actual Parameters'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                      <p className="text-[11px] font-medium text-slate-500 uppercase">{language === 'fr' ? 'Surface Utile' : 'Usable Surface'}</p>
                      <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">{selected.surface}</p>
                    </div>
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                      <p className="text-[11px] font-medium text-slate-500 uppercase">{language === 'fr' ? 'Consommation 24h' : '24h Consumption'}</p>
                      <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">{selected.consumption}</p>
                    </div>
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                      <p className="text-[11px] font-medium text-slate-500 uppercase">{language === 'fr' ? 'Consommation Annuelle' : 'Annual Consumption'}</p>
                      <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">{selected.consumptionYearMwh ? `${selected.consumptionYearMwh} MWh/an` : '--'}</p>
                    </div>
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                      <p className="text-[11px] font-medium text-slate-500 uppercase">{language === 'fr' ? 'Économie Réalisée' : 'Energy Savings'}</p>
                      <p className="text-sm sm:text-base font-bold text-emerald-700 mt-0.5">{selected.economy || '18%'}</p>
                    </div>
                  </div>
                </div>

                {/* Raccourcis de navigation croisée */}
                {onNavigateView && (
                  <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-slate-600 font-semibold">
                      {language === 'fr' ? 'Accès direct pour ce bâtiment :' : 'Direct actions:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigateView('gtb')}
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>{language === 'fr' ? 'Contrôles GTB' : 'BMS Controls'}</span>
                      </button>
                      <button
                        onClick={() => onNavigateView('dashboard')}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Dashboard</span>
                      </button>
                      <button
                        onClick={() => onNavigateView('reports')}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Rapports</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Interconnexion GTB & Automates du bâtiment */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-emerald-800" />
                      <h3 className="text-sm font-bold text-slate-900 font-display">
                        {language === 'fr' ? 'Supervision GTB & Capteurs' : 'BMS & Sensors Link'}
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Classe B EN ISO 52120-1
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 font-medium">{language === 'fr' ? 'Points de contrôle actifs' : 'Active control points'}</span>
                      <span className="font-bold text-slate-900">91 points</span>
                    </div>
                    <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 font-medium">{language === 'fr' ? 'Régulation CVC Daikin / BACnet' : 'HVAC Daikin / BACnet'}</span>
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Opérationnel
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 font-medium">{language === 'fr' ? 'Télérelève Linky & Eau' : 'Smart Meters (Linky & Water)'}</span>
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> En direct
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 font-medium">{language === 'fr' ? 'Consigne confort active' : 'Active comfort setpoint'}</span>
                      <span className="font-bold text-slate-900">20.5°C Hiver / 25°C Été</span>
                    </div>
                    <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 font-medium">{language === 'fr' ? 'Localisation du site' : 'Site location'}</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[200px]">{cleanBuildingLocation(selected.location, selected.id)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Tableau comparatif des 10 bâtiments quand "Tout le Parc" est sélectionné */
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs mb-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                    {language === 'fr' ? 'Comparatif du Parc (10 Bâtiments)' : 'Fleet Comparison (10 Buildings)'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {language === 'fr' ? 'Télémétrie en temps réel et puissances thermiques consolidées' : 'Real-time telemetry and consolidated thermal loads'}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Bâtiment</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Hiver (kW)</th>
                      <th className="pb-3">Été (kW)</th>
                      <th className="pb-3">Canicule (kW)</th>
                      <th className="pb-3">Conso (kWh/j)</th>
                      <th className="pb-3">Statut</th>
                      <th className="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {buildingsList.map(b => {
                      const isAnom = isBuildingInAnomaly(b);
                      return (
                        <tr key={b.id} className={cn(
                          "transition",
                          isAnom ? "bg-rose-50/70 hover:bg-rose-100/60 border-l-4 border-rose-500" : "hover:bg-slate-50/80"
                        )}>
                          <td className="py-2.5 pl-2 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              {isAnom && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />}
                              <span className={cn(isAnom ? "text-rose-950 font-bold" : "text-slate-900")}>
                                {formatBuildingName(b.name, b.id)}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 font-medium text-slate-600">{b.type || 'Tertiaire'}</td>
                          <td className="py-2.5 font-semibold text-sky-700">{b.powerWinterKw ?? '--'}</td>
                          <td className="py-2.5 font-semibold text-amber-700">{b.powerSummerKw ?? '--'}</td>
                          <td className="py-2.5 font-semibold text-rose-700">{b.powerHeatwaveKw ?? '--'}</td>
                          <td className="py-2.5">
                            <span className={cn(
                              "inline-block font-semibold",
                              isAnom 
                                ? "px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 font-bold border border-rose-200" 
                                : "text-slate-800"
                            )}>
                              {parseEnergy(b.consumption).toLocaleString('fr-FR')}
                            </span>
                          </td>
                          <td className="py-2.5"><Tag status={b.status} /></td>
                          <td className="py-2.5 text-right pr-2">
                            <button
                              onClick={() => onSelectBuilding?.(b.id.toString())}
                              className={cn(
                                "px-2.5 py-1 rounded-lg font-semibold text-xs transition cursor-pointer",
                                isAnom 
                                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-2xs" 
                                  : "bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200"
                              )}
                            >
                              {isAnom ? (language === 'fr' ? 'Inspecter' : 'Inspect') : (language === 'fr' ? 'Détails' : 'Details')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </ViewContainer>
  );
});

const ReportsView = ({ 
  language, 
  buildingsList, 
  currentDate,
  selectedBuildingId,
  onSelectBuilding,
  onNavigateView,
  gtbEquipments,
  isSyncing,
  lastSyncTime,
  onForceSync
}: { 
  language: string; 
  buildingsList: any[]; 
  currentDate: string;
  selectedBuildingId?: string;
  onSelectBuilding?: (id: string) => void;
  onNavigateView?: (view: ViewType) => void;
  gtbEquipments?: any[];
  isSyncing?: boolean;
  lastSyncTime?: string;
  onForceSync?: () => void;
}) => {
  const t = translations[language as keyof typeof translations] || translations.fr;
  const activeReportId = selectedBuildingId || 'all';
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(new Date().getFullYear(), i, 1);
    return {
      value: i,
      label: date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' })
    };
  });

  const getFilteredData = () => {
    if (activeReportId === 'all') return buildingsList;
    return buildingsList.filter(b => b.id.toString() === activeReportId);
  };

  const getReportContext = () => {
    const monthLabel = months[selectedMonth].label;
    const year = new Date().getFullYear();
    const filterName = activeReportId === 'all' 
      ? (language === 'fr' ? 'Parc Global (10 Bâtiments)' : 'Global Fleet (10 Buildings)') 
      : buildingsList.find(b => b.id.toString() === activeReportId)?.name || '';
    return { monthLabel, year, filterName };
  };

  const exportToCSV = () => {
    const data = getFilteredData();
    const { monthLabel, year, filterName } = getReportContext();
    const tariffKwh = 0.215; // Tarif professionnel moyen TTC en €/kWh
    
    const headers = [
      'ID', 
      'Nom_Site', 
      'Adresse', 
      'Statut_GTB', 
      'Typologie', 
      'Surface_m2', 
      'Lots', 
      'Conso_Jour_kWh', 
      'Conso_An_MWh', 
      'Conso_Surfacique_kWh_m2_an', 
      'Tarif_Elec_EUR_kWh', 
      'Facture_Jour_EUR', 
      'Facture_Mois_EUR', 
      'Facture_An_EUR', 
      'Economie_GTB_pct', 
      'Economie_An_EUR', 
      'Economie_5ans_EUR', 
      'CO2_An_kg', 
      'Decret_Tertiaire_Assujetti', 
      'Decret_Tertiaire_Statut', 
      'BACS_Norme_Classe',
      'Puissance_Hiver_kW',
      'Puissance_Ete_kW',
      'Periode'
    ];
    
    const rows = data.map(b => {
      const surfaceNum = parseFloat(String(b.surface || '').replace(/[^0-9.]/g, '')) || (b.type?.toLowerCase().includes('t1') ? 750 : 1300);
      const dailyKwh = parseEnergy(b.consumption);
      const annualKwh = b.consumptionYearMwh ? Math.round(b.consumptionYearMwh * 1000) : Math.round(dailyKwh * 365);
      const annualMwh = b.consumptionYearMwh != null ? Number(b.consumptionYearMwh) : Math.round((annualKwh / 1000) * 10) / 10;
      const consoSurfacique = Math.round(annualKwh / surfaceNum);
      const costDay = Math.round(dailyKwh * tariffKwh * 100) / 100;
      const costMonth = Math.round(costDay * 30.5);
      const costYear = Math.round(annualKwh * tariffKwh);
      const economyPct = parseFloat(String(b.economy || '16').replace(/[^0-9.]/g, '')) || 16;
      const savingsYear = Math.round(costYear * (economyPct / 100));
      const savings5Y = savingsYear * 5;
      const co2YearKg = Math.round(annualKwh * 0.052);
      const decretAssujetti = surfaceNum >= 1000 ? 'Oui (> 1000 m2)' : 'Oui (Parc tertiaire consolidé)';
      const decretStatut = b.status === 'OPTIMAL' ? 'Conforme 2030 (-40%)' : b.status === 'ALERTE' ? 'Non Conforme (Surconsommation)' : 'Sous Surveillance';

      return [
        b.id, 
        formatBuildingName(b.name, b.id), 
        cleanBuildingLocation(b.location, b.id), 
        b.status, 
        b.type || 'Tertiaire', 
        surfaceNum,
        b.unitsCount || 20, 
        dailyKwh, 
        annualMwh, 
        consoSurfacique,
        tariffKwh,
        costDay,
        costMonth,
        costYear,
        `${economyPct}%`,
        savingsYear,
        savings5Y,
        co2YearKg,
        decretAssujetti,
        decretStatut,
        'Classe B EN ISO 52120-1 (91 pts)',
        b.powerWinterKw ?? '--',
        b.powerSummerKw ?? '--',
        `${monthLabel} ${year}`
      ];
    });
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = filterName.replace(/\s+/g, '_');
    link.setAttribute("href", url);
    link.setAttribute("download", `CII_ENERGIE_Audit_Complet_${safeName}_${monthLabel}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const data = getFilteredData();
    const { monthLabel, year, filterName } = getReportContext();
    const doc = new jsPDF() as any;
    const tariffKwh = 0.215; // Tarif professionnel moyen TTC en €/kWh

    // Audit d'un bâtiment spécifique sélectionné
    if (activeReportId !== 'all') {
      const b = buildingsList.find(item => item.id.toString() === activeReportId) || (data.length > 0 ? data[0] : buildingsList[0]);
      const bName = formatBuildingName(b.name, b.id);
      const bLocation = cleanBuildingLocation(b.location, b.id);
      const surfaceNum = parseFloat(String(b.surface || '').replace(/[^0-9.]/g, '')) || (b.type?.toLowerCase().includes('t1') ? 750 : 1300);
      const dailyKwh = parseEnergy(b.consumption);
      const annualKwh = b.consumptionYearMwh ? Math.round(b.consumptionYearMwh * 1000) : Math.round(dailyKwh * 365);
      const annualMwh = b.consumptionYearMwh != null ? Number(b.consumptionYearMwh) : Math.round((annualKwh / 1000) * 10) / 10;
      const consoSurfacique = Math.round(annualKwh / surfaceNum);
      const costDay = Math.round(dailyKwh * tariffKwh * 100) / 100;
      const costMonth = Math.round(costDay * 30.5);
      const costYear = Math.round(annualKwh * tariffKwh);
      const economyPct = parseFloat(String(b.economy || '16').replace(/[^0-9.]/g, '')) || 16;
      const savingsYear = Math.round(costYear * (economyPct / 100));
      const savings5Y = savingsYear * 5;
      const co2YearKg = Math.round(annualKwh * 0.052);
      const co2AvoidedKg = Math.round((savingsYear / tariffKwh) * 0.052);
      const decretAssujetti = surfaceNum >= 1000 ? "Assujetti direct (> 1 000 m² - Art. L. 174-1 CCH)" : "Assujetti au titre du parc tertiaire du site";
      const decretStatutLabel = b.status === 'OPTIMAL' 
        ? "CONFORME (Trajectoire 2030 -40% respectée)" 
        : b.status === 'ALERTE' 
        ? "NON CONFORME (Surconsommation dérive +28%)" 
        : "SOUS SURVEILLANCE (Contrôle télérelève)";

      // --- PAGE 1 : IDENTITÉ, BILAN FINANCIER & DÉCRET TERTIAIRE ---
      // En-tête bandeau vert émeraude CII ENERGIE
      doc.setFillColor(24, 76, 38);
      doc.rect(0, 0, 210, 26, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('CII ENERGIE  |  AUDIT ÉNERGÉTIQUE TECHNIQUE & RÉGLEMENTAIRE', 14, 11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(220, 245, 225);
      doc.text('Télémétrie GTB en temps réel • Conformité Décret Tertiaire & Décret BACS • Analyse Financière', 14, 18);
      doc.setFontSize(8);
      doc.text(`Réf: AUD-2026-${b.id}`, 196, 11, { align: 'right' });
      doc.text(`${currentDate} | ${monthLabel} ${year}`, 196, 18, { align: 'right' });

      // Titre du site
      let currentY = 33;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(`RAPPORT TECHNIQUE & FINANCIER : ${bName.toUpperCase()}`, 14, currentY);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Site audité : ${bName} (${b.id}) — ${bLocation}  |  Période : ${monthLabel} ${year}`, 14, currentY + 6);

      // TABLE 1 : Fiche d'Identité & Caractéristiques du Site
      currentY = 44;
      autoTable(doc, {
        startY: currentY,
        head: [["Fiche d'Identité & Structure", "Spécifications Techniques du Site"]],
        body: [
          ["Identifiant & Nom Officiel", `${bName} (${b.id})`],
          ["Adresse d'Implantation", bLocation],
          ["Surface Utile Assujettie", `${surfaceNum.toLocaleString('fr-FR')} m²`],
          ["Typologie & Usage", `${b.type || 'Résidentiel / Tertiaire'} (${b.unitsCount || 20} logements/lots)`],
          ["Taux d'Occupation Moyen", `${b.occupancy || '95%'} (Occupation nominale active)`],
          ["Statut Opérationnel GTB", `${b.status} (Supervision continue 24/7 - EN ISO 52120-1 Classe B)`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [24, 76, 38], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 55, fillColor: [248, 250, 252] }, 
          1: { cellWidth: 127 } 
        },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 5;

      // TABLE 2 : Bilan Énergétique & Facturation Financière (Prix de l'Énergie)
      autoTable(doc, {
        startY: currentY,
        head: [["Bilan Énergétique & Coûts Financiers (Prix)", "Valeur Chiffrée", "Détails & Méthode de Calcul"]],
        body: [
          ["Consommation Journalière", `${dailyKwh.toLocaleString('fr-FR')} kWh / jour`, "Mesure continue compteur MID communicant"],
          ["Consommation Annuelle Consolidée", `${annualMwh} MWh / an (${annualKwh.toLocaleString('fr-FR')} kWh/an)`, "Historique 12 mois consolidé & extrapolations"],
          ["Intensité Énergétique Surfacique", `${consoSurfacique} kWh / m² / an`, `Ratio consommation / surface utile (${surfaceNum} m²)`],
          ["Tarif Réglementé de l'Électricité", `${tariffKwh.toFixed(3).replace('.', ',')} € / kWh TTC`, "Tarif professionnel moyen contrat d'exploitation"],
          ["Facture Journalière Estimée", `${costDay.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € / jour`, "Coût unitaire direct mesuré par jour"],
          ["Facture Mensuelle Estimée", `${costMonth.toLocaleString('fr-FR')} € / mois`, "Pondération mensuelle 30,5 jours ouvrés & weekend"],
          ["Budget Énergétique Annuel Estimé", `${costYear.toLocaleString('fr-FR')} € / an`, "Dépense prévisionnelle annuelle d'électricité"],
          ["Économies Financières GTB Annuelles", `${savingsYear.toLocaleString('fr-FR')} € / an`, `Gain net généré par l'automatisme Classe B (-${economyPct}%)`],
          ["Économies Cumulées Projetées (5 ans)", `${savings5Y.toLocaleString('fr-FR')} €`, "Gain financier net sur le cycle quinquennal GTB"],
          ["Bilan Émissions CO2 & Évitement", `${(co2YearKg / 1000).toFixed(2)} t CO2/an`, `Dont ${(co2AvoidedKg / 1000).toFixed(2)} t CO2/an évitées grâce au pilotage`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 62, fillColor: [248, 250, 252] }, 
          1: { fontStyle: 'bold', cellWidth: 46, textColor: [15, 118, 110] }, 
          2: { cellWidth: 74 } 
        },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 5;

      // TABLE 3 : Conformité Décret Tertiaire & Réglementation BACS
      autoTable(doc, {
        startY: currentY,
        head: [["Conformité Décret Tertiaire & BACS", "Cadre Réglementaire", "Situation Actuelle du Site"]],
        body: [
          ["Champ d'Assujettissement", "Bâtiments tertiaires >= 1 000 m² ou parc consolidé", decretAssujetti],
          ["Consommation Surfacique Réelle", "Seuil de référence nominal (55 kWh/m²/an)", `${consoSurfacique} kWh/m²/an (${dailyKwh} kWh/j)`],
          ["Objectif 2030 (Loi ÉLAN - Décret Tertiaire)", "-40% d'énergie finale par rapport à la référence", b.status === 'OPTIMAL' ? "Conforme : trajectoire atteinte (-" + economyPct + "%)" : b.status === 'ALERTE' ? "Non Conforme : surconsommation constatée" : "Sous surveillance : télérelève à contrôler"],
          ["Objectif 2040 (-50%) & 2050 (-60%)", "Trajectoire bas-carbone nationale SNBC", "Audit quinquennal de performance programmé"],
          ["Décret BACS (EN ISO 52120-1)", "Obligation système d'automatisation CVC > 70 kW", "Classe B Certifiée — Score : 91 / 100 points"],
          ["Fonctions d'Automatismes BACS", "Régulation pièce par pièce, délestage dynamique", "PAC asservie, vannes 0-10V, compteurs MID"],
          ["Statut de Conformité Global", "Validation pour déclaration OPERAT (ADEME)", decretStatutLabel]
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 54, fillColor: [248, 250, 252] }, 
          1: { cellWidth: 64 }, 
          2: { fontStyle: 'bold', cellWidth: 64, textColor: b.status === 'ALERTE' ? [190, 24, 93] : [22, 101, 52] } 
        },
        margin: { left: 14, right: 14 }
      });

      // --- PAGE 2 : BILAN THERMIQUE CVC, ÉQUIPEMENTS GTB & PLAN D'ACTION ---
      doc.addPage();
      doc.setFillColor(24, 76, 38);
      doc.rect(0, 0, 210, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`CII ENERGIE  |  BILAN TECHNIQUE CVC & PLAN D'ACTION — ${bName.toUpperCase()}`, 14, 12);
      doc.setFontSize(8);
      doc.text('Page 2 / 2', 196, 12, { align: 'right' });

      currentY = 25;

      // TABLE 4 : Puissances Souscrites & Régulation Thermique CVC
      autoTable(doc, {
        startY: currentY,
        head: [["Paramètre Thermique & Puissance", "Puissance / Consigne", "Mode de Régulation & Automatisme GTB"]],
        body: [
          ["Puissance Chauffage Hiver", `${b.powerWinterKw ?? '--'} kW`, "Loi d'eau asservie à la météo extérieure et sondes d'ambiance"],
          ["Puissance Climatisation Été", `${b.powerSummerKw ?? '--'} kW`, "Enclenchement modulant inverter avec limitation des pics"],
          ["Pic de Puissance Canicule", `${b.powerHeatwaveKw ?? '--'} kW`, "Seuil de sécurité & délestage progressif automatique"],
          ["Consigne Température Chauffage", "20.5 °C", "Conformité décret sobriété énergétique (seuil 19°C-21°C)"],
          ["Consigne Climatisation Été", "25.0 °C", "Blocage automatique si température extérieure < 26.0°C"],
          ["Supervision & Bus de Terrain", "BACnet/IP & Modbus RTU", "6 bus de terrain synchronisés avec rafraîchissement 60s"]
        ],
        theme: 'grid',
        headStyles: { fillColor: [180, 83, 9], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 55, fillColor: [248, 250, 252] }, 
          1: { fontStyle: 'bold', cellWidth: 45, textColor: [180, 83, 9] }, 
          2: { cellWidth: 82 } 
        },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 5;

      // TABLE 5 : Équipements GTB Supervisés sur le Bâtiment
      autoTable(doc, {
        startY: currentY,
        head: [["Équipement GTB Supervisé", "Marque & Référence", "Protocole & Points", "État & Disponibilité"]],
        body: [
          ["Pompe à Chaleur Réversible VRV IV+", "DAIKIN REYQ8U", "BACnet / IP (Commande & Alarme)", "Opérationnel - 100%"],
          ["Boîtiers de Sélection BS Réversibles", "DAIKIN BS-V", "Modbus RTU (Distribution chaud/froid)", "Opérationnel"],
          ["Unités Intérieures Gainables", "DAIKIN FXSQ", "Régulation pièce par pièce Classe B", "Opérationnel"],
          ["Ventilation Double Flux VMC", "Atlantic / Aldes Hygro", "Contact sec & modulation 0-10V", "Opérationnel"],
          ["Compteurs d'Énergie MID", "Schneider Electric / Linky", "LoRaWAN & M-Bus (Index 15 min)", "Télérelève active"],
          ["Vannes 3 Voies Régulées CVC", "Belimo 0-10V", "Pilotage proportionnel continu", "Opérationnel"]
        ],
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 55, fillColor: [248, 250, 252] }, 
          1: { cellWidth: 42 }, 
          2: { cellWidth: 50 }, 
          3: { fontStyle: 'bold', cellWidth: 35, textColor: [22, 101, 52] } 
        },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 7;

      // BOX DIAGNOSTIC & RECOMMANDATIONS TECHNIQUES
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, currentY, 182, 50, 3, 3, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("Diagnostic d'Exploitation & Plan d'Action Recommandé", 18, currentY + 7);

      doc.setFontSize(7.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      let diagText = "";
      let rec1 = "";
      let rec2 = "";
      let rec3 = "";

      if (b.status === 'ALERTE') {
        diagText = `Diagnostic : ALERTE SURCONSOMMATION DÉTECTÉE (+28.4% vs nominal). Le bâtiment s'écarte de la trajectoire du Décret Tertiaire avec un surcoût annuel estimé à ${Math.round((dailyKwh - (surfaceNum < 1000 ? 114 : 196)) * tariffKwh * 365).toLocaleString('fr-FR')} €/an. Une action corrective est nécessaire.`;
        rec1 = "1. Contrôle immédiat de l'étanchéité des vannes 3 voies motorisées (suspicion de circulation chaud/froid simultanée).";
        rec2 = "2. Révision des plages horaires d'inoccupation des unités gainables et verrouillage de la consigne CVC à 20.5°C.";
        rec3 = "3. Programmation d'une visite d'inspection terrain sous 48h par le technicien GTB.";
      } else if (b.status === 'ATTENTION') {
        diagText = `Diagnostic : SOUS-CONSOMMATION ANORMALE DÉTECTÉE (${dailyKwh} kWh/j vs référence nominale). Le site présente une baisse de charge drastique pouvant être liée à un problème de comptage ou une inoccupation prolongée.`;
        rec1 = "1. Vérification physique du tore de comptage MID et de la passerelle de télérelève Linky / LoRaWAN.";
        rec2 = "2. Contrôle de cohérence de l'occupation réelle du bâtiment et des index au Tableau Général Basse Tension (TGBT).";
        rec3 = "3. Relevé contradictoire de sécurité et test d'injection sur le bus de données CVC.";
      } else {
        diagText = `Diagnostic : FONCTIONNEMENT NOMINAL & EXCLUSIVEMENT CONFORME. Le bâtiment respecte intégralement la trajectoire du Décret Tertiaire (-40% 2030) avec une intensité de ${consoSurfacique} kWh/m²/an et une économie annuelle GTB de ${savingsYear.toLocaleString('fr-FR')} €/an.`;
        rec1 = "1. Maintien des consignes GTB optimisées (20.5°C chauffage / 25.0°C climatisation).";
        rec2 = "2. Vérification semestrielle de l'étalonnage des sondes de température et des registres de ventilation.";
        rec3 = "3. Téléversement annuel automatisé des données consolidées sur la plateforme réglementaire OPERAT (ADEME).";
      }

      const splitDiag = doc.splitTextToSize(diagText, 174);
      doc.text(splitDiag, 18, currentY + 14);
      
      const recStartY = currentY + 14 + (splitDiag.length * 3.8) + 2;
      doc.setFont('helvetica', 'bold');
      doc.text("Actions opérationnelles prioritaires :", 18, recStartY);
      doc.setFont('helvetica', 'normal');
      doc.text(rec1, 18, recStartY + 5);
      doc.text(rec2, 18, recStartY + 10);
      doc.text(rec3, 18, recStartY + 15);

      // Bas de page / Mentions légales
      doc.setFontSize(7.2);
      doc.setTextColor(140);
      doc.text('Rapport certifié généré par la plateforme CII ENERGIE Solutions — Supervision GTB EN ISO 52120-1 Classe B', 14, 282);
      doc.text('Conforme aux exigences de reporting OPERAT (ADEME) & Décret BACS n° 2020-887 / 2023-259 — Contact : support@cii-energie.fr', 14, 287);

      const safeName = formatBuildingName(b.name, b.id).replace(/\s+/g, '_');
      doc.save(`Audit_Complet_${safeName}_${monthLabel}_${year}.pdf`);
      return;
    }

    // --- RAPPORT GLOBAL DU PARC (10 BÂTIMENTS) ---
    const totalDailyKwh = buildingsList.reduce((acc, cur) => acc + parseEnergy(cur.consumption), 0);
    const totalAnnualKwh = buildingsList.reduce((acc, cur) => {
      const d = parseEnergy(cur.consumption);
      return acc + (cur.consumptionYearMwh ? Math.round(cur.consumptionYearMwh * 1000) : Math.round(d * 365));
    }, 0);
    const totalAnnualMwh = Math.round((totalAnnualKwh / 1000) * 10) / 10;
    const totalSurface = buildingsList.reduce((acc, cur) => {
      return acc + (parseFloat(String(cur.surface || '').replace(/[^0-9.]/g, '')) || (cur.type?.toLowerCase().includes('t1') ? 750 : 1300));
    }, 0);
    const totalCostYear = Math.round(totalAnnualKwh * tariffKwh);
    const totalCostMonth = Math.round(totalCostYear / 12);
    const totalSavingsYear = buildingsList.reduce((acc, cur) => {
      const d = parseEnergy(cur.consumption);
      const a = cur.consumptionYearMwh ? Math.round(cur.consumptionYearMwh * 1000) : Math.round(d * 365);
      const c = a * tariffKwh;
      const econ = parseFloat(String(cur.economy || '16').replace(/[^0-9.]/g, '')) || 16;
      return acc + Math.round(c * (econ / 100));
    }, 0);
    const totalCo2YearT = ((totalAnnualKwh * 0.052) / 1000).toFixed(1);
    const totalCo2AvoidedT = (((totalSavingsYear / tariffKwh) * 0.052) / 1000).toFixed(1);

    // PAGE 1 : EN-TÊTE & SYNTHÈSE DÉCRET TERTIAIRE DU PARC
    doc.setFillColor(24, 76, 38);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('CII ENERGIE  |  AUDIT GLOBAL CONSOLIDÉ DU PARC IMMOBILIER', 14, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(220, 245, 225);
    doc.text('Audit Décret Tertiaire • Tarification & Prix • Décret BACS Classe B (91 pts)', 14, 18);
    doc.setFontSize(8);
    doc.text('Réf: AUD-2026-PARC-GLOBAL', 196, 11, { align: 'right' });
    doc.text(`${currentDate} | ${monthLabel} ${year}`, 196, 18, { align: 'right' });

    let currentY = 33;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BILAN CONSOLIDÉ DES 10 SITES — PRIX, DÉCRET TERTIAIRE & BACS', 14, currentY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Ensemble immobilier : 10 Bâtiments (${totalSurface.toLocaleString('fr-FR')} m² au total) — Période : ${monthLabel} ${year}`, 14, currentY + 6);

    currentY = 44;

    // Macro-Bilan synthétique
    autoTable(doc, {
      startY: currentY,
      head: [["Indicateur Clé du Parc", "Valeur Globale Consolidée", "Cadre Réglementaire & Économique"]],
      body: [
        ["Patrimoine Supervisé", `10 Bâtiments Actifs (200 lots) — ${totalSurface.toLocaleString('fr-FR')} m²`, "Parc tertiaire assujetti de plein droit au Décret Tertiaire"],
        ["Consommation Électrique Annuelle", `${totalAnnualMwh} MWh / an (${totalDailyKwh.toLocaleString('fr-FR')} kWh / jour)`, "Intensité moyenne : " + Math.round(totalAnnualKwh / totalSurface) + " kWh / m² / an"],
        ["Facturation Énergétique Annuelle", `${totalCostYear.toLocaleString('fr-FR')} € / an (${totalCostMonth.toLocaleString('fr-FR')} € / mois)`, "Tarif professionnel régulé moyen : 0,215 € / kWh TTC"],
        ["Économies Financières Annuelles GTB", `${totalSavingsYear.toLocaleString('fr-FR')} € / an économisés`, "Gain moyen généré par la GTB Classe B (16,4% d'évitement)"],
        ["Conformité Décret Tertiaire 2030", "80% Conformes  |  10% Surveillance  |  10% Alerte", "Trajectoire -40% d'ici 2030 (Loi ÉLAN / OPERAT ADEME)"],
        ["Standard Réglementaire BACS", "EN ISO 52120-1 Classe B (91 / 100 points)", "100% des sites télécommandés et télégérés en continu"],
        ["Bilan Carbone du Parc", `${totalCo2YearT} t CO2/an émises`, `Dont ${totalCo2AvoidedT} t CO2/an évitées grâce à l'automatisme centralisé`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [24, 76, 38], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 58, fillColor: [248, 250, 252] }, 
        1: { fontStyle: 'bold', cellWidth: 54, textColor: [24, 76, 38] }, 
        2: { cellWidth: 70 } 
      },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;

    // TABLEAU 10 BÂTIMENTS : CONFORMITÉ DÉCRET TERTIAIRE
    const decretRows = buildingsList.map(b => {
      const surfaceNum = parseFloat(String(b.surface || '').replace(/[^0-9.]/g, '')) || (b.type?.toLowerCase().includes('t1') ? 750 : 1300);
      const dailyKwh = parseEnergy(b.consumption);
      const annualKwh = b.consumptionYearMwh ? Math.round(b.consumptionYearMwh * 1000) : Math.round(dailyKwh * 365);
      const annualMwh = b.consumptionYearMwh != null ? Number(b.consumptionYearMwh) : Math.round((annualKwh / 1000) * 10) / 10;
      const consoSurfacique = Math.round(annualKwh / surfaceNum);
      const statutTxt = b.status === 'OPTIMAL' ? 'Conforme (-40%)' : b.status === 'ALERTE' ? 'Non Conforme' : 'Surveillance';
      return [
        formatBuildingName(b.name, b.id),
        b.type || 'Tertiaire',
        `${surfaceNum} m²`,
        `${annualMwh} MWh`,
        `${consoSurfacique} kWh/m²`,
        '-40% (2030)',
        statutTxt
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Site", "Typologie", "Surface", "MWh/an", "Intensité", "Obj. 2030", "Statut Décret Tertiaire"]],
      body: decretRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.2, cellPadding: 1.8, textColor: [30, 41, 59] },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 26 }, 
        1: { cellWidth: 22 }, 
        2: { cellWidth: 20 }, 
        3: { cellWidth: 22 }, 
        4: { cellWidth: 26 }, 
        5: { cellWidth: 26 }, 
        6: { fontStyle: 'bold', cellWidth: 40 } 
      },
      margin: { left: 14, right: 14 }
    });

    // PAGE 2 : BILAN FINANCIER DÉTAILLÉ PAR BÂTIMENT & ACTIONS
    doc.addPage();
    doc.setFillColor(24, 76, 38);
    doc.rect(0, 0, 210, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CII ENERGIE  |  BILAN FINANCIER ÉNERGÉTIQUE & EXPLOITATION DU PARC', 14, 12);
    doc.setFontSize(8);
    doc.text('Page 2 / 2', 196, 12, { align: 'right' });

    currentY = 25;

    const financialRows = buildingsList.map(b => {
      const dailyKwh = parseEnergy(b.consumption);
      const annualKwh = b.consumptionYearMwh ? Math.round(b.consumptionYearMwh * 1000) : Math.round(dailyKwh * 365);
      const costDay = Math.round(dailyKwh * tariffKwh * 100) / 100;
      const costMonth = Math.round(costDay * 30.5);
      const costYear = Math.round(annualKwh * tariffKwh);
      const economyPct = parseFloat(String(b.economy || '16').replace(/[^0-9.]/g, '')) || 16;
      const savingsYear = Math.round(costYear * (economyPct / 100));
      return [
        formatBuildingName(b.name, b.id),
        `${dailyKwh} kWh/j`,
        `${costMonth.toLocaleString('fr-FR')} €`,
        `${costYear.toLocaleString('fr-FR')} €`,
        `${savingsYear.toLocaleString('fr-FR')} € (-${economyPct}%)`,
        `${((annualKwh * 0.052) / 1000).toFixed(2)} t CO2`
      ];
    });

    // Ajout d'une ligne Total
    financialRows.push([
      'TOTAL PARC',
      `${totalDailyKwh} kWh/j`,
      `${totalCostMonth.toLocaleString('fr-FR')} €`,
      `${totalCostYear.toLocaleString('fr-FR')} €`,
      `${totalSavingsYear.toLocaleString('fr-FR')} €`,
      `${totalCo2YearT} t CO2`
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Site", "Conso / Jour", "Facture Mois", "Budget Annuel", "Économie GTB / An", "Émissions CO2"]],
      body: financialRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.2, cellPadding: 1.8, textColor: [30, 41, 59] },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 32 }, 
        1: { cellWidth: 28 }, 
        2: { cellWidth: 28 }, 
        3: { fontStyle: 'bold', cellWidth: 30, textColor: [15, 118, 110] }, 
        4: { fontStyle: 'bold', cellWidth: 38, textColor: [22, 101, 52] }, 
        5: { cellWidth: 26 } 
      },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;

    // BOX DIAGNOSTIC GLOBAL
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, 182, 45, 3, 3, 'FD');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("Plan d'Optimisation & Démarches Réglementaires du Parc", 18, currentY + 7);

    doc.setFontSize(7.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    const fleetDiag = "Synthèse d'exploitation : Le parc immobilier affiche une efficacité énergétique globale remarquable avec 80% des sites parfaitement alignés sur les exigences du Décret Tertiaire 2030. La supervision GTB Classe B permet d'éviter 21 000+ € de coûts énergétiques annuels.";
    const fleetRec1 = "• Action prioritaire Bâtiment 2 (Alerte) : Traitement de la surconsommation (+28.4%) via diagnostic vanne 3 voies et gainables.";
    const fleetRec2 = "• Action prioritaire Bâtiment 4 (Surveillance) : Contrôle physique du tore de comptage Linky pour valider la télérelève basse.";
    const fleetRec3 = "• Déclaration réglementaire OPERAT : Export consolidé prêt pour la télé-déclaration ADEME annuelle obligatoire.";

    doc.text(doc.splitTextToSize(fleetDiag, 174), 18, currentY + 14);
    doc.text(fleetRec1, 18, currentY + 24);
    doc.text(fleetRec2, 18, currentY + 30);
    doc.text(fleetRec3, 18, currentY + 36);

    doc.setFontSize(7.2);
    doc.setTextColor(140);
    doc.text('Rapport consolidé certifié généré par CII ENERGIE Solutions — Télémétrie & Régulation GTB EN ISO 52120-1 Classe B', 14, 282);
    doc.text('Conforme aux exigences de reporting OPERAT (ADEME) & Décret BACS n° 2020-887 / 2023-259 — Contact : support@cii-energie.fr', 14, 287);

    doc.save(`Audit_Consolide_Parc_Global_${monthLabel}_${year}.pdf`);
  };

  const exportToJSON = () => {
    const data = getFilteredData();
    const { monthLabel, year, filterName } = getReportContext();
    const tariffKwh = 0.215;

    const exportData = {
      period: `${monthLabel} ${year}`,
      generatedAt: currentDate,
      scope: filterName,
      gtbStandard: "Classe B (EN ISO 52120-1) - 91 points",
      electricityTariffEurTtc: tariffKwh,
      regulatoryCompliance: {
        decretTertiaire: "Loi ÉLAN / Décret n° 2019-771 (Objectif 2030 à -40%)",
        decretBACS: "Décret BACS n° 2020-887 / 2023-259 (Classe B)",
        operatPlatform: "Prêt pour télé-déclaration ADEME"
      },
      sites: data.map(b => {
        const surfaceNum = parseFloat(String(b.surface || '').replace(/[^0-9.]/g, '')) || (b.type?.toLowerCase().includes('t1') ? 750 : 1300);
        const dailyKwh = parseEnergy(b.consumption);
        const annualKwh = b.consumptionYearMwh ? Math.round(b.consumptionYearMwh * 1000) : Math.round(dailyKwh * 365);
        const annualMwh = b.consumptionYearMwh != null ? Number(b.consumptionYearMwh) : Math.round((annualKwh / 1000) * 10) / 10;
        const consoSurfacique = Math.round(annualKwh / surfaceNum);
        const costDay = Math.round(dailyKwh * tariffKwh * 100) / 100;
        const costMonth = Math.round(costDay * 30.5);
        const costYear = Math.round(annualKwh * tariffKwh);
        const economyPct = parseFloat(String(b.economy || '16').replace(/[^0-9.]/g, '')) || 16;
        const savingsYear = Math.round(costYear * (economyPct / 100));

        return {
          id: b.id,
          name: formatBuildingName(b.name, b.id),
          location: cleanBuildingLocation(b.location, b.id),
          surfaceM2: surfaceNum,
          type: b.type || 'Tertiaire',
          occupancy: b.occupancy || '95%',
          unitsCount: b.unitsCount || 20,
          status: b.status,
          energy: {
            dailyConsumptionKwh: dailyKwh,
            annualConsumptionKwh: annualKwh,
            annualConsumptionMwh: annualMwh,
            intensityKwhPerM2Year: consoSurfacique,
            powerWinterKw: b.powerWinterKw,
            powerSummerKw: b.powerSummerKw,
            powerHeatwaveKw: b.powerHeatwaveKw,
            heatingSetpointC: 20.5,
            coolingSetpointC: 25.0
          },
          financial: {
            tariffEurKwh: tariffKwh,
            dailyCostEur: costDay,
            monthlyBillEur: costMonth,
            annualBudgetEur: costYear,
            gtbSavingsPercent: economyPct,
            annualSavingsEur: savingsYear,
            fiveYearSavingsEur: savingsYear * 5
          },
          decretTertiaire: {
            assujetti: surfaceNum >= 1000,
            targetReduction2030Percent: -40,
            targetReduction2040Percent: -50,
            targetReduction2050Percent: -60,
            complianceStatus: b.status === 'OPTIMAL' ? 'CONFORME' : b.status === 'ALERTE' ? 'NON_CONFORME' : 'SOUS_SURVEILLANCE'
          }
        };
      })
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const safeName = filterName.replace(/\s+/g, '_');
    downloadAnchorNode.setAttribute("download", `CII_ENERGIE_Audit_Complet_${safeName}_${monthLabel}_${year}.json`);
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

  const { monthLabel, year, filterName } = getReportContext();
  const selectedBuildingData = activeReportId !== 'all' ? buildingsList.find(b => b.id.toString() === activeReportId) : null;

  return (
    <ViewContainer>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-wider sm:tracking-widest mb-1.5">{currentDate}</h2>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 leading-tight">{language === 'fr' ? 'Centre de Rapports' : 'Reporting Center'}</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {language === 'fr' ? 'Génération et export consolidé des bilans énergétiques et contrôles GTB' : 'Consolidated energy audits and BMS telemetry reporting'}
          </p>
        </div>

        {/* Indicateur de statut de connexion */}
        <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold bg-white px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-2xs self-start sm:self-auto">
          <span className={cn("w-2 h-2 rounded-full", isSyncing ? "bg-amber-500 animate-spin" : "bg-emerald-500")} />
          <span>{language === 'fr' ? 'Télémétrie active' : 'Live Telemetry'}</span>
          {onForceSync && (
            <button
              onClick={onForceSync}
              disabled={isSyncing}
              title={language === 'fr' ? "Actualiser les données" : "Refresh"}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-700 transition cursor-pointer"
            >
              <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin text-emerald-600")} />
            </button>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl border border-slate-200/50 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="text-xl font-bold font-display text-slate-900 mb-1">
                  {language === 'fr' ? 'Export & Paramétrage du Rapport' : 'Report Parameters & Export'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                  {language === 'fr' ? 'Sélectionnez un site ou l\'ensemble du parc' : 'Select site or entire portfolio'}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Building Selector (Communique avec tout le site) */}
                <div className="relative w-full sm:w-auto">
                  <select 
                    value={activeReportId}
                    onChange={(e) => onSelectBuilding?.(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl px-4 py-3.5 focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-all pr-10 sm:min-w-[200px]"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '12px' }}
                  >
                    <option value="all">{language === 'fr' ? 'Tout le Parc (10 Bâtiments)' : 'All Sites (10 Buildings)'}</option>
                    {buildingsList.map(b => (
                      <option key={b.id} value={b.id.toString()}>{formatBuildingName(b.name, b.id)}</option>
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
                className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95 group cursor-pointer"
              >
                <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {language === 'fr' ? 'Audit PDF Complet' : 'Complete PDF Audit'}
              </button>
              <button 
                onClick={exportToCSV}
                className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-black text-white px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/20 active:scale-95 group cursor-pointer"
              >
                <Table className="w-4 h-4 group-hover:scale-110 transition-transform" />
                CSV (Énergie & GTB)
              </button>
              <button 
                onClick={exportToJSON}
                className="flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 group cursor-pointer"
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
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider sm:tracking-widest">{language === 'fr' ? 'Aperçu du Rapport Synthétique' : 'Report Preview'}</span>
        <div className="h-px flex-1 bg-slate-200/50" />
      </div>

      {/* Aperçu Dynamique et Interconnecté du Rapport */}
      <div className="bg-white rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4 sm:gap-6 w-full">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 transition-all shadow-sm shrink-0">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base sm:text-lg text-slate-800 tracking-tight">
                {language === 'fr' ? `Audit Énergétique & GTB - ${monthLabel} ${year}` : `Energy & BMS Audit - ${monthLabel} ${year}`}
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">{filterName}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{monthLabel} {year}</span>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black shadow-2xs">CONFORME CLASSE B</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => exportToPDF()}
            className="w-full sm:w-auto px-5 py-3 bg-emerald-900 hover:bg-emerald-800 text-white rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-xs font-bold shrink-0 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-white" />
            <span>{language === 'fr' ? 'Télécharger PDF' : 'Download PDF'}</span>
          </button>
        </div>

        {/* Résumé des données interconnectées */}
        {selectedBuildingData ? (
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Consommation & Surface */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'fr' ? 'Consommation & Surface' : 'Consumption & Surface'}</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{parseEnergy(selectedBuildingData.consumption).toLocaleString()} kWh/j</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {selectedBuildingData.consumptionYearMwh ? `${selectedBuildingData.consumptionYearMwh} MWh/an` : ''}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedBuildingData.surface || (selectedBuildingData.type?.toLowerCase().includes('t1') ? '750 m²' : '1 300 m²')}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-3 pt-2 border-t border-slate-200/60">
                {Math.round(((selectedBuildingData.consumptionYearMwh ? selectedBuildingData.consumptionYearMwh * 1000 : parseEnergy(selectedBuildingData.consumption) * 365)) / (parseFloat(String(selectedBuildingData.surface || '').replace(/[^0-9.]/g, '')) || (selectedBuildingData.type?.toLowerCase().includes('t1') ? 750 : 1300)))} kWh/m²/an
              </p>
            </div>

            {/* Prix & Facturation Énergétique */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'fr' ? 'Prix & Budget Électrique' : 'Energy Pricing & Budget'}</p>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {Math.round((selectedBuildingData.consumptionYearMwh ? selectedBuildingData.consumptionYearMwh * 1000 : parseEnergy(selectedBuildingData.consumption) * 365) * 0.215).toLocaleString('fr-FR')} €/an
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-emerald-800">
                    {Math.round(parseEnergy(selectedBuildingData.consumption) * 0.215 * 30.5).toLocaleString('fr-FR')} €/mois
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    (0,215 €/kWh TTC)
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-3 pt-2 border-t border-slate-200/60">
                Économie GTB : ~{Math.round((selectedBuildingData.consumptionYearMwh ? selectedBuildingData.consumptionYearMwh * 1000 : parseEnergy(selectedBuildingData.consumption) * 365) * 0.215 * ((parseFloat(String(selectedBuildingData.economy || '16').replace(/[^0-9.]/g, '')) || 16) / 100)).toLocaleString('fr-FR')} €/an (-{selectedBuildingData.economy || '16%'})
              </p>
            </div>

            {/* Conformité Décret Tertiaire & BACS */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'fr' ? 'Décret Tertiaire & BACS' : 'Tertiary Decree & BACS'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-bold border",
                    selectedBuildingData.status === 'OPTIMAL' ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                    selectedBuildingData.status === 'ALERTE' ? "bg-rose-100 text-rose-800 border-rose-300" :
                    "bg-amber-100 text-amber-800 border-amber-300"
                  )}>
                    {selectedBuildingData.status === 'OPTIMAL' ? 'Conforme 2030' : selectedBuildingData.status === 'ALERTE' ? 'Non Conforme' : 'Surveillance'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Obj. -40%</span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1.5">
                  BACS EN ISO 52120-1 Classe B (91 pts)
                </p>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-3 pt-2 border-t border-slate-200/60">
                Prêt télé-déclaration ADEME OPERAT
              </p>
            </div>

            {/* Puissances Thermiques & CVC */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'fr' ? 'Puissances & Consignes CVC' : 'HVAC Thermal & Setpoints'}</p>
                <div className="flex items-center justify-between text-xs font-bold mt-1">
                  <span className="text-sky-700">Hiver : {selectedBuildingData.powerWinterKw ?? '--'} kW</span>
                  <span className="text-amber-600">Été : {selectedBuildingData.powerSummerKw ?? '--'} kW</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Consigne GTB : 20.5°C Hiver / 25°C Été
                </p>
              </div>
              {onNavigateView && (
                <button
                  onClick={() => onNavigateView('gtb')}
                  className="mt-3 text-left text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer pt-2 border-t border-slate-200/60"
                >
                  <span>{language === 'fr' ? 'Voir dans Contrôle GTB' : 'View in BMS'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'fr' ? 'Parc Total Supervisé' : 'Total Fleet Monitored'}</p>
              <p className="text-xl font-bold text-slate-800 mt-1">10 Bâtiments (200 lots)</p>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">10 250 m² audités • Surveillance 24/7</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'fr' ? 'Facturation Globale (Prix)' : 'Total Energy Bill'}</p>
              <p className="text-xl font-bold text-slate-800 mt-1">~129 000 € / an</p>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">Économie GTB : ~21 000 €/an (-16,4%)</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'fr' ? 'Décret Tertiaire & BACS' : 'Tertiary Decree & BACS'}</p>
              <p className="text-sm font-bold text-emerald-800 mt-1">80% Conformes (Objectif 2030)</p>
              <p className="text-xs text-slate-500 font-medium">BACS Classe B (91 pts) • Décret 2020-887</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'fr' ? 'Disponibilité Réseau GTB' : 'BMS Network Uptime'}</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">99.8%</p>
              <p className="text-xs text-slate-400 font-medium">6 bus BACnet / Modbus synchronisés</p>
            </div>
          </div>
        )}
      </div>
    </ViewContainer>
  );
};

const GTBView = GTBExecutiveView;


export default function App() {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Portfolio View');
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [buildings, setBuildings] = useState<BuildingStats[]>(TABLE_DATA);
  const [activeWeatherCity, setActiveWeatherCity] = useState<WeatherCity>(POPULAR_CITIES[0]);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cii_energie_sheets_url') || GOOGLE_SHEETS_CSV_URL;
    }
    return GOOGLE_SHEETS_CSV_URL;
  });
  const [gtbEquipments, setGtbEquipments] = useState<GTBEquipment[]>(GTB_INITIAL_EQUIPMENT);
  const [gtbHeatingSetpoint, setGtbHeatingSetpoint] = useState<number>(21.5);
  const [gtbCoolingSetpoint, setGtbCoolingSetpoint] = useState<number>(25.0);
  const [gtbGlobalMode, setGtbGlobalMode] = useState<string>('AUTO');
  const hasGoogleSheetsSyncRef = React.useRef(false);

  const handleUpdateGoogleSheetsUrl = React.useCallback((newUrl: string) => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    setGoogleSheetsUrl(trimmed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cii_energie_sheets_url', trimmed);
    }
  }, []);

  const handleFixGtbSetpoint = React.useCallback((heating: number, cooling: number) => {
    setGtbHeatingSetpoint(heating);
    setGtbCoolingSetpoint(cooling);
  }, []);

  const handleSimulateScenario = React.useCallback((scenario: 'high' | 'low' | 'gtb' | 'reset') => {
    if (scenario === 'high') {
      setBuildings(prev => prev.map(b => b.id === 'BAT-02' ? { ...b, consumption: '320 kWh', status: 'ALERTE' as const, trend: '+63.2%' } : b));
    } else if (scenario === 'low') {
      setBuildings(prev => prev.map(b => b.id === 'BAT-04' ? { ...b, consumption: '12 kWh', status: 'ATTENTION' as const, trend: '-93.8%' } : b));
    } else if (scenario === 'gtb') {
      setGtbHeatingSetpoint(24.5);
      setGtbCoolingSetpoint(22.0);
      setGtbEquipments(prev => prev.map(eq => eq.category.includes("Ventilation") ? { ...eq, status: "Alarme" } : eq));
    } else if (scenario === 'reset') {
      setBuildings(TABLE_DATA);
      setGtbHeatingSetpoint(21.0);
      setGtbCoolingSetpoint(25.0);
      setGtbEquipments(GTB_INITIAL_EQUIPMENT);
    }
  }, []);

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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K opens Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // User Profile State
  const [userProfile, setUserProfile] = useState({
    name: 'Felix Admin',
    email: 'f.admin@cii-energie.com',
    photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    role: 'Administrateur Système CII ENERGIE'
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
      if (isGuest && !hasGoogleSheetsSyncRef.current) setBuildings(TABLE_DATA);
      return;
    }

    const buildingsRef = collection(db, 'users', user.uid, 'buildings');
    const unsubscribe = onSnapshot(buildingsRef, (snapshot) => {
      const buildingsData = snapshot.docs.map(doc => {
        const d = doc.data() as any;
        return {
          ...d,
          id: doc.id,
          name: formatBuildingName(d.name, doc.id),
          location: cleanBuildingLocation(d.location, doc.id)
        };
      }) as BuildingStats[];
      
      if (buildingsData.length === 0 && !isGuest) {
        // First time user: seed with default data
        TABLE_DATA.forEach(b => {
          const { id, ...rest } = b;
          addDoc(buildingsRef, { ...rest, createdAt: serverTimestamp() })
            .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/buildings`));
        });
      } else {
        // Only override if Google Sheets hasn't synced live data
        if (!hasGoogleSheetsSyncRef.current) {
          setBuildings(buildingsData);
        }
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

  const handleEmailLogin = async (emailToLogin: string, pass: string) => {
    await signInWithEmailAndPassword(auth, emailToLogin, pass);
  };

  const handleRegister = async (name: string, emailToRegister: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, emailToRegister, pass);
    if (cred.user) {
      if (name.trim()) {
        try {
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch (e) {
          console.warn('Could not update profile displayName:', e);
        }
      }
      // Initialize profile in Firestore
      const userRef = doc(db, 'users', cred.user.uid);
      const newProfile = {
        name: name.trim() || 'Gestionnaire Énergie',
        email: cred.user.email || emailToRegister,
        photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cred.user.uid}`,
        role: 'Gestionnaire Énergie',
        settings: {
          notificationsEmail: true,
          notificationsPush: true,
          twoFactorAuth: false,
          darkMode: false,
          language: 'fr'
        },
        updatedAt: serverTimestamp()
      };
      await setDoc(userRef, newProfile).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${cred.user.uid}`));
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

  // --- Automated Daily Notification System ---
  const dispatchDailyNotification = React.useCallback((force: boolean = false) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastDate = typeof window !== 'undefined' ? localStorage.getItem('cii_energie_last_daily_notification_date') : null;
    
    if (!force && lastDate === todayStr) {
      return false;
    }

    const isFr = settings.language === 'fr';
    const todayFormatted = new Date().toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    const totalKwh = memoizedBuildings.reduce((acc, b) => acc + parseEnergy(b.consumption), 0);
    const anomBuilding = memoizedBuildings.find(b => isBuildingInAnomaly(b));

    const notificationTitle = isFr 
      ? `📅 Bilan Journalier Automatique (${todayFormatted})`
      : `📅 Automated Daily Summary (${todayFormatted})`;

    const notificationBody = isFr
      ? `Consommation consolidée du parc : ${totalKwh.toLocaleString()} kWh. ${anomBuilding ? `Alerte dérive : ${anomBuilding.name} surconsomme à 286 kWh/j (+28.4%). Bâtiment surligné en rouge.` : 'Tous les bâtiments fonctionnent en mode nominal.'}`
      : `Fleet aggregate consumption: ${totalKwh.toLocaleString()} kWh. ${anomBuilding ? `Active drift alert: ${anomBuilding.name} at 286 kWh/d (+28.4%). Highlighted in red.` : 'All buildings operating nominally.'}`;

    // 1. Browser Native Web Notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(notificationTitle, {
            body: notificationBody,
            icon: '/icon.png'
          });
        } catch (e) {
          console.warn('Native notification dispatch error:', e);
        }
      } else if (force && Notification.permission === 'default') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') {
            new Notification(notificationTitle, { body: notificationBody, icon: '/icon.png' });
          }
        });
      }
    }

    // 2. In-App Notification Toast Event
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('app-notification', {
        detail: {
          title: notificationTitle,
          message: notificationBody
        }
      });
      window.dispatchEvent(event);
    }

    // 3. Persist today's execution
    if (typeof window !== 'undefined') {
      localStorage.setItem('cii_energie_last_daily_notification_date', todayStr);
    }
    return true;
  }, [settings.language, memoizedBuildings]);

  // Automated periodic notification disabled per user request (no automatic popups/chimes)
  React.useEffect(() => {
    // Left intentionally silent to prevent unwanted repeated popups/alarms
  }, []);

  // --- Real Smartphone Push Notifications & "Look & Clear" Engine ---
  const [activePushBanner, setActivePushBanner] = React.useState<{
    id: string;
    title: string;
    message: string;
    type?: 'alert' | 'success' | 'info' | 'daily' | 'daily-alert';
    buildingId?: string;
    timestamp: string;
  } | null>(null);

  const [hasViewedNotifications, setHasViewedNotifications] = React.useState(false);
  const [dismissedNotificationIds, setDismissedNotificationIds] = React.useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cii_energie_dismissed_notifications');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Realistic Smartphone Chime Synthesizer (dual harmonic tone)
  const playPhoneChime = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      // Tone 1: E5 (659Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // Tone 2: A5 (880Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.08);
      gain2.gain.setValueAtTime(0.1, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.42);
    } catch {
      // Audio autoplay policy guard
    }
  }, []);

  // "Une fois qu'on regarde tout disparaît" : Auto-dismiss banner after 4.5s like on iOS / Android
  React.useEffect(() => {
    if (activePushBanner) {
      const timer = setTimeout(() => {
        setActivePushBanner(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [activePushBanner]);

  // Listen to in-app notification events & trigger phone banner + audio chime
  React.useEffect(() => {
    const handleAppNotification = (e: any) => {
      const detail = e.detail;
      if (detail) {
        const isAlert = detail.title?.includes('🚨') || detail.title?.includes('🔴') || detail.title?.includes('Alerte') || detail.type === 'alert';
        
        setActivePushBanner({
          id: 'push-' + Date.now(),
          title: detail.title || (settings.language === 'fr' ? 'Notification ÉcoGrid' : 'EcoGrid Notification'),
          message: detail.message || '',
          type: detail.type || (isAlert ? 'alert' : 'info'),
          buildingId: detail.buildingId,
          timestamp: settings.language === 'fr' ? 'MAINTENANT' : 'NOW'
        });
        setHasViewedNotifications(false);
        playPhoneChime();
      }
    };

    window.addEventListener('app-notification', handleAppNotification);
    return () => window.removeEventListener('app-notification', handleAppNotification);
  }, [settings.language, playPhoneChime]);

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

    const systemAnomalies = detectSystemAnomalies(
      memoizedBuildings, 
      gtbEquipments, 
      { heatingSetpoint: gtbHeatingSetpoint, coolingSetpoint: gtbCoolingSetpoint, globalMode: gtbGlobalMode }
    );
    const anomaliesCount = isGlobal 
      ? systemAnomalies.length 
      : systemAnomalies.filter(a => a.targetId === selectedBuilding).length;

    const totalHeatingPowerKw = memoizedBuildings.reduce((acc, b) => {
      const val = typeof b.powerWinterKw === 'number' 
        ? b.powerWinterKw 
        : (parseFloat(String(b.powerWinterKw || '0').replace(',', '.')) || 0);
      return acc + val;
    }, 0);

    const selectedHeatingPowerKw = selected?.powerWinterKw !== undefined
      ? (typeof selected.powerWinterKw === 'number' ? selected.powerWinterKw : parseFloat(String(selected.powerWinterKw).replace(',', '.')))
      : undefined;

    return {
      totalConsumptionValue,
      totalHeatingPowerKw,
      selectedHeatingPowerKw,
      avgEfficiency,
      consumption,
      isGlobal,
      selected,
      topConsumer,
      anomaliesCount,
      trend: isGlobal ? "-12%" : selected?.trend || "0%"
    };
  }, [memoizedBuildings, selectedBuilding, gtbEquipments, gtbHeatingSetpoint, gtbCoolingSetpoint, gtbGlobalMode]);

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
        title: isFr ? "Bilan d'efficacité énergétique" : "Energy Efficiency Report",
        message: isFr
          ? "L'optimisation globale de régulation GTB a évité un surcoût de 12% sur l'ensemble du parc hier."
          : "Global BMS regulation optimization avoided a 12% cost overrun across the fleet yesterday.",
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
        time: isFr ? "Détecté - GTB" : "Detected - BMS"
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
          time: isFr ? "Supervision continue" : "Continuous Monitoring"
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
          time: isFr ? "Supervision continue" : "Continuous Monitoring"
        });
      }
    });

    // 3. Inject GTB and Energy Drift System Anomalies
    const detected = detectSystemAnomalies(
      memoizedBuildings, 
      gtbEquipments, 
      { heatingSetpoint: gtbHeatingSetpoint, coolingSetpoint: gtbCoolingSetpoint, globalMode: gtbGlobalMode }
    );
    detected.forEach((item, idx) => {
      list.unshift({
        id: `sys-anomaly-${item.id}-${idx}`,
        title: `${item.severity === 'critical' ? '🔴' : '🟠'} ${isFr ? item.titleFr : item.titleEn}`,
        message: isFr ? item.descriptionFr : item.descriptionEn,
        type: item.severity === 'critical' ? 'alert' : 'info',
        time: isFr ? 'Temps réel' : 'Real-time'
      });
    });

    // 4. Inject Automated Daily Summary Digest
    const todayFormatted = currentDate.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    const totalParkCons = memoizedBuildings.reduce((acc, b) => acc + parseEnergy(b.consumption), 0);
    const anomBuilding = memoizedBuildings.find(b => isBuildingInAnomaly(b));

    list.unshift({
      id: "automated-daily-report",
      title: isFr ? `📅 Bilan Journalier (${todayFormatted})` : `📅 Daily Telemetry Summary (${todayFormatted})`,
      message: isFr 
        ? `Consommation consolidée du parc : ${totalParkCons.toLocaleString()} kWh/j. ${anomBuilding ? `Alerte active : ${anomBuilding.name} surconsomme (${anomBuilding.consumption}/j, ${anomBuilding.trend || '+28%'}). Dérive thermique détectée.` : 'Tous les bâtiments fonctionnent en mode nominal optimisé.'}`
        : `Fleet aggregate consumption: ${totalParkCons.toLocaleString()} kWh/d. ${anomBuilding ? `Active drift: ${anomBuilding.name} at ${anomBuilding.consumption}/d (${anomBuilding.trend || '+28%'}). Highlighted in red.` : 'All buildings operating nominally in optimized mode.'}`,
      type: anomBuilding ? "daily-alert" : "daily",
      time: isFr ? "Quotidien • Automatique" : "Daily • Automated",
      isDaily: true
    });

    // Télémétrie et synchronisation
    list.push({
      id: "sync-status-notification",
      title: isFr ? "Supervision Continue" : "Continuous Monitoring",
      message: isFr 
        ? `Télémétrie active sur les ${memoizedBuildings.length} bâtiments du parc immobilier.` 
        : `Active telemetry across ${memoizedBuildings.length} portfolio buildings.`,
      type: "info",
      time: isFr ? "En direct" : "Live"
    });

    return list;
  }, [currentDate, memoizedBuildings, gtbEquipments, gtbHeatingSetpoint, gtbCoolingSetpoint, gtbGlobalMode, settings.language]);

  // Notifications filtered by user dismissal ("une fois qu'on regarde tout disparaît")
  const visibleNotifications = React.useMemo(() => {
    return notifications.filter(n => !dismissedNotificationIds.includes(n.id));
  }, [notifications, dismissedNotificationIds]);

  const unreadAlertsCount = hasViewedNotifications 
    ? 0 
    : visibleNotifications.filter(n => n.type === 'alert' || n.type === 'daily-alert').length || (hasViewedNotifications ? 0 : visibleNotifications.length);

  const dismissSingleNotification = React.useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissedNotificationIds(prev => {
      const next = [...prev, id];
      if (typeof window !== 'undefined') {
        localStorage.setItem('cii_energie_dismissed_notifications', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const clearAllNotifications = React.useCallback(() => {
    const allIds = notifications.map(n => n.id);
    setDismissedNotificationIds(allIds);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cii_energie_dismissed_notifications', JSON.stringify(allIds));
    }
    setHasViewedNotifications(true);
  }, [notifications]);

  const triggerTestPushNotification = React.useCallback(() => {
    const isFr = settings.language === 'fr';
    const anomBuilding = memoizedBuildings.find(b => isBuildingInAnomaly(b)) || memoizedBuildings[0];
    const bName = anomBuilding?.name || 'Bâtiment 1';
    const bId = anomBuilding?.id?.toString() || 'BAT-01';
    const bConso = anomBuilding?.consumption || '196 kWh';
    const bTrend = anomBuilding?.trend || '+0%';

    const event = new CustomEvent('app-notification', {
      detail: {
        title: isFr ? `🚨 Alerte Dérive ${bName}` : `🚨 Drift Alert ${bName}`,
        message: isFr 
          ? `Consommation anormale relevée dans le Google Sheet : ${bConso}/j (${bTrend}). Bâtiment signalé en rouge.` 
          : `Abnormal consumption reported in Google Sheet: ${bConso}/d (${bTrend}). Building flagged in red.`,
        type: 'alert',
        buildingId: bId
      }
    });
    window.dispatchEvent(event);
  }, [settings.language, memoizedBuildings]);

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

  // Synchronisation continue en direct avec le Google Sheets / Excel
  const fetchGoogleSheetsBackground = React.useCallback(async (overrideUrl?: string) => {
    try {
      setIsSyncingSheet(true);
      const activeUrl = overrideUrl || googleSheetsUrl;
      const sep = activeUrl.includes('?') ? '&' : '?';
      const cacheBustUrl = `${activeUrl}${sep}_t=${Date.now()}`;
      const response = await fetch(cacheBustUrl);
      if (!response.ok) return;

      const csvText = await response.text();
      const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      const parseLine = (line: string): string[] => {
        const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
        const elements: string[] = [];
        let matches;
        while ((matches = regex.exec(line)) !== null) {
          if (matches.index === regex.lastIndex) regex.lastIndex++;
          const val = matches[1] !== undefined ? matches[1].replace(/""/g, '"') : matches[2];
          elements.push(val !== undefined ? val.trim() : "");
        }
        return elements;
      };

      const cleanVal = (str: string): number => {
        if (!str) return 0;
        const cleaned = str
          .replace(/\s+/g, '')
          .replace(/\u202F/g, '')
          .replace(/\u00A0/g, '')
          .replace(',', '.');
        return parseFloat(cleaned) || 0;
      };

      // 1. RECHERCHE ET PARSING DE LA SECTION 1 (BÂTIMENTS, PUISSANCES & CONSOMMATIONS)
      let buildingHeaderIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        if (
          line.includes('consommation elec') ||
          (line.includes('typologie') && (line.includes('bâtiment') || line.includes('batiment'))) ||
          line.includes('besoin hiver') ||
          line.includes('id bâtiment') ||
          line.includes('id batiment')
        ) {
          buildingHeaderIndex = i;
          break;
        }
      }

      const parsedBuildings: BuildingStats[] = [];

      if (buildingHeaderIndex !== -1) {
        const headers = parseLine(lines[buildingHeaderIndex]);
        const idCol = headers.findIndex(h => /id\s*b[aâ]timent|identifiant|code/i.test(h));
        const typeCol = headers.findIndex(h => /typologie|type|usage|cat[eé]gorie/i.test(h));
        const unitsCol = headers.findIndex(h => /logement|nb\s*logement|nombre\s*logement|unit[eé]s/i.test(h));
        const winterCol = headers.findIndex(h => /hiver|winter|besoin\s*hiver/i.test(h));
        const summerCol = headers.findIndex(h => /[eé]t[eé]\s*courant|besoin\s*[eé]t[eé]|summer/i.test(h));
        const heatwaveCol = headers.findIndex(h => /canicule|heatwave|pic\s*[eé]t[eé]/i.test(h));
        const consoCol = headers.findIndex(h => /consommation\s*elec.*kwh\/j|conso.*kwh\/j|kwh\/j/i.test(h));
        const annualCol = headers.findIndex(h => /mwh\/an|annuel|consommation.*an/i.test(h));
        const statusCol = headers.findIndex(h => /statut|[eé]tat|alerte|anomalie|diagnostic/i.test(h));
        const surfaceCol = headers.findIndex(h => /surface|m2|m²/i.test(h));

        for (let i = buildingHeaderIndex + 1; i < lines.length; i++) {
          const cells = parseLine(lines[i]);
          const firstCell = (cells[0] || '').trim();

          // Arrêt si on atteint la ligne TOTAL ou la Section 2
          if (/^total/i.test(firstCell) || /^2\./i.test(firstCell) || cells.every(c => !c)) {
            break;
          }

          const rawId = idCol !== -1 && cells[idCol] ? cells[idCol].trim() : `BAT-${String(parsedBuildings.length + 1).padStart(2, '0')}`;
          const type = typeCol !== -1 && cells[typeCol] ? cells[typeCol].trim() : 'Bâtiment';
          const units = unitsCol !== -1 && cells[unitsCol] ? Math.round(cleanVal(cells[unitsCol])) : undefined;
          const powerWinter = winterCol !== -1 && cells[winterCol] ? cleanVal(cells[winterCol]) : undefined;
          const powerSummer = summerCol !== -1 && cells[summerCol] ? cleanVal(cells[summerCol]) : undefined;
          const powerHeatwave = heatwaveCol !== -1 && cells[heatwaveCol] ? cleanVal(cells[heatwaveCol]) : undefined;
          const conso = consoCol !== -1 ? cleanVal(cells[consoCol]) : 0;
          const annualMwh = annualCol !== -1 && cells[annualCol] 
            ? cleanVal(cells[annualCol]) 
            : (conso > 0 ? +(conso * 365 / 1000).toFixed(1) : undefined);

          if (rawId && (conso > 0 || powerWinter !== undefined || type)) {
            const cleanIdStr = rawId.replace(/^BAT-?/i, '');
            const buildingNum = parseInt(cleanIdStr, 10) || (parsedBuildings.length + 1);
            const buildingName = `Bâtiment ${buildingNum}`;

            // Calcul du seuil nominal selon la typologie présente dans le Google Sheet
            const isT1 = /t1|étudiant|etudiant/i.test(type) || (units !== undefined && units <= 20 && powerWinter !== undefined && powerWinter < 12);
            const nominalKwh = isT1 ? 114 : 196;
            const delta = nominalKwh > 0 && conso > 0 ? ((conso - nominalKwh) / nominalKwh) * 100 : 0;
            const deltaRound = Math.round(delta);

            // Détection de l'état d'anomalie strictement basée sur les données du Google Sheet
            let calculatedStatus: 'OPTIMAL' | 'ALERTE' | 'ATTENTION' = 'OPTIMAL';
            if (deltaRound >= 20 || (conso > 0 && deltaRound <= -50)) {
              calculatedStatus = 'ALERTE';
            } else if ((deltaRound >= 10 && deltaRound < 20) || (deltaRound <= -25 && deltaRound > -50)) {
              calculatedStatus = 'ATTENTION';
            }

            // Si la colonne Statut du Google Sheet est renseignée, elle fait foi
            let finalStatus: 'OPTIMAL' | 'ALERTE' | 'ATTENTION' = calculatedStatus;
            if (statusCol !== -1 && cells[statusCol]) {
              const rawStat = cells[statusCol].trim().toUpperCase();
              if (rawStat.includes('ALERT') || rawStat.includes('CRITIQU') || rawStat.includes('DÉRIVE') || rawStat.includes('DERIVE')) {
                finalStatus = 'ALERTE';
              } else if (rawStat.includes('ATTENTION') || rawStat.includes('SURVEILLANCE') || rawStat.includes('AVERTISS')) {
                finalStatus = 'ATTENTION';
              } else if (rawStat.includes('OPTIM') || rawStat.includes('NORM') || rawStat.includes('OK') || rawStat.includes('ACTIF')) {
                finalStatus = 'OPTIMAL';
              }
            }

            const trendStr = deltaRound >= 0 ? `+${deltaRound}%` : `${deltaRound}%`;
            const surfaceStr = surfaceCol !== -1 && cells[surfaceCol]
              ? `${cleanVal(cells[surfaceCol]).toLocaleString('fr-FR')} m²`
              : (isT1 ? '750 m²' : '1 300 m²');
            const economyVal = Math.max(4, Math.min(30, Math.round(16 - (deltaRound * 0.4))));

            parsedBuildings.push({
              id: rawId,
              name: buildingName,
              location: `Rue de Malbosc, 34080 Montpellier (Bâtiment ${buildingNum})`,
              status: finalStatus,
              consumption: `${conso.toLocaleString('fr-FR')} kWh`,
              economy: `${economyVal}%`,
              trend: trendStr,
              type,
              surface: surfaceStr,
              occupancy: '95%',
              unitsCount: units,
              powerWinterKw: powerWinter,
              powerSummerKw: powerSummer,
              powerHeatwaveKw: powerHeatwave,
              consumptionYearMwh: annualMwh
            });
          }
        }
      }

      // 2. RECHERCHE ET PARSING DE LA SECTION 2 (GTB / GTC & POINTS DE CONTRÔLE)
      let gtbHeaderIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        if (/^2\./.test(lines[i])) continue; // Ignorer la ligne de titre de section
        if (
          (line.includes('équipement') || line.includes('equipement')) &&
          (line.includes('protocole') || line.includes('marque') || line.includes('gtb'))
        ) {
          gtbHeaderIndex = i;
          break;
        }
      }

      const parsedEquipments: GTBEquipment[] = [];
      if (gtbHeaderIndex !== -1) {
        const gtbHeaders = parseLine(lines[gtbHeaderIndex]);
        const locCol = gtbHeaders.findIndex(h => /localisation|zone|site|b[aâ]timent/i.test(h));
        const catCol = gtbHeaders.findIndex(h => /lot|cat[eé]gorie/i.test(h));
        const eqCol = gtbHeaders.findIndex(h => /[eé]quipement|supervis[eé]|nom/i.test(h));
        const brandCol = gtbHeaders.findIndex(h => /marque|mod[eè]le/i.test(h));
        const qtyCol = gtbHeaders.findIndex(h => /quantit[eé]|qt[eé]|nombre/i.test(h));
        const protoCol = gtbHeaders.findIndex(h => /protocole|bus/i.test(h));
        const pointCol = gtbHeaders.findIndex(h => /point.*gtb|point.*contr[oô]le|supervision|type.*point/i.test(h));
        const statCol = gtbHeaders.findIndex(h => /statut|[eé]tat/i.test(h));

        for (let i = gtbHeaderIndex + 1; i < lines.length; i++) {
          const cells = parseLine(lines[i]);
          if (cells.every(c => !c) || /^3\./.test(cells[0] || '')) break;

          const eqName = (eqCol !== -1 && cells[eqCol] ? cells[eqCol] : cells[2] || '').trim();
          if (eqName) {
            const rawLoc = locCol !== -1 && cells[locCol] ? cells[locCol] : 'Bâtiments';
            const cleanLoc = rawLoc.replace(/\s*\([xX]10\)/g, '').replace(/\s*[xX]10/g, '').trim() || 'Bâtiments';
            const rawQtyStr = qtyCol !== -1 && cells[qtyCol] ? cells[qtyCol].toString() : '1';
            const cleanQty = Math.round(cleanVal(rawQtyStr.replace(/\s*\([xX]10\)/g, '').replace(/\s*[xX]10/g, ''))) || 1;

            parsedEquipments.push({
              location: cleanGtbText(cleanLoc) || 'Bâtiments',
              category: cleanGtbText(catCol !== -1 && cells[catCol] ? cells[catCol] : 'Général'),
              name: cleanGtbText(eqName),
              brandModel: cleanGtbText(brandCol !== -1 && cells[brandCol] ? cells[brandCol] : 'Standard'),
              quantity: cleanQty,
              protocol: cleanGtbText(protoCol !== -1 && cells[protoCol] ? cells[protoCol] : 'BACnet / IP'),
              pointType: cleanGtbText(pointCol !== -1 && cells[pointCol] ? cells[pointCol] : 'Supervision'),
              status: cleanGtbText(statCol !== -1 && cells[statCol] ? cells[statCol] : 'Actif')
            });
          }
        }
      }

      if (parsedBuildings.length > 0) {
        hasGoogleSheetsSyncRef.current = true;
        setBuildings(parsedBuildings);
      }
      if (parsedEquipments.length > 0) {
        setGtbEquipments(parsedEquipments);
      }

      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Liaison Google Sheets en direct:', err);
    } finally {
      setIsSyncingSheet(false);
    }
  }, [googleSheetsUrl]);

  // Forcer une actualisation manuelle immédiate
  const forceSyncGoogleSheets = React.useCallback(() => {
    fetchGoogleSheetsBackground();
  }, [fetchGoogleSheetsBackground]);

  // Synchronisation au chargement initial et rafraîchissement automatique toutes les 60 secondes pour répercuter les changements de Google Sheets
  React.useEffect(() => {
    fetchGoogleSheetsBackground();
    const interval = setInterval(() => {
      fetchGoogleSheetsBackground();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchGoogleSheetsBackground]);

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return (
        <DashboardView 
          selectedBuildingId={selectedBuilding} 
          onSelectBuilding={setSelectedBuilding} 
          language={settings.language} 
          buildingsList={memoizedBuildings} 
          metrics={metrics} 
          onOptimize={handleSmartOptimize} 
          currentDate={formattedDate}
          isSyncing={isSyncingSheet}
          lastSyncTime={lastSyncTime}
          onForceSync={forceSyncGoogleSheets}
        />
      );
      case 'buildings': return (
        <BuildingsView 
          language={settings.language} 
          onAddClick={() => setIsAddBuildingModalOpen(true)} 
          onDeleteClick={handleDeleteBuilding}
          onEditClick={(b: any) => setEditingBuilding(b)}
          buildingsList={memoizedBuildings} 
          selectedBuildingId={selectedBuilding}
          onSelectBuilding={setSelectedBuilding}
          onNavigateView={setActiveView}
          isSyncing={isSyncingSheet}
          lastSyncTime={lastSyncTime}
          onForceSync={forceSyncGoogleSheets}
        />
      );
      case 'analytics': return (
        <AnalyticsView 
          language={settings.language} 
          buildingsList={memoizedBuildings} 
          metrics={metrics} 
          currentDate={formattedDate} 
          selectedBuildingId={selectedBuilding}
          onSelectBuilding={setSelectedBuilding}
          onNavigateView={setActiveView}
          isSyncing={isSyncingSheet}
          lastSyncTime={lastSyncTime}
          onForceSync={forceSyncGoogleSheets}
        />
      );
      case 'reports': return (
        <ReportsView 
          language={settings.language} 
          buildingsList={memoizedBuildings} 
          currentDate={formattedDate} 
          selectedBuildingId={selectedBuilding}
          onSelectBuilding={setSelectedBuilding}
          onNavigateView={setActiveView}
          gtbEquipments={gtbEquipments}
          isSyncing={isSyncingSheet}
          lastSyncTime={lastSyncTime}
          onForceSync={forceSyncGoogleSheets}
        />
      );
      case 'gtb': return (
        <ViewContainer>
          <GTBExecutiveView 
            language={settings.language} 
            buildingsList={memoizedBuildings} 
            selectedBuildingId={selectedBuilding}
            onSelectBuilding={setSelectedBuilding}
            onNavigateView={setActiveView}
            gtbEquipments={gtbEquipments}
            isSyncing={isSyncingSheet}
            lastSyncTime={lastSyncTime}
            onForceSync={forceSyncGoogleSheets}
          />
        </ViewContainer>
      );
      case 'planning': return (
        <ViewContainer className="max-w-[1750px] p-1 sm:p-2.5 lg:p-3.5">
          <InterventionsPlanningView 
            language={settings.language} 
            buildingsList={memoizedBuildings} 
            selectedBuildingId={selectedBuilding} 
            onSelectBuilding={setSelectedBuilding}
            userProfile={userProfile}
            onNavigateView={setActiveView}
          />
        </ViewContainer>
      );
      case 'settings': return (
        <SettingsView 
          userProfile={userProfile} 
          onProfileChange={onProfileChange} 
          settings={settings} 
          setSettings={setSettings} 
          toggleSetting={toggleSetting} 
          fileInputRef={fileInputRef}
          handlePhotoUpload={handlePhotoUpload}
          googleSheetsUrl={googleSheetsUrl}
          onUpdateGoogleSheetsUrl={handleUpdateGoogleSheetsUrl}
          onForceSync={forceSyncGoogleSheets}
          isSyncing={isSyncingSheet}
          lastSyncTime={lastSyncTime}
        />
      );
      default: return (
        <DashboardView 
          selectedBuildingId={selectedBuilding} 
          onSelectBuilding={setSelectedBuilding} 
          language={settings.language} 
          buildingsList={memoizedBuildings} 
          metrics={metrics} 
          onOptimize={handleSmartOptimize} 
          currentDate={formattedDate}
          isSyncing={isSyncingSheet}
          lastSyncTime={lastSyncTime}
          onForceSync={forceSyncGoogleSheets}
          onNavigateView={setActiveView}
          gtbEquipments={gtbEquipments}
          gtbControls={{
            heatingSetpoint: gtbHeatingSetpoint,
            coolingSetpoint: gtbCoolingSetpoint,
            globalMode: gtbGlobalMode
          }}
          onFixGtbSetpoint={handleFixGtbSetpoint}
          onSimulateScenario={handleSimulateScenario}
        />
      );
    }
  };

  const titles = { 
    dashboard: currentTranslations.dashboard, 
    buildings: currentTranslations.buildings, 
    analytics: currentTranslations.analytics, 
    reports: currentTranslations.reports, 
    gtb: currentTranslations.gtb, 
    planning: currentTranslations.planning,
    settings: currentTranslations.settings 
  };

  const currentBuildingName = selectedBuilding === 'all' 
    ? 'Tous les sites' 
    : formatBuildingName(buildings.find(b => b.id.toString() === selectedBuilding)?.name, selectedBuilding) || 'Tous les sites';

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
    return (
      <LoginView 
        onLogin={handleLogin} 
        onGuest={() => setIsGuest(true)} 
        onEmailLogin={handleEmailLogin}
        onRegister={handleRegister}
      />
    );
  }

  return (
    <div className="flex h-dvh bg-slate-900 font-sans text-slate-900 overflow-hidden relative">
      {/* Full site eco-district architectural background layer with dynamic time-of-day cycle */}
      <GlobalDistrictBackground skyTheme="auto" />
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
                    <input id="modal-name" type="text" defaultValue={editingBuilding ? formatBuildingName(editingBuilding.name, editingBuilding.id) : ''} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mt-1.5 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all" placeholder="Ex: Bâtiment 1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{settings.language === 'fr' ? 'Localisation / Ville' : 'Location / City'}</label>
                    <input id="modal-loc" type="text" defaultValue={editingBuilding ? cleanBuildingLocation(editingBuilding.location, editingBuilding.id) : ''} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mt-1.5 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all" placeholder="Ex: Rue de Malbosc, Montpellier" />
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
                      const rawName = (document.getElementById('modal-name') as HTMLInputElement).value;
                      const rawLoc = (document.getElementById('modal-loc') as HTMLInputElement).value;
                      const name = formatBuildingName(rawName);
                      const loc = cleanBuildingLocation(rawLoc);
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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 z-50 px-3 sm:px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 active:scale-95 transition-all shrink-0"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <CiiEnergieLogo size="sm" align="left" />
        </div>
        
        {/* Mobile Building Dropdown Selector */}
        <div className="relative shrink min-w-0 max-w-[130px] sm:max-w-[200px] md:max-w-[280px]">
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1.5 rounded-xl cursor-pointer hover:bg-slate-200 transition-all border border-slate-200/40 w-full"
          >
            <span className="text-xs font-semibold text-slate-800 truncate">{currentBuildingName}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 transition-transform ml-auto shrink-0", isDropdownOpen && "rotate-180")} />
          </div>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 5, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-56 sm:w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 overflow-hidden font-sans"
              >
                <div 
                  onClick={() => { setSelectedBuilding('all'); setIsDropdownOpen(false); }}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors",
                    selectedBuilding === 'all' ? "bg-emerald-50 text-emerald-800 font-bold" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {settings.language === 'fr' ? 'Tous les sites (10 bâtiments)' : 'All Sites (10 Buildings)'}
                </div>
                <div className="h-px bg-slate-100 my-1 mx-1" />
                <div className="max-h-[220px] overflow-y-auto space-y-0.5">
                  {buildings.map((building) => (
                    <div 
                      key={building.id}
                      onClick={() => { setSelectedBuilding(building.id.toString()); setIsDropdownOpen(false); }}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex justify-between items-center group",
                        selectedBuilding === building.id.toString() ? "bg-emerald-50 text-emerald-800 font-bold" : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <span className="truncate mr-1.5">{formatBuildingName(building.name, building.id)}</span>
                      <Tag status={building.status} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsCommandPaletteOpen(true)}
            className="p-2 text-slate-700 active:scale-95 transition-all cursor-pointer"
            title={settings.language === 'fr' ? 'Recherche rapide' : 'Quick search'}
          >
            <Search className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              setIsNotificationsOpen(true);
              setHasViewedNotifications(true);
            }}
            className="p-2 text-slate-700 active:scale-95 transition-all relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadAlertsCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-rose-600 text-white rounded-full text-[9px] font-black border-2 border-white shadow-2xs animate-pulse">
                {unreadAlertsCount}
              </span>
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
          <SidebarItem icon={Calendar} label={currentTranslations.planning} active={activeView === 'planning'} onClick={() => { setActiveView('planning'); setIsSidebarOpen(false); }} />
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 select-none">
              <span className="font-bold text-[#236b33]">CII ENERGIE</span>
              <span>/</span>
              <AnimatePresence mode="wait">
                <motion.span 
                  key={activeView} 
                  initial={{ opacity: 0, y: -3 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="font-bold text-slate-800"
                >
                  {titles[activeView]}
                </motion.span>
              </AnimatePresence>
              {selectedBuilding !== 'all' && (
                <>
                  <span>/</span>
                  <span className="text-emerald-700 font-bold truncate max-w-[160px]">
                    {currentBuildingName}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Quick Command Palette (Cmd+K) Trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 rounded-xl text-xs font-semibold border border-slate-200/50 transition cursor-pointer shadow-2xs"
              title={settings.language === 'fr' ? 'Recherche rapide (Ctrl+K)' : 'Quick search (Ctrl+K)'}
            >
              <Search className="w-3.5 h-3.5 text-[#236b33]" />
              <span className="hidden xl:inline">{settings.language === 'fr' ? 'Recherche...' : 'Search...'}</span>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white text-slate-400 rounded border border-slate-200 shadow-2xs">
                ⌘K
              </kbd>
            </button>

            {/* Live Telemetry Pulse & Manual Sync */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100/60 border border-slate-200/40 text-xs text-slate-600">
              <span className={cn("w-2 h-2 rounded-full", isSyncingSheet ? "bg-amber-500 animate-spin" : "bg-emerald-500")} />
              <span className="text-[11px] font-medium text-slate-500">
                {lastSyncTime ? `${settings.language === 'fr' ? 'Sync' : 'Synced'} ${lastSyncTime}` : 'En direct'}
              </span>
              {forceSyncGoogleSheets && (
                <button
                  onClick={forceSyncGoogleSheets}
                  disabled={isSyncingSheet}
                  className="p-0.5 text-slate-400 hover:text-emerald-700 rounded transition cursor-pointer"
                  title={settings.language === 'fr' ? 'Actualiser les données Google Sheets' : 'Sync Google Sheets'}
                >
                  <RefreshCw className={cn("w-3 h-3", isSyncingSheet && "animate-spin text-emerald-600")} />
                </button>
              )}
            </div>

            <div className="relative">
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/70 px-3 py-2 rounded-xl cursor-pointer transition-all border border-slate-200 w-44"
              >
                <span className="text-xs font-semibold text-slate-800 truncate">{currentBuildingName}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform ml-auto", isDropdownOpen && "rotate-180")} />
              </div>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 5, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 overflow-hidden font-sans"
                  >
                    <div 
                      onClick={() => { setSelectedBuilding('all'); setIsDropdownOpen(false); }}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors",
                        selectedBuilding === 'all' ? "bg-emerald-50 text-emerald-800 font-bold" : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {settings.language === 'fr' ? 'Tous les sites (10 bâtiments)' : 'All Sites (10 Buildings)'}
                    </div>
                    <div className="h-px bg-slate-100 my-1 mx-1" />
                    <div className="max-h-[300px] overflow-y-auto space-y-0.5">
                      {buildings.map((building) => (
                        <div 
                          key={building.id}
                          onClick={() => { setSelectedBuilding(building.id.toString()); setIsDropdownOpen(false); }}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex justify-between items-center group",
                            selectedBuilding === building.id.toString() ? "bg-emerald-50 text-emerald-800 font-bold" : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <span className="truncate mr-2">{formatBuildingName(building.name, building.id)}</span>
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
                onClick={() => {
                  setIsNotificationsOpen(true);
                  setHasViewedNotifications(true);
                }}
                className="flex p-2.5 text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all relative outline-none cursor-pointer"
                title={settings.language === 'fr' ? 'Notifications et alertes' : 'Notifications & alerts'}
              >
                <Bell className="w-5 h-5" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-rose-600 text-white rounded-full text-[9px] font-black border-2 border-white shadow-2xs animate-pulse">
                    {unreadAlertsCount}
                  </span>
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

        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth pt-16 lg:pt-0">
          <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
        </div>
      </main>

      {/* Realistic Smartphone Push Notification Banner (Top Lockscreen / Dynamic Island Style) */}
      <AnimatePresence>
        {activePushBanner && (
          <motion.div
            initial={{ y: -90, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -90, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            drag="y"
            dragConstraints={{ top: -120, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y < -25 || info.velocity.y < -300) {
                setActivePushBanner(null);
              }
            }}
            onClick={() => {
              if (activePushBanner.buildingId) {
                setSelectedBuilding(activePushBanner.buildingId);
                setActiveView('buildings');
              } else {
                setIsNotificationsOpen(true);
                setHasViewedNotifications(true);
              }
              setActivePushBanner(null);
            }}
            className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[150] w-[94%] max-w-[430px] cursor-pointer select-none group"
          >
            <div className="relative overflow-hidden bg-slate-950/94 backdrop-blur-2xl border border-white/20 text-white rounded-3xl p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.65)] flex flex-col gap-2 ring-1 ring-white/10 active:scale-[0.98] transition-transform">
              {/* Header inside phone banner */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-xl bg-emerald-500/90 flex items-center justify-center text-slate-950 font-black shadow-2xs">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                    ÉCOGRID
                  </span>
                  <span className="text-slate-500 text-xs">•</span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {activePushBanner.timestamp}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePushBanner(null);
                    }}
                    className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={settings.language === 'fr' ? 'Fermer' : 'Dismiss'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title & Message */}
              <div className="pr-1">
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 leading-snug">
                  {activePushBanner.type === 'alert' || activePushBanner.type === 'daily-alert' ? (
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                  <span>{activePushBanner.title}</span>
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed font-medium">
                  {activePushBanner.message}
                </p>
              </div>

              {/* Action hint & bottom swipe handle */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] text-slate-400 font-medium">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span>👉</span>
                  <span>{settings.language === 'fr' ? 'Toucher pour ouvrir' : 'Tap to open'}</span>
                </span>
                <span className="text-slate-500 text-[9px]">
                  {settings.language === 'fr' ? 'Glisser vers le haut pour effacer' : 'Swipe up to dismiss'}
                </span>
              </div>
              <div className="flex justify-center -mb-1">
                <div className="w-10 h-1 rounded-full bg-white/30" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Drawer */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsNotificationsOpen(false);
                setHasViewedNotifications(true);
              }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-end bg-slate-50/50">
                <div className="flex items-center gap-1.5">
                  {visibleNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllNotifications}
                      className="px-2 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title={settings.language === 'fr' ? 'Tout effacer comme sur un téléphone' : 'Clear all like on a phone'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{settings.language === 'fr' ? 'Effacer tout' : 'Clear all'}</span>
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      setHasViewedNotifications(true);
                    }}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Automated Daily Dispatch Status Banner */}
              <div className="mx-4 mt-3.5 p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950">
                      {settings.language === 'fr' ? 'Notifications journalières automatiques' : 'Automated daily notifications'}
                    </span>
                  </div>
                  <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                    {settings.language === 'fr' ? 'Actif 24/7' : 'Active 24/7'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                  {settings.language === 'fr'
                    ? 'Chaque jour, un récapitulatif automatisé compile la consommation globale et alerte instantanément de toute dérive ou anomalie.'
                    : 'Each day, an automated digest compiles aggregate power use and immediately alerts of any detected drift.'}
                </p>
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => dispatchDailyNotification(true)}
                    className="w-full py-1.5 px-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{settings.language === 'fr' ? 'Déclencher le bilan du jour maintenant' : 'Trigger daily report now'}</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {visibleNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mb-3 text-emerald-600 shadow-2xs">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">
                      {settings.language === 'fr' ? 'Toutes les alertes sont acquittées' : 'All alerts acknowledged'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-medium">
                      {settings.language === 'fr' 
                        ? 'Le parc fonctionne en paramètres nominaux. Les notifications consultées sont automatiquement archivées.' 
                        : 'Portfolio operating within nominal parameters. Viewed notifications are automatically archived.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDismissedNotificationIds([]);
                        if (typeof window !== 'undefined') {
                          localStorage.removeItem('cii_energie_dismissed_notifications');
                        }
                        triggerTestPushNotification();
                      }}
                      className="mt-5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{settings.language === 'fr' ? 'Tester une notification push' : 'Simulate push alert'}</span>
                    </button>
                  </div>
                ) : (
                  visibleNotifications.map((n) => {
                    const isAnomAlert = n.type === 'alert' || n.type === 'daily-alert';
                    const isDaily = n.isDaily;
                    return (
                      <div 
                        key={n.id} 
                        onClick={() => {
                          // Dismiss upon looking/inspecting
                          dismissSingleNotification(n.id);
                          if (n.buildingId) {
                            setSelectedBuilding(n.buildingId);
                            setActiveView('buildings');
                            setIsNotificationsOpen(false);
                          } else if (isAnomAlert) {
                            const anomB = memoizedBuildings.find(b => isBuildingInAnomaly(b));
                            if (anomB) setSelectedBuilding(anomB.id.toString());
                            setActiveView('buildings');
                            setIsNotificationsOpen(false);
                          }
                        }}
                        className={cn(
                          "p-4 rounded-2xl border transition-all cursor-pointer group relative",
                          isDaily 
                            ? (isAnomAlert ? "bg-rose-50/80 border-rose-300 hover:border-rose-500 shadow-2xs" : "bg-emerald-50/70 border-emerald-200 hover:border-emerald-400")
                            : isAnomAlert 
                              ? "bg-rose-50/60 border-rose-200 hover:border-rose-400 hover:shadow-xs" 
                              : "bg-slate-50 border-slate-100 hover:border-emerald-200"
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                           <span className={cn(
                             "text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded flex items-center gap-1",
                             isDaily && isAnomAlert ? "bg-rose-700 text-white shadow-2xs" :
                             n.type === 'alert' ? "bg-rose-600 text-white shadow-2xs" : 
                             n.type === 'success' ? "bg-emerald-100 text-emerald-700" : 
                             isDaily ? "bg-emerald-700 text-white" : "bg-blue-100 text-blue-700"
                           )}>
                             {isAnomAlert && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                             {isDaily ? (settings.language === 'fr' ? 'JOURNALIER AUTOMATISÉ' : 'DAILY AUTOMATED') : n.type}
                           </span>
                           <div className="flex items-center gap-1.5">
                             <span className="text-[9px] font-bold text-slate-400">{n.time}</span>
                             <button
                               type="button"
                               onClick={(e) => dismissSingleNotification(n.id, e)}
                               className="p-0.5 text-slate-300 hover:text-slate-700 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
                               title={settings.language === 'fr' ? 'Acquitter et effacer' : 'Acknowledge & dismiss'}
                             >
                               <X className="w-3.5 h-3.5" />
                             </button>
                           </div>
                        </div>
                        <h4 className={cn(
                          "font-bold text-sm mb-1 transition-colors",
                          isAnomAlert ? "text-rose-950 group-hover:text-rose-700 font-extrabold" : "text-slate-800 group-hover:text-emerald-700"
                        )}>
                          {n.title}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">{n.message}</p>
                        {isAnomAlert && (
                          <p className="text-[10px] font-bold text-rose-600 mt-2 flex items-center gap-1">
                            <span>👉</span>
                            <span>{settings.language === 'fr' ? 'Cliquer pour inspecter le bâtiment' : 'Click to inspect building'}</span>
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && 'Notification' in window) {
                      Notification.requestPermission().then(p => {
                        if (p === 'granted') {
                          new Notification(
                            settings.language === 'fr' ? '🚨 CII ENERGIE : Alerte Bâtiment 2' : '🚨 CII ENERGIE: Building 2 Alert',
                            { body: settings.language === 'fr' ? 'Surconsommation anormale de 286 kWh/j détectée (+28.4%). Bâtiment marqué en rouge.' : 'Abnormal consumption of 286 kWh/d detected (+28.4%). Building highlighted in red.' }
                          );
                        }
                      });
                    }
                    triggerTestPushNotification();
                  }}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-white" />
                  <span>{settings.language === 'fr' ? 'Tester une alerte smartphone (avec sonnerie)' : 'Test phone alert (with chime)'}</span>
                </button>
                <button 
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    setHasViewedNotifications(true);
                  }}
                  className="w-full py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  {settings.language === 'fr' ? 'Fermer le centre' : 'Close center'}
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
                  <button 
                    onClick={() => {
                      setActiveView('planning');
                      setIsHelpOpen(false);
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-2xs"
                  >
                    Contacter le support / Planifier
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global Command Palette (Cmd+K / Ctrl+K / Top Search) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        language={settings.language as any}
        buildings={memoizedBuildings}
        onNavigateView={setActiveView}
        onSelectBuilding={setSelectedBuilding}
        onForceSync={forceSyncGoogleSheets}
        onTriggerExportPdf={() => setActiveView('reports')}
        onTriggerExportCsv={() => setActiveView('reports')}
        onOpenAnomalyScanner={() => setActiveView('dashboard')}
      />
    </div>
  );
}

