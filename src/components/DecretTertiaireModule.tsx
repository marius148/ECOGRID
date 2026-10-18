import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  TrendingDown, 
  TrendingUp, 
  ShieldCheck, 
  Award, 
  Calendar, 
  Sliders, 
  Leaf, 
  Flame, 
  Zap, 
  Activity, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  ChevronRight,
  ExternalLink,
  Target,
  ThermometerSun,
  FileCheck
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { cn } from '../lib/utils';
import { getBuildingColorTheme } from '../utils/buildingThemes';

interface DecretTertiaireModuleProps {
  language?: 'fr' | 'en';
  buildingName?: string;
  buildingSurface?: number; // m²
  currentAnnualConsumptionMwh?: number; // MWh/an
  winterDemandKw?: number;
  selectedBuildingId?: string;
}

export const DecretTertiaireModule: React.FC<DecretTertiaireModuleProps> = ({
  language = 'fr',
  buildingName = 'Parc Global (10 Sites)',
  buildingSurface = 48500,
  currentAnnualConsumptionMwh = 4320,
  winterDemandKw = 1680,
  selectedBuildingId = 'all'
}) => {
  const theme = useMemo(() => getBuildingColorTheme(selectedBuildingId), [selectedBuildingId]);
  // Reference baseline year (typically 2012, 2018 or 2019 under French Décret Tertiaire regulations)
  const [baselineYear, setBaselineYear] = useState<'2012' | '2018' | '2019'>('2018');
  
  // Baseline consumption estimate (typically +30% to +45% higher than current optimized levels)
  const baselineConsumptionMwh = useMemo(() => {
    const factor = baselineYear === '2012' ? 1.48 : baselineYear === '2018' ? 1.34 : 1.28;
    return Math.round(currentAnnualConsumptionMwh * factor);
  }, [baselineYear, currentAnnualConsumptionMwh]);

  // Décret Tertiaire Milestones
  // 2030: -40%, 2040: -50%, 2050: -60%
  const target2030Mwh = Math.round(baselineConsumptionMwh * 0.60);
  const target2040Mwh = Math.round(baselineConsumptionMwh * 0.50);
  const target2050Mwh = Math.round(baselineConsumptionMwh * 0.40);

  // Current progress calculation
  const currentReductionPct = useMemo(() => {
    if (baselineConsumptionMwh <= 0) return 0;
    const diff = baselineConsumptionMwh - currentAnnualConsumptionMwh;
    return Math.max(0, Math.round((diff / baselineConsumptionMwh) * 100));
  }, [baselineConsumptionMwh, currentAnnualConsumptionMwh]);

  const target2030Pct = 40;
  const progressRatioTo2030 = Math.min(100, Math.round((currentReductionPct / target2030Pct) * 100));

  // Trajectory chart data from baseline to 2050
  const trajectoryData = useMemo(() => {
    const baseVal = baselineConsumptionMwh;
    const currVal = currentAnnualConsumptionMwh;
    const t30 = target2030Mwh;
    const t40 = target2040Mwh;
    const t50 = target2050Mwh;

    return [
      { year: baselineYear, reel: baseVal, cible: baseVal, djuCorrige: baseVal },
      { year: '2021', reel: Math.round(baseVal * 0.93), cible: Math.round(baseVal * 0.94), djuCorrige: Math.round(baseVal * 0.92) },
      { year: '2023', reel: Math.round(baseVal * 0.84), cible: Math.round(baseVal * 0.86), djuCorrige: Math.round(baseVal * 0.83) },
      { year: '2025', reel: currVal, cible: Math.round(baseVal * 0.78), djuCorrige: Math.round(currVal * 0.97) },
      { year: '2030', reel: null, cible: t30, djuCorrige: null, note: '-40%' },
      { year: '2040', reel: null, cible: t40, djuCorrige: null, note: '-50%' },
      { year: '2050', reel: null, cible: t50, djuCorrige: null, note: '-60%' }
    ];
  }, [baselineYear, baselineConsumptionMwh, currentAnnualConsumptionMwh, target2030Mwh, target2040Mwh, target2050Mwh]);

  // DJU (Degrés Jours Unifiés) Simulation
  // Shows real winter climate severity correction (Météo-France standard base 18°C)
  const djuStats = useMemo(() => {
    const djuNormal = 2150; // Average annual DJU in Paris/IDF
    const djuYear = 2040;   // Mild winter example
    const climateRatio = (djuNormal / djuYear).toFixed(3);
    const correctedConso = Math.round(currentAnnualConsumptionMwh * (djuNormal / djuYear));
    return { djuNormal, djuYear, climateRatio, correctedConso };
  }, [currentAnnualConsumptionMwh]);

  // BACS Checklist according to EN ISO 52120-1 (Class B requirement for tertiary > 70 kW / 290 kW)
  const bacsCriteria = [
    {
      id: 'reg_cvc',
      label: language === 'fr' ? 'Régulation automatique de la température par zone / pièce' : 'Automatic zone temperature control',
      standard: 'EN ISO 52120-1 (Class B)',
      status: 'compliant',
      detail: language === 'fr' ? 'Vannes thermostatiques pilotées & loi d\'eau dynamique GTB' : 'BMS weather curve & motorized balancing valves'
    },
    {
      id: 'sub_metering',
      label: language === 'fr' ? 'Sous-comptage par usage énergétique (CVC, Éclairage, Prises)' : 'Sub-metering by energy usage (HVAC, Lighting, Plugs)',
      standard: 'Décret BACS Art. R. 175-1',
      status: 'compliant',
      detail: language === 'fr' ? 'Compteurs MID communicants Modbus / M-Bus intégrés' : 'Communicating Modbus / M-Bus meters deployed'
    },
    {
      id: 'drift_alert',
      label: language === 'fr' ? 'Détection automatique de dérives de consigne et surconsommations' : 'Automated setpoint drift & anomaly detection',
      standard: 'Supervision Continue CII ENERGIE',
      status: 'compliant',
      detail: language === 'fr' ? 'Algorithme temps réel avec alertes de dépassement' : 'Real-time algorithm with threshold deviation alerts'
    },
    {
      id: 'auto_shutdown',
      label: language === 'fr' ? 'Intermittence & abaissement automatique en période inoccupée' : 'Automatic set-back & night setback scheduling',
      standard: 'Décret BACS Art. R. 175-3',
      status: 'compliant',
      detail: language === 'fr' ? 'Planning hebdomadaire asservi aux horaires d\'occupation' : 'Weekly occupancy scheduling with anti-frost protection'
    },
    {
      id: 'interoperability',
      label: language === 'fr' ? 'Interopérabilité des automates GTB (BACnet IP / Modbus)' : 'BMS PLC Interoperability (BACnet IP / Modbus)',
      standard: 'Protocole Ouvert ISO 16484-5',
      status: 'compliant',
      detail: language === 'fr' ? 'Passerelle multi-protocoles avec sauvegarde distante' : 'Multi-protocol gateway with remote backup'
    }
  ];

  // Financial and CO2 Impact
  const annualEurosSaved = Math.round((baselineConsumptionMwh - currentAnnualConsumptionMwh) * 1000 * 0.185); // 0.185 €/kWh
  const co2AvoidedTons = Math.round((baselineConsumptionMwh - currentAnnualConsumptionMwh) * 0.052); // ~52g CO2/kWh mix France

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-100/40 via-transparent to-transparent pointer-events-none rounded-full -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                {language === 'fr' ? 'Conformité Réglementaire France' : 'French Regulatory Compliance'}
              </span>
              <span className="text-xs text-slate-400 font-medium">·</span>
              <span className="text-xs text-slate-500 font-semibold">
                {buildingName}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              {language === 'fr' ? 'Trajectoire Décret Tertiaire & Décret BACS' : 'Tertiary Decree & BACS Compliance'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              {language === 'fr'
                ? 'Suivi de la réduction d\'énergie finale (-40% en 2030, -50% en 2040, -60% en 2050) et conformité GTB Classe B (EN ISO 52120-1).'
                : 'Tracking mandated energy reductions (-40% by 2030, -50% by 2040, -60% by 2050) and Class B BMS readiness.'
              }
            </p>
          </div>

          {/* Baseline Selector */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80 shrink-0 self-start lg:self-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase px-2">
              {language === 'fr' ? 'Année Réf :' : 'Baseline :'}
            </span>
            {(['2012', '2018', '2019'] as const).map(year => (
              <button
                key={year}
                onClick={() => setBaselineYear(year)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  baselineYear === year
                    ? "bg-[#236b33] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar Toward 2030 Target */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#236b33]" />
              <span className="text-xs font-bold text-slate-800">
                {language === 'fr' ? 'Objectif Décret Tertiaire 2030 (-40%)' : '2030 Target (-40%)'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-slate-500">
                {language === 'fr' ? 'Réalisé :' : 'Achieved :'} <strong className="text-emerald-700 font-bold">-{currentReductionPct}%</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-semibold text-slate-500">
                {language === 'fr' ? 'Reste à faire :' : 'Remaining :'} <strong className="text-slate-800 font-bold">{Math.max(0, 40 - currentReductionPct)}%</strong>
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/60 relative">
            {/* Target 2030 marker line at 100% of ratio */}
            <div 
              className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#236b33] to-[#7ec22a]"
              style={{ width: `${Math.min(100, (currentReductionPct / 40) * 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium mt-1.5">
            <span>Réf. {baselineYear} : {baselineConsumptionMwh.toLocaleString()} MWh</span>
            <span className="font-bold text-emerald-800">Avancement 2030 : {progressRatioTo2030}%</span>
            <span>Cible 2030 : {target2030Mwh.toLocaleString()} MWh</span>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Économies Financières */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {language === 'fr' ? 'Économies Réalisées' : 'Annual Cost Avoidance'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-display">
            ~{annualEurosSaved.toLocaleString()} € <span className="text-xs font-semibold text-slate-400">/ an</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {language === 'fr' 
              ? `Sur la base de 185 €/MWh vs consommation de référence ${baselineYear}` 
              : `Based on 185 €/MWh baseline vs ${baselineYear}`
            }
          </p>
        </div>

        {/* Impact Carbone Évité */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {language === 'fr' ? 'Émissions CO2 Évitées' : 'CO2 Avoided'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900 font-display">
            {co2AvoidedTons} T CO₂eq <span className="text-xs font-semibold text-slate-400">/ an</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {language === 'fr'
              ? 'Calculé selon le facteur d\'émission de l\'ADEME (mix électrique & gaz France)'
              : 'Computed using ADEME emission factor'
            }
          </p>
        </div>

        {/* Décret BACS Statut */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {language === 'fr' ? 'Conformité BACS' : 'BACS Compliance'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#236b33] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-display flex items-center gap-2">
            <span>Classe B</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
              91 / 100
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {language === 'fr'
              ? 'Conforme norme EN ISO 52120-1 (obligatoire pour tertiaire > 70 kW)'
              : 'Compliant with EN ISO 52120-1 (> 70 kW tertiary threshold)'
            }
          </p>
        </div>
      </div>

      {/* Trajectory Curve Chart & DJU Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart Column */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {language === 'fr' ? 'Courbe de Trajectoire Décret Tertiaire (MWh/an)' : 'Tertiary Decree Trajectory Curve (MWh/yr)'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'fr' ? 'Comparaison Réel supervisé vs Objectifs réglementaires' : 'Supervised actuals vs statutory targets'}
                </p>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded" style={{ backgroundColor: theme.primary }} />
                  <span>{language === 'fr' ? 'Réel' : 'Actual'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-amber-500 rounded" />
                  <span>{language === 'fr' ? 'Cible légale' : 'Target'}</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reelGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.primary} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cibleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" MWh" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    formatter={(val: any, name: any) => [
                      val ? `${Number(val).toLocaleString()} MWh` : '--',
                      name === 'reel' ? (language === 'fr' ? 'Consommation Réelle' : 'Actual Consumption') : (language === 'fr' ? 'Trajectoire Réglementaire' : 'Statutory Target')
                    ]}
                  />
                  <Area type="monotone" dataKey="cible" stroke="#f59e0b" strokeWidth={2} fill="url(#cibleGrad)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="reel" stroke={theme.primary} strokeWidth={2.5} fill="url(#reelGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">
              {language === 'fr' ? 'Statut de conformité actuel :' : 'Current compliance status :'}
            </span>
            <span className="font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {language === 'fr' ? 'En avance de 3 ans sur la trajectoire' : '3 years ahead of statutory trajectory'}
            </span>
          </div>
        </div>

        {/* DJU Climate Normalization & Temperature Sensitivity */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <ThermometerSun className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'fr' ? 'Correction DJU Météo (Climat)' : 'Weather DJU Normalization'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'fr' ? 'Degrés Jours Unifiés (Base 18°C)' : 'Heating Degree Days (Base 18°C)'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {language === 'fr'
                ? 'Pour évaluer la performance réelle sans le biais d\'un hiver doux ou rigoureux, le Décret Tertiaire impose une correction climatique officielle basée sur les stations Météo-France.'
                : 'Tertiary Decree mandates climate correction via heating degree days to isolate true thermal efficiency from weather variations.'
              }
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                <span className="text-slate-500 font-medium">{language === 'fr' ? 'DJU Référence Trentenaire' : '30-yr Normal DJU'}</span>
                <span className="font-bold text-slate-800 font-mono">{djuStats.djuNormal} DJU</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                <span className="text-slate-500 font-medium">{language === 'fr' ? 'DJU Constatés Réels' : 'Observed DJU'}</span>
                <span className="font-bold text-slate-800 font-mono">{djuStats.djuYear} DJU</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100 text-xs">
                <span className="text-emerald-900 font-semibold">{language === 'fr' ? 'Coefficient de Rigueur' : 'Climate Severity Ratio'}</span>
                <span className="font-bold text-emerald-800 font-mono">{djuStats.climateRatio}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                <span className="text-slate-500 font-medium">{language === 'fr' ? 'Consommation Corrigée DJU' : 'Climate-Adjusted Conso'}</span>
                <span className="font-bold text-[#236b33] font-mono">{djuStats.correctedConso.toLocaleString()} MWh</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{language === 'fr' ? 'Données calibrées pour la plateforme OPERAT (ADEME)' : 'Calibrated for French OPERAT ADEME portal'}</span>
          </div>
        </div>
      </div>

      {/* Décret BACS Compliance Checklist */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#236b33]" />
              <span>{language === 'fr' ? 'Matrice de Conformité Décret BACS (GTB Classe B)' : 'BACS Decree Compliance Matrix (BMS Class B)'}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'fr'
                ? 'Exigences réglementaires pour les systèmes de régulation et pilotage CVC (art. R. 175-1 et suivants)'
                : 'Regulatory requirements for automated HVAC building management'
              }
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            5 / 5 {language === 'fr' ? 'Critères validés' : 'Criteria validated'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {bacsCriteria.map(item => (
            <div 
              key={item.id}
              className="p-3.5 bg-slate-50/70 hover:bg-slate-100/70 transition rounded-2xl border border-slate-200/60 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.standard}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 leading-snug">{item.label}</h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
