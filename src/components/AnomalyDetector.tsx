import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Cpu, 
  Sliders, 
  CheckCircle2, 
  Zap, 
  Thermometer, 
  Activity, 
  RotateCcw, 
  Sparkles, 
  ShieldAlert, 
  ArrowRight, 
  Clock, 
  Gauge, 
  AlertCircle,
  Wrench,
  Radio
} from 'lucide-react';
import { cn } from '../lib/utils';

export type AnomalyCategory = 'conso_high' | 'conso_low' | 'gtb_temperature' | 'gtb_equipment';

export interface AnomalyItem {
  id: string;
  category: AnomalyCategory;
  severity: 'critical' | 'warning' | 'info';
  targetId: string;
  targetName: string;
  targetType: 'building' | 'gtb';
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  measuredValue: string;
  thresholdValue: string;
  deltaPercent?: number;
  recommendationFr: string;
  recommendationEn: string;
  actionType: 'inspect_building' | 'navigate_gtb' | 'fix_gtb_setpoint' | 'rearm_gtb';
  detectedAt: string;
}

export interface AnomalyThresholds {
  highConsoRatio: number; // e.g. 1.25 (+25% above nominal)
  lowConsoRatio: number;  // e.g. 0.40 (-60% below nominal)
  maxHeatingTemp: number; // e.g. 22.0°C
  minHeatingTemp: number; // e.g. 17.5°C
  minCoolingTemp: number; // e.g. 23.5°C
}

export const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  highConsoRatio: 1.25,
  lowConsoRatio: 0.40,
  maxHeatingTemp: 22.5,
  minHeatingTemp: 17.0,
  minCoolingTemp: 23.0,
};

// Helper parsing numeric energy
export const parseKwh = (val: string | number | undefined): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '.').replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
};

// Pure detection function
export const detectSystemAnomalies = (
  buildingsList: any[],
  gtbEquipments: any[] = [],
  gtbControls?: {
    heatingSetpoint?: number;
    coolingSetpoint?: number;
    globalMode?: string;
  },
  thresholds: AnomalyThresholds = DEFAULT_THRESHOLDS
): AnomalyItem[] => {
  const anomalies: AnomalyItem[] = [];
  const nowStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  // 1. DÉTECTION SURCONSOMMATION & SOUS-CONSOMMATION PAR BÂTIMENT
  buildingsList.forEach((b) => {
    const kwh = parseKwh(b.consumption);
    const surfaceStr = String(b.surface || '').replace(/[^0-9.]/g, '');
    const surface = parseFloat(surfaceStr) || 1000;
    const occupancyPrct = parseInt(String(b.occupancy || '95').replace(/[^0-9]/g, ''), 10) || 90;
    
    // Déterminer la référence nominale selon la typologie et la surface
    // Typologies Montpellier: T3 Familial (1300m² nominal ~196 kWh/j), T1bis Étudiant (750m² nominal ~114 kWh/j)
    const isLarge = surface >= 1000;
    const nominalKwh = isLarge ? 196 : 114;
    const highThreshold = Math.round(nominalKwh * thresholds.highConsoRatio);
    const lowThreshold = Math.round(nominalKwh * thresholds.lowConsoRatio);
    const density = kwh / surface; // kWh/m²/j

    // A. DÉTECTION CONSO TROP ÉLEVÉE (SURCONSOMMATION)
    if (kwh > highThreshold || (density > 0.22 && kwh > nominalKwh)) {
      const delta = Math.round(((kwh - nominalKwh) / nominalKwh) * 100);
      const isExtreme = delta >= 40;
      
      anomalies.push({
        id: `anom-high-${b.id}`,
        category: 'conso_high',
        severity: isExtreme ? 'critical' : 'warning',
        targetId: b.id.toString(),
        targetName: b.name || `Bâtiment ${b.id}`,
        targetType: 'building',
        titleFr: isExtreme ? 'Surconsommation Critique' : 'Surconsommation Détectée',
        titleEn: isExtreme ? 'Critical Excess Consumption' : 'Overconsumption Detected',
        descriptionFr: `Consommation mesurée à ${Math.round(kwh)} kWh/j contre une référence nominale de ${nominalKwh} kWh/j (+${delta}% de surcroît). Densité anormale de ${(density * 100).toFixed(1)} Wh/m²/j.`,
        descriptionEn: `Recorded consumption is ${Math.round(kwh)} kWh/day vs baseline ${nominalKwh} kWh/day (+${delta}% increase). Abnormal intensity rate.`,
        measuredValue: `${Math.round(kwh)} kWh/j`,
        thresholdValue: `Nominal: ${nominalKwh} kWh/j (Seuil: ${highThreshold})`,
        deltaPercent: delta,
        recommendationFr: `Vérifier la consigne des ventilo-convecteurs / PAC VRV et l'absence de marche forcée en période d'occupation (${occupancyPrct}%). Activer le délestage préventif.`,
        recommendationEn: `Inspect VRV heat pump setpoints and unneeded active loads during occupancy (${occupancyPrct}%).`,
        actionType: 'inspect_building',
        detectedAt: nowStr
      });
    }

    // B. DÉTECTION CONSO TROP BASSE (SOUS-CONSOMMATION / DÉFAUT TÉLÉRELÈVE)
    if (kwh < lowThreshold && occupancyPrct >= 50) {
      const delta = Math.round(((nominalKwh - kwh) / nominalKwh) * 100);
      const isZero = kwh <= 5;

      anomalies.push({
        id: `anom-low-${b.id}`,
        category: 'conso_low',
        severity: isZero ? 'critical' : 'warning',
        targetId: b.id.toString(),
        targetName: b.name || `Bâtiment ${b.id}`,
        targetType: 'building',
        titleFr: isZero ? 'Coupure Comptage / Décrochage TGBT' : 'Sous-consommation Suspecte',
        titleEn: isZero ? 'Zero Meter Reading / TGBT Outage' : 'Suspicious Under-consumption',
        descriptionFr: isZero 
          ? `Consommation nulle ou quasi-inexistante (${Math.round(kwh)} kWh) alors que le bâtiment accueille ${occupancyPrct}% de résidents. Rupture de transmission du compteur Linky/M-Bus ou disjoncteur général déclenché.`
          : `Consommation anormalement basse (${Math.round(kwh)} kWh/j, -${delta}% vs référence de ${nominalKwh} kWh/j) pour un taux d'occupation de ${occupancyPrct}%. Défaut potentiel de chaîne de mesure.`,
        descriptionEn: isZero
          ? `Near-zero consumption (${Math.round(kwh)} kWh) recorded while occupancy is ${occupancyPrct}%. Likely meter outage or comm drop.`
          : `Abnormally low power reading (${Math.round(kwh)} kWh/day, -${delta}% below ${nominalKwh} kWh) for ${occupancyPrct}% occupancy. Check energy telemetry.`,
        measuredValue: `${Math.round(kwh)} kWh/j`,
        thresholdValue: `Min attendu: ${lowThreshold} kWh/j`,
        deltaPercent: -delta,
        recommendationFr: `Interroger le concentrateur Modbus/Linky pour ce bâtiment, vérifier le bon raccordement des tores de mesure et tester la passerelle télérelève.`,
        recommendationEn: `Poll the Modbus/Linky gateway for this building and check the current transformer wiring and communication loop.`,
        actionType: 'inspect_building',
        detectedAt: nowStr
      });
    }
  });

  // 2. DÉTECTION DES ANOMALIES GTB / BMS (CONSIGNES CVC & AUTOMATES)
  const heating = gtbControls?.heatingSetpoint ?? 21.5;
  const cooling = gtbControls?.coolingSetpoint ?? 25.0;

  // A. Dérive consigne Chauffage GTB (trop élevée ou trop basse)
  if (heating > thresholds.maxHeatingTemp) {
    const excessDegrees = (heating - 20.0).toFixed(1);
    const estimatedWastePct = Math.round((heating - 20.0) * 7); // +7% de conso par degré au-delà de 20°C (norme ADEME)
    anomalies.push({
      id: 'anom-gtb-heating-high',
      category: 'gtb_temperature',
      severity: heating >= 23.5 ? 'critical' : 'warning',
      targetId: 'gtb-cvc-heating',
      targetName: 'Supervision CVC - Consigne Chauffage',
      targetType: 'gtb',
      titleFr: 'Surchauffe GTB : Consigne Hors Plage Éco',
      titleEn: 'BMS Overheating: Setpoint Exceeds Eco Limit',
      descriptionFr: `La consigne de chauffage centrale est fixée à ${heating}°C (seuil max recommandé: ${thresholds.maxHeatingTemp}°C). Chaque degré au-delà de 20°C engendre ~7% de surconsommation, soit environ +${estimatedWastePct}% de dérive énergétique.`,
      descriptionEn: `Heating setpoint is at ${heating}°C (recommended limit: ${thresholds.maxHeatingTemp}°C). Generates ~${estimatedWastePct}% unnecessary thermal load.`,
      measuredValue: `${heating}°C`,
      thresholdValue: `Max conseillé: ${thresholds.maxHeatingTemp}°C`,
      deltaPercent: estimatedWastePct,
      recommendationFr: `Rabaisser la consigne à 20.0°C ou activer la régulation adaptative selon la courbe de chauffe extérieure.`,
      recommendationEn: `Lower setpoint to 20.0°C or re-engage automated weather-compensated curve.`,
      actionType: 'fix_gtb_setpoint',
      detectedAt: nowStr
    });
  } else if (heating < thresholds.minHeatingTemp && gtbControls?.globalMode !== 'GEL') {
    anomalies.push({
      id: 'anom-gtb-heating-low',
      category: 'gtb_temperature',
      severity: 'warning',
      targetId: 'gtb-cvc-heating-low',
      targetName: 'Supervision CVC - Consigne Chauffage',
      targetType: 'gtb',
      titleFr: 'Sous-Chauffe GTB : Risque d\'Inconfort Thermique',
      titleEn: 'BMS Under-heating: Resident Discomfort Risk',
      descriptionFr: `Consigne de chauffage à seulement ${heating}°C en période opérationnelle. Risque d'inconfort pour les usagers et réclamations thermiques.`,
      descriptionEn: `Heating setpoint set to ${heating}°C during operational hours. Risk of resident discomfort.`,
      measuredValue: `${heating}°C`,
      thresholdValue: `Min confort: ${thresholds.minHeatingTemp}°C`,
      recommendationFr: `Réajuster la consigne confort à 20.5°C pour respecter les standards thermiques RE2020.`,
      recommendationEn: `Adjust comfort setpoint back to 20.5°C to comply with thermal standards.`,
      actionType: 'fix_gtb_setpoint',
      detectedAt: nowStr
    });
  }

  // B. Dérive consigne Climatisation GTB (trop basse)
  if (cooling < thresholds.minCoolingTemp) {
    anomalies.push({
      id: 'anom-gtb-cooling-low',
      category: 'gtb_temperature',
      severity: 'warning',
      targetId: 'gtb-cvc-cooling-low',
      targetName: 'Supervision CVC - Consigne Climatisation',
      targetType: 'gtb',
      titleFr: 'Sur-Climatisation GTB : Consigne Froid Trop Basse',
      titleEn: 'Excessive BMS Chilling: Low Cooling Setpoint',
      descriptionFr: `La consigne de refroidissement est paramétrée à ${cooling}°C (seuil mini recommandé: ${thresholds.minCoolingTemp}°C). Risque de condensation sur gaines et surconsommation du groupe froid.`,
      descriptionEn: `Cooling setpoint is ${cooling}°C (recommended minimum: ${thresholds.minCoolingTemp}°C). High energy drain and condensation hazard.`,
      measuredValue: `${cooling}°C`,
      thresholdValue: `Min conseillé: ${thresholds.minCoolingTemp}°C`,
      recommendationFr: `Relever la consigne froid à 25.0°C pour maintenir un écart de confort sain avec l'extérieur.`,
      recommendationEn: `Raise cooling setpoint to 25.0°C to preserve energy and prevent duct condensation.`,
      actionType: 'fix_gtb_setpoint',
      detectedAt: nowStr
    });
  }

  // C. Conflit Chaud / Froid simultanés (incohérence d'automatisme)
  if (heating >= cooling) {
    anomalies.push({
      id: 'anom-gtb-conflict',
      category: 'gtb_temperature',
      severity: 'critical',
      targetId: 'gtb-cvc-conflict',
      targetName: 'Régulateur GTB - Boucle CVC',
      targetType: 'gtb',
      titleFr: 'Conflit Thermique Critique : Chauffage >= Climatisation',
      titleEn: 'Critical Thermal Conflict: Heating >= Cooling',
      descriptionFr: `La consigne de chauffage (${heating}°C) est supérieure ou égale à la consigne de froid (${cooling}°C). Les émetteurs chaud et froid s'annulent mutuellement en provoquant une surconsommation massive !`,
      descriptionEn: `Heating setpoint (${heating}°C) overlaps cooling setpoint (${cooling}°C). Simultaneous heating and cooling triggers massive energy waste.`,
      measuredValue: `Chaud: ${heating}°C | Froid: ${cooling}°C`,
      thresholdValue: `Écart requis: >= 2.0°C`,
      recommendationFr: `Insérer une zone neutre d'au moins 2.5°C entre consigne chaud (20.5°C) et consigne froid (25.0°C).`,
      recommendationEn: `Establish an inter-stage deadband of at least 2.5°C between heating (20.5°C) and cooling (25.0°C).`,
      actionType: 'fix_gtb_setpoint',
      detectedAt: nowStr
    });
  }

  // D. Équipements GTB en alarme ou défaut de communication
  gtbEquipments.forEach((eq, idx) => {
    const status = String(eq.status || '').toLowerCase();
    const name = eq.name || `Équipement #${idx + 1}`;
    const category = eq.category || '';

    // Détection d'état en panne, alarme ou perte de communication
    if (
      status.includes('défaut') || 
      status.includes('panne') || 
      status.includes('alarme') || 
      status.includes('arrêté') ||
      status.includes('perte')
    ) {
      anomalies.push({
        id: `anom-gtb-eq-${idx}`,
        category: 'gtb_equipment',
        severity: status.includes('panne') || status.includes('alarme') ? 'critical' : 'warning',
        targetId: `eq-${idx}`,
        targetName: `${name} (${eq.location || 'GTB'})`,
        targetType: 'gtb',
        titleFr: `Défaut Automate : ${name}`,
        titleEn: `BMS Hardware Defect: ${name}`,
        descriptionFr: `L'équipement (${category} - ${eq.brandModel || 'Standard'}) signale un état anormal : « ${eq.status} ». Protocole: ${eq.protocol || 'BACnet'}.`,
        descriptionEn: `Equipment reports abnormal operational state: "${eq.status}". Protocol: ${eq.protocol || 'BACnet'}.`,
        measuredValue: eq.status,
        thresholdValue: 'Attendu: Actif / Nominal',
        recommendationFr: `Vérifier le bus de communication, réarmer le disjoncteur thermique ou relancer le cycle de supervision.`,
        recommendationEn: `Check the fieldbus trunk, acknowledge alarm and inspect the local controller.`,
        actionType: 'rearm_gtb',
        detectedAt: nowStr
      });
    }
  });

  return anomalies;
};

// Helper to determine single building anomaly state
export const getBuildingAnomalyStatus = (
  building: any, 
  anomalies: AnomalyItem[]
): {
  status: 'OPTIMAL' | 'ALERTE' | 'ATTENTION';
  labelFr: string;
  labelEn: string;
  badgeClass: string;
  anomaly?: AnomalyItem;
} => {
  const bId = building.id.toString();
  const bAnomalies = anomalies.filter(a => a.targetId === bId);

  const high = bAnomalies.find(a => a.category === 'conso_high');
  if (high) {
    return {
      status: 'ALERTE',
      labelFr: 'Surconsommation',
      labelEn: 'High Consumption',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs',
      anomaly: high
    };
  }

  const low = bAnomalies.find(a => a.category === 'conso_low');
  if (low) {
    return {
      status: 'ATTENTION',
      labelFr: 'Sous-conso suspecte',
      labelEn: 'Low Consumption',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs',
      anomaly: low
    };
  }

  return {
    status: 'OPTIMAL',
    labelFr: 'Optimal',
    labelEn: 'Optimal',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
  };
};

interface AutoAnomalyScannerCardProps {
  language: string;
  buildingsList: any[];
  gtbEquipments?: any[];
  gtbControls?: {
    heatingSetpoint?: number;
    coolingSetpoint?: number;
    globalMode?: string;
  };
  onSelectBuilding?: (id: string) => void;
  onNavigateView?: (view: string) => void;
  onOptimize?: () => void;
  onFixGtbSetpoint?: (heating: number, cooling: number) => void;
  onSimulateScenario?: (scenario: 'high' | 'low' | 'gtb' | 'reset') => void;
}

export const AutoAnomalyScannerCard: React.FC<AutoAnomalyScannerCardProps> = ({
  language,
  buildingsList,
  gtbEquipments = [],
  gtbControls,
  onSelectBuilding,
  onNavigateView,
  onOptimize,
  onFixGtbSetpoint,
  onSimulateScenario
}) => {
  const isFr = language === 'fr';
  const [activeFilter, setActiveFilter] = useState<'all' | 'conso_high' | 'conso_low' | 'gtb'>('all');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [thresholds, setThresholds] = useState<AnomalyThresholds>(DEFAULT_THRESHOLDS);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Compute live detected anomalies
  const detectedAnomalies = useMemo(() => {
    return detectSystemAnomalies(buildingsList, gtbEquipments, gtbControls, thresholds);
  }, [buildingsList, gtbEquipments, gtbControls, thresholds]);

  // Counts by category
  const counts = useMemo(() => {
    return {
      all: detectedAnomalies.length,
      high: detectedAnomalies.filter(a => a.category === 'conso_high').length,
      low: detectedAnomalies.filter(a => a.category === 'conso_low').length,
      gtb: detectedAnomalies.filter(a => a.category === 'gtb_temperature' || a.category === 'gtb_equipment').length,
      critical: detectedAnomalies.filter(a => a.severity === 'critical').length,
    };
  }, [detectedAnomalies]);

  // Filtered list
  const filteredAnomalies = useMemo(() => {
    if (activeFilter === 'conso_high') {
      return detectedAnomalies.filter(a => a.category === 'conso_high');
    }
    if (activeFilter === 'conso_low') {
      return detectedAnomalies.filter(a => a.category === 'conso_low');
    }
    if (activeFilter === 'gtb') {
      return detectedAnomalies.filter(a => a.category === 'gtb_temperature' || a.category === 'gtb_equipment');
    }
    return detectedAnomalies;
  }, [detectedAnomalies, activeFilter]);

  const showFeedback = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

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
          showFeedback(isFr ? "Diagnostic automatique terminé !" : "Automated scan finished!");
        }, 600);
      }, 600);
    }, 600);
  };

  const handleAutoFixGtb = () => {
    if (onFixGtbSetpoint) {
      onFixGtbSetpoint(20.5, 25.0);
      showFeedback(isFr ? "Consignes GTB recalibrées sur 20.5°C (Chauffage) / 25.0°C (Climatisation)" : "BMS setpoints re-aligned to 20.5°C / 25.0°C");
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 flex flex-col gap-4 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
              <Cpu className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-display text-slate-900 flex items-center gap-2">
                {isFr ? "Détecteur d'Anomalies Conso & GTB" : "Consumption & BMS Anomaly Detector"}
                {counts.all > 0 && (
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                    counts.critical > 0 ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-amber-100 text-amber-700 border border-amber-200"
                  )}>
                    {counts.all} {isFr ? "anomalie(s)" : "issue(s)"}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isFr 
                  ? "Surveillance en temps réel des surconsommations, sous-consommations et régulations GTB." 
                  : "Continuous real-time tracking of high, low consumption and BMS drifts."}
              </p>
            </div>
          </div>
        </div>

        {/* Action toolbar */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowSettings(!showSettings)}
            title={isFr ? "Réglage des seuils de détection" : "Detection thresholds configuration"}
            className={cn(
              "px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95",
              showSettings ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isFr ? "Seuils" : "Thresholds"}</span>
          </button>

          <button
            onClick={handleStartScan}
            disabled={isScanning}
            className="px-3 py-1.5 bg-emerald-900 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Clock className={cn("w-3.5 h-3.5", isScanning && "animate-spin")} />
            <span>{isScanning ? (isFr ? "Scan en cours..." : "Scanning...") : (isFr ? "Lancer Scan" : "Run Scan")}</span>
          </button>
        </div>
      </div>

      {/* Action Notice toast */}
      {actionNotice && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Threshold configuration drawer / bar */}
      {showSettings && (
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-slate-500" />
              {isFr ? "Calibrage des Seuils de Détection" : "Detection Thresholds Tuning"}
            </span>
            <button
              onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              {isFr ? "Réinitialiser" : "Reset"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Seuil Surconso */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                <span>{isFr ? "Surconsommation max" : "Max Overconsumption"}</span>
                <span className="text-rose-600 font-extrabold">+{Math.round((thresholds.highConsoRatio - 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="1.10"
                max="1.60"
                step="0.05"
                value={thresholds.highConsoRatio}
                onChange={(e) => setThresholds(t => ({ ...t, highConsoRatio: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
              />
              <p className="text-[9px] text-slate-400 mt-1">{isFr ? "Déclenche l'alerte surconso si dépassement" : "Triggers high alert if exceeded"}</p>
            </div>

            {/* Seuil Sous-conso */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                <span>{isFr ? "Sous-conso minimale" : "Min Under-consumption"}</span>
                <span className="text-amber-600 font-extrabold">-{Math.round((1 - thresholds.lowConsoRatio) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.60"
                step="0.05"
                value={thresholds.lowConsoRatio}
                onChange={(e) => setThresholds(t => ({ ...t, lowConsoRatio: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <p className="text-[9px] text-slate-400 mt-1">{isFr ? "Déclenche défaut télérelève si trop bas" : "Triggers comm defect if below"}</p>
            </div>

            {/* Seuil Consigne GTB Chauffage */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                <span>{isFr ? "Consigne Max Chauffage GTB" : "Max BMS Heating"}</span>
                <span className="text-indigo-600 font-extrabold">{thresholds.maxHeatingTemp}°C</span>
              </div>
              <input
                type="range"
                min="20.5"
                max="24.0"
                step="0.5"
                value={thresholds.maxHeatingTemp}
                onChange={(e) => setThresholds(t => ({ ...t, maxHeatingTemp: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[9px] text-slate-400 mt-1">{isFr ? "Alerte de surchauffe automatique CVC" : "HVAC overheating warning limit"}</p>
            </div>
          </div>

          {/* Quick simulation buttons to easily test */}
          {onSimulateScenario && (
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isFr ? "Scénarios de test :" : "Test Scenarios:"}</span>
              <button
                onClick={() => { onSimulateScenario('high'); showFeedback(isFr ? "Scénario injecté : Surconsommation Bâtiment 2 (294 kWh)" : "Injected: High consumption Building 2"); }}
                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold transition"
              >
                + {isFr ? "Injecter Surconso (Trop haut)" : "Simulate High Conso"}
              </button>
              <button
                onClick={() => { onSimulateScenario('low'); showFeedback(isFr ? "Scénario injecté : Sous-conso Bâtiment 4 (14 kWh / Défaut compteur)" : "Injected: Low consumption Building 4"); }}
                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-[10px] font-bold transition"
              >
                - {isFr ? "Injecter Sous-conso (Trop bas)" : "Simulate Low Conso"}
              </button>
              <button
                onClick={() => { onSimulateScenario('gtb'); showFeedback(isFr ? "Scénario injecté : Dérive GTB (24.5°C + Alarme filtre VMC)" : "Injected: BMS drift"); }}
                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold transition"
              >
                ⚡ {isFr ? "Injecter Alerte GTB" : "Simulate BMS Anomaly"}
              </button>
              <button
                onClick={() => { onSimulateScenario('reset'); showFeedback(isFr ? "Toutes les consommations et consignes GTB rétablies à l'état optimal" : "Reset to optimal values"); }}
                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold transition"
              >
                ✓ {isFr ? "Rétablir Nominal" : "Reset to Nominal"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scanner Animation in Progress */}
      {isScanning ? (
        <div className="py-8 flex flex-col items-center justify-center text-center gap-3 bg-slate-50/50 rounded-2xl border border-slate-100 p-6 min-h-[160px]">
          <div className="relative flex items-center justify-center w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin" />
            <Cpu className="w-5 h-5 text-emerald-600 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {scanStep === 1 && (isFr ? "Vérification des consommations trop élevées (> +25%)..." : "Scanning for excessive consumption (> +25%)...")}
              {scanStep === 2 && (isFr ? "Détection des sous-consommations anormales & coupures télérelève..." : "Detecting under-consumption & meter communication outages...")}
              {scanStep === 3 && (isFr ? "Audit des consignes GTB CVC & automates..." : "Auditing BMS HVAC setpoints & field controllers...")}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {isFr ? "Analyse mathématique par rapport aux références nominales RE2020" : "Algorithmic comparison against nominal baseline standards"}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 overflow-x-auto no-scrollbar sm:flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap",
                activeFilter === 'all' 
                  ? "bg-slate-900 text-white shadow-2xs" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <span>{isFr ? "Toutes les anomalies" : "All anomalies"}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                activeFilter === 'all' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              )}>
                {counts.all}
              </span>
            </button>

            {/* Surconsommation (Trop haut) */}
            <button
              onClick={() => setActiveFilter('conso_high')}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap",
                activeFilter === 'conso_high' 
                  ? "bg-rose-600 text-white shadow-2xs" 
                  : "bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{isFr ? "Surconsommation" : "Overconsumption"}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                activeFilter === 'conso_high' ? "bg-white/20 text-white" : "bg-rose-200 text-rose-800"
              )}>
                {counts.high}
              </span>
            </button>

            {/* Sous-consommation (Trop bas) */}
            <button
              onClick={() => setActiveFilter('conso_low')}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap",
                activeFilter === 'conso_low' 
                  ? "bg-amber-600 text-white shadow-2xs" 
                  : "bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100"
              )}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{isFr ? "Sous-conso / Défaut" : "Under-conso / Defect"}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                activeFilter === 'conso_low' ? "bg-white/20 text-white" : "bg-amber-200 text-amber-800"
              )}>
                {counts.low}
              </span>
            </button>

            {/* Anomalies GTB */}
            <button
              onClick={() => setActiveFilter('gtb')}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap",
                activeFilter === 'gtb' 
                  ? "bg-indigo-600 text-white shadow-2xs" 
                  : "bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100"
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isFr ? "Anomalies GTB & CVC" : "BMS & HVAC Issues"}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                activeFilter === 'gtb' ? "bg-white/20 text-white" : "bg-indigo-200 text-indigo-800"
              )}>
                {counts.gtb}
              </span>
            </button>
          </div>

          {/* List of Anomalies */}
          <div className="space-y-3">
            {filteredAnomalies.length === 0 ? (
              <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-emerald-800">
                  {activeFilter === 'all' 
                    ? (isFr ? "Parc & GTB en fonctionnement optimal" : "Portfolio & BMS operating nominally")
                    : (isFr ? "Aucune anomalie dans cette catégorie" : "No issues detected in this category")}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  {isFr 
                    ? "Toutes les consommations mesurées et les consignes de régulation respectent scrupuleusement les plages attendues." 
                    : "All recorded metrics and regulation setpoints fall within authorized operating bounds."}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {filteredAnomalies.map((item) => {
                  const isHigh = item.category === 'conso_high';
                  const isLow = item.category === 'conso_low';
                  const isGtb = item.category === 'gtb_temperature' || item.category === 'gtb_equipment';

                  const borderColor = isHigh 
                    ? "border-rose-200 hover:border-rose-300 bg-rose-50/30" 
                    : isLow 
                    ? "border-amber-200 hover:border-amber-300 bg-amber-50/30" 
                    : "border-indigo-200 hover:border-indigo-300 bg-indigo-50/30";

                  const tagBg = isHigh 
                    ? "bg-rose-100 text-rose-700 border-rose-200" 
                    : isLow 
                    ? "bg-amber-100 text-amber-700 border-amber-200" 
                    : "bg-indigo-100 text-indigo-700 border-indigo-200";

                  const iconEl = isHigh ? (
                    <TrendingUp className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : isLow ? (
                    <TrendingDown className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : item.category === 'gtb_temperature' ? (
                    <Thermometer className="w-4 h-4 text-indigo-600 shrink-0" />
                  ) : (
                    <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
                  );

                  return (
                    <div 
                      key={item.id} 
                      className={cn(
                        "p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col gap-2.5 shadow-2xs",
                        borderColor
                      )}
                    >
                      {/* Top Header */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {iconEl}
                          <div>
                            <span className="text-xs font-bold text-slate-800">
                              {isFr ? item.titleFr : item.titleEn}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold ml-2">
                              • {item.targetName}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn("text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border", tagBg)}>
                            {isHigh 
                              ? (isFr ? "SURCONSOMMATION" : "OVERCONSUMPTION")
                              : isLow 
                              ? (isFr ? "SOUS-CONSO / DÉFAUT" : "UNDERCONSUMPTION")
                              : (isFr ? "DÉFAUT GTB" : "BMS ANOMALY")}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                            {item.detectedAt}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        {isFr ? item.descriptionFr : item.descriptionEn}
                      </p>

                      {/* Measured vs Expected Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-white rounded-lg border border-slate-200/80 text-xs">
                        <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "Valeur Relevée :" : "Observed Value:"}</span>
                          <span className={cn(
                            "font-black text-xs",
                            isHigh ? "text-rose-600" : isLow ? "text-amber-600" : "text-indigo-600"
                          )}>
                            {item.measuredValue}
                          </span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isFr ? "Référence Normale :" : "Nominal Standard:"}</span>
                          <span className="font-semibold text-xs text-slate-700">
                            {item.thresholdValue}
                          </span>
                        </div>
                      </div>

                      {/* Diagnostic & Action Footer */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                        <div className="text-[11px] text-slate-500 font-medium italic flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{isFr ? item.recommendationFr : item.recommendationEn}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {item.targetType === 'building' && onSelectBuilding && (
                            <button
                              onClick={() => onSelectBuilding(item.targetId)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isFr ? "Voir bâtiment" : "Inspect"}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}

                          {item.category === 'gtb_temperature' && onFixGtbSetpoint && (
                            <button
                              onClick={handleAutoFixGtb}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>{isFr ? "Réguler à 20.5°C" : "Set to 20.5°C"}</span>
                            </button>
                          )}

                          {onNavigateView && (
                            <button
                              onClick={() => onNavigateView(item.targetType === 'building' ? 'buildings' : 'gtb')}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <span>{item.targetType === 'building' ? (isFr ? "Parc" : "Buildings") : (isFr ? "Vue GTB" : "BMS View")}</span>
                            </button>
                          )}

                          {onOptimize && (
                            <button
                              onClick={onOptimize}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>{isFr ? "IA Délester" : "AI Balance"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
