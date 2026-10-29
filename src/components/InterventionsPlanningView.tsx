import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Calendar as CalendarIcon, 
  MapPin, 
  Check, 
  X, 
  Wrench, 
  Building2, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  Edit3,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Download,
  Copy,
  RotateCcw,
  RotateCw,
  ExternalLink,
  Link2,
  FilterX,
  FileSpreadsheet,
  Users,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  fetchAndParseGoogleSheetsInterventions,
  DEFAULT_GOOGLE_SHEETS_CSV_URL,
  LOCAL_STORAGE_CUSTOM_SHEET_URL,
  LOCAL_STORAGE_SHEETS_LAST_SYNC,
  GOOGLE_SHEETS_TEMPLATE_SAMPLE
} from '../utils/googleSheetsPlanningSync';
import {
  downloadInterventionIcs,
  downloadAllInterventionsIcs
} from '../utils/calendarExport';
import {
  updateFirestorePlanningIntervention,
  deleteFirestorePlanningIntervention,
  subscribeFirestorePlanning,
  syncBatchToFirestorePlanning,
  syncGoogleSheetsWithFirestore
} from '../services/planningFirestoreService';

export type InterventionCategory = 'maintenance' | 'gtb' | 'audit' | 'reglementaire' | 'telemetry';
export type InterventionStatus = 'planned' | 'in_progress' | 'urgent' | 'completed';

export interface Technician {
  id: string;
  name: string;
  role: string;
  avatar: string;
  initials: string;
  color: string;
}

export interface InterventionEvent {
  id: string;
  title: string;
  buildingId: string;
  buildingName: string;
  location: string;
  date: string; // YYYY-MM-DD
  startHour: number; // e.g. 8.5 for 8:30
  endHour: number; // e.g. 10.0 for 10:00
  startTimeStr: string; // "08:30"
  endTimeStr: string; // "10:00"
  category: InterventionCategory;
  technicianIds: string[];
  status: InterventionStatus;
  notes?: string;
  priority?: 'normal' | 'high' | 'critical';
  rsvpStatus?: 'pending' | 'confirmed' | 'declined';
  source?: 'local' | 'google_sheets';
  sheetRowIndex?: number;
}

const DEFAULT_TECHNICIANS: Technician[] = [
  { 
    id: 'tech-1', 
    name: 'Samuel Crawford', 
    role: 'Référent GTB & CVC', 
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80', 
    initials: 'SC', 
    color: 'bg-emerald-600' 
  },
  { 
    id: 'tech-2', 
    name: 'Deborah Meyer', 
    role: 'Ingénieure Régulation GTB', 
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80', 
    initials: 'DM', 
    color: 'bg-teal-600' 
  },
  { 
    id: 'tech-3', 
    name: 'Alexandre Roux', 
    role: 'Technicien PAC & Chaufferie', 
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80', 
    initials: 'AR', 
    color: 'bg-amber-600' 
  },
  { 
    id: 'tech-4', 
    name: 'Hilda Meyer', 
    role: 'Auditrice Efficacité Énergie', 
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80', 
    initials: 'HM', 
    color: 'bg-purple-600' 
  },
  { 
    id: 'tech-5', 
    name: 'Marc Lefebvre', 
    role: 'Expert Télérelève & Sondes', 
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80', 
    initials: 'ML', 
    color: 'bg-sky-600' 
  },
];

const CATEGORIES_CONFIG: Record<InterventionCategory, {
  labelFr: string;
  labelEn: string;
  cardBg: string;
  textColor: string;
  borderColor: string;
  tagBg: string;
  tagActiveBg: string;
  barColor: string;
  dotColor: string;
}> = {
  maintenance: {
    labelFr: 'Maintenance PAC / CVC',
    labelEn: 'HVAC & Heatpump Maint.',
    cardBg: 'bg-[#cbf3ef]/90 hover:bg-[#b2ede7]',
    textColor: 'text-teal-950',
    borderColor: 'border-teal-300/80',
    tagBg: 'bg-teal-50 text-teal-700 border-teal-200',
    tagActiveBg: 'bg-teal-600 text-white border-teal-600 shadow-2xs',
    barColor: 'bg-teal-500',
    dotColor: 'bg-teal-500'
  },
  gtb: {
    labelFr: 'Régulation & Dépannage GTB',
    labelEn: 'BMS Control & Drift Fix',
    cardBg: 'bg-[#d7f7de]/90 hover:bg-[#c2f3cc]',
    textColor: 'text-emerald-950',
    borderColor: 'border-emerald-300/80',
    tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    tagActiveBg: 'bg-emerald-600 text-white border-emerald-600 shadow-2xs',
    barColor: 'bg-emerald-500',
    dotColor: 'bg-emerald-500'
  },
  audit: {
    labelFr: 'Audit Énergétique & Bilan',
    labelEn: 'Energy Audit & Assessment',
    cardBg: 'bg-[#ffedd5]/90 hover:bg-[#fed7aa]',
    textColor: 'text-amber-950',
    borderColor: 'border-amber-300/80',
    tagBg: 'bg-amber-50 text-amber-700 border-amber-200',
    tagActiveBg: 'bg-amber-500 text-white border-amber-500 shadow-2xs',
    barColor: 'bg-amber-500',
    dotColor: 'bg-amber-500'
  },
  reglementaire: {
    labelFr: 'Contrôle Réglementaire',
    labelEn: 'Regulatory Compliance',
    cardBg: 'bg-[#ffe4e6]/90 hover:bg-[#fecdd3]',
    textColor: 'text-rose-950',
    borderColor: 'border-rose-300/80',
    tagBg: 'bg-rose-50 text-rose-700 border-rose-200',
    tagActiveBg: 'bg-rose-600 text-white border-rose-600 shadow-2xs',
    barColor: 'bg-rose-500',
    dotColor: 'bg-rose-500'
  },
  telemetry: {
    labelFr: 'Relevé Compteurs & Sondes',
    labelEn: 'Meters & Sensor Calibration',
    cardBg: 'bg-[#ede9fe]/90 hover:bg-[#ddd6fe]',
    textColor: 'text-violet-950',
    borderColor: 'border-violet-300/80',
    tagBg: 'bg-violet-50 text-violet-700 border-violet-200',
    tagActiveBg: 'bg-violet-600 text-white border-violet-600 shadow-2xs',
    barColor: 'bg-violet-500',
    dotColor: 'bg-violet-500'
  }
};

// Format YYYY-MM-DD
function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// European Monday-start week
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0: Sun, 1: Mon, ...
  const diff = date.getDate() - (day === 0 ? 6 : day - 1);
  date.setDate(diff);
  return date;
}

// Generate base seed interventions aligned with current week (Monday to Sunday)
function generateInitialInterventions(today: Date): InterventionEvent[] {
  const monday = getMonday(today);

  const getDayOffset = (offset: number) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    return toIsoDate(d);
  };

  return [
    {
      id: 'interv-1',
      title: 'Maintenance préventive CTA & Filtres',
      buildingId: 'BAT-01',
      buildingName: 'Bâtiment 1 - Siège Principal',
      location: 'Local Technique Toiture Nord',
      date: getDayOffset(0), // Lundi
      startHour: 8.0,
      endHour: 10.0,
      startTimeStr: '08:00',
      endTimeStr: '10:00',
      category: 'maintenance',
      technicianIds: ['tech-1', 'tech-3'],
      status: 'completed',
      notes: 'Nettoyage des batteries d’échange et remplacement des filtres G4/F7.'
    },
    {
      id: 'interv-2',
      title: 'Équilibrage hydraulique réseau CVC',
      buildingId: 'BAT-02',
      buildingName: 'Bâtiment 2 - R&D Tertiaire',
      location: 'Sous-station Chaufferie',
      date: getDayOffset(0), // Lundi
      startHour: 10.5,
      endHour: 12.0,
      startTimeStr: '10:30',
      endTimeStr: '12:00',
      category: 'gtb',
      technicianIds: ['tech-1', 'tech-2', 'tech-5'],
      status: 'completed',
      notes: 'Calibrage des vannes d’équilibrage TA sur les boucles primaires.'
    },
    {
      id: 'interv-3',
      title: 'Diagnostic dérive surconsommation nuit',
      buildingId: 'BAT-02',
      buildingName: 'Bâtiment 2 - R&D Tertiaire',
      location: 'Tableau Automate Armoire GTB',
      date: getDayOffset(1), // Mardi
      startHour: 8.5,
      endHour: 10.5,
      startTimeStr: '08:30',
      endTimeStr: '10:30',
      category: 'gtb',
      technicianIds: ['tech-2', 'tech-4'],
      status: 'in_progress',
      notes: 'Contrôle des ordres de relance nocturne et sondes de gaine.'
    },
    {
      id: 'interv-4',
      title: 'Contrôle étalonnage sondes d’ambiance',
      buildingId: 'BAT-03',
      buildingName: 'Bâtiment 3 - Logistique',
      location: 'Zones Bureaux et Quais',
      date: getDayOffset(1), // Mardi
      startHour: 11.0,
      endHour: 12.5,
      startTimeStr: '11:00',
      endTimeStr: '12:30',
      category: 'audit',
      technicianIds: ['tech-3', 'tech-5'],
      status: 'planned',
      notes: 'Vérification comparée avec thermohygromètre de précision étalonné.'
    },
    {
      id: 'interv-5',
      title: 'Visite réglementaire annuelle fluides frigo',
      buildingId: 'BAT-01',
      buildingName: 'Bâtiment 1 - Siège Principal',
      location: 'Chiller / Groupe Froid Extérieur',
      date: getDayOffset(2), // Mercredi
      startHour: 9.0,
      endHour: 11.0,
      startTimeStr: '09:00',
      endTimeStr: '11:00',
      category: 'maintenance',
      technicianIds: ['tech-1', 'tech-3'],
      status: 'planned',
      notes: 'Détection de fuites azote et attestation cerfa 15497.'
    },
    {
      id: 'interv-6',
      title: 'Audit Efficacité Énergétique & BACS',
      buildingId: 'BAT-04',
      buildingName: 'Bâtiment 4 - Centre Serveurs',
      location: 'Salle Baies & Climatisation de précision',
      date: getDayOffset(2), // Mercredi
      startHour: 12.0,
      endHour: 13.5,
      startTimeStr: '12:00',
      endTimeStr: '13:30',
      category: 'gtb',
      technicianIds: ['tech-2', 'tech-4'],
      status: 'planned',
      notes: 'Contrôle de conformité Décret BACS classe A.'
    },
    {
      id: 'interv-7',
      title: 'Remplacement automate de régulation PAC',
      buildingId: 'BAT-02',
      buildingName: 'Bâtiment 2 - R&D Tertiaire',
      location: 'Local CTA Étage 2',
      date: getDayOffset(3), // Jeudi
      startHour: 8.5,
      endHour: 10.5,
      startTimeStr: '08:30',
      endTimeStr: '10:30',
      category: 'gtb',
      technicianIds: ['tech-2', 'tech-3'],
      status: 'completed',
      notes: 'Migration vers contrôleur Modbus IP nouvelle génération.'
    },
    {
      id: 'interv-8',
      title: 'Relevé général index compteurs MID',
      buildingId: 'BAT-01',
      buildingName: 'Bâtiment 1 - Siège Principal',
      location: 'TGBT & Sous-tableaux Étage',
      date: getDayOffset(3), // Jeudi
      startHour: 11.0,
      endHour: 13.0,
      startTimeStr: '11:00',
      endTimeStr: '13:00',
      category: 'telemetry',
      technicianIds: ['tech-4', 'tech-5'],
      status: 'completed',
      notes: 'Rapprochement des données Enedis / télérelèves LoRaWAN.'
    },
    {
      id: 'interv-9',
      title: 'Remplacement vannes motorisées 3 voies',
      buildingId: 'BAT-03',
      buildingName: 'Bâtiment 3 - Logistique',
      location: 'Départ Chauffage Zone B',
      date: getDayOffset(4), // Vendredi
      startHour: 9.0,
      endHour: 11.0,
      startTimeStr: '09:00',
      endTimeStr: '11:00',
      category: 'maintenance',
      technicianIds: ['tech-2', 'tech-3'],
      status: 'planned',
      notes: 'Installation servomoteur Belimo 0-10V.'
    },
    {
      id: 'interv-10',
      title: 'Bilan hebdomadaire & Optimisation Consignes',
      buildingId: 'BAT-01',
      buildingName: 'Bâtiment 1 - Siège Principal',
      location: 'Salle Supervision CII ENERGIE',
      date: getDayOffset(4), // Vendredi
      startHour: 14.0,
      endHour: 15.5,
      startTimeStr: '14:00',
      endTimeStr: '15:30',
      category: 'audit',
      technicianIds: ['tech-1', 'tech-2', 'tech-4'],
      status: 'planned',
      notes: 'Validation des réduits d’inoccupation week-end.'
    },
    {
      id: 'interv-11',
      title: 'Contrôle sécurité incendie clapets coupe-feu',
      buildingId: 'BAT-05',
      buildingName: 'Bâtiment 5 - Entrepôt Nord',
      location: 'Gainage aéraulique distribution',
      date: getDayOffset(5), // Samedi
      startHour: 9.0,
      endHour: 11.0,
      startTimeStr: '09:00',
      endTimeStr: '11:00',
      category: 'reglementaire',
      technicianIds: ['tech-1', 'tech-3'],
      status: 'planned',
      notes: 'Test de déclenchement électromécanique et report d’état GTB.'
    },
    {
      id: 'interv-12',
      title: 'Contrôle Veille GTB & Réduit Week-end',
      buildingId: 'BAT-01',
      buildingName: 'Bâtiment 1 - Siège Principal',
      location: 'Sous-station Chaufferie',
      date: getDayOffset(6), // Dimanche
      startHour: 9.5,
      endHour: 11.5,
      startTimeStr: '09:30',
      endTimeStr: '11:30',
      category: 'gtb',
      technicianIds: ['tech-2', 'tech-5'],
      status: 'planned',
      notes: 'Vérification du maintien des consignes éco inoccupation et hors-gel.'
    },
    {
      id: 'interv-13',
      title: 'Inspection PAC secours & télérelève',
      buildingId: 'BAT-02',
      buildingName: 'Bâtiment 2 - R&D Tertiaire',
      location: 'Local CTA Sous-sol',
      date: getDayOffset(6), // Dimanche
      startHour: 14.0,
      endHour: 15.5,
      startTimeStr: '14:00',
      endTimeStr: '15:30',
      category: 'maintenance',
      technicianIds: ['tech-1', 'tech-3'],
      status: 'planned',
      notes: 'Test du basculement automatique PAC primaire / secours.'
    }
  ];
}

interface InterventionsPlanningViewProps {
  language?: 'fr' | 'en';
  buildingsList?: any[];
  selectedBuildingId?: string;
  onSelectBuilding?: (id: string) => void;
  userProfile?: any;
  onNavigateView?: (view: any) => void;
}

export const InterventionsPlanningView: React.FC<InterventionsPlanningViewProps> = ({
  language = 'fr',
  buildingsList = [],
  selectedBuildingId = 'all',
  onSelectBuilding,
  userProfile,
  onNavigateView
}) => {
  const isFr = language === 'fr';

  // Navigation states: auto-center on saved intervention date if present
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cii_interventions_planning_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].date) {
            const d = new Date(parsed[0].date + 'T12:00:00');
            if (!isNaN(d.getTime())) return d;
          }
        }
      } catch (e) {
        // fallback
      }
    }
    return new Date();
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cii_interventions_planning_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].date) {
            const d = new Date(parsed[0].date + 'T12:00:00');
            if (!isNaN(d.getTime())) return d;
          }
        }
      } catch (e) {
        // fallback
      }
    }
    return new Date();
  });
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  const [weekDaysCount, setWeekDaysCount] = useState<7 | 5>(7);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTimeBreakdownOpen, setIsTimeBreakdownOpen] = useState(true);

  // Filters state (Technician filter removed per user request)
  const [filterCategory, setFilterCategory] = useState<InterventionCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [localBuildingFilter, setLocalBuildingFilter] = useState<string>(selectedBuildingId || 'all');

  // Toast feedback with optional Undo action
  const [toastState, setToastState] = useState<{ message: string; canUndo?: boolean } | null>(null);
  const toastTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, canUndo = false) => {
    setToastState({ message, canUndo });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastState(null);
    }, canUndo ? 6000 : 3200);
  };

  // Undo delete history
  const [lastDeletedIntervention, setLastDeletedIntervention] = useState<InterventionEvent | null>(null);

  // In-app confirmation dialogs (safe for iframes, no window.confirm!)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<InterventionEvent | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Interventions List State (loaded from localStorage without mock seed data)
  const [interventions, setInterventions] = useState<InterventionEvent[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cii_interventions_planning_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Remove any legacy mock seed interventions (interv-1..interv-13)
            return parsed.filter((item: any) => !item.id?.startsWith('interv-'));
          }
        } catch (e) {
          console.error('Failed to parse saved interventions', e);
        }
      }
    }
    return [];
  });

  // Save to localStorage on changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cii_interventions_planning_v2', JSON.stringify(interventions));
    }
  }, [interventions]);

  // Firestore 'planning' real-time synchronization state
  const [firestoreSyncState, setFirestoreSyncState] = useState<{
    connected: boolean;
    lastSyncTime: string | null;
    docCount: number;
    error: string | null;
  }>({
    connected: false,
    lastSyncTime: null,
    docCount: 0,
    error: null,
  });

  // Subscribe to Firestore 'planning' collection in real-time
  useEffect(() => {
    const unsubscribe = subscribeFirestorePlanning(
      (firestoreEvents) => {
        const timeNow = new Date().toLocaleTimeString(isFr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        const realEvents = firestoreEvents.filter(ev => !ev.id?.startsWith('interv-'));
        setFirestoreSyncState({
          connected: true,
          lastSyncTime: timeNow,
          docCount: realEvents.length,
          error: null,
        });

        // Set real Firestore interventions (never auto-seed mock interventions)
        setInterventions(realEvents);
      },
      (error) => {
        console.warn('Firestore planning subscription error:', error);
        setFirestoreSyncState(prev => ({
          ...prev,
          connected: false,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    );

    return () => unsubscribe();
  }, [isFr]);

  // Safe helper to persist created or modified interventions to Firestore
  const persistInterventionToFirestore = (item: InterventionEvent) => {
    updateFirestorePlanningIntervention(item)
      .then(() => {
        const timeNow = new Date().toLocaleTimeString(isFr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        setFirestoreSyncState(prev => ({ ...prev, connected: true, lastSyncTime: timeNow }));
      })
      .catch((err) => {
        console.warn('Could not update Firestore planning intervention:', err);
      });
  };

  // Safe helper to remove intervention from Firestore
  const removeInterventionFromFirestore = (id: string) => {
    deleteFirestorePlanningIntervention(id)
      .then(() => {
        const timeNow = new Date().toLocaleTimeString(isFr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        setFirestoreSyncState(prev => ({ ...prev, connected: true, lastSyncTime: timeNow }));
      })
      .catch((err) => {
        console.warn('Could not delete Firestore planning intervention:', err);
      });
  };

  // Dynamic Technicians State (Default techs + any technicians parsed from Google Sheets)
  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cii_technicians_list_v2');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved technicians', e);
        }
      }
    }
    return DEFAULT_TECHNICIANS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cii_technicians_list_v2', JSON.stringify(technicians));
    }
  }, [technicians]);

  // Google Sheets Synchronization State
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_CUSTOM_SHEET_URL);
      // If no saved URL or if saved URL is the old root without gid, use the INTER tab URL
      if (!saved || !saved.includes('gid=')) {
        localStorage.setItem(LOCAL_STORAGE_CUSTOM_SHEET_URL, DEFAULT_GOOGLE_SHEETS_CSV_URL);
        return DEFAULT_GOOGLE_SHEETS_CSV_URL;
      }
      return saved;
    }
    return DEFAULT_GOOGLE_SHEETS_CSV_URL;
  });
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [lastSheetSyncTime, setLastSheetSyncTime] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_SHEETS_LAST_SYNC);
    }
    return null;
  });
  const [sheetSyncStatus, setSheetSyncStatus] = useState<{ count: number; error?: string } | null>(null);
  const [isSheetSettingsModalOpen, setIsSheetSettingsModalOpen] = useState(false);
  const [isCopiedTemplate, setIsCopiedTemplate] = useState(false);

  // Google Sheets Sync Execution
  const handleSyncGoogleSheets = async (silent = false) => {
    try {
      setIsSyncingSheet(true);
      const result = await fetchAndParseGoogleSheetsInterventions(sheetUrl, technicians);

      if (result.success) {
        // Register any newly encountered technicians
        if (result.newTechnicians.length > 0) {
          setTechnicians(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const toAdd = result.newTechnicians.filter(t => !existingIds.has(t.id));
            return [...prev, ...toAdd];
          });
        }

        // Merge interventions: Replace ALL previous Google Sheets events with current ones from Google Sheets
        // (if the user deleted rows from Google Sheets, they are automatically removed from the planning!)
        setInterventions(prev => {
          // Keep local events that weren't created by Google Sheets and not old mock items
          const nonSheetEvents = prev.filter(e => e.source !== 'google_sheets' && !e.id?.startsWith('interv-'));
          return [...result.events, ...nonSheetEvents];
        });

        // Persist synced interventions from Google Sheets into Firestore 'planning' collection
        // This automatically saves Google Sheets changes to Firebase and cleans up removed rows
        syncGoogleSheetsWithFirestore(result.events).then(stats => {
          const timeNow = new Date().toLocaleTimeString(isFr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
          setFirestoreSyncState(prev => ({ ...prev, connected: true, lastSyncTime: timeNow }));
        }).catch(err => {
          console.warn('Batch sync Google Sheets events to Firestore error:', err);
        });

        const nowStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        setLastSheetSyncTime(nowStr);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_SHEETS_LAST_SYNC, nowStr);
        }
        setSheetSyncStatus({ count: result.events.length });

        // Always auto-navigate calendar view (currentDate and selectedDate) to the synced intervention's date
        // so that the intervention appears at the exact date and hour on screen!
        if (result.events.length > 0 && result.events[0].date) {
          const targetDate = new Date(result.events[0].date + 'T12:00:00');
          if (!isNaN(targetDate.getTime())) {
            setSelectedDate(targetDate);
            setCurrentDate(targetDate);
          }
          // If building filter was active and hides this event, reset to all
          if (localBuildingFilter !== 'all' && result.events[0].buildingId && localBuildingFilter !== result.events[0].buildingId) {
            setLocalBuildingFilter('all');
            if (onSelectBuilding) onSelectBuilding('all');
          }
        }

        if (!silent) {
          if (result.events.length === 0) {
            showToast(isFr 
              ? 'Synchronisation terminée : aucune intervention dans le flux distant (planning actualisé).'
              : 'Sync complete: no interventions in remote stream (schedule updated).'
            );
          } else {
            showToast(isFr 
              ? `✓ ${result.events.length} intervention(s) synchronisée(s) depuis le flux distant !` 
              : `✓ ${result.events.length} intervention(s) synced from data stream!`
            );
          }
        }
      } else {
        setSheetSyncStatus({ count: 0, error: result.message });
        if (!silent) {
          showToast(result.message);
        }
      }
    } catch (err: any) {
      console.warn('Erreur synchro flux distant:', err);
      setSheetSyncStatus({ count: 0, error: err.message || 'Erreur de connexion' });
      if (!silent) {
        showToast(isFr ? `Erreur synchro flux distant: ${err.message}` : `Data stream sync error: ${err.message}`);
      }
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Background auto-sync on mount and every 45 seconds
  useEffect(() => {
    handleSyncGoogleSheets(true);
    const interval = setInterval(() => {
      handleSyncGoogleSheets(true);
    }, 45000);
    return () => clearInterval(interval);
  }, [sheetUrl]);

  // Synchronize building prop if provided from outside (App / Top bar / Other views)
  useEffect(() => {
    if (selectedBuildingId !== undefined) {
      setLocalBuildingFilter(selectedBuildingId);
    }
  }, [selectedBuildingId]);

  // Modal State: Add or Edit Event
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<InterventionEvent | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formBuildingId, setFormBuildingId] = useState('BAT-01');
  const [formLocation, setFormLocation] = useState('');
  const [formDate, setFormDate] = useState(toIsoDate(new Date()));
  const [formStartHour, setFormStartHour] = useState('09:00');
  const [formEndHour, setFormEndHour] = useState('10:30');
  const [formCategory, setFormCategory] = useState<InterventionCategory>('maintenance');
  const [formStatus, setFormStatus] = useState<InterventionStatus>('planned');
  const [formNotes, setFormNotes] = useState('');

  // Undo delete action
  const handleUndoDelete = () => {
    if (lastDeletedIntervention) {
      const restored = lastDeletedIntervention;
      setInterventions(prev => [restored, ...prev]);
      persistInterventionToFirestore(restored);
      setLastDeletedIntervention(null);
      setToastState(null);
      showToast(isFr ? `✓ Intervention "${restored.title}" restaurée !` : `✓ Intervention "${restored.title}" restored!`);
    }
  };

  // Safe delete execution (called when user confirms deletion)
  const executeDeleteIntervention = (target: InterventionEvent) => {
    setLastDeletedIntervention(target);
    setInterventions(prev => prev.filter(i => i.id !== target.id));
    removeInterventionFromFirestore(target.id);
    setDeleteConfirmTarget(null);
    if (isModalOpen && editingIntervention?.id === target.id) {
      setIsModalOpen(false);
      setEditingIntervention(null);
    }
    showToast(isFr ? 'Intervention supprimée du planning' : 'Intervention deleted from schedule', true);
  };

  // Reset to default sample schedule (opens in-app confirmation modal)
  const handleResetSchedule = () => {
    setIsResetConfirmOpen(true);
  };

  // Helper to parse "HH:MM" to float
  const parseHourToFloat = (timeStr: string): number => {
    const [h, m] = (timeStr || '08:00').split(':').map(Number);
    return (h || 8) + (m || 0) / 60;
  };

  // Helper to format float to "HH:MM"
  const formatFloatToHour = (val: number): string => {
    const h = Math.floor(val);
    const m = Math.round((val - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Add quick duration in modal
  const handleAddDuration = (hoursToAdd: number) => {
    const startF = parseHourToFloat(formStartHour);
    const newEndF = Math.min(23.75, startF + hoursToAdd);
    setFormEndHour(formatFloatToHour(newEndF));
  };

  // Compute week days: starting strictly on LUNDI (Monday) and ending on DIMANCHE (Sunday)
  const currentWeekDays = useMemo(() => {
    const monday = getMonday(currentDate);
    const totalDays = weekDaysCount;
    const days: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate, weekDaysCount]);

  // Mini calendar month days (35 cells)
  const miniCalendarDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // 0 = Monday

    const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startingDayOfWeek);

    for (let i = 0; i < 35; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push({
        date: d,
        isCurrentMonth: d.getMonth() === month,
        dateStr: toIsoDate(d)
      });
    }
    return days;
  }, [selectedDate]);

  // Filtered interventions
  const filteredInterventions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return interventions.filter(item => {
      if (localBuildingFilter !== 'all' && item.buildingId !== localBuildingFilter) {
        return false;
      }
      if (filterCategory !== 'all' && item.category !== filterCategory) {
        return false;
      }
      if (q) {
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesBldg = item.buildingName.toLowerCase().includes(q);
        const matchesLoc = item.location.toLowerCase().includes(q);
        const matchesNotes = item.notes?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesBldg && !matchesLoc && !matchesNotes) {
          return false;
        }
      }
      return true;
    });
  }, [interventions, localBuildingFilter, filterCategory, searchQuery]);

  // Dates with interventions for mini calendar dots
  const datesWithInterventions = useMemo(() => {
    const set = new Set<string>();
    interventions.forEach(inv => set.add(inv.date));
    return set;
  }, [interventions]);

  // Category breakdown calculation
  const categoryStats = useMemo(() => {
    const counts: Record<InterventionCategory, number> = {
      maintenance: 0,
      gtb: 0,
      audit: 0,
      reglementaire: 0,
      telemetry: 0
    };
    interventions.forEach(i => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    const total = interventions.length || 1;
    return {
      counts,
      percentages: {
        maintenance: Math.round((counts.maintenance / total) * 100),
        gtb: Math.round((counts.gtb / total) * 100),
        audit: Math.round((counts.audit / total) * 100),
        reglementaire: Math.round((counts.reglementaire / total) * 100),
        telemetry: Math.round((counts.telemetry / total) * 100),
      }
    };
  }, [interventions]);

  // Next upcoming intervention (for sidebar banner, with fallback to most recent active intervention)
  const upcomingIntervention = useMemo(() => {
    const todayStr = toIsoDate(new Date());
    const upcoming = interventions
      .filter(i => i.date >= todayStr && i.status !== 'completed')
      .sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour);
    if (upcoming.length > 0) return upcoming[0];

    // Fallback: show the most recently scheduled intervention (e.g. from Google Sheets)
    const allSorted = [...interventions].sort((a, b) => b.date.localeCompare(a.date) || b.startHour - a.startHour);
    return allSorted[0] || null;
  }, [interventions]);

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
    showToast(isFr ? 'Retour à aujourd’hui' : 'Jumped to today');
  };

  // Open modal for new event
  const openNewEventModal = (targetDateStr?: string, targetHour?: number) => {
    setEditingIntervention(null);
    setFormTitle(isFr ? 'Intervention Maintenance CVC' : 'HVAC Maintenance Service');
    setFormBuildingId(localBuildingFilter !== 'all' ? localBuildingFilter : (buildingsList[0]?.id?.toString() || 'BAT-01'));
    setFormLocation(isFr ? 'Sous-station Chaufferie' : 'Boiler Substation');
    setFormDate(targetDateStr || toIsoDate(selectedDate));
    
    const start = targetHour !== undefined ? `${String(Math.floor(targetHour)).padStart(2, '0')}:00` : '09:00';
    const end = targetHour !== undefined ? `${String(Math.floor(targetHour) + 1).padStart(2, '0')}:30` : '10:30';
    setFormStartHour(start);
    setFormEndHour(end);
    setFormCategory('maintenance');
    setFormStatus('planned');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open modal for editing event
  const openEditEventModal = (ev: InterventionEvent) => {
    setEditingIntervention(ev);
    setFormTitle(ev.title);
    setFormBuildingId(ev.buildingId);
    setFormLocation(ev.location);
    setFormDate(ev.date);
    setFormStartHour(ev.startTimeStr);
    setFormEndHour(ev.endTimeStr);
    setFormCategory(ev.category);
    setFormStatus(ev.status);
    setFormNotes(ev.notes || '');
    setIsModalOpen(true);
  };

  // Quick toggle status of an intervention directly from card
  const handleQuickToggleStatus = (ev: InterventionEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus: Record<InterventionStatus, InterventionStatus> = {
      planned: 'in_progress',
      in_progress: 'completed',
      completed: 'planned',
      urgent: 'in_progress'
    };
    const updated = nextStatus[ev.status];
    const updatedEv: InterventionEvent = { ...ev, status: updated };
    setInterventions(prev => prev.map(item => item.id === ev.id ? updatedEv : item));
    persistInterventionToFirestore(updatedEv);
    showToast(`${isFr ? 'Statut mis à jour :' : 'Status updated:'} ${updated.toUpperCase()}`);
  };

  // Duplicate intervention to next day
  const handleDuplicateIntervention = () => {
    if (!editingIntervention) return;
    const currD = new Date(editingIntervention.date);
    currD.setDate(currD.getDate() + 1);
    const newDateStr = toIsoDate(currD);

    const dup: InterventionEvent = {
      ...editingIntervention,
      id: `interv-${Date.now()}`,
      title: `${editingIntervention.title} (${isFr ? 'Copie' : 'Copy'})`,
      date: newDateStr,
      status: 'planned'
    };

    setInterventions(prev => [dup, ...prev]);
    persistInterventionToFirestore(dup);
    setIsModalOpen(false);
    showToast(isFr ? `Intervention dupliquée au ${newDateStr} !` : `Intervention duplicated to ${newDateStr}!`);
  };

  // Save intervention handler
  const handleSaveIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    const startF = parseHourToFloat(formStartHour);
    let endF = parseHourToFloat(formEndHour);
    if (endF <= startF) {
      endF = Math.min(23.75, startF + 1);
      setFormEndHour(formatFloatToHour(endF));
    }

    const bldg = buildingsList.find(b => b.id.toString() === formBuildingId);
    const bName = bldg ? bldg.name : `Bâtiment ${formBuildingId}`;

    if (editingIntervention) {
      const updatedItem: InterventionEvent = {
        ...editingIntervention,
        title: formTitle.trim() || (isFr ? 'Intervention Technique' : 'Technical Service'),
        buildingId: formBuildingId,
        buildingName: bName,
        location: formLocation.trim() || (isFr ? 'Local Technique' : 'Equipment Room'),
        date: formDate,
        startHour: startF,
        endHour: endF,
        startTimeStr: formStartHour,
        endTimeStr: formEndHour,
        category: formCategory,
        technicianIds: editingIntervention.technicianIds || ['admin-1'],
        status: formStatus,
        notes: formNotes
      };

      setInterventions(prev => prev.map(item => {
        if (item.id === editingIntervention.id) {
          return updatedItem;
        }
        return item;
      }));
      persistInterventionToFirestore(updatedItem);
      showToast(isFr ? '✓ Intervention modifiée et synchronisée avec Firestore !' : '✓ Intervention updated and synced with Firestore!');
    } else {
      const newInterv: InterventionEvent = {
        id: `interv-${Date.now()}`,
        title: formTitle.trim() || (isFr ? 'Nouvelle Intervention CVC' : 'New HVAC Intervention'),
        buildingId: formBuildingId,
        buildingName: bName,
        location: formLocation.trim() || (isFr ? 'Local Technique' : 'Equipment Room'),
        date: formDate,
        startHour: startF,
        endHour: endF,
        startTimeStr: formStartHour,
        endTimeStr: formEndHour,
        category: formCategory,
        technicianIds: ['admin-1'],
        status: formStatus,
        notes: formNotes
      };
      setInterventions(prev => [newInterv, ...prev]);
      persistInterventionToFirestore(newInterv);
      showToast(isFr ? '✓ Nouvelle intervention enregistrée dans Firestore !' : '✓ New intervention saved to Firestore!');
    }

    // Auto clear conflicting filters so the user is guaranteed to see their saved intervention!
    if (localBuildingFilter !== 'all' && localBuildingFilter !== formBuildingId) {
      setLocalBuildingFilter('all');
      if (onSelectBuilding) onSelectBuilding('all');
    }
    if (filterCategory !== 'all' && filterCategory !== formCategory) {
      setFilterCategory('all');
    }

    // Focus/navigate date to the intervention date so it appears immediately on the screen
    const targetDateObj = new Date(formDate + 'T12:00:00');
    if (!isNaN(targetDateObj.getTime())) {
      setCurrentDate(targetDateObj);
      setSelectedDate(targetDateObj);
    }

    setIsModalOpen(false);
    setEditingIntervention(null);
  };

  // Delete intervention (initiates safe in-app confirmation modal)
  const handleDeleteIntervention = (id: string) => {
    const target = interventions.find(i => i.id === id) || editingIntervention;
    if (target) {
      setDeleteConfirmTarget(target);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Début', 'Fin', 'Titre', 'Bâtiment', 'Localisation', 'Catégorie', 'Supervision', 'Statut', 'Notes'];
    const supervisor = userProfile?.name || 'Felix Admin';
    const rows = filteredInterventions.map(i => {
      return [
        `"${i.id}"`,
        `"${i.date}"`,
        `"${i.startTimeStr}"`,
        `"${i.endTimeStr}"`,
        `"${i.title.replace(/"/g, '""')}"`,
        `"${i.buildingName.replace(/"/g, '""')}"`,
        `"${i.location.replace(/"/g, '""')}"`,
        `"${i.category}"`,
        `"${supervisor}"`,
        `"${i.status}"`,
        `"${(i.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planning_interventions_cii_energie_${toIsoDate(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(isFr ? 'Export CSV téléchargé avec succès !' : 'CSV schedule downloaded successfully!');
  };

  // Formatted month/year title for main header
  const mainHeaderMonthYear = useMemo(() => {
    const month = currentDate.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { month: 'long' });
    const year = currentDate.getFullYear();
    return `${month.charAt(0).toUpperCase() + month.slice(1)}, ${year}`;
  }, [currentDate, isFr]);

  // Mini calendar month/year
  const miniCalendarMonthYear = useMemo(() => {
    const month = selectedDate.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { month: 'long' });
    const year = selectedDate.getFullYear();
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
  }, [selectedDate, isFr]);

  // Dynamic Timeline hours adapting to any early morning or evening interventions (defaults to 7:00 -> 19:00)
  const timelineHours = useMemo(() => {
    let minH = 7;
    let maxH = 19;
    for (const inv of filteredInterventions) {
      if (typeof inv.startHour === 'number' && !isNaN(inv.startHour)) {
        minH = Math.min(minH, Math.floor(inv.startHour));
        maxH = Math.max(maxH, Math.ceil(inv.endHour || (inv.startHour + 1)));
      }
    }
    minH = Math.max(5, Math.min(7, minH));
    maxH = Math.min(23, Math.max(19, maxH));
    const hours: number[] = [];
    for (let h = minH; h <= maxH; h++) {
      hours.push(h);
    }
    return hours;
  }, [filteredInterventions]);

  // Active filters count
  const activeFiltersCount = (filterCategory !== 'all' ? 1 : 0) + 
                             (localBuildingFilter !== 'all' ? 1 : 0) + 
                             (searchQuery ? 1 : 0);

  return (
    <div className="w-full bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden font-sans relative">
      
      {/* Toast Notification Alert with optional Undo */}
      <AnimatePresence>
        {toastState && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-70 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500/30"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastState.message}</span>
            {toastState.canUndo && lastDeletedIntervention && (
              <button
                type="button"
                onClick={handleUndoDelete}
                className="ml-1 px-2.5 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] cursor-pointer transition shadow-2xs"
              >
                {isFr ? 'Annuler' : 'Undo'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col xl:flex-row min-h-0 xl:min-h-[780px]">
        
        {/* ================= LEFT SIDEBAR ================= */}
        {!isSidebarCollapsed && (
          <aside className="w-full xl:w-72 2xl:w-76 border-b xl:border-b-0 xl:border-r border-slate-100 bg-[#fbfbfb] p-4 sm:p-5 flex flex-col gap-4.5 shrink-0 transition-all">
            
            {/* User profile & Add Button */}
            <div className="flex items-center justify-between">
              <div 
                onClick={() => {
                  setLocalBuildingFilter('all');
                  if (onSelectBuilding) onSelectBuilding('all');
                  setFilterCategory('all');
                  setSearchQuery('');
                  showToast(isFr ? 'Vue d\'ensemble réinitialisée' : 'Overview reset');
                }}
                className="flex items-center gap-2.5 cursor-pointer group p-1 -m-1 rounded-xl hover:bg-slate-100 transition"
                title={isFr ? 'Profil Administrateur (Cliquer pour afficher tout)' : 'Administrator Profile (Click to show all)'}
              >
                <div className="relative">
                  <img 
                    src={userProfile?.photo || userProfile?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} 
                    alt={userProfile?.name || 'Felix Admin'} 
                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-600/30 shadow-2xs group-hover:scale-105 transition"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-600/20" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate group-hover:text-emerald-800 transition">
                    {userProfile?.name || 'Felix Admin'}
                  </h4>
                  <p className="text-[10px] font-medium text-slate-400 truncate">
                    {userProfile?.role || 'Administrateur Système CII ENERGIE'}
                  </p>
                </div>
              </div>

              {/* Quick Add Button (+) */}
              <button
                type="button"
                onClick={() => openNewEventModal()}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-emerald-900 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
                title={isFr ? 'Ajouter une intervention' : 'Add intervention'}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Upcoming Event Card (Interactive: clicking opens its details and navigates to its slot!) */}
            {upcomingIntervention ? (
              <div 
                onClick={() => {
                  if (upcomingIntervention?.date) {
                    const d = new Date(upcomingIntervention.date + 'T12:00:00');
                    if (!isNaN(d.getTime())) {
                      setSelectedDate(d);
                      setCurrentDate(d);
                    }
                  }
                  openEditEventModal(upcomingIntervention);
                }}
                className="p-3 bg-white hover:bg-emerald-50/40 rounded-xl sm:rounded-2xl border border-slate-200/70 hover:border-emerald-300 shadow-2xs flex flex-col gap-1.5 cursor-pointer transition group"
                title={isFr ? 'Cliquez pour ouvrir les détails et aller au créneau' : 'Click to view details and go to time slot'}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-emerald-800 transition">
                    {isFr ? 'Prochaine intervention' : 'Upcoming intervention'}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded-md">
                      {isFr ? 'Ouvrir' : 'Open'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmTarget(upcomingIntervention);
                      }}
                      className="p-0.5 rounded hover:text-rose-600 hover:bg-rose-50 text-slate-400 transition cursor-pointer"
                      title={isFr ? 'Supprimer cette intervention' : 'Delete intervention'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition">
                    <Wrench className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-950">
                      {upcomingIntervention.title}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {upcomingIntervention.date === toIsoDate(new Date()) ? (isFr ? "Aujourd'hui" : "Today") : upcomingIntervention.date}, {upcomingIntervention.startTimeStr}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white/70 rounded-xl sm:rounded-2xl border border-dashed border-slate-200 shadow-2xs flex flex-col gap-1 text-slate-500">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {isFr ? 'Prochaine intervention' : 'Upcoming intervention'}
                </span>
                <p className="text-xs font-semibold text-slate-700">
                  {isFr ? 'Aucune intervention programmée' : 'No upcoming intervention'}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {isFr ? 'Synchronisez le flux ou cliquez sur + pour planifier.' : 'Sync stream or click + to add.'}
                </p>
              </div>
            )}

            {/* Mini Calendar (Interactive month navigation and date selection) */}
            <div className="bg-white p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/70 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-bold text-xs text-slate-900">
                  {miniCalendarMonthYear}
                </h5>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(selectedDate);
                      d.setMonth(d.getMonth() - 1);
                      setSelectedDate(d);
                      setCurrentDate(d);
                    }}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    title={isFr ? 'Mois précédent' : 'Previous month'}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(selectedDate);
                      d.setMonth(d.getMonth() + 1);
                      setSelectedDate(d);
                      setCurrentDate(d);
                    }}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    title={isFr ? 'Mois suivant' : 'Next month'}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Days of week letters: L M M J V S D */}
              <div className="grid grid-cols-7 text-center mb-1">
                {(isFr ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((dayLetter, idx) => (
                  <span key={idx} className={`text-[9px] font-bold uppercase py-0.5 ${idx === 6 ? 'text-emerald-700 font-extrabold' : idx === 5 ? 'text-slate-600' : 'text-slate-400'}`}>
                    {dayLetter}
                  </span>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-y-1 text-center">
                {miniCalendarDays.map(({ date, isCurrentMonth, dateStr }, idx) => {
                  const isSelected = dateStr === toIsoDate(selectedDate);
                  const isToday = dateStr === toIsoDate(new Date());
                  const hasIntervention = datesWithInterventions.has(dateStr);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        setCurrentDate(date);
                      }}
                      className={`h-6.5 w-6.5 mx-auto rounded-full text-[11px] font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white font-bold shadow-2xs'
                          : isToday
                          ? 'text-emerald-700 font-bold bg-emerald-50'
                          : isCurrentMonth
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{date.getDate()}</span>
                      {hasIntervention && (
                        <span className={`w-1 h-1 rounded-full absolute bottom-0.5 ${isSelected ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time breakdown: CLICKABLE FILTERS! */}
            <div className="bg-white p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/70 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <button
                  type="button"
                  onClick={() => setIsTimeBreakdownOpen(!isTimeBreakdownOpen)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-900 cursor-pointer"
                >
                  <span>{isFr ? 'Répartition & Filtres' : 'Breakdown & Filters'}</span>
                  {isTimeBreakdownOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                {filterCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setFilterCategory('all')}
                    className="text-[9px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    {isFr ? 'Effacer' : 'Clear'}
                  </button>
                )}
              </div>

              {isTimeBreakdownOpen && (
                <div className="space-y-1.5 pt-1">
                  {(Object.keys(CATEGORIES_CONFIG) as InterventionCategory[]).map(catKey => {
                    const cfg = CATEGORIES_CONFIG[catKey];
                    const pct = categoryStats.percentages[catKey];
                    const count = categoryStats.counts[catKey];
                    const isSelected = filterCategory === catKey;

                    return (
                      <div 
                        key={catKey}
                        onClick={() => setFilterCategory(isSelected ? 'all' : catKey)}
                        className={`p-1.5 rounded-xl cursor-pointer transition-all ${
                          isSelected ? 'bg-slate-100 ring-1 ring-slate-300' : 'hover:bg-slate-50'
                        }`}
                        title={isFr ? `Filtrer sur ${cfg.labelFr}` : `Filter by ${cfg.labelEn}`}
                      >
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotColor}`} />
                            <span className={`truncate ${isSelected ? 'font-bold text-slate-900' : 'text-slate-600 font-medium'}`}>
                              {isFr ? cfg.labelFr : cfg.labelEn}
                            </span>
                          </div>
                          <span className="font-bold text-slate-400 text-[9px] shrink-0 ml-1">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${cfg.barColor} rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick action: Restore default schedule */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={handleResetSchedule}
                className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center justify-center gap-1 mx-auto transition cursor-pointer"
                title={isFr ? 'Réinitialiser le planning aux données recommandées' : 'Reset schedule'}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isFr ? 'Restaurer le planning type' : 'Restore sample schedule'}</span>
              </button>
            </div>

          </aside>
        )}

        {/* ================= MAIN CALENDAR VIEW ================= */}
        <main className="flex-1 flex flex-col p-3 sm:p-5 lg:p-6 bg-white overflow-hidden min-w-0">
          
          {/* Top Header: Title, Sidebar toggle, Search, View Switcher (Month, Week, Day), Nav Buttons */}
          <div className="flex flex-col gap-3 mb-4 pb-3.5 border-b border-slate-100">
            
            {/* Top row: Title, Controls, Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              
              {/* Left group: Panel Toggle, Title, Current building badge */}
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200/80 transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
                  title={isSidebarCollapsed ? (isFr ? 'Afficher le volet latéral' : 'Show sidebar') : (isFr ? 'Masquer le volet latéral (Plein écran)' : 'Collapse sidebar')}
                >
                  {isSidebarCollapsed ? (
                    <>
                      <PanelLeftOpen className="w-4 h-4 text-emerald-800" />
                      <span className="hidden sm:inline text-slate-700">{isFr ? 'Volet' : 'Sidebar'}</span>
                    </>
                  ) : (
                    <>
                      <PanelLeftClose className="w-4 h-4 text-slate-500" />
                      <span className="hidden sm:inline text-slate-500">{isFr ? 'Plein écran' : 'Full width'}</span>
                    </>
                  )}
                </button>

                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight">
                  {mainHeaderMonthYear}
                </h2>

                {localBuildingFilter !== 'all' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 truncate max-w-[160px]">
                    {buildingsList.find(b => b.id.toString() === localBuildingFilter)?.name || localBuildingFilter}
                  </span>
                )}

                {interventions.some(i => i.source === 'google_sheets') && (
                  <button
                    type="button"
                    onClick={() => {
                      const sheetEv = interventions.find(i => i.source === 'google_sheets');
                      if (sheetEv?.date) {
                        const d = new Date(sheetEv.date + 'T12:00:00');
                        if (!isNaN(d.getTime())) {
                          setSelectedDate(d);
                          setCurrentDate(d);
                        }
                        if (localBuildingFilter !== 'all' && sheetEv.buildingId && localBuildingFilter !== sheetEv.buildingId) {
                          setLocalBuildingFilter('all');
                          if (onSelectBuilding) onSelectBuilding('all');
                        }
                        showToast(isFr ? `Positionné sur l’intervention (${sheetEv.date} à ${sheetEv.startTimeStr})` : `Jumped to intervention`);
                      }
                    }}
                    className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 text-[11px] font-bold border border-emerald-300/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title={isFr ? 'Aller directement au créneau de l’intervention synchronisée' : 'Go directly to synchronized intervention slot'}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {isFr ? 'Voir intervention synchronisée' : 'View synchronized event'}
                    </span>
                  </button>
                )}
              </div>

              {/* Right group: Mode switch (Mois, Semaine, Jour), Prev/Next, Exporter CSV, New event (+) */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Segmented control: Mois / Semaine / Jour */}
                <div className="bg-slate-100 p-0.5 rounded-xl flex items-center shadow-2xs">
                  {(['month', 'week', 'day'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize cursor-pointer ${
                        viewMode === mode
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {mode === 'month' ? (isFr ? 'Mois' : 'Month') : mode === 'week' ? (isFr ? 'Semaine' : 'Week') : (isFr ? 'Jour' : 'Day')}
                    </button>
                  ))}
                </div>

                {/* Prev / Today / Next Navigation */}
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl shadow-2xs">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                    title={isFr ? 'Précédent' : 'Previous'}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                    title={isFr ? "Aujourd'hui" : 'Today'}
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                    title={isFr ? 'Suivant' : 'Next'}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Export CSV button */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title={isFr ? 'Télécharger la liste des interventions en CSV' : 'Export CSV'}
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>{isFr ? 'Exporter CSV' : 'Export CSV'}</span>
                </button>

                {/* Export iCal (.ics) button */}
                <button
                  type="button"
                  onClick={() => {
                    downloadAllInterventionsIcs(filteredInterventions);
                    showToast(isFr ? '✓ Calendrier iCal (.ics) exporté pour Outlook & Google Calendar !' : '✓ iCal (.ics) calendar downloaded!');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title={isFr ? 'Exporter le planning au format iCalendar (.ics)' : 'Export full schedule to iCalendar (.ics)'}
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-[#236b33]" />
                  <span>{isFr ? 'Export iCal' : 'Export iCal'}</span>
                </button>

                {/* Add event button (clean icon button) */}
                <button
                  type="button"
                  onClick={() => openNewEventModal()}
                  className="p-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center shadow-2xs cursor-pointer shrink-0"
                  title={isFr ? 'Nouvelle intervention' : 'New event'}
                >
                  <Plus className="w-4 h-4" />
                </button>

              </div>
            </div>

            {/* Filter toolbar: Search, Building filter, Technician filter, Clear button */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              
              <div className="flex flex-wrap items-center gap-2 flex-1">
                
                {/* Search Bar */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs w-full sm:w-56 focus-within:border-emerald-500 focus-within:bg-white transition">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isFr ? 'Rechercher équipement, titre...' : 'Search...'}
                    className="bg-transparent text-slate-800 outline-none w-full text-xs font-medium"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Building filter */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={localBuildingFilter}
                    onChange={(e) => {
                      setLocalBuildingFilter(e.target.value);
                      if (onSelectBuilding) onSelectBuilding(e.target.value);
                    }}
                    className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer text-xs"
                  >
                    <option value="all">{isFr ? 'Tous les sites' : 'All buildings'}</option>
                    {buildingsList.map(b => (
                      <option key={b.id} value={b.id.toString()}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active building cross-view communication shortcuts */}
                {localBuildingFilter !== 'all' && onNavigateView && (
                  <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl px-2 py-1 text-xs font-bold">
                    <span className="text-[10px] text-emerald-600 uppercase tracking-wider hidden sm:inline">{isFr ? 'Aller à :' : 'Go to:'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectBuilding) onSelectBuilding(localBuildingFilter);
                        onNavigateView('gtb');
                      }}
                      className="px-1.5 py-0.5 rounded-md hover:bg-emerald-100 text-emerald-900 transition flex items-center gap-1 cursor-pointer"
                      title={isFr ? 'Ouvrir les contrôles GTB de ce bâtiment' : 'Open BMS controls for this building'}
                    >
                      <Wrench className="w-3 h-3 text-emerald-600" />
                      <span>GTB</span>
                    </button>
                    <div className="w-px h-3 bg-emerald-200" />
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectBuilding) onSelectBuilding(localBuildingFilter);
                        onNavigateView('dashboard');
                      }}
                      className="px-1.5 py-0.5 rounded-md hover:bg-emerald-100 text-emerald-900 transition flex items-center gap-1 cursor-pointer"
                      title={isFr ? 'Voir le tableau de bord de ce bâtiment' : 'View dashboard for this building'}
                    >
                      <Building2 className="w-3 h-3 text-emerald-600" />
                      <span>{isFr ? 'Tableau' : 'Dashboard'}</span>
                    </button>
                  </div>
                )}

                {/* Reset all active filters */}
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterCategory('all');
                      setSearchQuery('');
                      setLocalBuildingFilter('all');
                      if (onSelectBuilding) onSelectBuilding('all');
                    }}
                    className="px-2 py-1 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <FilterX className="w-3 h-3" />
                    <span>{isFr ? `Réinitialiser (${activeFiltersCount})` : `Reset (${activeFiltersCount})`}</span>
                  </button>
                )}

              </div>

              {/* Interventions count indicator */}
              <div className="text-[11px] font-bold text-slate-400">
                <span className="text-slate-900 font-black">{filteredInterventions.length}</span> {isFr ? 'interventions' : 'tasks'}
              </div>

            </div>

          </div>

          {/* ================= VIEW CONTENT ================= */}

          {/* 1. WEEK VIEW: FULL DISPLAY FROM LUNDI TO DIMANCHE */}
          {viewMode === 'week' && (
            <div className="flex-1 overflow-x-auto w-full min-w-0">
              {filteredInterventions.length === 0 && (
                <div className="mb-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/70 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      {isFr 
                        ? 'Planning vierge : vos interventions s’ajouteront automatiquement dès la synchronisation du flux distant.' 
                        : 'Clean schedule: interventions will appear here as soon as synchronized with data stream.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSyncGoogleSheets(false)}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold border border-emerald-300 transition cursor-pointer shrink-0"
                  >
                    {isFr ? 'Vérifier le flux distant' : 'Check Data Stream'}
                  </button>
                </div>
              )}
              
              {/* Header Grid: slim time column + exactly 7 (or 5) day columns */}
              <div 
                className={`grid pb-2.5 mb-1.5 text-center items-center border-b border-slate-100 min-w-[700px] lg:min-w-0 ${
                  weekDaysCount === 7 ? 'grid-cols-[44px_repeat(7,minmax(0,1fr))]' : 'grid-cols-[44px_repeat(5,minmax(0,1fr))]'
                }`}
              >
                
                {/* Timezone label */}
                <div className="text-left pl-1">
                  <span className="text-[10px] font-bold text-slate-400">GMT+2</span>
                </div>

                {/* Day Headers: LUN to DIM (Clicking switches to Day View!) */}
                {currentWeekDays.map((dayDate, idx) => {
                  const dateStr = toIsoDate(dayDate);
                  const isToday = dateStr === toIsoDate(new Date());
                  const isSelected = dateStr === toIsoDate(selectedDate);
                  const isSunday = idx === 6 && weekDaysCount === 7;
                  const isSaturday = idx === 5 && weekDaysCount === 7;
                  const dayName = dayDate.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { weekday: 'short' }).toUpperCase();
                  const dayNum = dayDate.getDate();

                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setSelectedDate(dayDate);
                        setViewMode('day'); // Click jumps to day view for maximum utility!
                      }}
                      className={`cursor-pointer py-1.5 px-0.5 rounded-xl transition-all mx-0.5 group ${
                        isSelected 
                          ? 'border border-slate-900 bg-slate-50/70 shadow-2xs' 
                          : isToday
                          ? 'bg-emerald-50/80 border border-emerald-300'
                          : isSunday
                          ? 'bg-emerald-50/40 border border-dashed border-emerald-200'
                          : isSaturday
                          ? 'bg-slate-50/60'
                          : 'hover:bg-slate-50'
                      }`}
                      title={isFr ? 'Cliquez pour voir le détail de cette journée' : 'Click to view day detail'}
                    >
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                        <span className={`text-xs font-black ${isSelected ? 'text-slate-900' : isToday ? 'text-emerald-700' : isSunday ? 'text-emerald-950 font-black' : 'text-slate-700'}`}>
                          {dayNum}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isSunday ? 'text-emerald-800 font-extrabold' : 'text-slate-400'}`}>
                            {dayName}
                          </span>
                          {isSunday && (
                            <span className="hidden xl:inline text-[8px] font-bold px-1 rounded-sm bg-emerald-600 text-white uppercase tracking-tighter">
                              Dim
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Weekly Time Grid */}
              <div className="relative divide-y divide-slate-100 text-xs min-w-[700px] lg:min-w-0">
                {timelineHours.map(hour => (
                  <div 
                    key={hour} 
                    className={`grid min-h-[62px] group ${
                      weekDaysCount === 7 ? 'grid-cols-[44px_repeat(7,minmax(0,1fr))]' : 'grid-cols-[44px_repeat(5,minmax(0,1fr))]'
                    }`}
                  >
                    
                    {/* Time Label on left */}
                    <div className="text-[10px] font-semibold text-slate-400 pt-1 select-none pl-1">
                      {`${hour}:00`}
                    </div>

                    {/* Columns for Days */}
                    {currentWeekDays.map((dayDate, dayIdx) => {
                      const dateStr = toIsoDate(dayDate);
                      const isSunday = dayIdx === 6 && weekDaysCount === 7;
                      const isSaturday = dayIdx === 5 && weekDaysCount === 7;

                      // Find interventions that start in this hour slot for this day
                      const slotEvents = filteredInterventions.filter(inv => {
                        return inv.date === dateStr && Math.floor(inv.startHour) === hour;
                      });

                      return (
                        <div 
                          key={dayIdx} 
                          className={`relative border-l border-slate-100/80 p-0.5 sm:p-1 min-h-[62px] min-w-0 transition-colors group/cell ${
                            isSunday 
                              ? 'bg-emerald-50/15 hover:bg-emerald-50/30' 
                              : isSaturday
                              ? 'bg-slate-50/20 hover:bg-slate-50/50'
                              : 'hover:bg-slate-50/40'
                          }`}
                          onDoubleClick={() => openNewEventModal(dateStr, hour)}
                        >
                          {/* Quick add button on hover if empty */}
                          {slotEvents.length === 0 && (
                            <button
                              type="button"
                              onClick={() => openNewEventModal(dateStr, hour)}
                              className="opacity-0 group-hover/cell:opacity-100 absolute inset-1 rounded-xl border border-dashed border-slate-200 text-slate-300 hover:text-emerald-600 hover:border-emerald-300 flex items-center justify-center transition-all bg-white/80 text-xs font-bold cursor-pointer"
                              title={isFr ? `Créer à ${hour}:00` : `Add at ${hour}:00`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Render Events */}
                          {slotEvents.map(event => {
                            const cfg = CATEGORIES_CONFIG[event.category];
                            const durationHours = Math.max(0.75, event.endHour - event.startHour);
                            const cardHeight = Math.max(52, Math.round(durationHours * 58));
                            const minuteOffset = Math.round((event.startHour - Math.floor(event.startHour)) * 60);
                            const topMarginPx = Math.round((minuteOffset / 60) * 58);

                            return (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditEventModal(event);
                                }}
                                style={{
                                  minHeight: `${cardHeight}px`,
                                  marginTop: topMarginPx > 0 ? `${topMarginPx}px` : undefined
                                }}
                                className={`w-full rounded-xl sm:rounded-2xl p-1.5 sm:p-2 mb-1 flex flex-col justify-between border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md min-w-0 overflow-hidden group/card relative ${cfg.cardBg} ${cfg.borderColor} ${cfg.textColor}`}
                              >
                                <div className="min-w-0">
                                  {/* Time range + quick status button */}
                                  <div className="flex items-center justify-between text-[9px] font-bold opacity-80 mb-0.5">
                                    <span className="truncate font-black tracking-tight">{event.startTimeStr}–{event.endTimeStr}</span>
                                    
                                    {/* Clickable Quick Status toggle */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleQuickToggleStatus(event, e)}
                                      className={`px-1 py-0.2 rounded-sm text-[8px] font-black uppercase tracking-tighter cursor-pointer ${
                                        event.status === 'completed'
                                          ? 'bg-emerald-600 text-white'
                                          : event.status === 'urgent'
                                          ? 'bg-rose-600 text-white animate-pulse'
                                          : event.status === 'in_progress'
                                          ? 'bg-amber-600 text-white'
                                          : 'bg-black/10 text-slate-700'
                                      }`}
                                      title={isFr ? 'Cliquer pour changer de statut' : 'Click to cycle status'}
                                    >
                                      {event.status === 'completed' ? '✓' : event.status}
                                    </button>
                                  </div>

                                  {/* Title */}
                                  <h6 className="font-bold text-[11px] leading-tight line-clamp-2 break-words">
                                    {event.title}
                                  </h6>

                                  {/* Building */}
                                  <p className="text-[9px] font-medium opacity-75 mt-0.5 truncate">
                                    {event.buildingName}
                                  </p>
                                </div>

                                {/* Bottom Row: Building tag + Hover action icons */}
                                <div className="flex items-center justify-between mt-1 pt-0.5 min-w-0">
                                  <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/70 backdrop-blur-xs border border-current/10 truncate max-w-[110px]">
                                    {event.buildingId}
                                  </span>

                                  {/* Hover action icons */}
                                  <div className="opacity-0 group-hover/card:opacity-100 flex items-center gap-1 transition">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditEventModal(event);
                                      }}
                                      className="p-0.5 hover:bg-white/80 rounded text-slate-700 cursor-pointer"
                                      title={isFr ? 'Modifier' : 'Edit'}
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmTarget(event);
                                      }}
                                      className="p-0.5 hover:bg-rose-100 rounded text-rose-600 transition cursor-pointer"
                                      title={isFr ? 'Supprimer' : 'Delete'}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-7 border-b border-slate-100 pb-2 mb-2 text-center text-xs font-bold text-slate-400">
                {(isFr ? ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).map((day, i) => (
                  <div key={i} className={`py-1 ${i === 6 ? 'text-emerald-700 font-extrabold' : ''}`}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-h-[550px]">
                {miniCalendarDays.map(({ date, isCurrentMonth, dateStr }, idx) => {
                  const dayEvents = filteredInterventions.filter(i => i.date === dateStr);
                  const isSelected = dateStr === toIsoDate(selectedDate);
                  const isToday = dateStr === toIsoDate(new Date());
                  const isSunday = (idx + 1) % 7 === 0;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(date)}
                      onDoubleClick={() => {
                        setSelectedDate(date);
                        setViewMode('day');
                      }}
                      className={`p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all flex flex-col min-h-[90px] cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50/50 shadow-2xs'
                          : isToday
                          ? 'border-emerald-300 bg-emerald-50/30'
                          : isSunday
                          ? 'border-emerald-100 bg-emerald-50/15'
                          : isCurrentMonth
                          ? 'border-slate-200/70 bg-white hover:border-slate-400'
                          : 'border-slate-100 bg-slate-50/40 opacity-40'
                      }`}
                      title={isFr ? 'Double-cliquez pour ouvrir la journée' : 'Double click for day view'}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${isSelected ? 'text-slate-900' : isToday ? 'text-emerald-700 font-extrabold' : isSunday ? 'text-emerald-950 font-bold' : 'text-slate-700'}`}>
                          {date.getDate()}
                        </span>
                        <div className="flex items-center gap-1">
                          {dayEvents.length > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                              {dayEvents.length}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openNewEventModal(dateStr);
                            }}
                            className="w-4 h-4 rounded hover:bg-slate-200 text-slate-400 hover:text-emerald-700 flex items-center justify-center transition cursor-pointer"
                            title={isFr ? 'Ajouter une intervention à cette date' : 'Add event to this date'}
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 overflow-y-auto flex-1 max-h-20">
                        {dayEvents.slice(0, 2).map(ev => {
                          const cfg = CATEGORIES_CONFIG[ev.category];
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditEventModal(ev);
                              }}
                              className={`text-[9px] font-semibold p-1 rounded-lg truncate flex items-center justify-between group/pill cursor-pointer ${cfg.cardBg} ${cfg.textColor}`}
                            >
                              <span className="truncate">{ev.startTimeStr} {ev.title}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmTarget(ev);
                                }}
                                className="opacity-0 group-hover/pill:opacity-100 p-0.5 hover:text-rose-600 transition"
                                title={isFr ? 'Supprimer' : 'Delete'}
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <span className="text-[8px] font-bold text-slate-400 block text-center">
                            +{dayEvents.length - 2} autres
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. DAY VIEW */}
          {viewMode === 'day' && (
            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-sm text-emerald-950">
                    {selectedDate.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h4>
                  <p className="text-xs text-emerald-800 font-medium">
                    {filteredInterventions.filter(i => i.date === toIsoDate(selectedDate)).length} {isFr ? 'interventions planifiées sur cette journée' : 'interventions scheduled for today'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openNewEventModal(toIsoDate(selectedDate))}
                  className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isFr ? 'Ajouter à cette date' : 'Add to this day'}</span>
                </button>
              </div>

              {filteredInterventions.filter(i => i.date === toIsoDate(selectedDate)).length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-sm text-slate-700">{isFr ? 'Aucune intervention programmée' : 'No interventions scheduled'}</p>
                  <p className="text-xs text-slate-400 mt-1">{isFr ? 'Cliquez sur le bouton ci-dessus pour planifier une maintenance.' : 'Click the button above to schedule a maintenance.'}</p>
                </div>
              ) : (
                filteredInterventions
                  .filter(i => i.date === toIsoDate(selectedDate))
                  .sort((a, b) => a.startHour - b.startHour)
                  .map(ev => {
                    const cfg = CATEGORIES_CONFIG[ev.category];

                    return (
                      <div
                        key={ev.id}
                        onClick={() => openEditEventModal(ev)}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 ${cfg.cardBg} ${cfg.borderColor} ${cfg.textColor}`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black tracking-tight bg-white/70 px-2 py-0.5 rounded-lg border border-black/5">
                              {ev.startTimeStr} – {ev.endTimeStr}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/50">
                              {isFr ? cfg.labelFr : cfg.labelEn}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                              ev.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-800'
                            }`}>
                              {ev.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm sm:text-base text-slate-900">{ev.title}</h4>
                          <div className="flex items-center gap-3 text-xs opacity-80 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold">
                              <Building2 className="w-3.5 h-3.5" />
                              {ev.buildingName}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {ev.location}
                            </span>
                          </div>
                          {ev.notes && (
                            <p className="text-xs opacity-75 pt-1 italic">{ev.notes}</p>
                          )}
                        </div>

                        {/* Cross Navigation Actions & Status */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {onNavigateView && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectBuilding) onSelectBuilding(ev.buildingId);
                                onNavigateView('gtb');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-white/90 hover:bg-emerald-50 text-xs font-bold text-emerald-800 border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title={isFr ? 'Inspecter ce site dans la GTB' : 'Inspect site in GTB'}
                            >
                              <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">GTB</span>
                            </button>
                          )}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleQuickToggleStatus(ev, e)}
                              className="px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-xs font-bold transition text-slate-700 border border-slate-200 cursor-pointer"
                              title={isFr ? 'Basculer le statut' : 'Toggle status'}
                            >
                              {ev.status === 'completed' ? (isFr ? '✓ Terminé' : '✓ Done') : (isFr ? 'Valider' : 'Done')}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditEventModal(ev);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                              title={isFr ? 'Modifier cette intervention' : 'Edit intervention'}
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">{isFr ? 'Modifier' : 'Edit'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmTarget(ev);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                              title={isFr ? 'Supprimer cette intervention' : 'Delete intervention'}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span className="hidden sm:inline">{isFr ? 'Supprimer' : 'Delete'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

        </main>
      </div>

      {/* ================= MODAL: ADD / EDIT INTERVENTION ================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 z-10 border border-slate-100 max-h-[92vh] overflow-y-auto"
            >
              
              {/* Header with Title and close / pen icon */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder={isFr ? 'Nom de l’intervention...' : 'Intervention title...'}
                      className="text-base sm:text-xl font-bold text-slate-900 outline-none w-full bg-transparent border-b border-transparent focus:border-slate-300 pb-0.5"
                    />
                    <Edit3 className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {editingIntervention 
                      ? (isFr ? 'Modifier cette intervention planifiée' : 'Edit scheduled intervention')
                      : (isFr ? 'Nouvelle intervention technique GTB / CVC' : 'New technical service task')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveIntervention} className="space-y-3.5">
                
                {/* Quick Presets / Templates when adding new intervention */}
                {!editingIntervention && (
                  <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        {isFr ? 'Modèles d’intervention rapides :' : 'Quick templates:'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { title: isFr ? 'Maintenance PAC Chaufferie' : 'Heat Pump Maintenance', cat: 'maintenance' as InterventionCategory, loc: isFr ? 'Chaufferie sous-sol' : 'Basement boiler room', dur: 1.5 },
                        { title: isFr ? 'Contrôle & Régulation GTB' : 'BMS Calibration', cat: 'gtb' as InterventionCategory, loc: isFr ? 'Armoire GTB Étage 1' : 'BMS Panel L1', dur: 1.0 },
                        { title: isFr ? 'Dépannage CTA & Ventilation' : 'AHU Emergency Repair', cat: 'depannage' as InterventionCategory, loc: isFr ? 'Local CTA Toiture' : 'Rooftop AHU', dur: 2.0 },
                        { title: isFr ? 'Remplacement Filtres & Courroies' : 'Filter Replacement', cat: 'maintenance' as InterventionCategory, loc: isFr ? 'Centrale de traitement d’air' : 'Air handler', dur: 1.0 },
                        { title: isFr ? 'Audit Énergétique & Mesures' : 'Energy Audit & Logging', cat: 'audit' as InterventionCategory, loc: isFr ? 'Sous-station' : 'Substation', dur: 2.5 },
                        { title: isFr ? 'Équilibrage Réseau Hydraulique' : 'Hydraulic Balancing', cat: 'commissioning' as InterventionCategory, loc: isFr ? 'Réseau primaire' : 'Primary loop', dur: 3.0 }
                      ].map((tpl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setFormTitle(tpl.title);
                            setFormCategory(tpl.cat);
                            setFormLocation(tpl.loc);
                            const startF = parseHourToFloat(formStartHour);
                            setFormEndHour(formatFloatToHour(Math.min(23.75, startF + tpl.dur)));
                          }}
                          className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-100 hover:text-emerald-950 border border-emerald-200/80 text-[10px] font-bold text-slate-800 transition shadow-2xs cursor-pointer"
                        >
                          + {tpl.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Date Row */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/80">
                  <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 outline-none w-full cursor-pointer"
                  />
                </div>

                {/* Time Range Pickers: Start & End + quick duration pills */}
                <div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {isFr ? 'Heure de début' : 'Start Time'}
                      </label>
                      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="time"
                          required
                          value={formStartHour}
                          onChange={(e) => setFormStartHour(e.target.value)}
                          className="bg-transparent text-xs font-bold text-slate-800 outline-none w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {isFr ? 'Heure de fin' : 'End Time'}
                      </label>
                      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="time"
                          required
                          value={formEndHour}
                          onChange={(e) => setFormEndHour(e.target.value)}
                          className="bg-transparent text-xs font-bold text-slate-800 outline-none w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick duration buttons (+30m, +1h, +2h) */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] text-slate-400">{isFr ? 'Durée rapide :' : 'Quick duration:'}</span>
                    <button
                      type="button"
                      onClick={() => handleAddDuration(0.5)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                    >
                      +30 min
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddDuration(1)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                    >
                      +1 h
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddDuration(2)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                    >
                      +2 h
                    </button>
                  </div>
                </div>

                {/* Building & Location Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {isFr ? 'Bâtiment concerné' : 'Target Building'}
                    </label>
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <select
                        value={formBuildingId}
                        onChange={(e) => setFormBuildingId(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-800 outline-none w-full cursor-pointer"
                      >
                        {buildingsList.map(b => (
                          <option key={b.id} value={b.id.toString()}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {isFr ? 'Localisation / Équipement' : 'Location / Equipment'}
                    </label>
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        placeholder={isFr ? 'Ex: Chaufferie sous-sol, CTA Étage 2' : 'E.g. Boiler room'}
                        className="bg-transparent text-xs font-semibold text-slate-800 outline-none w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Pills */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    {isFr ? 'Catégorie d’intervention' : 'Category'}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(CATEGORIES_CONFIG) as InterventionCategory[]).map(catKey => {
                      const cfg = CATEGORIES_CONFIG[catKey];
                      const isSelected = formCategory === catKey;

                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => setFormCategory(catKey)}
                          className={`px-2.5 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected ? cfg.tagActiveBg : cfg.tagBg
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{isFr ? cfg.labelFr : cfg.labelEn}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Supervision & Site Actions */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isFr ? 'Supervision & Responsable' : 'Supervision & Lead'}
                  </label>
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={userProfile?.photo || userProfile?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'}
                        alt={userProfile?.name || 'Felix Admin'}
                        className="w-8 h-8 rounded-full object-cover border border-emerald-500/30"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{userProfile?.name || 'Felix Admin'}</p>
                        <p className="text-[10px] text-slate-500 truncate">{userProfile?.role || 'Administrateur Système CII ENERGIE'}</p>
                      </div>
                    </div>

                    {onNavigateView && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsModalOpen(false);
                            if (onSelectBuilding) onSelectBuilding(formBuildingId);
                            onNavigateView('gtb');
                          }}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1 border border-emerald-200 cursor-pointer"
                          title={isFr ? 'Accéder à la GTB pour ce bâtiment' : 'Open BMS for this building'}
                        >
                          <Wrench className="w-3 h-3 text-emerald-600" />
                          <span>GTB</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsModalOpen(false);
                            if (onSelectBuilding) onSelectBuilding(formBuildingId);
                            onNavigateView('dashboard');
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 border border-slate-200 cursor-pointer"
                          title={isFr ? 'Voir le tableau de bord pour ce bâtiment' : 'View dashboard for this building'}
                        >
                          <Building2 className="w-3 h-3 text-slate-600" />
                          <span>{isFr ? 'Bord' : 'Dash'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {isFr ? 'Statut de l’intervention' : 'Status'}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'planned', label: isFr ? 'Planifié' : 'Planned', color: 'text-slate-700 bg-slate-100' },
                      { id: 'in_progress', label: isFr ? 'En cours' : 'In Progress', color: 'text-amber-800 bg-amber-50' },
                      { id: 'urgent', label: isFr ? 'Urgent' : 'Urgent', color: 'text-rose-800 bg-rose-50' },
                      { id: 'completed', label: isFr ? 'Terminé' : 'Completed', color: 'text-emerald-800 bg-emerald-50' },
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setFormStatus(st.id as InterventionStatus)}
                        className={`py-1.5 px-1 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          formStatus === st.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : `${st.color} border-transparent hover:border-slate-200`
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {isFr ? 'Consignes & Détails d’intervention' : 'Instructions & Details'}
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder={isFr ? 'Ex: Prévoir nacelle, vérifier pression d’eau, test débit...' : 'Notes...'}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>

                {/* Action Buttons: Add, Duplicate, Delete */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-slate-900 hover:bg-emerald-950 text-white rounded-xl sm:rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>
                      {editingIntervention 
                        ? (isFr ? 'Enregistrer les modifications' : 'Update intervention')
                        : (isFr ? 'Ajouter l’intervention' : 'Add event')}
                    </span>
                  </button>

                  {editingIntervention && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (editingIntervention) {
                            downloadInterventionIcs(editingIntervention);
                            showToast(isFr ? '✓ Fichier .ics téléchargé pour Outlook / Apple / Google !' : '✓ .ics calendar file downloaded!');
                          }
                        }}
                        className="p-3 text-emerald-800 hover:bg-emerald-50 border border-emerald-200 rounded-xl sm:rounded-2xl transition cursor-pointer"
                        title={isFr ? 'Exporter cette intervention en iCalendar (.ics)' : 'Export to iCalendar (.ics)'}
                      >
                        <CalendarIcon className="w-4 h-4 text-[#236b33]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (editingIntervention) {
                            const memo = `[CII ENERGIE] Intervention: ${editingIntervention.title}\nDate: ${editingIntervention.date} (${editingIntervention.startTimeStr} - ${editingIntervention.endTimeStr})\nBâtiment: ${editingIntervention.buildingName} - ${editingIntervention.location}\nCatégorie: ${editingIntervention.category}\nStatut: ${editingIntervention.status}\nConsignes: ${editingIntervention.notes || 'Aucune'}`;
                            navigator.clipboard.writeText(memo);
                            showToast(isFr ? '✓ Fiche intervention copiée dans le presse-papier !' : '✓ Intervention copied to clipboard!');
                          }
                        }}
                        className="p-3 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl transition cursor-pointer"
                        title={isFr ? 'Copier la fiche intervention (SMS / WhatsApp)' : 'Copy memo for technician'}
                      >
                        <Copy className="w-4 h-4 text-slate-600" />
                      </button>

                      <button
                        type="button"
                        onClick={handleDuplicateIntervention}
                        className="p-3 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl transition cursor-pointer"
                        title={isFr ? 'Dupliquer au lendemain' : 'Duplicate to next day'}
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteIntervention(editingIntervention.id)}
                        className="px-3.5 py-3 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl sm:rounded-2xl transition cursor-pointer flex items-center gap-1.5 font-bold text-xs"
                        title={isFr ? 'Supprimer cette intervention' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <span>{isFr ? 'Supprimer' : 'Delete'}</span>
                      </button>
                    </>
                  )}
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: IN-APP CONFIRMATION SUPPRESSION ================= */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex items-start gap-3.5 mb-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {isFr ? 'Supprimer cette intervention ?' : 'Delete this intervention?'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isFr ? 'Cette action retirera l’intervention de votre planning.' : 'This will remove the event from schedule.'}
                  </p>
                </div>
              </div>

              {/* Card preview of the event being deleted */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 my-3.5 text-xs space-y-1">
                <div className="font-bold text-slate-900 text-sm">{deleteConfirmTarget.title}</div>
                <div className="text-slate-600 font-semibold flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                    {deleteConfirmTarget.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {deleteConfirmTarget.startTimeStr} – {deleteConfirmTarget.endTimeStr}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] flex items-center gap-1.5 pt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{deleteConfirmTarget.buildingName} • {deleteConfirmTarget.location}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => executeDeleteIntervention(deleteConfirmTarget)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isFr ? 'Supprimer définitivement' : 'Delete permanently'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: IN-APP CONFIRMATION RÉINITIALISATION ================= */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex items-start gap-3.5 mb-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {isFr ? 'Restaurer le planning type ?' : 'Restore default schedule?'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isFr ? 'Toutes vos interventions actuelles seront réinitialisées au modèle initial recommandé.' : 'Current interventions will be replaced with recommended template.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 mt-5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setInterventions([]);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('cii_interventions_planning_v2', JSON.stringify([]));
                    }
                    syncGoogleSheetsWithFirestore([]).catch(err => console.warn(err));
                    setIsResetConfirmOpen(false);
                    showToast(isFr ? '✓ Tout le planning a été vidé (0 intervention).' : '✓ Schedule cleared (0 interventions).');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isFr ? 'Vider tout le planning' : 'Clear all schedule'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetConfirmOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                  >
                    {isFr ? 'Annuler' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fresh = generateInitialInterventions(new Date());
                      setInterventions(fresh);
                      syncBatchToFirestorePlanning(fresh).catch(err => {
                        console.warn('Sync fresh schedule to Firestore error:', err);
                      });
                      setIsResetConfirmOpen(false);
                      showToast(isFr ? '✓ Planning type restauré et synchronisé avec Firestore !' : '✓ Default schedule restored and synced with Firestore!');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-950 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isFr ? 'Modèle standard' : 'Standard template'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: SYNCHRONISATION GOOGLE SHEETS ================= */}
      <AnimatePresence>
        {isSheetSettingsModalOpen && (
          <div className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 border border-emerald-300 flex items-center justify-center text-emerald-800">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                      <span>{isFr ? 'Liaison & Synchronisation du Flux' : 'Data Stream Synchronization'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900">
                        {isFr ? 'Automatique 45s' : 'Auto 45s'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isFr 
                        ? 'Ajoutez vos maintenances dans votre flux distant pour les intégrer instantanément au planning' 
                        : 'Add maintenances in your remote stream to immediately integrate them into the schedule'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSheetSettingsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Summary Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${sheetSyncStatus?.count && sheetSyncStatus.count > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{interventions.filter(i => i.source === 'google_sheets').length} {isFr ? 'interventions synchronisées actives' : 'active synchronized interventions'}</span>
                      {lastSheetSyncTime && (
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({isFr ? 'Dernier scan à' : 'Last scan at'} {lastSheetSyncTime})
                        </span>
                      )}
                    </div>
                    {sheetSyncStatus?.error && (
                      <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                        {sheetSyncStatus.error}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSyncGoogleSheets(false)}
                    disabled={isSyncingSheet}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                    <span>{isSyncingSheet ? (isFr ? 'Lecture...' : 'Fetching...') : (isFr ? 'Synchroniser maintenant' : 'Sync now')}</span>
                  </button>
                </div>
              </div>

              {/* URL Input */}
              <div className="space-y-1.5 mb-5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  {isFr ? 'Lien CSV publié du flux distant' : 'Published Data Stream CSV URL'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={sheetUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSheetUrl(val);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem(LOCAL_STORAGE_CUSTOM_SHEET_URL, val);
                      }
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSheetUrl(DEFAULT_GOOGLE_SHEETS_CSV_URL);
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem(LOCAL_STORAGE_CUSTOM_SHEET_URL);
                      }
                      showToast(isFr ? 'URL par défaut rétablie' : 'Default URL restored');
                    }}
                    className="px-2.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer shrink-0"
                    title={isFr ? 'Rétablir le lien par défaut du projet' : 'Reset to default data stream'}
                  >
                    {isFr ? 'Défaut' : 'Default'}
                  </button>
                </div>
              </div>

              {/* Guide des colonnes requises */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 mb-5">
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span>{isFr ? 'Colonnes reconnues pour vos interventions' : 'Recognized Columns for your schedule'}</span>
                </h4>
                <p className="text-xs text-slate-600 mb-3">
                  {isFr 
                    ? 'Dans votre tableur ou flux distant, ajoutez les colonnes ci-dessous (soit à la suite comme Section 3, soit sur un nouvel onglet) :'
                    : 'In your remote spreadsheet or stream, add the columns below (either at bottom of sheet or in a dedicated tab):'}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                    <span className="font-extrabold text-emerald-900 block mb-0.5">Technicien</span>
                    <span className="text-[11px] text-slate-500 block">Ex: Alexandre Roux, Marius...</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                    <span className="font-extrabold text-emerald-900 block mb-0.5">Bâtiment</span>
                    <span className="text-[11px] text-slate-500 block">Ex: Bâtiment 1, BAT-02...</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                    <span className="font-extrabold text-emerald-900 block mb-0.5">Objet</span>
                    <span className="text-[11px] text-slate-500 block">Ex: Remplacement filtre CTA...</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                    <span className="font-extrabold text-emerald-900 block mb-0.5">Date</span>
                    <span className="text-[11px] text-slate-500 block">Ex: 24/09/2026 ou 24/09...</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                    <span className="font-extrabold text-emerald-900 block mb-0.5">Heure</span>
                    <span className="text-[11px] text-slate-500 block">Ex: 09:00 ou 9h-11h...</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between gap-2 flex-wrap">
                  <span>
                    <strong>{isFr ? 'Suppression automatique :' : 'Automatic deletion:'}</strong> {isFr ? 'Lorsque vous effacez une ligne dans votre tableur distant, elle disparaît immédiatement du planning.' : 'When you delete a row in your remote table, it is immediately removed from the schedule.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(GOOGLE_SHEETS_TEMPLATE_SAMPLE);
                      setIsCopiedTemplate(true);
                      setTimeout(() => setIsCopiedTemplate(false), 2500);
                      showToast(isFr ? '✓ Modèle copié dans le presse-papier !' : '✓ Template copied to clipboard!');
                    }}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs ml-auto"
                  >
                    {isCopiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedTemplate ? (isFr ? 'Copié !' : 'Copied!') : (isFr ? 'Copier le modèle de tableau' : 'Copy table template')}</span>
                  </button>
                </div>
              </div>

              {/* Sample Table Preview */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden mb-5 text-[11px]">
                <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-600 border-b border-slate-200 flex items-center justify-between">
                  <span>{isFr ? 'Exemple conforme à votre feuille INTER' : 'Example matching your INTER sheet'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{isFr ? 'Onglet INTER' : 'INTER tab'}</span>
                </div>
                <div className="overflow-x-auto p-2 bg-slate-50/50 font-mono text-[10px] text-slate-700 space-y-1">
                  <div className="font-bold text-emerald-900">TECHNICIEN, BATIMENT, OBJET, DATE, HEURE</div>
                  <div className="text-slate-600">MARIUS, BATIMENT 1, REMPLACEMENT DES FILTRE CTA, 24/09/2026, 09:00 - 11:00</div>
                  <div className="text-slate-600">Alexandre Roux, Bâtiment 2, Maintenance PAC Chaufferie, 24/09/2026, 14:00 - 16:30</div>
                  <div className="text-slate-600">Deborah Meyer, Bâtiment 7, Dépannage CTA & ventilation, 25/09/2026, 10:00</div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSheetSettingsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                >
                  {isFr ? 'Fermer' : 'Close'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSyncGoogleSheets(false);
                    setIsSheetSettingsModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>{isFr ? 'Enregistrer & Synchroniser' : 'Save & Sync'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
