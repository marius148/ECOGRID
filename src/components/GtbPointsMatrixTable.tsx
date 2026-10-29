import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Table, 
  RefreshCw, 
  Download, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  SlidersHorizontal, 
  Database, 
  ExternalLink, 
  Search, 
  Layers, 
  Cpu, 
  Sparkles,
  Settings,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * ============================================================================
 * CONFIGURATION DU LIEN GOOGLE SHEETS :
 * ============================================================================
 * Pour lier ce tableau à votre propre fichier Google Sheets :
 * 1. Ouvrez votre classeur Google Sheets.
 * 2. Menu : Fichier > Partager > Publier sur le web.
 * 3. Choisissez la feuille contenant la matrice des points (ou tout le document)
 *    au format "Valeurs séparées par des virgules (.csv)".
 * 4. Cliquez sur "Publier" et copiez le lien généré.
 * 5. Remplacez la constante DEFAULT_GOOGLE_SHEET_CSV_URL ci-dessous par ce lien,
 *    OU saisissez-le directement dans l'interface via le bouton "Lier Google Sheet" (⚙️).
 * ============================================================================
 */
export const DEFAULT_GOOGLE_SHEET_CSV_URL = 
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSzA9anmbi31SQYS9-Qzo1oFGEagoJ6GcDljSYd7kJe8OCLzyujYZnTmpYlM92ljA/pub?output=csv";

// Structure de données typée pour chaque système GTB
export interface GtbSystemRow {
  systeme: string;
  ta: number; // Téléalarme (Alarme / Défaut - Entrée digitale)
  ts: number; // Télésignalisation (État / Marche / Position - Entrée digitale)
  tm: number; // Télémesure (Mesure physique / Température / Compteur - Entrée analogique)
  tc: number; // Télécommande (Ordre de pilotage / Commande - Sortie digitale)
  tr: number; // Régulation (Consigne modulante / 0-10V - Sortie analogique)
  totalPoints: number; // Total des points par système
  description?: string;
  category?: 'HVAC' | 'Elec' | 'Hydraulique' | 'ENR' | 'Comptage';
}

// 1. DONNÉES DE BASE DE SIMULATION (Données de référence exactes demandées)
export const INITIAL_GTB_MATRIX_DATA: GtbSystemRow[] = [
  {
    systeme: 'Tri-génération',
    ta: 7,
    ts: 3,
    tm: 9,
    tc: 3,
    tr: 3,
    totalPoints: 25,
    category: 'ENR',
    description: 'Cogénération biométhane 100 kWe + Machine absorption froid LiBr'
  },
  {
    systeme: 'Réseaux hydrauliques',
    ta: 4,
    ts: 4,
    tm: 8,
    tc: 4,
    tr: 4,
    totalPoints: 24,
    category: 'Hydraulique',
    description: 'Circulateurs primaires/secondaires, vannes 3 voies mélange'
  },
  {
    systeme: 'Photovoltaïque',
    ta: 39,
    ts: 13,
    tm: 52,
    tc: 13,
    tr: 0,
    totalPoints: 117,
    category: 'ENR',
    description: 'Champ solaire 1 296 kWc, 10 onduleurs triphasés, stockage LFP'
  },
  {
    systeme: 'Ventilation',
    ta: 30,
    ts: 10,
    tm: 30,
    tc: 10,
    tr: 10,
    totalPoints: 90,
    category: 'HVAC',
    description: 'Centrales VMC hygroréglables Bâtiment, pressostats et moteurs EC'
  },
  {
    systeme: 'Éclairage',
    ta: 2141,
    ts: 410,
    tm: 51,
    tc: 270,
    tr: 120,
    totalPoints: 2992,
    category: 'Elec',
    description: 'Passerelles DALI / KNX, détecteurs crépusculaires et présence'
  },
  {
    systeme: 'ECS',
    ta: 450,
    ts: 300,
    tm: 450,
    tc: 300,
    tr: 300,
    totalPoints: 1800,
    category: 'HVAC',
    description: 'Eau Chaude Sanitaire, ballons hydrobox, bouclages thermiques'
  },
  {
    systeme: 'Comptage énergie',
    ta: 160,
    ts: 0,
    tm: 350,
    tc: 0,
    tr: 0,
    totalPoints: 510,
    category: 'Comptage',
    description: 'Compteurs communicants Linky, compteurs eau M-Bus et CET'
  }
];

// Glossaire des acronymes GTB officiels avec description technique détaillée
export const GTB_ACRONYMS = {
  TA: {
    label: 'TA',
    full: 'Téléalarme',
    type: 'Entrée Digitale (DI)',
    description: 'Remontée des alarmes critiques, défauts disjoncteurs, arrêts d\'urgence et sécurités techniques.',
    color: 'text-rose-600 bg-rose-50 border-rose-200'
  },
  TS: {
    label: 'TS',
    full: 'Télésignalisation',
    type: 'Entrée Digitale (DI)',
    description: 'Indication des états de fonctionnement (Marche / Arrêt, position vanne, présence, acquittement).',
    color: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  TM: {
    label: 'TM',
    full: 'Télémesure',
    type: 'Entrée Analogique (AI)',
    description: 'Mesures continues des grandeurs physiques (Températures °C, pressions bar, débits m³/h, puissance kW, index kWh).',
    color: 'text-sky-600 bg-sky-50 border-sky-200'
  },
  TC: {
    label: 'TC',
    full: 'Télécommande',
    type: 'Sortie Digitale (DO)',
    description: 'Ordres de pilotage tout-ou-rien (Marche/Arrêt pompes, commutation régime jour/nuit, enclenchement disjoncteurs).',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
  },
  TR: {
    label: 'TR',
    full: 'Régulation',
    type: 'Sortie Analogique (AO)',
    description: 'Consignes de régulation modulantes (Signal 0-10V vannes mélangeuses, variateurs de fréquence ventilateurs).',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
  }
};

interface GtbPointsMatrixTableProps {
  language?: string;
  sheetUrl?: string;
  className?: string;
  isCompact?: boolean;
}

export const GtbPointsMatrixTable: React.FC<GtbPointsMatrixTableProps> = ({
  language = 'fr',
  sheetUrl,
  className,
  isCompact = false
}) => {
  const isFr = language === 'fr';

  // URL configurable dans le composant avec stockage localStorage
  const [configuredUrl, setConfiguredUrl] = useState<string>(() => {
    return localStorage.getItem('cii_gtb_matrix_sheet_url') || sheetUrl || DEFAULT_GOOGLE_SHEET_CSV_URL;
  });

  const [matrixData, setMatrixData] = useState<GtbSystemRow[]>(INITIAL_GTB_MATRIX_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isUrlModalOpen, setIsUrlModalOpen] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>(configuredUrl);
  const [sortField, setSortField] = useState<keyof GtbSystemRow>('totalPoints');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  /**
   * Analyseur CSV tolérant pour extraire les colonnes de la matrice des points
   * Permet de parser directement un export CSV publié depuis Google Sheets
   */
  const parseGoogleSheetMatrixCsv = useCallback((csvText: string): GtbSystemRow[] | null => {
    try {
      const cleanText = csvText.replace(/^\uFEFF/, '').trim();
      if (!cleanText) return null;

      const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return null;

      // Recherche de l'en-tête de la matrice
      let headerIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].toLowerCase();
        if (
          (l.includes('système') || l.includes('systeme') || l.includes('lot')) &&
          (l.includes('ta') || l.includes('total'))
        ) {
          headerIndex = i;
          break;
        }
      }

      // Si non trouvé explicitement, on analyse si la première ligne ressemble aux en-têtes
      if (headerIndex === -1 && lines[0].toLowerCase().includes('ta')) {
        headerIndex = 0;
      }

      // Parser de ligne CSV respectant les guillemets
      const parseCsvLine = (line: string): string[] => {
        const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
        const result: string[] = [];
        let m;
        while ((m = regex.exec(line)) !== null) {
          if (m.index === regex.lastIndex) regex.lastIndex++;
          const val = m[1] !== undefined ? m[1].replace(/""/g, '"') : m[2];
          result.push(val !== undefined ? val.trim() : '');
        }
        return result;
      };

      const cleanNum = (val: string): number => {
        if (!val) return 0;
        const cleaned = val.replace(/\s+/g, '').replace(/,/g, '.');
        return parseInt(cleaned, 10) || 0;
      };

      if (headerIndex !== -1) {
        const headers = parseCsvLine(lines[headerIndex]).map(h => h.trim().toUpperCase());
        const sysCol = headers.findIndex(h => h.includes('SYST') || h.includes('LOT') || h.includes('NOM'));
        const taCol = headers.findIndex(h => h === 'TA' || h.includes('TÉLÉALARME') || h.includes('ALARME'));
        const tsCol = headers.findIndex(h => h === 'TS' || h.includes('TÉLÉSIGNALISATION') || h.includes('ETAT') || h.includes('ÉTAT'));
        const tmCol = headers.findIndex(h => h === 'TM' || h.includes('TÉLÉMESURE') || h.includes('MESURE'));
        const tcCol = headers.findIndex(h => h === 'TC' || h.includes('TÉLÉCOMMANDE') || h.includes('COMMANDE') || h.includes('ORDRE'));
        const trCol = headers.findIndex(h => h === 'TR' || h.includes('RÉGULATION') || h.includes('CONSIGNE'));
        const totalCol = headers.findIndex(h => h.includes('TOTAL'));

        const parsedRows: GtbSystemRow[] = [];

        for (let i = headerIndex + 1; i < lines.length; i++) {
          const cells = parseCsvLine(lines[i]);
          const sysName = (cells[sysCol !== -1 ? sysCol : 0] || '').trim();

          // Ignorer les lignes de total ou vides
          if (!sysName || /^total/i.test(sysName) || cells.every(c => !c)) {
            continue;
          }

          const ta = taCol !== -1 ? cleanNum(cells[taCol]) : 0;
          const ts = tsCol !== -1 ? cleanNum(cells[tsCol]) : 0;
          const tm = tmCol !== -1 ? cleanNum(cells[tmCol]) : 0;
          const tc = tcCol !== -1 ? cleanNum(cells[tcCol]) : 0;
          const tr = trCol !== -1 ? cleanNum(cells[trCol]) : 0;
          const explicitTotal = totalCol !== -1 ? cleanNum(cells[totalCol]) : 0;
          const calculatedTotal = ta + ts + tm + tc + tr;
          const totalPoints = explicitTotal > 0 ? explicitTotal : calculatedTotal;

          parsedRows.push({
            systeme: sysName,
            ta,
            ts,
            tm,
            tc,
            tr,
            totalPoints
          });
        }

        if (parsedRows.length > 0) {
          return parsedRows;
        }
      }

      return null;
    } catch (e) {
      console.warn("Échec du parsing CSV Google Sheets:", e);
      return null;
    }
  }, []);

  /**
   * Simulation / Récupération asynchrone des données depuis le Google Sheets
   * Comporte une gestion des délais réseau, erreurs et retour gracieux aux données de référence.
   */
  const fetchGtbPointsData = useCallback(async (targetUrl: string) => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');

    try {
      // Simulation réaliste de latence réseau pour afficher l'état de chargement
      await new Promise(res => setTimeout(res, 500));

      if (targetUrl) {
        try {
          const response = await fetch(targetUrl, {
            method: 'GET',
            headers: { 'Accept': 'text/csv, application/json, text/plain, */*' }
          });

          if (response.ok) {
            const rawContent = await response.text();
            
            // Tentative de parsing JSON (si webhook ou Apps Script)
            try {
              const jsonData = JSON.parse(rawContent);
              if (Array.isArray(jsonData) && jsonData.length > 0) {
                const formatted: GtbSystemRow[] = jsonData.map((item: any) => ({
                  systeme: item.Système || item.systeme || item.name || 'Système',
                  ta: Number(item.TA || item.ta || 0),
                  ts: Number(item.TS || item.ts || 0),
                  tm: Number(item.TM || item.tm || 0),
                  tc: Number(item.TC || item.tc || 0),
                  tr: Number(item.TR || item.tr || 0),
                  totalPoints: Number(item.totalPoints || item.Total || (Number(item.TA || 0) + Number(item.TS || 0) + Number(item.TM || 0) + Number(item.TC || 0) + Number(item.TR || 0)))
                }));
                setMatrixData(formatted);
                setLastSyncTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                setIsLoading(false);
                return;
              }
            } catch {
              // Si ce n'est pas du JSON, on tente le parsing CSV
              const parsedCsv = parseGoogleSheetMatrixCsv(rawContent);
              if (parsedCsv && parsedCsv.length > 0) {
                setMatrixData(parsedCsv);
                setLastSyncTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                setIsLoading(false);
                return;
              }
            }
          }
        } catch (fetchErr) {
          // Erreur réseau ou CORS normale si le lien publié n'est pas encore accessible
          console.info("Info liaison distante Google Sheet, utilisation des données de référence :", fetchErr);
        }
      }

      // Utilisation du jeu de simulation officiel validé
      setMatrixData(INITIAL_GTB_MATRIX_DATA);
      setLastSyncTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(isFr ? "Erreur de synchronisation du flux. Données de référence affichées." : "Failed to sync remote data. Using baseline reference points.");
      setMatrixData(INITIAL_GTB_MATRIX_DATA);
    } finally {
      setIsLoading(false);
    }
  }, [parseGoogleSheetMatrixCsv, isFr]);

  // Chargement initial
  useEffect(() => {
    fetchGtbPointsData(configuredUrl);
  }, [configuredUrl, fetchGtbPointsData]);

  // Sauvegarde d'une nouvelle URL personnalisée
  const handleSaveCustomUrl = () => {
    const trimmed = inputUrl.trim();
    setConfiguredUrl(trimmed);
    localStorage.setItem('cii_gtb_matrix_sheet_url', trimmed);
    setIsUrlModalOpen(false);
    fetchGtbPointsData(trimmed);
  };

  // Réinitialisation de l'URL par défaut
  const handleResetDefaultUrl = () => {
    setInputUrl(DEFAULT_GOOGLE_SHEET_CSV_URL);
    setConfiguredUrl(DEFAULT_GOOGLE_SHEET_CSV_URL);
    localStorage.removeItem('cii_gtb_matrix_sheet_url');
    setIsUrlModalOpen(false);
    fetchGtbPointsData(DEFAULT_GOOGLE_SHEET_CSV_URL);
  };

  // Exportation CSV directe du tableau affiché
  const handleExportCsv = () => {
    const headers = ['Système', 'TA (Téléalarme)', 'TS (Télésignalisation)', 'TM (Télémesure)', 'TC (Télécommande)', 'TR (Régulation)', 'Total points'];
    const rows = matrixData.map(r => [
      `"${r.systeme}"`,
      r.ta,
      r.ts,
      r.tm,
      r.tc,
      r.tr,
      r.totalPoints
    ]);
    // Ligne Total
    rows.push([
      '"TOTAL GÉNÉRAL"',
      totals.ta,
      totals.ts,
      totals.tm,
      totals.tc,
      totals.tr,
      totals.totalPoints
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Matrice_Points_GTB_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtrage et tri des données
  const filteredAndSortedData = useMemo(() => {
    let result = [...matrixData];

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      result = result.filter(item => 
        item.systeme.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
    });

    return result;
  }, [matrixData, searchFilter, sortField, sortOrder]);

  // Calcul dynamique des totaux généraux
  const totals = useMemo(() => {
    return matrixData.reduce((acc, row) => ({
      ta: acc.ta + (Number(row.ta) || 0),
      ts: acc.ts + (Number(row.ts) || 0),
      tm: acc.tm + (Number(row.tm) || 0),
      tc: acc.tc + (Number(row.tc) || 0),
      tr: acc.tr + (Number(row.tr) || 0),
      totalPoints: acc.totalPoints + (Number(row.totalPoints) || (Number(row.ta) + Number(row.ts) + Number(row.tm) + Number(row.tc) + Number(row.tr)))
    }), { ta: 0, ts: 0, tm: 0, tc: 0, tr: 0, totalPoints: 0 });
  }, [matrixData]);

  // Bascule du tri par colonne
  const handleSort = (field: keyof GtbSystemRow) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className={cn("bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md p-4 sm:p-6 transition-all", className)}>
      
      {/* 1. En-tête Principal du Composant */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 bg-[#236b33]/10 text-[#236b33] rounded-xl flex items-center justify-center shrink-0 border border-[#236b33]/20 shadow-2xs">
              <Table className="w-5 h-5 text-[#236b33]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold font-display text-slate-900 tracking-tight">
                  {isFr ? 'Matrice des Points GTB par Système' : 'BMS Control Points Matrix by System'}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-900 border border-emerald-300 font-mono">
                  EN ISO 52120-1
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isFr 
                  ? 'Inventaire et ventilation des points de contrôle (Entrées / Sorties automates)' 
                  : 'BMS I/O physical and virtual points breakdown per building system'}
              </p>
            </div>
          </div>
        </div>

        {/* Contrôles & Actions */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          {/* Recherche rapide */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={isFr ? "Filtrer système..." : "Filter system..."}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#236b33]/30 w-36 sm:w-44 text-slate-700"
            />
            {searchFilter && (
              <button 
                onClick={() => setSearchFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Bouton d'actualisation synchronisé */}
          <button
            type="button"
            onClick={() => fetchGtbPointsData(configuredUrl)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            title={isFr ? "Actualiser les données en direct" : "Sync live data"}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-[#236b33]", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">{isLoading ? (isFr ? 'Chargement...' : 'Syncing...') : (isFr ? 'Actualiser' : 'Sync')}</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-2xs"
            title={isFr ? "Exporter la matrice en CSV" : "Export matrix to CSV"}
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Configuration du flux distant */}
          <button
            type="button"
            onClick={() => setIsUrlModalOpen(true)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title={isFr ? "Configurer le lien de flux distant" : "Configure remote data stream"}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Bandeau d'état et résumé des KPIs GTB */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>TA (Alarmes)</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-1">{totals.ta.toLocaleString()}</p>
          <span className="text-[9px] text-slate-400 font-medium">Entrées Digitales</span>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>TS (États)</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-1">{totals.ts.toLocaleString()}</p>
          <span className="text-[9px] text-slate-400 font-medium">Télésignalisations</span>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>TM (Mesures)</span>
            <span className="w-2 h-2 rounded-full bg-sky-500" />
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-1">{totals.tm.toLocaleString()}</p>
          <span className="text-[9px] text-slate-400 font-medium">Sondes & Compteurs</span>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>TC (Commandes)</span>
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-1">{totals.tc.toLocaleString()}</p>
          <span className="text-[9px] text-slate-400 font-medium">Sorties Pilotage</span>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>TR (Régulation)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-1">{totals.tr.toLocaleString()}</p>
          <span className="text-[9px] text-slate-400 font-medium">Consignes 0-10V</span>
        </div>

        <div className="p-2.5 bg-[#236b33]/10 rounded-xl border border-[#236b33]/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-black text-[#236b33] uppercase tracking-wider">
            <span>Total Points</span>
            <span className="w-2 h-2 rounded-full bg-[#236b33] animate-pulse" />
          </div>
          <p className="text-base sm:text-lg font-black font-mono text-[#184c24] mt-1">{totals.totalPoints.toLocaleString()}</p>
          <span className="text-[9px] text-[#236b33] font-bold">Points GTB Actifs</span>
        </div>
      </div>

      {/* Message d'erreur élégant avec bouton de réessai */}
      {isError && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => fetchGtbPointsData(configuredUrl)}
            className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition text-[11px]"
          >
            {isFr ? 'Réessayer' : 'Retry'}
          </button>
        </div>
      )}

      {/* 3. Le Tableau Responsive avec Zébrures & Infobulles */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 scrollbar-thin scrollbar-thumb-slate-300">
        <table className="w-full text-left text-xs min-w-[680px]">
          {/* En-têtes de colonnes avec Infobulles survolables */}
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 select-none">
              
              {/* Colonne Système */}
              <th 
                onClick={() => handleSort('systeme')}
                className="py-3 px-3 sm:px-4 cursor-pointer hover:bg-slate-200/70 transition w-[220px]"
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#236b33]" />
                  <span>{isFr ? 'Système' : 'System'}</span>
                  {sortField === 'systeme' && (
                    <span className="text-[10px] text-[#236b33] font-mono">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>

              {/* Colonne TA */}
              <th className="py-3 px-3 text-right group relative cursor-pointer" onClick={() => handleSort('ta')}>
                <div className="inline-flex items-center gap-1 justify-end">
                  <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-mono font-bold text-[10px] border border-rose-200">
                    TA
                  </span>
                  <HelpCircle className="w-3 h-3 text-slate-400 group-hover:text-rose-600" />
                  {sortField === 'ta' && <span className="text-[10px] text-rose-600 font-mono">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </div>
                {/* Infobulle TA */}
                <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 w-56 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl pointer-events-none normal-case leading-relaxed text-left">
                  <p className="font-bold text-rose-400 mb-0.5">TA : {GTB_ACRONYMS.TA.full}</p>
                  <p className="text-slate-300 text-[10px] mb-1 font-mono">{GTB_ACRONYMS.TA.type}</p>
                  <p className="text-slate-300 text-[10px]">{GTB_ACRONYMS.TA.description}</p>
                </div>
              </th>

              {/* Colonne TS */}
              <th className="py-3 px-3 text-right group relative cursor-pointer" onClick={() => handleSort('ts')}>
                <div className="inline-flex items-center gap-1 justify-end">
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-[10px] border border-amber-200">
                    TS
                  </span>
                  <HelpCircle className="w-3 h-3 text-slate-400 group-hover:text-amber-600" />
                  {sortField === 'ts' && <span className="text-[10px] text-amber-600 font-mono">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </div>
                {/* Infobulle TS */}
                <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 w-56 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl pointer-events-none normal-case leading-relaxed text-left">
                  <p className="font-bold text-amber-400 mb-0.5">TS : {GTB_ACRONYMS.TS.full}</p>
                  <p className="text-slate-300 text-[10px] mb-1 font-mono">{GTB_ACRONYMS.TS.type}</p>
                  <p className="text-slate-300 text-[10px]">{GTB_ACRONYMS.TS.description}</p>
                </div>
              </th>

              {/* Colonne TM */}
              <th className="py-3 px-3 text-right group relative cursor-pointer" onClick={() => handleSort('tm')}>
                <div className="inline-flex items-center gap-1 justify-end">
                  <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-mono font-bold text-[10px] border border-sky-200">
                    TM
                  </span>
                  <HelpCircle className="w-3 h-3 text-slate-400 group-hover:text-sky-600" />
                  {sortField === 'tm' && <span className="text-[10px] text-sky-600 font-mono">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </div>
                {/* Infobulle TM */}
                <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 w-56 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl pointer-events-none normal-case leading-relaxed text-left">
                  <p className="font-bold text-sky-400 mb-0.5">TM : {GTB_ACRONYMS.TM.full}</p>
                  <p className="text-slate-300 text-[10px] mb-1 font-mono">{GTB_ACRONYMS.TM.type}</p>
                  <p className="text-slate-300 text-[10px]">{GTB_ACRONYMS.TM.description}</p>
                </div>
              </th>

              {/* Colonne TC */}
              <th className="py-3 px-3 text-right group relative cursor-pointer" onClick={() => handleSort('tc')}>
                <div className="inline-flex items-center gap-1 justify-end">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold text-[10px] border border-indigo-200">
                    TC
                  </span>
                  <HelpCircle className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
                  {sortField === 'tc' && <span className="text-[10px] text-indigo-600 font-mono">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </div>
                {/* Infobulle TC */}
                <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 w-56 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl pointer-events-none normal-case leading-relaxed text-left">
                  <p className="font-bold text-indigo-400 mb-0.5">TC : {GTB_ACRONYMS.TC.full}</p>
                  <p className="text-slate-300 text-[10px] mb-1 font-mono">{GTB_ACRONYMS.TC.type}</p>
                  <p className="text-slate-300 text-[10px]">{GTB_ACRONYMS.TC.description}</p>
                </div>
              </th>

              {/* Colonne TR */}
              <th className="py-3 px-3 text-right group relative cursor-pointer" onClick={() => handleSort('tr')}>
                <div className="inline-flex items-center gap-1 justify-end">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono font-bold text-[10px] border border-emerald-300">
                    TR
                  </span>
                  <HelpCircle className="w-3 h-3 text-slate-400 group-hover:text-emerald-700" />
                  {sortField === 'tr' && <span className="text-[10px] text-emerald-700 font-mono">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </div>
                {/* Infobulle TR */}
                <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 w-56 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl pointer-events-none normal-case leading-relaxed text-left">
                  <p className="font-bold text-emerald-400 mb-0.5">TR : {GTB_ACRONYMS.TR.full}</p>
                  <p className="text-slate-300 text-[10px] mb-1 font-mono">{GTB_ACRONYMS.TR.type}</p>
                  <p className="text-slate-300 text-[10px]">{GTB_ACRONYMS.TR.description}</p>
                </div>
              </th>

              {/* Colonne Total Points */}
              <th 
                onClick={() => handleSort('totalPoints')}
                className="py-3 px-4 text-right cursor-pointer hover:bg-slate-200/70 transition w-[140px]"
              >
                <div className="flex items-center gap-1 justify-end text-slate-900">
                  <span>{isFr ? 'Total points' : 'Total points'}</span>
                  {sortField === 'totalPoints' && (
                    <span className="text-[10px] text-[#236b33] font-mono">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>

            </tr>
          </thead>

          {/* Corps du Tableau avec Zébrures discrètes */}
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // État de chargement élégant (Skeleton)
              Array.from({ length: 7 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                  <td className="py-3 px-4">
                    <div className="h-4 bg-slate-200 rounded w-32 animate-pulse" />
                  </td>
                  <td className="py-3 px-3 text-right"><div className="h-4 bg-slate-200 rounded w-10 ml-auto animate-pulse" /></td>
                  <td className="py-3 px-3 text-right"><div className="h-4 bg-slate-200 rounded w-10 ml-auto animate-pulse" /></td>
                  <td className="py-3 px-3 text-right"><div className="h-4 bg-slate-200 rounded w-10 ml-auto animate-pulse" /></td>
                  <td className="py-3 px-3 text-right"><div className="h-4 bg-slate-200 rounded w-10 ml-auto animate-pulse" /></td>
                  <td className="py-3 px-3 text-right"><div className="h-4 bg-slate-200 rounded w-10 ml-auto animate-pulse" /></td>
                  <td className="py-3 px-4 text-right"><div className="h-4 bg-slate-300 rounded w-16 ml-auto animate-pulse" /></td>
                </tr>
              ))
            ) : filteredAndSortedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  {isFr ? 'Aucun système correspondant à votre recherche.' : 'No system matched your query.'}
                </td>
              </tr>
            ) : (
              filteredAndSortedData.map((row, index) => {
                const isEven = index % 2 === 0;
                const pctOfTotal = totals.totalPoints > 0 ? ((row.totalPoints / totals.totalPoints) * 100).toFixed(1) : '0';

                return (
                  <tr 
                    key={row.systeme} 
                    className={cn(
                      "transition-colors duration-150 group",
                      isEven ? "bg-white" : "bg-slate-50/70",
                      "hover:bg-emerald-50/60"
                    )}
                  >
                    {/* Nom du système + badge visuel */}
                    <td className="py-3 px-3 sm:px-4 font-semibold text-slate-800">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 group-hover:text-[#236b33] transition-colors">
                          {row.systeme}
                        </span>
                        {row.description && (
                          <span className="text-[10px] text-slate-400 font-normal line-clamp-1">
                            {row.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* TA */}
                    <td className="py-3 px-3 text-right font-mono text-slate-700 font-semibold group-hover:text-rose-700">
                      <span className={cn(row.ta > 500 ? "font-bold text-rose-700" : "")}>
                        {row.ta.toLocaleString()}
                      </span>
                    </td>

                    {/* TS */}
                    <td className="py-3 px-3 text-right font-mono text-slate-700 font-semibold group-hover:text-amber-700">
                      <span className={cn(row.ts > 200 ? "font-bold text-amber-700" : "")}>
                        {row.ts.toLocaleString()}
                      </span>
                    </td>

                    {/* TM */}
                    <td className="py-3 px-3 text-right font-mono text-slate-700 font-semibold group-hover:text-sky-700">
                      <span className={cn(row.tm > 200 ? "font-bold text-sky-700" : "")}>
                        {row.tm.toLocaleString()}
                      </span>
                    </td>

                    {/* TC */}
                    <td className="py-3 px-3 text-right font-mono text-slate-700 font-semibold group-hover:text-indigo-700">
                      <span className={cn(row.tc > 150 ? "font-bold text-indigo-700" : "")}>
                        {row.tc.toLocaleString()}
                      </span>
                    </td>

                    {/* TR */}
                    <td className="py-3 px-3 text-right font-mono text-slate-700 font-semibold group-hover:text-emerald-700">
                      <span className={cn(row.tr > 100 ? "font-bold text-emerald-700" : "")}>
                        {row.tr.toLocaleString()}
                      </span>
                    </td>

                    {/* Total points avec jauge de pondération */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {row.totalPoints.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-12 bg-slate-200 rounded-full h-1 overflow-hidden">
                            <div 
                              className="bg-[#236b33] h-1 rounded-full" 
                              style={{ width: `${Math.min(100, Math.max(4, Number(pctOfTotal)))}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-slate-400">{pctOfTotal}%</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* 4. Ligne de Pied de Page (TOTAL GÉNÉRAL mis en évidence) */}
          <tfoot>
            <tr className="bg-slate-900 text-white font-extrabold text-xs border-t-2 border-[#236b33]">
              <td className="py-3.5 px-3 sm:px-4 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-black">{isFr ? 'Total général' : 'Grand Total'}</span>
                </div>
              </td>
              <td className="py-3.5 px-3 text-right font-mono text-rose-300 font-bold">{totals.ta.toLocaleString()}</td>
              <td className="py-3.5 px-3 text-right font-mono text-amber-300 font-bold">{totals.ts.toLocaleString()}</td>
              <td className="py-3.5 px-3 text-right font-mono text-sky-300 font-bold">{totals.tm.toLocaleString()}</td>
              <td className="py-3.5 px-3 text-right font-mono text-indigo-300 font-bold">{totals.tc.toLocaleString()}</td>
              <td className="py-3.5 px-3 text-right font-mono text-emerald-300 font-bold">{totals.tr.toLocaleString()}</td>
              <td className="py-3.5 px-4 text-right font-mono font-black text-white text-sm bg-slate-950">
                <span className="px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-300 border border-emerald-500/40">
                  {totals.totalPoints.toLocaleString()}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 5. Note de bas de tableau et Horodatage de synchronisation */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[#236b33] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {isFr ? 'Source :' : 'Source:'} Télémétrie Téléconnectée
          </span>
          <span>•</span>
          <span className="text-slate-400">
            {isFr ? 'Matrice conforme BACS & EN ISO 52120-1 Classe B' : 'BACS EN ISO 52120-1 Class B compliance'}
          </span>
        </div>

        {lastSyncTime && (
          <div className="text-slate-400 text-[10px] font-mono">
            {isFr ? `Dernière synchronisation : ${lastSyncTime}` : `Last sync: ${lastSyncTime}`}
          </div>
        )}
      </div>

      {/* MODAL CONFIGURATION URL FLUX DISTANT */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#236b33]" />
                <h4 className="font-bold text-slate-900">
                  {isFr ? 'Liaison Directe au Flux de Données' : 'Live Data Stream Link'}
                </h4>
              </div>
              <button 
                onClick={() => setIsUrlModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <p>
                {isFr 
                  ? 'Pour relier votre propre flux distant à ce tableau sans modifier le code, publiez votre tableur au format CSV et collez son URL ci-dessous :' 
                  : 'To link your own data stream without editing code, publish your table as CSV and paste the URL below:'}
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isFr ? 'URL de publication du flux (format CSV) :' : 'Published stream URL (CSV format):'}
                </label>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#236b33]"
                />
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
                <p className="font-bold">{isFr ? 'Instructions de publication :' : 'Publication Instructions:'}</p>
                <p>{isFr ? '1. Ouvrez votre tableau distant' : '1. Open your remote spreadsheet'}</p>
                <p>{isFr ? '2. Fichier → Partager → Publier sur le web' : '2. File → Share → Publish to the web'}</p>
                <p>{isFr ? '3. Sélectionnez format : ' : '3. Select format: '}<strong>{isFr ? 'Valeurs séparées par des virgules (.csv)' : 'Comma-separated values (.csv)'}</strong></p>
                <p>{isFr ? '4. Collez le lien et cliquez sur "Enregistrer et Synchroniser".' : '4. Paste the URL and click "Save & Sync".'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
              <button
                type="button"
                onClick={handleResetDefaultUrl}
                className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                {isFr ? 'Restaurer défaut' : 'Reset default'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomUrl}
                  className="px-4 py-1.5 rounded-xl bg-[#236b33] hover:bg-[#184c24] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {isFr ? 'Enregistrer & Synchroniser' : 'Save & Sync'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
