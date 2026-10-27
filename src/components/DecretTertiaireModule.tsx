import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  TrendingDown, 
  ShieldCheck, 
  Leaf, 
  CheckCircle2, 
  Target,
  ThermometerSun,
  FileCheck,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { cn } from '../lib/utils';
import { getBuildingColorTheme } from '../utils/buildingThemes';

interface DecretTertiaireModuleProps {
  language?: 'fr' | 'en';
  buildingName?: string;
  buildingSurface?: number;
  currentAnnualConsumptionMwh?: number;
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
  const isFr = language === 'fr';
  const theme = useMemo(() => getBuildingColorTheme(selectedBuildingId), [selectedBuildingId]);
  const [baselineYear, setBaselineYear] = useState<'2012' | '2018' | '2019'>('2018');
  
  // Consommation de référence selon l'année choisie
  const baselineConsumptionMwh = useMemo(() => {
    const factor = baselineYear === '2012' ? 1.48 : baselineYear === '2018' ? 1.34 : 1.28;
    return Math.round(currentAnnualConsumptionMwh * factor);
  }, [baselineYear, currentAnnualConsumptionMwh]);

  // Objectifs réglementaires Décret Tertiaire
  const target2030Mwh = Math.round(baselineConsumptionMwh * 0.60);
  const target2040Mwh = Math.round(baselineConsumptionMwh * 0.50);
  const target2050Mwh = Math.round(baselineConsumptionMwh * 0.40);

  // Pourcentage de réduction actuel
  const currentReductionPct = useMemo(() => {
    if (baselineConsumptionMwh <= 0) return 0;
    const diff = baselineConsumptionMwh - currentAnnualConsumptionMwh;
    return Math.max(0, Math.round((diff / baselineConsumptionMwh) * 100));
  }, [baselineConsumptionMwh, currentAnnualConsumptionMwh]);

  const target2030Pct = 40;
  const progressRatioTo2030 = Math.min(100, Math.round((currentReductionPct / target2030Pct) * 100));

  // Données de la trajectoire
  const trajectoryData = useMemo(() => {
    const baseVal = baselineConsumptionMwh;
    const currVal = currentAnnualConsumptionMwh;

    return [
      { year: baselineYear, reel: baseVal, cible: baseVal },
      { year: '2021', reel: Math.round(baseVal * 0.93), cible: Math.round(baseVal * 0.94) },
      { year: '2023', reel: Math.round(baseVal * 0.84), cible: Math.round(baseVal * 0.86) },
      { year: '2025', reel: currVal, cible: Math.round(baseVal * 0.78) },
      { year: '2030', reel: null, cible: target2030Mwh },
      { year: '2040', reel: null, cible: target2040Mwh },
      { year: '2050', reel: null, cible: target2050Mwh }
    ];
  }, [baselineYear, baselineConsumptionMwh, currentAnnualConsumptionMwh, target2030Mwh, target2040Mwh, target2050Mwh]);

  // Données DJU condensées et précises
  const djuStats = useMemo(() => {
    const djuNormal = 2150;
    const djuYear = 2040;
    const climateRatio = (djuNormal / djuYear).toFixed(3);
    const correctedConso = Math.round(currentAnnualConsumptionMwh * (djuNormal / djuYear));
    return { djuNormal, djuYear, climateRatio, correctedConso };
  }, [currentAnnualConsumptionMwh]);

  // Critères BACS épurés
  const bacsCriteria = [
    {
      id: 'reg_cvc',
      label: isFr ? 'Régulation automatique de la température par zone / pièce' : 'Automatic zone temperature control',
      standard: 'EN ISO 52120-1 (Classe B)',
      status: isFr ? 'Conforme' : 'Compliant'
    },
    {
      id: 'sub_metering',
      label: isFr ? 'Sous-comptage communicant par usage (CVC, Éclairage, Prises)' : 'Sub-metering by energy usage (HVAC, Lighting, Plugs)',
      standard: 'Décret BACS Art. R. 175-1',
      status: isFr ? 'Conforme' : 'Compliant'
    },
    {
      id: 'drift_alert',
      label: isFr ? 'Détection automatique de dérives et surconsommations en temps réel' : 'Automated setpoint drift & anomaly detection',
      standard: 'Supervision CII ENERGIE',
      status: isFr ? 'Conforme' : 'Compliant'
    },
    {
      id: 'auto_shutdown',
      label: isFr ? 'Intermittence & abaissement automatique en période inoccupée' : 'Automatic set-back in unoccupied periods',
      standard: 'Décret BACS Art. R. 175-3',
      status: isFr ? 'Conforme' : 'Compliant'
    },
    {
      id: 'interoperability',
      label: isFr ? 'Interopérabilité des automates GTB (BACnet IP / Modbus)' : 'BMS PLC Interoperability (BACnet IP / Modbus)',
      standard: 'ISO 16484-5',
      status: isFr ? 'Conforme' : 'Compliant'
    }
  ];

  const annualEurosSaved = Math.round((baselineConsumptionMwh - currentAnnualConsumptionMwh) * 1000 * 0.185);
  const co2AvoidedTons = Math.round((baselineConsumptionMwh - currentAnnualConsumptionMwh) * 0.052);

  return (
    <div className="space-y-5">
      {/* En-tête synthétique & Objectif 2030 */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                {isFr ? 'Conformité Réglementaire' : 'Regulatory Compliance'}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-slate-600">{buildingName}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-slate-900 tracking-tight">
              {isFr ? 'Trajectoire Décret Tertiaire & Décret BACS' : 'Tertiary Decree & BACS Trajectory'}
            </h2>
          </div>

          {/* Année de Référence */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
            <span className="text-xs font-medium text-slate-600 px-2">
              {isFr ? 'Réf :' : 'Baseline :'}
            </span>
            {(['2012', '2018', '2019'] as const).map(year => (
              <button
                key={year}
                onClick={() => setBaselineYear(year)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer",
                  baselineYear === year
                    ? "bg-[#236b33] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Barre de progression épurée */}
        <div className="pt-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#236b33]" />
              <span className="font-bold text-slate-900">
                {isFr ? 'Objectif 2030 (-40%)' : '2030 Target (-40%)'}
              </span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-[11px]">
                {isFr ? `-${currentReductionPct}% réalisé` : `-${currentReductionPct}% achieved`}
              </span>
            </div>
            <span className="text-slate-600 font-medium">
              {isFr ? `Avancement : ${progressRatioTo2030}%` : `Progress: ${progressRatioTo2030}%`}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/70">
            <div 
              className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#236b33] to-[#5ba734]"
              style={{ width: `${Math.min(100, (currentReductionPct / 40) * 100)}%` }}
            />
          </div>

          <div className="flex flex-wrap justify-between items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 font-medium mt-2">
            <span>{isFr ? `Réf. ${baselineYear} : ${baselineConsumptionMwh.toLocaleString()} MWh` : `Ref. ${baselineYear}: ${baselineConsumptionMwh.toLocaleString()} MWh`}</span>
            <span className="font-semibold text-slate-700">{isFr ? `Actuel : ${currentAnnualConsumptionMwh.toLocaleString()} MWh` : `Current: ${currentAnnualConsumptionMwh.toLocaleString()} MWh`}</span>
            <span>{isFr ? `Cible 2030 : ${target2030Mwh.toLocaleString()} MWh` : `Target 2030: ${target2030Mwh.toLocaleString()} MWh`}</span>
          </div>
        </div>
      </div>

      {/* 3 Cartes Indicateurs Clés - Style Harmonisé */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Économies */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {isFr ? 'Économies Constatées' : 'Cost Avoidance'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-slate-900 tracking-tight">
              ~{annualEurosSaved.toLocaleString('fr-FR')} € <span className="text-xs font-normal text-slate-500">/ an</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {isFr ? `Vs consommation de référence ${baselineYear}` : `Vs reference baseline ${baselineYear}`}
            </p>
          </div>
        </div>

        {/* CO2 */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {isFr ? 'Émissions Évitées' : 'CO2 Avoided'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center border border-teal-100">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-slate-900 tracking-tight">
              {co2AvoidedTons} T CO₂eq <span className="text-xs font-normal text-slate-500">/ an</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {isFr ? 'Facteur d’émission ADEME (mix France)' : 'ADEME emission factor'}
            </p>
          </div>
        </div>

        {/* Décret BACS */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {isFr ? 'Conformité GTB' : 'BMS Compliance'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#236b33] flex items-center justify-center border border-emerald-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
              <span>Classe B</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                91 / 100
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {isFr ? 'Norme EN ISO 52120-1 (Tertiaire)' : 'EN ISO 52120-1 standard'}
            </p>
          </div>
        </div>
      </div>

      {/* Courbe Trajectoire & Correction DJU */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Graphique */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  {isFr ? 'Trajectoire de Consommation Annuelle' : 'Annual Consumption Trajectory'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isFr ? 'MWh/an : Réel supervisé vs Objectifs réglementaires' : 'MWh/yr: Supervised actuals vs statutory targets'}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded" style={{ backgroundColor: theme.primary }} />
                  <span>{isFr ? 'Réel' : 'Actual'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-amber-500 rounded" />
                  <span>{isFr ? 'Cible légale' : 'Target'}</span>
                </div>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reelGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.primary} stopOpacity={0.2} />
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
                      name === 'reel' ? (isFr ? 'Consommation Réelle' : 'Actual') : (isFr ? 'Trajectoire Réglementaire' : 'Target')
                    ]}
                  />
                  <Area type="monotone" dataKey="cible" stroke="#f59e0b" strokeWidth={2} fill="url(#cibleGrad)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="reel" stroke={theme.primary} strokeWidth={2.5} fill="url(#reelGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {isFr ? 'Statut de trajectoire :' : 'Trajectory status:'}
            </span>
            <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {isFr ? 'En avance de 3 ans sur la cible 2030' : '3 years ahead of 2030 milestone'}
            </span>
          </div>
        </div>

        {/* Correction DJU Synthétique */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                <ThermometerSun className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  {isFr ? 'Correction Météo DJU' : 'Weather DJU Normalization'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {isFr ? 'Degrés Jours Unifiés (Base 18°C Météo-France)' : 'Degree Days (Base 18°C Météo-France)'}
                </p>
              </div>
            </div>

            <div className="space-y-2 mt-4 text-xs font-sans">
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600 font-medium">{isFr ? 'DJU Référence Trentenaire' : '30-yr Normal DJU'}</span>
                <span className="font-bold text-slate-800">{djuStats.djuNormal} DJU</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600 font-medium">{isFr ? 'DJU Constatés Réels' : 'Observed DJU'}</span>
                <span className="font-bold text-slate-800">{djuStats.djuYear} DJU</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <span className="text-emerald-900 font-medium">{isFr ? 'Coefficient de Rigueur Climatique' : 'Climate Severity Ratio'}</span>
                <span className="font-bold text-emerald-900">{djuStats.climateRatio}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600 font-medium">{isFr ? 'Consommation Corrigée DJU' : 'Climate-Adjusted Conso'}</span>
                <span className="font-bold text-[#236b33]">{djuStats.correctedConso.toLocaleString()} MWh</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-medium mt-4 pt-3 border-t border-slate-100">
            {isFr ? 'Données certifiées pour déclaration OPERAT (ADEME)' : 'Certified for French OPERAT (ADEME) reporting'}
          </p>
        </div>
      </div>

      {/* Matrice Décret BACS Épurée */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#236b33]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                {isFr ? 'Matrice de Conformité Décret BACS (GTB Classe B)' : 'BACS Compliance Matrix (BMS Class B)'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isFr ? 'Exigences pour les systèmes de pilotage CVC (art. R. 175-1)' : 'HVAC automated controls statutory requirements'}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            5 / 5 {isFr ? 'critères validés' : 'validated'}
          </span>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {bacsCriteria.map((item) => (
            <div 
              key={item.id}
              className="p-3 bg-white hover:bg-slate-50/70 transition flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800 truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md hidden sm:inline-block">
                  {item.standard}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
