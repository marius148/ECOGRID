import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Building2, 
  LayoutDashboard, 
  Activity, 
  FileText, 
  SlidersHorizontal, 
  Calendar, 
  Settings, 
  ArrowRight, 
  Zap, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  X,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Thermometer,
  Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export interface CommandPaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'views' | 'buildings' | 'actions' | 'tools';
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  onSelect: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'fr' | 'en';
  buildings: Array<{
    id: string | number;
    name: string;
    location?: string;
    status?: string;
    consumption?: string | number;
  }>;
  onNavigateView: (view: any) => void;
  onSelectBuilding: (buildingId: string) => void;
  onForceSync?: () => void;
  onTriggerExportPdf?: () => void;
  onTriggerExportCsv?: () => void;
  onOpenAnomalyScanner?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  language = 'fr',
  buildings = [],
  onNavigateView,
  onSelectBuilding,
  onForceSync,
  onTriggerExportPdf,
  onTriggerExportCsv,
  onOpenAnomalyScanner
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build searchable items
  const items: CommandPaletteItem[] = useMemo(() => {
    const list: CommandPaletteItem[] = [];

    // 1. Navigation Views
    list.push({
      id: 'view-dashboard',
      title: language === 'fr' ? 'Tableau de bord' : 'Dashboard',
      subtitle: language === 'fr' ? 'Vue d\'ensemble, KPI énergétiques et cartographie' : 'Overview, energy KPIs and mapping',
      category: 'views',
      icon: LayoutDashboard,
      badge: 'Vue',
      onSelect: () => {
        onNavigateView('dashboard');
        onClose();
      }
    });

    list.push({
      id: 'view-buildings',
      title: language === 'fr' ? 'Parc Immobilier' : 'Real Estate Portfolio',
      subtitle: language === 'fr' ? 'Inventaire technique des 10 bâtiments, puissances et bilans' : 'Technical inventory, thermal powers and audits',
      category: 'views',
      icon: Building2,
      badge: 'Vue',
      onSelect: () => {
        onNavigateView('buildings');
        onClose();
      }
    });

    list.push({
      id: 'view-analytics',
      title: language === 'fr' ? 'Analyses & Décret Tertiaire' : 'Analytics & Trajectory',
      subtitle: language === 'fr' ? 'Courbes de charge, décomposition CVC et conformité BACS' : 'Load profiles, HVAC breakdown and BACS compliance',
      category: 'views',
      icon: Activity,
      badge: 'Vue',
      onSelect: () => {
        onNavigateView('analytics');
        onClose();
      }
    });

    list.push({
      id: 'view-gtb',
      title: language === 'fr' ? 'Contrôles GTB (GTC / BMS)' : 'BMS Executive Controls',
      subtitle: language === 'fr' ? 'Points de régulation, automates, sondes et actionneurs' : 'Field points, PLCs, sensors and actuators',
      category: 'views',
      icon: SlidersHorizontal,
      badge: 'GTB',
      onSelect: () => {
        onNavigateView('gtb');
        onClose();
      }
    });

    list.push({
      id: 'view-planning',
      title: language === 'fr' ? 'Planning des Interventions' : 'Intervention Schedule',
      subtitle: language === 'fr' ? 'Synchronisation télémétrique, calendrier des techniciens' : 'Live telemetry sync, technician calendar',
      category: 'views',
      icon: Calendar,
      badge: 'Planning',
      onSelect: () => {
        onNavigateView('planning');
        onClose();
      }
    });

    list.push({
      id: 'view-reports',
      title: language === 'fr' ? 'Centre de Rapports' : 'Reports Center',
      subtitle: language === 'fr' ? 'Génération et téléchargement des bilans PDF & CSV' : 'Generate and download PDF & CSV audit files',
      category: 'views',
      icon: FileText,
      badge: 'Exports',
      onSelect: () => {
        onNavigateView('reports');
        onClose();
      }
    });

    list.push({
      id: 'view-settings',
      title: language === 'fr' ? 'Paramètres du Système' : 'System Settings',
      subtitle: language === 'fr' ? 'Seuils d\'alerte, profil et intégrations du parc' : 'Alert thresholds, profile and integrations',
      category: 'views',
      icon: Settings,
      badge: 'Config',
      onSelect: () => {
        onNavigateView('settings');
        onClose();
      }
    });

    // 2. Fast Actions
    if (onForceSync) {
      list.push({
        id: 'action-sync',
        title: language === 'fr' ? 'Synchroniser les données en direct' : 'Sync Live Data',
        subtitle: language === 'fr' ? 'Rafraîchir immédiatement les puissances et interventions' : 'Instantly fetch latest thermal powers and interventions',
        category: 'actions',
        icon: RefreshCw,
        badge: 'Action',
        onSelect: () => {
          onForceSync();
          onClose();
        }
      });
    }

    if (onTriggerExportPdf) {
      list.push({
        id: 'action-export-pdf',
        title: language === 'fr' ? 'Télécharger le rapport d\'audit PDF' : 'Download PDF Audit Report',
        subtitle: language === 'fr' ? 'Générer le PDF officiel CII ENERGIE' : 'Generate official CII ENERGIE PDF summary',
        category: 'actions',
        icon: Download,
        badge: 'PDF',
        onSelect: () => {
          onTriggerExportPdf();
          onClose();
        }
      });
    }

    if (onTriggerExportCsv) {
      list.push({
        id: 'action-export-csv',
        title: language === 'fr' ? 'Exporter les données brutes en CSV / Excel' : 'Export Raw Data to CSV / Excel',
        subtitle: language === 'fr' ? 'Télécharger la matrice de consommation complète' : 'Download complete multi-site energy matrix',
        category: 'actions',
        icon: FileSpreadsheet,
        badge: 'CSV',
        onSelect: () => {
          onTriggerExportCsv();
          onClose();
        }
      });
    }

    if (onOpenAnomalyScanner) {
      list.push({
        id: 'action-anomaly-scanner',
        title: language === 'fr' ? 'Lancer le diagnostic d\'anomalies GTB' : 'Run GTB Anomaly Diagnostic',
        subtitle: language === 'fr' ? 'Analyse algorithmique des dérives de température et surconsommations' : 'Algorithmic check of thermal drift and excessive loads',
        category: 'actions',
        icon: AlertTriangle,
        badge: 'Scan',
        onSelect: () => {
          onOpenAnomalyScanner();
          onClose();
        }
      });
    }

    // 3. Buildings
    buildings.forEach(b => {
      const isAl = b.status === 'ALERTE';
      list.push({
        id: `bld-${b.id}`,
        title: b.name,
        subtitle: `${b.location || 'Paris / IDF'} · ${b.consumption ? `${b.consumption} kWh/j` : 'Supervisé'}`,
        category: 'buildings',
        icon: Building2,
        badge: b.status || 'NORMAL',
        badgeColor: isAl ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200',
        onSelect: () => {
          onSelectBuilding(b.id.toString());
          onNavigateView('buildings');
          onClose();
        }
      });
    });

    return list;
  }, [
    language, 
    buildings, 
    onNavigateView, 
    onSelectBuilding, 
    onForceSync, 
    onTriggerExportPdf, 
    onTriggerExportCsv, 
    onOpenAnomalyScanner, 
    onClose
  ]);

  // Filtered items
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase().trim();
    return items.filter(it => 
      it.title.toLowerCase().includes(q) ||
      (it.subtitle && it.subtitle.toLowerCase().includes(q)) ||
      it.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].onSelect();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  // Reset selectedIndex on search
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Auto-scroll selected element into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-md">
        {/* Backdrop click */}
        <div className="fixed inset-0 -z-10" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[75vh]"
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <Search className="w-5 h-5 text-emerald-600 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={language === 'fr' ? 'Rechercher un bâtiment, une vue, un rapport, une action...' : 'Search building, view, report, action...'}
              className="flex-1 bg-transparent border-0 outline-none text-slate-800 text-sm placeholder:text-slate-400 font-medium"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-600">
                  {language === 'fr' ? 'Aucun résultat trouvé' : 'No results found'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'fr' ? `Aucun élément ne correspond à "${query}"` : `No item matching "${query}"`}
                </p>
              </div>
            ) : (
              filtered.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    data-index={idx}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-left",
                      isSelected 
                        ? "bg-emerald-50/80 text-emerald-950 border border-emerald-200/80 shadow-2xs" 
                        : "hover:bg-slate-50 text-slate-700 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 truncate">{item.title}</span>
                        {item.badge && (
                          <span className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                            item.badgeColor || "text-slate-500 bg-slate-100 border-slate-200"
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>

                    <ArrowRight className={cn(
                      "w-4 h-4 transition-transform shrink-0",
                      isSelected ? "text-emerald-600 translate-x-0.5" : "text-slate-300"
                    )} />
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Hints */}
          <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[9px] text-slate-500">↑↓</kbd>
                {language === 'fr' ? 'Naviguer' : 'Navigate'}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[9px] text-slate-500">↵</kbd>
                {language === 'fr' ? 'Valider' : 'Select'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>CII ENERGIE Command Center</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
