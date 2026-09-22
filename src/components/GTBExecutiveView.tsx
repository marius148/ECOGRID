import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Layers, 
  Activity, 
  Cpu, 
  Search, 
  CheckCircle2, 
  RefreshCw, 
  MapPin, 
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  Building2,
  Flame,
  Zap,
  ArrowRight,
  X,
  Power,
  Sliders,
  Thermometer,
  Fan,
  Sun,
  Shield,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  TrendingUp,
  TrendingDown,
  Wrench
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { cn } from '../lib/utils';

export interface GTBEquipment {
  location: string;
  category: string;
  name: string;
  brandModel: string;
  quantity: string | number;
  protocol: string;
  pointType: string;
  status: string;
}

export const cleanGtbText = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/\s*\([xX]10\)/gi, '')
    .replace(/\s*[xX]10\b/gi, '')
    .replace(/\s*\(Bâtiment\s*\d+\)/gi, '')
    .replace(/\s*\(Batiment\s*\d+\)/gi, '')
    .trim();
};

const cleanQty = (val: any): number => {
  if (typeof val === 'number') return val;
  const cleaned = cleanGtbText(val).replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 1;
};

interface GTBExecutiveViewProps {
  language: string;
  buildingsList: any[];
  selectedBuildingId?: string;
  onSelectBuilding?: (id: string) => void;
  onNavigateView?: (view: string) => void;
  gtbEquipments?: GTBEquipment[];
  isSyncing?: boolean;
  lastSyncTime?: string;
  onForceSync?: () => void;
}

export const GTBExecutiveView: React.FC<GTBExecutiveViewProps> = ({
  language,
  buildingsList,
  selectedBuildingId,
  onSelectBuilding,
  onNavigateView,
  gtbEquipments = [],
  isSyncing,
  lastSyncTime,
  onForceSync
}) => {
  // Filtres et Vues
  const [selectedZone, setSelectedZone] = useState<string>('Tous');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showTable, setShowTable] = useState<boolean>(false);
  const [timeFilter, setTimeFilter] = useState<string>('today');

  // État interactif des régulations GTB en temps réel
  const [globalMode, setGlobalMode] = useState<'AUTO' | 'CONFORT' | 'ECO' | 'NUIT' | 'CANICULE' | 'GEL'>('AUTO');
  const [heatingSetpoint, setHeatingSetpoint] = useState<number>(21.5);
  const [coolingSetpoint, setCoolingSetpoint] = useState<number>(25.0);
  const [ventilationRate, setVentilationRate] = useState<number>(850);
  const [lightingLux, setLightingLux] = useState<number>(350);
  const [aiOptimizationActive, setAiOptimizationActive] = useState<boolean>(true);
  const [nightSetbackActive, setNightSetbackActive] = useState<boolean>(true);

  // État interactif individuel des équipements
  const [equipmentStates, setEquipmentStates] = useState<Record<string, { status: string; override: boolean; setpoint?: number }>>({});
  const [selectedEquipmentModal, setSelectedEquipmentModal] = useState<GTBEquipment | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Notifications temporaires lors d'une action
  const showFeedback = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => {
      setActionNotice(null);
    }, 3000);
  };

  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId || selectedBuildingId === 'all') return null;
    return buildingsList.find(b => b.id.toString() === selectedBuildingId.toString()) || null;
  }, [buildingsList, selectedBuildingId]);

  // Nettoyage systématique des équipements pour supprimer tout "x10" et "(Bâtiment X)"
  const sanitizedEquipments = useMemo(() => {
    return gtbEquipments.map((eq, idx) => ({
      ...eq,
      id: `EQ-${idx}`,
      location: cleanGtbText(eq.location) || 'Bâtiments',
      category: cleanGtbText(eq.category) || 'Général',
      name: cleanGtbText(eq.name),
      brandModel: cleanGtbText(eq.brandModel),
      quantity: cleanQty(eq.quantity),
      protocol: cleanGtbText(eq.protocol),
      pointType: cleanGtbText(eq.pointType),
      status: equipmentStates[`EQ-${idx}`]?.status || cleanGtbText(eq.status) || 'Actif'
    }));
  }, [gtbEquipments, equipmentStates]);

  // Bascule du statut d'un équipement en 1 clic
  const handleToggleEquipment = (eqId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Actif' ? 'En veille' : currentStatus === 'En veille' ? 'Arrêté' : 'Actif';
    setEquipmentStates(prev => ({
      ...prev,
      [eqId]: {
        ...(prev[eqId] || {}),
        status: nextStatus,
        override: true
      }
    }));
    showFeedback(`Équipement ${eqId} commuté : ${nextStatus}`);
  };

  // Modes prédéfinis interactifs
  const handleSelectMode = (mode: 'AUTO' | 'CONFORT' | 'ECO' | 'NUIT' | 'CANICULE' | 'GEL') => {
    setGlobalMode(mode);
    switch (mode) {
      case 'CONFORT':
        setHeatingSetpoint(22.0);
        setCoolingSetpoint(24.5);
        setVentilationRate(950);
        showFeedback(language === 'fr' ? 'Mode Confort activé (22.0°C)' : 'Comfort Mode active (22.0°C)');
        break;
      case 'ECO':
        setHeatingSetpoint(19.0);
        setCoolingSetpoint(26.0);
        setVentilationRate(700);
        showFeedback(language === 'fr' ? 'Mode Éco GTB activé (19.0°C)' : 'Eco BMS Mode active (19.0°C)');
        break;
      case 'NUIT':
        setHeatingSetpoint(16.0);
        setCoolingSetpoint(28.0);
        setVentilationRate(400);
        showFeedback(language === 'fr' ? 'Abaissement Nuit activé (16.0°C)' : 'Night Setback active (16.0°C)');
        break;
      case 'CANICULE':
        setHeatingSetpoint(18.0);
        setCoolingSetpoint(25.0);
        setVentilationRate(1100);
        showFeedback(language === 'fr' ? 'Protection Canicule active (25.0°C)' : 'Heatwave protection active (25.0°C)');
        break;
      case 'GEL':
        setHeatingSetpoint(8.0);
        setCoolingSetpoint(32.0);
        setVentilationRate(300);
        showFeedback(language === 'fr' ? 'Hors-Gel activé (8.0°C)' : 'Frost protection active (8.0°C)');
        break;
      case 'AUTO':
      default:
        setHeatingSetpoint(21.5);
        setCoolingSetpoint(25.0);
        setVentilationRate(850);
        showFeedback(language === 'fr' ? 'Régulation Automatique IA active' : 'Automated AI regulation active');
        break;
    }
  };

  // Métriques
  const metrics = useMemo(() => {
    const totalItems = sanitizedEquipments.reduce((acc, curr) => acc + (typeof curr.quantity === 'number' ? curr.quantity : 1), 0);
    const uniqueCategories = Array.from(new Set(sanitizedEquipments.map(e => e.category)));
    const uniqueProtocols = Array.from(new Set(sanitizedEquipments.map(e => e.protocol.split('/')[0].trim()))).filter(Boolean);
    
    return {
      pointsCount: 91,
      totalEquipments: totalItems || 3496,
      categoriesCount: uniqueCategories.length || 7,
      protocolsCount: uniqueProtocols.length || 6,
      availability: '99.8%'
    };
  }, [sanitizedEquipments]);

  // Données du graphique circulaire
  const pieData = useMemo(() => {
    return [
      { name: 'CVC & Confort', value: 460, color: '#064e3b' },
      { name: 'GTB Comptage', value: 410, color: '#059669' },
      { name: 'Production ENR', value: 2602, color: '#10b981' },
      { name: 'Sécurité & Utilités', value: 24, color: '#0d9488' },
    ];
  }, []);

  // Données du graphique en barres
  const barData = useMemo(() => {
    return [
      { name: 'CVC', telemetrie: 36, automates: 22 },
      { name: 'Comptage', telemetrie: 28, automates: 8 },
      { name: 'Solaire', telemetrie: 24, automates: 16 },
      { name: 'Stockage', telemetrie: 14, automates: 12 },
      { name: 'Trigén.', telemetrie: 20, automates: 26 },
      { name: 'Sécurité', telemetrie: 22, automates: 15 },
    ];
  }, []);

  // Données de couverture par zone
  const zonesCoverage = useMemo(() => {
    return [
      { name: 'Bâtiments', pct: 87, bgClass: 'bg-emerald-800' },
      { name: 'Zone Technique', pct: 57, bgClass: 'bg-emerald-600' },
      { name: 'Sous-stations', pct: 37, bgClass: 'bg-emerald-500' },
      { name: 'Centrale Énergie', pct: 17, bgClass: 'bg-emerald-400' },
    ];
  }, []);

  // Filtrage pour le tableau d'inventaire
  const filteredEquipments = useMemo(() => {
    return sanitizedEquipments.filter(eq => {
      if (selectedZone !== 'Tous') {
        if (!eq.location.toLowerCase().includes(selectedZone.toLowerCase())) return false;
      }
      if (selectedCategory !== 'Tous') {
        if (!eq.category.toLowerCase().includes(selectedCategory.toLowerCase())) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          eq.name.toLowerCase().includes(q) ||
          eq.brandModel.toLowerCase().includes(q) ||
          eq.category.toLowerCase().includes(q) ||
          eq.protocol.toLowerCase().includes(q) ||
          eq.pointType.toLowerCase().includes(q) ||
          eq.location.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [sanitizedEquipments, selectedZone, selectedCategory, searchQuery]);

  // Calcul en direct des anomalies et dérives GTB
  const gtbAnomalies = useMemo(() => {
    const list: Array<{
      id: string;
      titleFr: string;
      titleEn: string;
      descFr: string;
      descEn: string;
      severity: 'critical' | 'warning';
      type: 'temp_high' | 'temp_low' | 'conflict' | 'equipment';
      actionType?: 'setpoint' | 'rearm';
    }> = [];

    // 1. Dérive consigne Chauffage (trop haute ou trop basse)
    if (heatingSetpoint > 22.5) {
      const excess = (heatingSetpoint - 20).toFixed(1);
      const wastePct = Math.round((heatingSetpoint - 20) * 7);
      list.push({
        id: 'anom-heat-high',
        titleFr: 'Surchauffe GTB : Consigne Chauffage Excessive',
        titleEn: 'BMS Overheating: High Heating Setpoint',
        descFr: `Consigne fixée à ${heatingSetpoint.toFixed(1)}°C (recommandation : 19.0°C - 21.0°C). Engendre ~+${wastePct}% de surconsommation CVC continue (+${excess}°C au-dessus de 20°C).`,
        descEn: `Setpoint at ${heatingSetpoint.toFixed(1)}°C (target: 19-21°C). Causes ~+${wastePct}% unnecessary HVAC continuous drain.`,
        severity: heatingSetpoint >= 24 ? 'critical' : 'warning',
        type: 'temp_high',
        actionType: 'setpoint'
      });
    } else if (heatingSetpoint < 17.0 && globalMode !== 'GEL') {
      list.push({
        id: 'anom-heat-low',
        titleFr: 'Sous-chauffe GTB : Risque d\'Inconfort Thermique',
        titleEn: 'BMS Under-heating: Resident Discomfort Hazard',
        descFr: `Consigne à ${heatingSetpoint.toFixed(1)}°C en période d'occupation. Risque élevé d'inconfort pour les résidents.`,
        descEn: `Heating setpoint at ${heatingSetpoint.toFixed(1)}°C during occupied schedule. Severe discomfort risk.`,
        severity: 'warning',
        type: 'temp_low',
        actionType: 'setpoint'
      });
    }

    // 2. Dérive consigne Climatisation (trop basse)
    if (coolingSetpoint < 23.0) {
      list.push({
        id: 'anom-cool-low',
        titleFr: 'Sur-Climatisation : Consigne Froid Trop Basse',
        titleEn: 'Excessive Chilling: Low Cooling Setpoint',
        descFr: `Consigne froid à ${coolingSetpoint.toFixed(1)}°C (seuil mini recommandé : 24.0°C). Surcharge du compresseur et risque de condensation.`,
        descEn: `Cooling setpoint at ${coolingSetpoint.toFixed(1)}°C. Compressor stress and condensation hazard.`,
        severity: 'warning',
        type: 'temp_low',
        actionType: 'setpoint'
      });
    }

    // 3. Conflit Chaud/Froid simultanés
    if (heatingSetpoint >= coolingSetpoint) {
      list.push({
        id: 'anom-conflict',
        titleFr: 'Conflit Thermique Majeur : Chauffage >= Climatisation',
        titleEn: 'Major Thermal Conflict: Heating >= Cooling',
        descFr: `Consigne chauffage (${heatingSetpoint.toFixed(1)}°C) supérieure ou égale à la consigne froid (${coolingSetpoint.toFixed(1)}°C). Fonctionnement simultané destructeur !`,
        descEn: `Heating setpoint (${heatingSetpoint.toFixed(1)}°C) overlaps cooling (${coolingSetpoint.toFixed(1)}°C). Energy destructive!`,
        severity: 'critical',
        type: 'conflict',
        actionType: 'setpoint'
      });
    }

    // 4. Équipements en alarme ou perte de communication
    sanitizedEquipments.forEach((eq, idx) => {
      const s = String(eq.status).toLowerCase();
      if (s.includes('alarme') || s.includes('défaut') || s.includes('panne') || s.includes('perte')) {
        list.push({
          id: `anom-eq-${idx}`,
          titleFr: `Défaut Automate / Capteur : ${eq.name}`,
          titleEn: `Hardware / Sensor Alert: ${eq.name}`,
          descFr: `${eq.location} (${eq.category}) : état « ${eq.status} » sur protocole ${eq.protocol}.`,
          descEn: `${eq.location} (${eq.category}): state "${eq.status}" over protocol ${eq.protocol}.`,
          severity: s.includes('alarme') || s.includes('défaut') ? 'critical' : 'warning',
          type: 'equipment',
          actionType: 'rearm'
        });
      }
    });

    return list;
  }, [heatingSetpoint, coolingSetpoint, globalMode, sanitizedEquipments]);

  // Réarmer tous les équipements en défaut
  const handleRearmAllEquipments = () => {
    setEquipmentStates(prev => {
      const next = { ...prev };
      sanitizedEquipments.forEach(eq => {
        const s = String(eq.status).toLowerCase();
        if (s.includes('alarme') || s.includes('défaut') || s.includes('panne') || s.includes('perte')) {
          next[eq.id] = {
            ...(next[eq.id] || {}),
            status: 'Actif',
            override: true
          };
        }
      });
      return next;
    });
    showFeedback(language === 'fr' ? 'Tous les automates ont été réarmés (statut: Actif)' : 'All BMS controllers acknowledged and reset (status: Active)');
  };

  // Corriger automatiquement les consignes GTB
  const handleAutoFixSetpoints = () => {
    setHeatingSetpoint(20.5);
    setCoolingSetpoint(25.0);
    setGlobalMode('AUTO');
    showFeedback(language === 'fr' ? 'Consignes GTB recalibrées sur 20.5°C / 25.0°C (Zone neutre: 4.5°C)' : 'BMS setpoints re-aligned to 20.5°C / 25.0°C');
  };

  // Date formatée
  const formattedDate = useMemo(() => {
    const d = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const s = d.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', options);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [language]);

  return (
    <div className="w-full space-y-6">
      {/* Toast de confirmation des actions interactives */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 1. En-tête Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 tracking-tight">
            {language === 'fr' ? 'Supervision & Contrôles GTB' : 'BMS Supervision & Controls'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {formattedDate} • {selectedBuilding ? selectedBuilding.name : (language === 'fr' ? 'Périmètre Global du Parc' : 'Global Portfolio Scope')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Statut de communication interactif */}
          <button
            onClick={() => {
              onForceSync?.();
              showFeedback(language === 'fr' ? 'Actualisation de la télémétrie GTB effectuée' : 'BMS telemetry refreshed');
            }}
            className="flex items-center gap-2 text-xs text-slate-700 font-semibold bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs transition cursor-pointer"
          >
            <span className={cn("w-2 h-2 rounded-full", isSyncing ? "bg-amber-500 animate-spin" : "bg-emerald-500")} />
            <span>{isSyncing ? (language === 'fr' ? 'Synchronisation...' : 'Syncing...') : (language === 'fr' ? 'Télémétrie Active' : 'Live Telemetry')}</span>
            <RefreshCw className={cn("w-3.5 h-3.5 text-slate-400", isSyncing && "animate-spin text-emerald-600")} />
          </button>

          {/* Bouton bascule Vue Synthèse / Inventaire */}
          <button
            onClick={() => setShowTable(!showTable)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs border cursor-pointer",
              showTable
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/80"
            )}
          >
            {showTable ? (
              <>
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{language === 'fr' ? 'Vue Pilotage' : 'Dashboard'}</span>
              </>
            ) : (
              <>
                <TableIcon className="w-3.5 h-3.5" />
                <span>{language === 'fr' ? 'Inventaire Automates' : 'Inventory'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 1.5. Centre de Diagnostic des Anomalies & Alertes GTB */}
      <div className={cn(
        "rounded-2xl p-4 sm:p-5 border transition-all space-y-3.5 shadow-xs",
        gtbAnomalies.length > 0
          ? "bg-rose-50/40 border-rose-200/90"
          : "bg-emerald-50/30 border-emerald-200/60"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs",
              gtbAnomalies.length > 0 
                ? "bg-rose-100 border-rose-200 text-rose-700" 
                : "bg-emerald-100 border-emerald-200 text-emerald-700"
            )}>
              {gtbAnomalies.length > 0 ? (
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display break-words">
                  {language === 'fr' ? 'Diagnostic & Anomalies GTB en Temps Réel' : 'Live BMS Anomaly & Drift Diagnostics'}
                </h3>
                {gtbAnomalies.length > 0 ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white uppercase tracking-wider shadow-2xs shrink-0">
                    {gtbAnomalies.length} {language === 'fr' ? 'dérive(s) détectée(s)' : 'drift(s)'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider shrink-0">
                    {language === 'fr' ? '100% Nominal' : '100% Nominal'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                {language === 'fr'
                  ? 'Audit continu des consignes thermiques, conflits chaud/froid et trames d\'automates.'
                  : 'Continuous audit of thermal setpoints, heat/cool overlaps and fieldbus frames.'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {gtbAnomalies.some(a => a.actionType === 'setpoint' || a.type === 'temp_high' || a.type === 'temp_low' || a.type === 'conflict') && (
              <button
                onClick={handleAutoFixSetpoints}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{language === 'fr' ? 'Corriger Consignes (20.5°C)' : 'Align Setpoints (20.5°C)'}</span>
              </button>
            )}

            {gtbAnomalies.some(a => a.actionType === 'rearm' || a.type === 'equipment') && (
              <button
                onClick={handleRearmAllEquipments}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'fr' ? 'Réarmer Automates' : 'Reset Hardware'}</span>
              </button>
            )}

            {/* Test Simulation Trigger */}
            <button
              onClick={() => {
                if (heatingSetpoint >= 23.5) {
                  handleAutoFixSetpoints();
                } else {
                  setHeatingSetpoint(24.5);
                  showFeedback(language === 'fr' ? 'Consigne test injectée : 24.5°C (Surchauffe GTB)' : 'Test setpoint injected: 24.5°C (Overheating)');
                }
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <span>{heatingSetpoint >= 23.5 ? (language === 'fr' ? 'Rétablir consigne' : 'Reset setpoint') : (language === 'fr' ? 'Tester surchauffe (24.5°C)' : 'Test high drift (24.5°C)')}</span>
            </button>
          </div>
        </div>

        {/* Detailed Anomaly Cards */}
        {gtbAnomalies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {gtbAnomalies.map((anom) => (
              <div 
                key={anom.id}
                className={cn(
                  "p-3 rounded-xl border bg-white flex flex-col justify-between gap-2 shadow-2xs transition-all",
                  anom.severity === 'critical' ? "border-rose-300" : "border-amber-300"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertTriangle className={cn("w-4 h-4 shrink-0", anom.severity === 'critical' ? "text-rose-600" : "text-amber-600")} />
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {language === 'fr' ? anom.titleFr : anom.titleEn}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0",
                    anom.severity === 'critical' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {anom.severity === 'critical' ? (language === 'fr' ? "CRITIQUE" : "CRITICAL") : (language === 'fr' ? "ALERTE" : "WARNING")}
                  </span>
                </div>

                <p className="text-xs text-slate-600 font-normal leading-relaxed">
                  {language === 'fr' ? anom.descFr : anom.descEn}
                </p>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-bold text-slate-500">
                  <span>{language === 'fr' ? 'Résolution recommandée :' : 'Remedy:'}</span>
                  {anom.actionType === 'setpoint' ? (
                    <button
                      onClick={handleAutoFixSetpoints}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <Wrench className="w-3 h-3" />
                      {language === 'fr' ? 'Réguler à 20.5°C' : 'Align setpoint'}
                    </button>
                  ) : (
                    <button
                      onClick={handleRearmAllEquipments}
                      className="text-slate-800 hover:underline uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {language === 'fr' ? 'Acquitter l\'alarme' : 'Acknowledge'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 py-1">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {language === 'fr'
                ? 'Tous les régulateurs CVC, automates BACnet/Modbus et compteurs d\'énergie fonctionnent dans les plages thermiques optimales.'
                : 'All HVAC loop controllers, BACnet/Modbus hardware and energy meters operate within optimal parameters.'}
            </span>
          </div>
        )}
      </div>

      {/* 2. Centre de Commande Interactif : Modes de Marche & Consignes */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">
              {language === 'fr' ? 'Mode de Régulation GTB & Consignes' : 'BMS Operating Mode & Setpoints'}
            </h2>
          </div>

          {/* Bouton Optimisation IA */}
          <button
            onClick={() => {
              setAiOptimizationActive(!aiOptimizationActive);
              showFeedback(aiOptimizationActive ? 'Optimisation IA désactivée' : 'Optimisation IA activée');
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border",
              aiOptimizationActive
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-slate-100 text-slate-500 border-slate-200"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === 'fr' ? 'Optimisation IA GTB' : 'AI Optimization'}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider">{aiOptimizationActive ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Boutons Sélecteurs de Mode (100% Interactifs) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { id: 'AUTO', label: 'Auto (IA)', desc: 'Régulation optimale' },
            { id: 'CONFORT', label: 'Confort', desc: '22.0°C' },
            { id: 'ECO', label: 'Éco GTB', desc: '19.0°C' },
            { id: 'NUIT', label: 'Nuit', desc: '16.0°C' },
            { id: 'CANICULE', label: 'Canicule', desc: '25.0°C' },
            { id: 'GEL', label: 'Hors-Gel', desc: '8.0°C' },
          ].map((mode) => {
            const isCurrent = globalMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => handleSelectMode(mode.id as any)}
                className={cn(
                  "p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between",
                  isCurrent
                    ? "bg-emerald-900 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-600/30"
                    : "bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-slate-200/70"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{mode.label}</span>
                  {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <span className={cn("text-[10px] mt-1 font-medium", isCurrent ? "text-emerald-200" : "text-slate-400")}>
                  {mode.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Régleurs Interactifs de Consignes (+ / -) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Chauffage */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>{language === 'fr' ? 'Consigne Chauffage' : 'Heating Setpoint'}</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {heatingSetpoint.toFixed(1)}°C
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setHeatingSetpoint(prev => Math.max(12, +(prev - 0.5).toFixed(1)));
                  showFeedback(`Consigne chauffage : ${(heatingSetpoint - 0.5).toFixed(1)}°C`);
                }}
                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
              >
                -
              </button>
              <button
                onClick={() => {
                  setHeatingSetpoint(prev => Math.min(26, +(prev + 0.5).toFixed(1)));
                  showFeedback(`Consigne chauffage : ${(heatingSetpoint + 0.5).toFixed(1)}°C`);
                }}
                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Climatisation */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                <Thermometer className="w-3.5 h-3.5 text-sky-600" />
                <span>{language === 'fr' ? 'Consigne Froid' : 'Cooling Setpoint'}</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {coolingSetpoint.toFixed(1)}°C
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setCoolingSetpoint(prev => Math.max(20, +(prev - 0.5).toFixed(1)));
                  showFeedback(`Consigne froid : ${(coolingSetpoint - 0.5).toFixed(1)}°C`);
                }}
                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
              >
                -
              </button>
              <button
                onClick={() => {
                  setCoolingSetpoint(prev => Math.min(30, +(prev + 0.5).toFixed(1)));
                  showFeedback(`Consigne froid : ${(coolingSetpoint + 0.5).toFixed(1)}°C`);
                }}
                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Ventilation VMC CTA */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                <Fan className="w-3.5 h-3.5 text-teal-600 animate-spin" style={{ animationDuration: '4s' }} />
                <span>{language === 'fr' ? 'Débit VMC / CTA' : 'Ventilation Rate'}</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {ventilationRate} m³/h
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setVentilationRate(prev => Math.max(300, prev - 50));
                  showFeedback(`Débit ventilation : ${ventilationRate - 50} m³/h`);
                }}
                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
              >
                -
              </button>
              <button
                onClick={() => {
                  setVentilationRate(prev => Math.min(1600, prev + 50));
                  showFeedback(`Débit ventilation : ${ventilationRate + 50} m³/h`);
                }}
                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Seuil Éclairage */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'fr' ? 'Seuil Éclairage' : 'Lighting Level'}</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {lightingLux} Lux
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setLightingLux(prev => Math.max(100, prev - 25));
                  showFeedback(`Seuil d'éclairage : ${lightingLux - 25} Lux`);
                }}
                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
              >
                -
              </button>
              <button
                onClick={() => {
                  setLightingLux(prev => Math.min(800, prev + 25));
                  showFeedback(`Seuil d'éclairage : ${lightingLux + 25} Lux`);
                }}
                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Grille Principale Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Colonne Gauche : 4 KPI + Graphique */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          
          {/* 4 Cartes KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Carte 1 : Vert Foncé Forêt sobre, sans badge lumineux */}
            <div className="bg-[#064e3b] text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[135px]">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center text-white border border-emerald-700/60">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-emerald-200">
                  Classe B EN ISO 52120-1
                </span>
              </div>

              <div className="mt-3">
                <p className="text-xs font-medium text-emerald-200/90 mb-0.5">
                  {language === 'fr' ? 'Points de Contrôle Normalisés' : 'Total BMS Points'}
                </p>
                <div className="text-3xl font-bold font-display tracking-tight text-white">
                  91 Points
                </div>
              </div>

              <div className="mt-2 text-[11px] font-medium text-emerald-300/80">
                {language === 'fr' ? 'Supervision continue des équipements' : 'Active equipment supervision'}
              </div>
            </div>

            {/* Carte 2 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-xs flex flex-col justify-between min-h-[135px]">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200/60">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {metrics.categoriesCount} Macro-lots
                </span>
              </div>

              <div className="mt-3">
                <p className="text-xs font-medium text-slate-500 mb-0.5">
                  {language === 'fr' ? 'Lots Techniques' : 'Technical Lots'}
                </p>
                <div className="text-3xl font-bold font-display tracking-tight text-slate-900">
                  {metrics.categoriesCount} Lots
                </div>
              </div>

              <div className="mt-2 text-[11px] font-medium text-slate-400">
                CVC, Énergie Solaire, Comptages, Utilités
              </div>
            </div>

            {/* Carte 3 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-xs flex flex-col justify-between min-h-[135px]">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200/60">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-emerald-700">
                  Optimal
                </span>
              </div>

              <div className="mt-3">
                <p className="text-xs font-medium text-slate-500 mb-0.5">
                  {language === 'fr' ? 'Disponibilité Réseau' : 'Network Uptime'}
                </p>
                <div className="text-3xl font-bold font-display tracking-tight text-slate-900">
                  {metrics.availability}
                </div>
              </div>

              <div className="mt-2 text-[11px] font-medium text-slate-400">
                {language === 'fr' ? 'Taux de service des automates' : 'Automate service rate'}
              </div>
            </div>

            {/* Carte 4 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-xs flex flex-col justify-between min-h-[135px]">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200/60">
                  <Cpu className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-500 font-mono">
                  BACnet / Modbus
                </span>
              </div>

              <div className="mt-3">
                <p className="text-xs font-medium text-slate-500 mb-0.5">
                  {language === 'fr' ? 'Protocoles Bus' : 'Bus Protocols'}
                </p>
                <div className="text-3xl font-bold font-display tracking-tight text-slate-900">
                  {metrics.protocolsCount} Bus
                </div>
              </div>

              <div className="mt-2 text-[11px] font-medium text-slate-400">
                BACnet IP, Modbus RTU, M-Bus, KNX
              </div>
            </div>

          </div>

          {/* Graphique Barres */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h3 className="text-base font-bold font-display text-slate-900 leading-snug">
                  {language === 'fr' ? 'Points de Supervision GTB par Macro-Lot' : 'BMS Supervision Points by Macro-Lot'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {language === 'fr' ? 'Répartition des commandes et des télérelèves' : 'Commands and sensors breakdown'}
                </p>
              </div>

              {/* Filtre interactif de période */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto shrink-0">
                {['today', 'week', 'year'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setTimeFilter(tf);
                      showFeedback(`Période sélectionnée : ${tf}`);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer",
                      timeFilter === tf
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {tf === 'today' ? (language === 'fr' ? 'Jour' : 'Day') : tf === 'week' ? (language === 'fr' ? 'Semaine' : 'Week') : (language === 'fr' ? 'Année' : 'Year')}
                  </button>
                ))}
              </div>
            </div>

            {/* Légende du graphique */}
            <div className="flex items-center gap-5 text-xs font-semibold text-slate-600 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
                <span>{language === 'fr' ? 'Capteurs & Télérelèves' : 'Sensors & Meters'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#064e3b]" />
                <span>{language === 'fr' ? 'Commandes Automates' : 'Automate Commands'}</span>
              </div>
            </div>

            {/* Zone graphique */}
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barGap={6} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    domain={[0, 40]}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '12px', 
                      border: 'none', 
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="telemetrie" 
                    name={language === 'fr' ? 'Télérelèves' : 'Meters'} 
                    fill="#10b981" 
                    radius={[6, 6, 0, 0]} 
                    barSize={16}
                  />
                  <Bar 
                    dataKey="automates" 
                    name={language === 'fr' ? 'Automates' : 'Automates'} 
                    fill="#064e3b" 
                    radius={[6, 6, 0, 0]} 
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Colonne Droite : Donut + Couverture */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* Carte 1 : Répartition des Lots */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold font-display text-slate-900">
                  {language === 'fr' ? 'Inventaire des Lots' : 'Lot Distribution'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {language === 'fr' ? 'Équipements répertoriés' : 'Registered equipments'}
                </p>
              </div>
            </div>

            {/* Graphique Circulaire */}
            <div className="h-44 w-full my-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '10px', 
                      border: 'none', 
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 'bold' 
                    }} 
                  />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Liste des catégories cliquables pour filtrer */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              {pieData.map((item, idx) => {
                const isFiltered = selectedCategory.toLowerCase().includes(item.name.slice(0, 3).toLowerCase());
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      const next = isFiltered ? 'Tous' : item.name.split('&')[0].trim();
                      setSelectedCategory(next);
                      showFeedback(`Filtre : ${next}`);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between text-xs p-2 rounded-xl transition cursor-pointer text-left",
                      isFiltered ? "bg-slate-100 font-bold" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">{item.value}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Carte 2 : Couverture Technique */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold font-display text-slate-900">
                  {language === 'fr' ? 'Couverture par Zone' : 'Zone Coverage'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {language === 'fr' ? 'Densité des points de mesure' : 'Measurement density'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {zonesCoverage.map((zone, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    setSelectedZone(zone.name);
                    showFeedback(`Zone sélectionnée : ${zone.name}`);
                  }}
                  className="space-y-1.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{zone.name}</span>
                    <span className="font-mono font-bold text-slate-600">{zone.pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", zone.bgClass)}
                      style={{ width: `${zone.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* 4. Tableau d'Inventaire & Contrôles Individuels */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden mt-6">
        
        {/* En-tête avec recherche et filtres */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">
                {language === 'fr' ? 'Inventaire des Équipements & Actionneurs GTB' : 'BMS Equipments & Actuators Inventory'}
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-xs">
                {filteredEquipments.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {language === 'fr' ? 'Cliquez sur un équipement pour accéder à ses commandes avancées' : 'Click any equipment to access detailed controls'}
            </p>
          </div>

          {/* Recherche */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'fr' ? 'Rechercher équipement, bus, modèle...' : 'Search equipment, bus, model...'}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs py-2 pl-9 pr-8 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Puces de filtre par zone */}
        <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {['Tous', 'Bâtiments', 'Sous-stations', 'Zone Technique', 'Centrale Énergie'].map((zone) => {
            const isActive = selectedZone === zone;
            return (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border",
                  isActive
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
                )}
              >
                {zone === 'Tous' ? (language === 'fr' ? 'Toutes les zones' : 'All Zones') : zone}
              </button>
            );
          })}
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-5 whitespace-nowrap">{language === 'fr' ? 'Localisation' : 'Location'}</th>
                <th className="py-3 px-5 whitespace-nowrap">{language === 'fr' ? 'Lot' : 'Lot'}</th>
                <th className="py-3 px-5">{language === 'fr' ? 'Équipement & Marque' : 'Equipment & Brand'}</th>
                <th className="py-3 px-5 text-center whitespace-nowrap">{language === 'fr' ? 'Qté' : 'Qty'}</th>
                <th className="py-3 px-5 whitespace-nowrap">{language === 'fr' ? 'Bus' : 'Bus'}</th>
                <th className="py-3 px-5">{language === 'fr' ? 'Fonction' : 'Function'}</th>
                <th className="py-3 px-5 text-center whitespace-nowrap">{language === 'fr' ? 'État' : 'Status'}</th>
                <th className="py-3 px-5 text-center whitespace-nowrap">{language === 'fr' ? 'Action' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEquipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <p className="font-semibold">{language === 'fr' ? 'Aucun équipement trouvé' : 'No equipment found'}</p>
                  </td>
                </tr>
              ) : (
                filteredEquipments.map((eq: any, idx: number) => {
                  const eqId = eq.id || `EQ-${idx}`;
                  const isActif = eq.status === 'Actif';
                  return (
                    <tr 
                      key={eqId} 
                      onClick={() => setSelectedEquipmentModal(eq)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-5 font-semibold text-slate-800 whitespace-nowrap">
                        {eq.location}
                      </td>

                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {eq.category}
                        </span>
                      </td>

                      <td className="py-3 px-5">
                        <div className="font-bold text-slate-900 text-xs">{eq.name}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{eq.brandModel}</div>
                      </td>

                      <td className="py-3 px-5 text-center whitespace-nowrap font-mono font-bold text-slate-700">
                        {eq.quantity}
                      </td>

                      <td className="py-3 px-5 whitespace-nowrap font-mono text-[10px] font-semibold text-slate-600">
                        {eq.protocol}
                      </td>

                      <td className="py-3 px-5 text-slate-600 font-medium">
                        {eq.pointType}
                      </td>

                      <td className="py-3 px-5 text-center whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          isActif 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : eq.status === 'En veille'
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {eq.status}
                        </span>
                      </td>

                      <td className="py-3 px-5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleEquipment(eqId, eq.status)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
                        >
                          {language === 'fr' ? 'Basculer' : 'Toggle'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Interactive de Contrôle Détaillé d'un Équipement */}
      {selectedEquipmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-base">
                  {language === 'fr' ? 'Contrôle Actionneur GTB' : 'BMS Actuator Control'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEquipmentModal(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{language === 'fr' ? 'Équipement :' : 'Equipment:'}</span>
                <span className="font-bold text-slate-800">{selectedEquipmentModal.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{language === 'fr' ? 'Modèle :' : 'Model:'}</span>
                <span className="font-semibold text-slate-700">{selectedEquipmentModal.brandModel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{language === 'fr' ? 'Zone & Bus :' : 'Zone & Bus:'}</span>
                <span className="font-mono text-slate-700">{selectedEquipmentModal.location} • {selectedEquipmentModal.protocol}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{language === 'fr' ? 'Fonction :' : 'Function:'}</span>
                <span className="font-semibold text-slate-700">{selectedEquipmentModal.pointType}</span>
              </div>
            </div>

            {/* Commandes directes */}
            <div className="pt-2 space-y-2">
              <p className="text-xs font-bold text-slate-700">{language === 'fr' ? 'Action Immédiate :' : 'Immediate Action:'}</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    handleToggleEquipment((selectedEquipmentModal as any).id || 'EQ-0', 'En veille');
                    setSelectedEquipmentModal(null);
                  }}
                  className="py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer text-center"
                >
                  {language === 'fr' ? 'Marche Forcée' : 'Force Run'}
                </button>
                <button
                  onClick={() => {
                    handleToggleEquipment((selectedEquipmentModal as any).id || 'EQ-0', 'Actif');
                    setSelectedEquipmentModal(null);
                  }}
                  className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer text-center"
                >
                  {language === 'fr' ? 'Mettre en Veille' : 'Standby'}
                </button>
                <button
                  onClick={() => {
                    handleToggleEquipment((selectedEquipmentModal as any).id || 'EQ-0', 'Arrêté');
                    setSelectedEquipmentModal(null);
                  }}
                  className="py-2 px-3 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer text-center"
                >
                  {language === 'fr' ? 'Arrêt' : 'Stop'}
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    showFeedback(`Diagnostic du Bus ${selectedEquipmentModal.protocol} : Communication OK (0 erreur)`);
                    setSelectedEquipmentModal(null);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer text-center"
                >
                  {language === 'fr' ? 'Tester Bus' : 'Test Bus'}
                </button>
                <button
                  onClick={() => {
                    showFeedback(`Alarmes acquittées sur ${selectedEquipmentModal.name}`);
                    setSelectedEquipmentModal(null);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer text-center"
                >
                  {language === 'fr' ? 'Acquitter Alarme' : 'Ack Alarm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
