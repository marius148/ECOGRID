/**
 * CII ENERGIE - Palette Visuelle Dynamique Multi-Bâtiments
 * Respecte strictement la charte graphique :
 * Vert Forêt (#236b33), Vert Pomme (#7ec22a), Émeraude (#047857),
 * Sarcelle (#0f766e), Pin Foncé (#064e3b), et Alerte (#be123c).
 */

export interface BuildingColorTheme {
  id: string;
  primary: string;
  secondary: string;
  accent: string;
  gradient: [string, string];
  lightBg: string;
  border: string;
  text: string;
  badge: string;
}

// 10 Nuances Distinctes et Cohérentes pour les 10 Bâtiments
export const BUILDING_PALETTES: Record<string, BuildingColorTheme> = {
  // Bâtiment 1 : Vert Signature CII ENERGIE
  'BAT-01': {
    id: 'BAT-01',
    primary: '#236b33',
    secondary: '#184c24',
    accent: '#7ec22a',
    gradient: ['#236b33', '#184c24'],
    lightBg: 'bg-emerald-50/60',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    badge: 'bg-[#236b33] text-white'
  },
  // Bâtiment 2 : Alerte Surconsommation (Rose / Rouge Alerte)
  'BAT-02': {
    id: 'BAT-02',
    primary: '#be123c',
    secondary: '#881337',
    accent: '#fb7185',
    gradient: ['#be123c', '#881337'],
    lightBg: 'bg-rose-50/80',
    border: 'border-rose-300',
    text: 'text-rose-950',
    badge: 'bg-rose-600 text-white'
  },
  // Bâtiment 3 : Émeraude Intense
  'BAT-03': {
    id: 'BAT-03',
    primary: '#059669',
    secondary: '#065f46',
    accent: '#34d399',
    gradient: ['#059669', '#065f46'],
    lightBg: 'bg-emerald-50/60',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    badge: 'bg-emerald-600 text-white'
  },
  // Bâtiment 4 : Vert Forêt Profond (Basse Conso / Attention)
  'BAT-04': {
    id: 'BAT-04',
    primary: '#064e3b',
    secondary: '#022c22',
    accent: '#6ee7b7',
    gradient: ['#064e3b', '#022c22'],
    lightBg: 'bg-teal-50/60',
    border: 'border-teal-200',
    text: 'text-teal-950',
    badge: 'bg-[#064e3b] text-white'
  },
  // Bâtiment 5 : Vert Vif Éco-Énergie
  'BAT-05': {
    id: 'BAT-05',
    primary: '#16a34a',
    secondary: '#14532d',
    accent: '#86efac',
    gradient: ['#16a34a', '#14532d'],
    lightBg: 'bg-green-50/60',
    border: 'border-green-200',
    text: 'text-green-950',
    badge: 'bg-green-600 text-white'
  },
  // Bâtiment 6 : Sarcelle Énergétique (Teal)
  'BAT-06': {
    id: 'BAT-06',
    primary: '#0d9488',
    secondary: '#134e4a',
    accent: '#5eead4',
    gradient: ['#0d9488', '#134e4a'],
    lightBg: 'bg-teal-50/60',
    border: 'border-teal-200',
    text: 'text-teal-900',
    badge: 'bg-teal-600 text-white'
  },
  // Bâtiment 7 : Alerte Chauffage (Orange / Rouge Dérive)
  'BAT-07': {
    id: 'BAT-07',
    primary: '#c2410c',
    secondary: '#7c2d12',
    accent: '#fdba74',
    gradient: ['#c2410c', '#7c2d12'],
    lightBg: 'bg-orange-50/80',
    border: 'border-orange-300',
    text: 'text-orange-950',
    badge: 'bg-orange-600 text-white'
  },
  // Bâtiment 8 : Vert Olive Chêne
  'BAT-08': {
    id: 'BAT-08',
    primary: '#4d7c0f',
    secondary: '#365314',
    accent: '#bef264',
    gradient: ['#4d7c0f', '#365314'],
    lightBg: 'bg-lime-50/60',
    border: 'border-lime-200',
    text: 'text-lime-950',
    badge: 'bg-lime-700 text-white'
  },
  // Bâtiment 9 : Sarcelle Foncé Océan
  'BAT-09': {
    id: 'BAT-09',
    primary: '#0f766e',
    secondary: '#042f2e',
    accent: '#2dd4bf',
    gradient: ['#0f766e', '#042f2e'],
    lightBg: 'bg-teal-50/60',
    border: 'border-teal-200',
    text: 'text-teal-950',
    badge: 'bg-[#0f766e] text-white'
  },
  // Bâtiment 10 : Émeraude Sage
  'BAT-10': {
    id: 'BAT-10',
    primary: '#047857',
    secondary: '#064e3b',
    accent: '#6ee7b7',
    gradient: ['#047857', '#064e3b'],
    lightBg: 'bg-emerald-50/60',
    border: 'border-emerald-200',
    text: 'text-emerald-950',
    badge: 'bg-[#047857] text-white'
  }
};

export const NORMAL_THEME: BuildingColorTheme = {
  id: 'normal',
  primary: '#236b33',       // Vert Signature CII ENERGIE (Mode Normal)
  secondary: '#184c24',
  accent: '#7ec22a',
  gradient: ['#236b33', '#184c24'],
  lightBg: 'bg-emerald-50/60',
  border: 'border-emerald-200',
  text: 'text-emerald-900',
  badge: 'bg-[#236b33] text-white'
};

export const ALERT_THEME: BuildingColorTheme = {
  id: 'alert',
  primary: '#be123c',       // Rouge Alerte (Détection Anomalie / Surconsommation)
  secondary: '#881337',
  accent: '#fb7185',
  gradient: ['#be123c', '#881337'],
  lightBg: 'bg-rose-50/80',
  border: 'border-rose-300',
  text: 'text-rose-950',
  badge: 'bg-rose-600 text-white'
};

export const GLOBAL_THEME: BuildingColorTheme = {
  id: 'all',
  primary: '#236b33',
  secondary: '#184c24',
  accent: '#7ec22a',
  gradient: ['#236b33', '#184c24'],
  lightBg: 'bg-slate-50',
  border: 'border-slate-200',
  text: 'text-slate-900',
  badge: 'bg-slate-900 text-white'
};

/**
 * Retourne la couleur selon la présence d'une anomalie détectée sur les consommations :
 * - Bâtiment en anomalie (surconsommation/dérive) : Rouge Alerte (#be123c)
 * - Bâtiment en mode normal : Vert Signature CII ENERGIE (#236b33)
 */
export function getBuildingColorTheme(
  buildingId?: string | number | null, 
  status?: string,
  isAnomaly?: boolean
): BuildingColorTheme {
  if (!buildingId || buildingId === 'all') {
    return GLOBAL_THEME;
  }

  const strId = String(buildingId).toUpperCase().trim();
  // Anomalie détectée si le flag isAnomaly est vrai, si le statut est ALERTE,
  // ou si non spécifié pour les bâtiments connus en dérive (BAT-02, BAT-07)
  const isAnom = isAnomaly !== undefined 
    ? Boolean(isAnomaly) 
    : (status === 'ALERTE' || strId === 'BAT-02' || strId === 'BAT-07');

  if (isAnom) {
    return ALERT_THEME;
  }

  return NORMAL_THEME;
}
