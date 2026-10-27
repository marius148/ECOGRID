import { InterventionCategory, InterventionStatus, InterventionEvent, Technician } from '../components/InterventionsPlanningView';

export const DEFAULT_GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSzA9anmbi31SQYS9-Qzo1oFGEagoJ6GcDljSYd7kJe8OCLzyujYZnTmpYlM92ljA/pub?gid=1888002345&single=true&output=csv";

export const LOCAL_STORAGE_CUSTOM_SHEET_URL = "cii_interventions_sheets_custom_url";
export const LOCAL_STORAGE_SHEETS_LAST_SYNC = "cii_interventions_sheets_last_sync";

// Helper CSV Line parser (handles quoted fields and commas inside quotes)
export function parseCsvLine(line: string): string[] {
  const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
  const elements: string[] = [];
  let matches;
  while ((matches = regex.exec(line)) !== null) {
    if (matches.index === regex.lastIndex) regex.lastIndex++;
    const val = matches[1] !== undefined ? matches[1].replace(/""/g, '"') : matches[2];
    elements.push(val !== undefined ? val.trim() : "");
  }
  return elements;
}

// Clean time string from noise prefixes and normalize spaces
function cleanTimeStr(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/^(?:de|dès|vers|à|a|@)\s+/i, '')
    .replace(/\s+/g, ' ');
}

// Convert hours like "09:30", "9h30", "14h", "14:00", "14 h 30", "14,5", or decimal 0.5833 to float
export function parseTimeToFloat(timeStr: string, defaultHour: number): { floatHour: number; formatted: string } {
  if (!timeStr) {
    const f = defaultHour;
    const h = Math.floor(f);
    const m = Math.round((f - h) * 60);
    return {
      floatHour: f,
      formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    };
  }

  const s = cleanTimeStr(timeStr);

  // 1. Check 12-hour AM/PM format e.g. "2:30 pm", "2 pm", "11 am"
  const ampmMatch = s.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const isPm = ampmMatch[3].toLowerCase() === 'pm';
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    const floatHour = h + m / 60;
    return {
      floatHour,
      formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    };
  }

  // 2. Google Sheets serial day fraction e.g. "0.583333" or "0,5833"
  if (/^0[.,]\d+$/.test(s)) {
    const val = parseFloat(s.replace(',', '.'));
    if (!isNaN(val) && val > 0 && val < 1) {
      const totalMinutes = Math.round(val * 24 * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return {
        floatHour: h + m / 60,
        formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      };
    }
  }

  // 3. Decimal hours e.g. "14.5" or "14,5"
  if (/^\d{1,2}[.,]\d+$/.test(s)) {
    const val = parseFloat(s.replace(',', '.'));
    if (!isNaN(val) && val >= 0 && val <= 24) {
      const h = Math.floor(val);
      const m = Math.round((val - h) * 60);
      return {
        floatHour: val,
        formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      };
    }
  }

  // 4. Standard HH:MM or HH:MM:SS or HHhMM (handles spaces e.g. "14 h 30", "14:30:00", "14h30", "8:45")
  const timeMatch = s.match(/(\d{1,2})\s*(?:h|:)\s*(\d{1,2})(?::\d{1,2})?/i);
  if (timeMatch) {
    const h = Math.max(0, Math.min(23, parseInt(timeMatch[1], 10)));
    const m = Math.max(0, Math.min(59, parseInt(timeMatch[2], 10)));
    const floatHour = h + m / 60;
    return {
      floatHour,
      formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    };
  }

  // 5. Just an integer hour e.g. "14", "9", "14h", "14 h"
  const intHourMatch = s.match(/^(\d{1,2})\s*h?$/i);
  if (intHourMatch) {
    const h = Math.max(0, Math.min(23, parseInt(intHourMatch[1], 10)));
    return {
      floatHour: h,
      formatted: `${String(h).padStart(2, '0')}:00`
    };
  }

  const f = defaultHour;
  const h = Math.floor(f);
  const m = Math.round((f - h) * 60);
  return {
    floatHour: f,
    formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  };
}

// Parse single hour or range (e.g. "09:00 - 11:00", "9h-11h", "14h à 16h30", "14h a 16h", "de 14h à 16h", "14:00/16:00")
export function parseHourRangeOrSingle(
  startRaw: string,
  endRaw: string,
  defaultStartHour: number,
  defaultDuration = 1.5
): {
  startHour: number;
  endHour: number;
  startTimeStr: string;
  endTimeStr: string;
} {
  const raw = cleanTimeStr(startRaw || '');

  // Check if startRaw contains a time range e.g. "14h à 16h", "de 14h à 16h", "14h a 16h", "14:00 - 16:00", "14h00-16h00", "14h/16h"
  const rangeMatch = raw.match(/^(.+?)(?:\s*(?:-|–|—|to|\/)\s*|\s+(?:[aà]|au)\s+)(.+)$/i);
  if (rangeMatch) {
    const start = parseTimeToFloat(rangeMatch[1], defaultStartHour);
    const end = parseTimeToFloat(rangeMatch[2], start.floatHour + defaultDuration);
    const endH = end.floatHour > start.floatHour ? end.floatHour : start.floatHour + defaultDuration;
    const h = Math.floor(endH);
    const m = Math.round((endH - h) * 60);
    return {
      startHour: start.floatHour,
      endHour: endH,
      startTimeStr: start.formatted,
      endTimeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    };
  }

  const start = parseTimeToFloat(raw, defaultStartHour);

  // If separate end hour column was supplied
  if (endRaw && endRaw.trim()) {
    const end = parseTimeToFloat(endRaw.trim(), start.floatHour + defaultDuration);
    const endH = end.floatHour > start.floatHour ? end.floatHour : start.floatHour + defaultDuration;
    const h = Math.floor(endH);
    const m = Math.round((endH - h) * 60);
    return {
      startHour: start.floatHour,
      endHour: endH,
      startTimeStr: start.formatted,
      endTimeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    };
  }

  // Default end time: start + defaultDuration
  const endH = Math.min(23.75, start.floatHour + defaultDuration);
  const h = Math.floor(endH);
  const m = Math.round((endH - h) * 60);
  return {
    startHour: start.floatHour,
    endHour: endH,
    startTimeStr: start.formatted,
    endTimeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  };
}

// Extract date and any embedded time (e.g. from "24/09/2026 14:30" or "2026-09-24T14:00:00")
export function normalizeDateAndExtractTime(rawDate: string): { dateStr: string; embeddedTime: string } {
  if (!rawDate) {
    const now = new Date();
    return { dateStr: now.toISOString().split('T')[0], embeddedTime: '' };
  }

  let s = rawDate.trim();
  let embeddedTime = '';

  const timeMatch = s.match(/(?:[T\s]+(?:à\s*|-)?\s*)((?:[01]?\d|2[0-3])\s*(?:h|:)\s*(?:[0-5]?\d)(?::[0-5]\d)?(?:\s*(?:am|pm))?|(?:[01]?\d|2[0-3])\s*h)\s*$/i);
  if (timeMatch) {
    embeddedTime = timeMatch[1].trim();
    s = s.substring(0, timeMatch.index).trim();
  }

  const dateStr = normalizeDate(s);
  return { dateStr, embeddedTime };
}

// Format date string to ISO YYYY-MM-DD
export function normalizeDate(rawDate: string): string {
  if (!rawDate) {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  let trimmed = rawDate.trim();
  // Strip leading day names or words like "Mercredi 23/09", "Lun 24", "le 8", "jour 8"
  trimmed = trimmed
    .replace(/^(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lun|mar|mer|jeu|ven|sam|dim)\.?\s+/i, '')
    .replace(/^(?:le|du|jour|d|date)\s*[:=]?\s*/i, '')
    .replace(/[.,;]$/, '')
    .trim();

  // Check ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Check French format DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const frMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (frMatch) {
    const day = frMatch[1].padStart(2, '0');
    const month = frMatch[2].padStart(2, '0');
    const year = frMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Check 2-digit year DD/MM/YY
  const frShortMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (frShortMatch) {
    const day = frShortMatch[1].padStart(2, '0');
    const month = frShortMatch[2].padStart(2, '0');
    const year = `20${frShortMatch[3]}`;
    return `${year}-${month}-${day}`;
  }

  // Check day/month without year: DD/MM or DD-MM (assumes current year)
  const frNoYearMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})$/);
  if (frNoYearMatch) {
    const day = frNoYearMatch[1].padStart(2, '0');
    const month = frNoYearMatch[2].padStart(2, '0');
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${month}-${day}`;
  }

  // Check text month: "24 septembre", "24 sept 2026", "24-sept"
  const monthNamesMap: Record<string, string> = {
    janv: '01', janvier: '01',
    fevr: '02', févr: '02', fevrier: '02', février: '02',
    mars: '03',
    avr: '04', avril: '04',
    mai: '05',
    juin: '06',
    juil: '07', juillet: '07',
    aout: '08', août: '08',
    sept: '09', septembre: '09',
    oct: '10', octobre: '10',
    nov: '11', novembre: '11',
    dec: '12', déc: '12', decembre: '12', décembre: '12'
  };
  const textMonthMatch = trimmed.match(/^(\d{1,2})(?:[\s\-_]+)([a-zA-ZÀ-ÿ]+)(?:[\s\-_]+(\d{2,4}))?/i);
  if (textMonthMatch) {
    const day = textMonthMatch[1].padStart(2, '0');
    const rawMonth = textMonthMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const matchedKey = Object.keys(monthNamesMap).find(k => k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').startsWith(rawMonth) || rawMonth.startsWith(k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
    if (matchedKey) {
      const month = monthNamesMap[matchedKey];
      let year = textMonthMatch[3] || String(new Date().getFullYear());
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }
  }

  // Check Excel serial number (around 45000-47000 for 2023-2028)
  if (/^\d{5}$/.test(trimmed)) {
    const serial = parseInt(trimmed, 10);
    const utcDays = serial - 25569;
    const dateObj = new Date(utcDays * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
  }

  // Check single day number e.g. "8" or "24" (current month and year)
  if (/^\d{1,2}$/.test(trimmed)) {
    const d = parseInt(trimmed, 10);
    if (d >= 1 && d <= 31) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}-${String(d).padStart(2, '0')}`;
    }
  }

  // Relative verbal dates
  const lower = trimmed.toLowerCase();
  const today = new Date();
  if (lower.includes("aujourd'hui") || lower.includes("today")) {
    return today.toISOString().split('T')[0];
  }
  if (lower.includes("demain") || lower.includes("tomorrow")) {
    const tomorrow = new Date(today.getTime() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  }

  // Fallback to today
  return today.toISOString().split('T')[0];
}

// Normalize Building ID and Name
export function normalizeBuilding(rawBldg: string, defaultBuildingId = 'BAT-01'): { buildingId: string; buildingName: string } {
  if (!rawBldg) {
    return { buildingId: defaultBuildingId, buildingName: 'Bâtiment 1' };
  }

  const clean = rawBldg.trim();
  // Match building number like "1", "01", "Bâtiment 2", "BAT-03", "Bât. 4"
  const numMatch = clean.match(/(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const id = `BAT-${String(num).padStart(2, '0')}`;
    return { buildingId: id, buildingName: `Bâtiment ${num}` };
  }

  // If specific name
  return {
    buildingId: defaultBuildingId,
    buildingName: clean || 'Bâtiment 1'
  };
}

// Guess category based on title / object keywords
export function detectCategory(rawCat: string, title: string): InterventionCategory {
  const combined = `${rawCat || ''} ${title || ''}`.toLowerCase();
  
  if (combined.includes('audit') || combined.includes('mesure') || combined.includes('bilan') || combined.includes('diagnostic') || combined.includes('comptage')) {
    return 'audit';
  }
  if (combined.includes('gtb') || combined.includes('gtc') || combined.includes('automate') || combined.includes('sonde') || combined.includes('régulation') || combined.includes('modbus') || combined.includes('bacnet') || combined.includes('capteur')) {
    return 'gtb';
  }
  if (combined.includes('dépannage') || combined.includes('depannage') || combined.includes('panne') || combined.includes('fuite') || combined.includes('urgence') || combined.includes('bloqué') || combined.includes('court-circuit')) {
    return 'depannage' as any; // maps to maintenance or specialized category
  }
  if (combined.includes('réglementaire') || combined.includes('reglementaire') || combined.includes('ssi') || combined.includes('désenfumage') || combined.includes('sécurité') || combined.includes('conformité')) {
    return 'reglementaire';
  }
  if (combined.includes('télérelève') || combined.includes('telemetry') || combined.includes('onde') || combined.includes('lora') || combined.includes('passerelle')) {
    return 'telemetry';
  }

  return 'maintenance';
}

// Guess status
export function detectStatus(rawStatus: string): InterventionStatus {
  if (!rawStatus) return 'planned';
  const lower = rawStatus.toLowerCase().trim();
  if (lower.includes('fait') || lower.includes('termin') || lower.includes('done') || lower.includes('clos') || lower.includes('ok') || lower.includes('valide')) {
    return 'completed';
  }
  if (lower.includes('cours') || lower.includes('progress') || lower.includes('action')) {
    return 'in_progress';
  }
  if (lower.includes('urgent') || lower.includes('critique') || lower.includes('haute') || lower.includes('prioritaire')) {
    return 'urgent';
  }
  return 'planned';
}

// Palette of colors for generated technician avatars
const TECH_COLORS = [
  'bg-emerald-600',
  'bg-teal-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-sky-600',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-cyan-600'
];

// Helper to create initials
export function getInitials(name: string): string {
  if (!name) return 'TC';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export interface GoogleSheetsSyncResult {
  success: boolean;
  events: InterventionEvent[];
  newTechnicians: Technician[];
  rawRowCount: number;
  message: string;
  sourceUrl: string;
  timestamp: string;
}

/**
 * Main Google Sheets parser for Interventions & Maintenances
 * Handles:
 * 1. An explicit Section "3. Interventions" in the main CSV
 * 2. A standalone table with headers Technicien, Bâtiment, Objet
 * 3. Dedicated tab CSV
 */
export async function fetchAndParseGoogleSheetsInterventions(
  customUrl?: string,
  existingTechs: Technician[] = []
): Promise<GoogleSheetsSyncResult> {
  let targetUrl = customUrl || (typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_CUSTOM_SHEET_URL) : null) || DEFAULT_GOOGLE_SHEETS_CSV_URL;
  
  // If the stored URL doesn't have a gid or is pointing to the old first sheet without gid, upgrade it to the INTER sheet
  if (!targetUrl.includes('gid=') && DEFAULT_GOOGLE_SHEETS_CSV_URL.includes('gid=')) {
    targetUrl = DEFAULT_GOOGLE_SHEETS_CSV_URL;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_SHEET_URL, DEFAULT_GOOGLE_SHEETS_CSV_URL);
    }
  }

  const cacheBustUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}_t=${Date.now()}&_r=${Math.random().toString(36).substring(2, 7)}`;

  const response = await fetch(cacheBustUrl, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status} lors de l'accès au Google Sheets`);
  }

  let csvText = await response.text();
  let lines = csvText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !/^[,;\s]+$/.test(l));

  if (lines.length === 0) {
    return {
      success: true,
      events: [],
      newTechnicians: [],
      rawRowCount: 0,
      message: 'Fichier Google Sheets vide',
      sourceUrl: targetUrl,
      timestamp: new Date().toLocaleTimeString('fr-FR')
    };
  }

  // 1. Detect where the interventions header row is located
  let headerIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Check if line contains keyword markers for the 3 key columns requested:
    // "nom du technicien dans quel batiment ou il va intervenir ainsi l'objet de la maintenance ou intervention"
    const hasTech = /technicien|intervenant|agent|op[eé]rateur|responsable/i.test(line);
    const hasBldg = /b[aâ]timent|immeuble|site|local/i.test(line);
    const hasObject = /objet|intervention|maintenance|titre|action|motif|t[aâ]che|description/i.test(line);

    if (hasTech && (hasBldg || hasObject)) {
      headerIndex = i;
      break;
    }

    // Alternatively check for section marker "3." or "planning"
    if (/^3\.\s*(?:intervention|maintenance|planning)/i.test(lines[i])) {
      // The header is likely the next non-empty line
      if (i + 1 < lines.length) {
        headerIndex = i + 1;
        break;
      }
    }
  }

  // If no header found yet, check if line 0 looks like an interventions table
  if (headerIndex === -1 && lines.length > 0) {
    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes('technicien') || firstLine.includes('objet') || firstLine.includes('maintenance')) {
      headerIndex = 0;
    }
  }

  // Fallback: If headers were not found on this sheet, automatically discover published tabs from pubhtml (e.g. the INTER tab)
  if (headerIndex === -1) {
    try {
      const pubhtmlUrl = targetUrl.replace(/\/pub(?:\?.*)?$/, '/pubhtml');
      const pubRes = await fetch(`${pubhtmlUrl}${pubhtmlUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`);
      if (pubRes.ok) {
        const pubHtml = await pubRes.text();
        const tabMatches = [...pubHtml.matchAll(/items\.push\(\{\s*name:\s*"([^"]+)",[^}]*gid:\s*"(\d+)"/g)];
        const discoveredSheets = tabMatches.map(m => ({ name: m[1], gid: m[2] }));

        // Prioritize tabs named INTER, INTERVENTIONS, PLANNING, MAINTENANCE
        const interTab = discoveredSheets.find(s => /inter|maintenance|planning/i.test(s.name)) ||
                         discoveredSheets.find(s => s.gid === '1888002345');

        if (interTab) {
          const tabCsvUrl = targetUrl.replace(/\/pub(?:\?.*)?$/, `/pub?gid=${interTab.gid}&single=true&output=csv`);
          const retryRes = await fetch(`${tabCsvUrl}&_t=${Date.now()}`);
          if (retryRes.ok) {
            const retryCsvText = await retryRes.text();
            const retryLines = retryCsvText
              .split(/\r?\n/)
              .map(l => l.trim())
              .filter(l => l && !/^[,;\s]+$/.test(l));
            
            for (let i = 0; i < retryLines.length; i++) {
              const line = retryLines[i].toLowerCase();
              const hasTech = /technicien|intervenant|agent|op[eé]rateur|responsable/i.test(line);
              const hasBldg = /b[aâ]timent|immeuble|site|local/i.test(line);
              const hasObject = /objet|intervention|maintenance|titre|action|motif|t[aâ]che|description/i.test(line);

              if (hasTech && (hasBldg || hasObject)) {
                if (typeof window !== 'undefined') {
                  localStorage.setItem(LOCAL_STORAGE_CUSTOM_SHEET_URL, tabCsvUrl);
                }
                lines = retryLines;
                headerIndex = i;
                targetUrl = tabCsvUrl;
                break;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Auto-discovery of tabs failed:", e);
    }
  }

  if (headerIndex === -1) {
    return {
      success: false,
      events: [],
      newTechnicians: [],
      rawRowCount: 0,
      message: "En-têtes d'interventions non trouvés. Assurez-vous d'avoir les colonnes : Technicien, Bâtiment, Objet.",
      sourceUrl: targetUrl,
      timestamp: new Date().toLocaleTimeString('fr-FR')
    };
  }

  const headers = parseCsvLine(lines[headerIndex]);
  const cleanHeaders = headers.map(h => (h || '').trim());

  // Identify column indices
  const dateCol = cleanHeaders.findIndex(h => /date|jour|\bday\b/i.test(h));
  let startCol = cleanHeaders.findIndex(h => /heure\s*d[eé]but|d[eé]but|start\s*time|\bstart\b/i.test(h));
  const endCol = cleanHeaders.findIndex(h => /heure\s*fin|\bfin\b|end\s*time|\bend\b|dur[eé]e/i.test(h));
  if (startCol === -1) {
    startCol = cleanHeaders.findIndex(h => /^h$|heure|horaire|cr[eé]neau|plage|\btemps\b|\btime\b/i.test(h));
  }
  const techCol = cleanHeaders.findIndex(h => /technicien|intervenant|agent|nom.*technicien|personne/i.test(h));
  const bldgCol = cleanHeaders.findIndex(h => /b[aâ]timent|immeuble|site|bat/i.test(h));
  const locCol = cleanHeaders.findIndex(h => /localisation|local|zone|[eé]tage|pi[eè]ce/i.test(h));
  const objCol = cleanHeaders.findIndex(h => /objet|intervention|maintenance|titre|description|action|motif|t[aâ]che/i.test(h));
  const catCol = cleanHeaders.findIndex(h => /cat[eé]gorie|lot|type|domaine/i.test(h));
  const statCol = cleanHeaders.findIndex(h => /statut|[eé]tat|status/i.test(h));
  const notesCol = cleanHeaders.findIndex(h => /note|remarque|consigne|d[eé]tail|commentaire/i.test(h));

  // Smart column fallback: if startCol is not named, look for time patterns in sample rows
  if (startCol === -1) {
    for (let r = headerIndex + 1; r < Math.min(lines.length, headerIndex + 6); r++) {
      const sampleCells = parseCsvLine(lines[r]);
      for (let c = 0; c < sampleCells.length; c++) {
        if (c !== dateCol && c !== techCol && c !== bldgCol && c !== objCol) {
          const val = (sampleCells[c] || '').trim();
          if (/(?:\d{1,2}\s*[h:]\s*\d{0,2}|\b\d{1,2}\s*h\b)/i.test(val)) {
            startCol = c;
            break;
          }
        }
      }
      if (startCol !== -1) break;
    }
  }

  const parsedEvents: InterventionEvent[] = [];
  const dynamicTechs: Technician[] = [...existingTechs];
  const newlyCreatedTechs: Technician[] = [];

  // Helper to find or register technician
  const getOrCreateTechId = (techNameRaw: string): string => {
    const cleanName = techNameRaw.trim();
    if (!cleanName) return dynamicTechs[0]?.id || 'tech-1';

    // Search existing
    const existing = dynamicTechs.find(t => 
      t.name.toLowerCase() === cleanName.toLowerCase() ||
      t.name.toLowerCase().includes(cleanName.toLowerCase()) ||
      cleanName.toLowerCase().includes(t.name.toLowerCase())
    );

    if (existing) {
      return existing.id;
    }

    // Create dynamic tech
    const newId = `tech-gs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const initials = getInitials(cleanName);
    const colorIndex = dynamicTechs.length % TECH_COLORS.length;
    const newTech: Technician = {
      id: newId,
      name: cleanName,
      role: 'Technicien d’intervention',
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80`,
      initials,
      color: TECH_COLORS[colorIndex]
    };

    dynamicTechs.push(newTech);
    newlyCreatedTechs.push(newTech);
    return newId;
  };

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every(c => !c || !c.trim())) continue; // skip blank rows

    // Stop if we hit a new section marker like "4."
    if (/^[4-9]\./.test(cells[0] || '')) break;

    const rawTech = techCol !== -1 && cells[techCol] ? cells[techCol].trim() : '';
    const rawBldg = bldgCol !== -1 && cells[bldgCol] ? cells[bldgCol].trim() : '';
    const rawObj = objCol !== -1 && cells[objCol] ? cells[objCol].trim() : '';

    // Ignore repeated header lines
    if (/^(?:technicien|intervenant|agent|op[eé]rateur|responsable)$/i.test(rawTech) &&
        /^(?:b[aâ]timent|immeuble|site|local)$/i.test(rawBldg)) {
      continue;
    }
    if (/^(?:objet|intervention|maintenance|titre|action|motif|t[aâ]che)$/i.test(rawObj)) {
      continue;
    }

    // Must have at least a non-empty object or technician with alphanumeric characters
    const cleanObj = rawObj.replace(/[^a-zA-Z0-9À-ÿ]/g, '');
    const cleanTech = rawTech.replace(/[^a-zA-Z0-9À-ÿ]/g, '');
    if (!cleanObj && !cleanTech) continue;

    const title = rawObj || `Maintenance ${rawTech ? `- ${rawTech}` : ''}`.trim();
    const techId = getOrCreateTechId(rawTech);
    const { buildingId, buildingName } = normalizeBuilding(rawBldg);

    const rawDate = dateCol !== -1 && cells[dateCol] ? cells[dateCol].trim() : '';
    const { dateStr, embeddedTime } = normalizeDateAndExtractTime(rawDate);

    let rawStart = startCol !== -1 && cells[startCol] ? cells[startCol].trim() : '';
    const rawEnd = endCol !== -1 && cells[endCol] ? cells[endCol].trim() : '';

    if (!rawStart && embeddedTime) {
      rawStart = embeddedTime;
    }

    const defaultStart = 9.0 + (parsedEvents.length % 5) * 1.5;
    const timeParsed = parseHourRangeOrSingle(rawStart, rawEnd, Math.min(16.5, defaultStart));

    const rawLoc = locCol !== -1 && cells[locCol] ? cells[locCol].trim() : '';
    const location = rawLoc || `Rue de Malbosc, 34080 Montpellier (${buildingName})`;

    const rawCat = catCol !== -1 && cells[catCol] ? cells[catCol].trim() : '';
    const category = detectCategory(rawCat, title);

    const rawStatus = statCol !== -1 && cells[statCol] ? cells[statCol].trim() : '';
    const status = detectStatus(rawStatus);

    const rawNotes = notesCol !== -1 && cells[notesCol] ? cells[notesCol].trim() : '';
    const notes = rawNotes || (rawTech ? `Assigné à ${rawTech} via Google Sheets` : undefined);

    const eventId = `gs-ev-${i}-${buildingId}-${dateStr}`;

    parsedEvents.push({
      id: eventId,
      title,
      buildingId,
      buildingName,
      location,
      date: dateStr,
      startHour: timeParsed.startHour,
      endHour: Math.max(timeParsed.startHour + 0.5, timeParsed.endHour),
      startTimeStr: timeParsed.startTimeStr,
      endTimeStr: timeParsed.endTimeStr,
      category,
      technicianIds: [techId],
      status,
      notes,
      source: 'google_sheets',
      sheetRowIndex: i + 1
    });
  }

  return {
    success: true,
    events: parsedEvents,
    newTechnicians: newlyCreatedTechs,
    rawRowCount: parsedEvents.length,
    message: `${parsedEvents.length} intervention(s) synchronisée(s) avec succès depuis Google Sheets`,
    sourceUrl: targetUrl,
    timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}

// Recommended Header & Sample data for users to copy/paste into Google Sheets
export const GOOGLE_SHEETS_TEMPLATE_SAMPLE = `3. Interventions & Maintenances Planifiées,,,,,,,,
Date,Heure Début,Heure Fin,Technicien,Bâtiment,Localisation,Objet de la maintenance,Catégorie,Statut,Notes
2026-09-24,09:00,11:00,Alexandre Roux,Bâtiment 1,Chaufferie,Maintenance PAC & Contrôle échangeur,maintenance,planned,Vérifier pressions HP/BP
2026-09-24,14:00,16:30,Deborah Meyer,Bâtiment 3,Local GTB,Mise à jour automate GTB et sondes d'ambiance,gtb,in_progress,Vérifier réseau Modbus
2026-09-25,10:00,12:00,Samuel Crawford,Bâtiment 7,Local CTA Toiture,Dépannage CTA & remplacement courroies,depannage,urgent,Signalement bruit anormal
2026-09-25,14:30,17:00,Hilda Meyer,Bâtiment 2,Sous-station,Audit énergétique & mesures débits,audit,planned,Campagne de mesure continue
2026-09-26,08:30,11:30,Marc Lefebvre,Bâtiment 5,Chaufferie,Contrôle vannes & équilibrage hydraulique,maintenance,planned,Vérifier circuits secondaires`;
