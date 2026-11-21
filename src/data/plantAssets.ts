import type {
  PowerPackModelType,
  PumpHealthStatus,
  PumpTelemetrySnapshot,
  VernacularLang,
} from '../utils/pumpModel';

export interface PlantPumpAsset {
  id: string;
  name: string;
  shortName: string;
  line: string;
  bay: string;
  pumpSpec: string;
  architectureLabel: string;
  modelType: PowerPackModelType;
  tankCapacityL: number;
  motorPowerKw: number;
  status: PumpHealthStatus;
  healthScore: number;
  confidencePct: number;
  daysLeft: number;
  flaggedComponent: string;
  lastUpdated: string;
  telemetry: PumpTelemetrySnapshot;
  historicalLabels: string[];
  historicalEtaV: number[];
  forecastLabels: string[];
  actions: Record<VernacularLang, string>;
}

export interface PredictionSignalRow {
  signal: string;
  tapMethod: string;
  earlyPattern: string;
  likelyFault: string;
  leadTime: string;
}

export const PLANT_ASSETS: PlantPumpAsset[] = [
  {
    id: 'HPU-01',
    name: 'HPU-01 · 250T Forging Press',
    shortName: '250T Forging Press',
    line: 'Press Shop Bay A',
    bay: 'Bay A-01',
    pumpSpec: 'Axial Piston A10VSO 71 · 210 bar',
    architectureLabel: 'Compact Top-Mount HPU',
    modelType: 'compact_hpu',
    tankCapacityL: 250,
    motorPowerKw: 18.5,
    status: 'degraded',
    healthScore: 68,
    confidencePct: 84,
    daysLeft: 28,
    flaggedComponent: 'Piston Shoe Wear',
    lastUpdated: '12s ago',
    telemetry: {
      volumetricEfficiencyPct: 85.4,
      caseDrainLpm: 3.5,
      oilDeltaTempC: 11.4,
      pressureRampBarPerSec: 204,
      operatingPressureBar: 205,
      mainFlowLpm: 77.2,
      tankTempC: 54.8,
      oilLevelPct: 86,
      motorCurrentA: 31.4,
      vibrationMmS: 3.8,
    },
    historicalLabels: ['W-7', 'W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'Now'],
    historicalEtaV: [93.1, 92.4, 91.5, 90.2, 89.1, 87.9, 86.6, 85.4],
    forecastLabels: ['+1W', '+2W', '+3W', '+4W'],
    actions: {
      en: 'Case drain up 42% over 6 weeks → Piston shoe wear likely → Plan seal & slipper swap during Sunday shutdown (~28 days left).',
      ta: 'கேஸ்-ட்ரெய்ன் ஓட்டம் 6 வாரங்களில் 42% அதிகரித்துள்ளது → பிஸ்டன் ஷூ தேய்மானம் → அடுத்த ஞாயிறு பராமரிப்பில் பம்ப் கிட் மாற்றவும் (~28 நாட்கள் மீதம்).',
      hi: 'पिछले 6 हफ्तों में केस-ड्रेन फ्लो 42% बढ़ा है → पिस्टन शू घिसाव की संभावना → रविवार के शटडाउन में किट बदलने की योजना बनाएं (~28 दिन शेष).',
    },
  },
  {
    id: 'HPU-02',
    name: 'HPU-02 · 400T Injection Molder #4',
    shortName: '400T Injection Molder #4',
    line: 'Molding Line 2',
    bay: 'Bay B-04',
    pumpSpec: 'Variable Displacement 45cc · 185 bar · Dual Accumulator',
    architectureLabel: 'Dual-Accumulator Press HPU',
    modelType: 'accumulator_hpu',
    tankCapacityL: 400,
    motorPowerKw: 22.0,
    status: 'healthy',
    healthScore: 94,
    confidencePct: 92,
    daysLeft: 142,
    flaggedComponent: 'None — Nominal Baseline',
    lastUpdated: '8s ago',
    telemetry: {
      volumetricEfficiencyPct: 94.2,
      caseDrainLpm: 1.6,
      oilDeltaTempC: 6.1,
      pressureRampBarPerSec: 244,
      operatingPressureBar: 185,
      mainFlowLpm: 63.8,
      tankTempC: 44.2,
      oilLevelPct: 93,
      motorCurrentA: 34.2,
      vibrationMmS: 1.9,
    },
    historicalLabels: ['W-7', 'W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'Now'],
    historicalEtaV: [94.6, 94.5, 94.4, 94.5, 94.3, 94.2, 94.3, 94.2],
    forecastLabels: ['+1W', '+2W', '+3W', '+4W'],
    actions: {
      en: 'Volumetric efficiency steady at 94.2% → Accumulator pre-charge & case drain nominal → Continue 500-hour filter schedule.',
      ta: 'பம்ப் செயல்திறன் 94.2% சீராக உள்ளது → கேஸ்-ட்ரெய்ன் இயல்பானது → வழக்கமான 500 மணி நேர ஆயில் பில்டர் சோதனையைத் தொடரவும்.',
      hi: 'वॉल्यूमेट्रिक एफिशिएंसी 94.2% पर स्थिर है → केस-ड्रेन सामान्य है → नियमित 500-घंटे ऑयल फ़िल्टर जांच जारी रखें।',
    },
  },
  {
    id: 'HPU-03',
    name: 'HPU-03 · Die-Casting Clamp Pack',
    shortName: 'Die-Casting Clamp Pack',
    line: 'Foundry Cell 3',
    bay: 'Bay C-03',
    pumpSpec: 'Axial Piston 100cc · 230 bar · Shell-Tube Cooler',
    architectureLabel: 'Cooler-Equipped Compact HPU',
    modelType: 'cooler_hpu',
    tankCapacityL: 320,
    motorPowerKw: 30.0,
    status: 'failing',
    healthScore: 36,
    confidencePct: 89,
    daysLeft: 6,
    flaggedComponent: 'Valve Plate Scoring',
    lastUpdated: '5s ago',
    telemetry: {
      volumetricEfficiencyPct: 75.8,
      caseDrainLpm: 5.4,
      oilDeltaTempC: 15.2,
      pressureRampBarPerSec: 171,
      operatingPressureBar: 194,
      mainFlowLpm: 92.4,
      tankTempC: 66.4,
      oilLevelPct: 79,
      motorCurrentA: 49.6,
      vibrationMmS: 6.4,
    },
    historicalLabels: ['W-7', 'W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'Now'],
    historicalEtaV: [88.9, 87.4, 85.8, 83.9, 81.8, 79.9, 77.8, 75.8],
    forecastLabels: ['+1W', '+2W', '+3W', '+4W'],
    actions: {
      en: 'URGENT: Oil ΔT +15.2°C and efficiency at 75.8% → Valve plate scoring → Swap standby cartridge before Friday shift (~6 days left).',
      ta: 'அவசரம்: ஆயில் வெப்ப உயர்வு +15.2°C, செயல்திறன் 75.8% → வால்வ் பிளேட் தேய்மானம் → வெள்ளிக்கிழமைக்குள் மாற்று பம்ப் பொருத்தவும் (~6 நாட்கள்).',
      hi: 'तुरंत ध्यान दें: ऑयल तापमान ΔT +15.2°C और दक्षता 75.8% → वॉल्व प्लेट स्कोरिंग → शुक्रवार की शिफ्ट से पहले स्टैंडबाय पंप लगाएं (~6 दिन शेष).',
    },
  },
  {
    id: 'HPU-04',
    name: 'HPU-04 · Broaching Line Skid',
    shortName: 'Broaching Line Skid',
    line: 'Machining Bay C',
    bay: 'Bay C-08',
    pumpSpec: '3× Parallel Motor-Pump Skid · 160 bar Header',
    architectureLabel: 'Multi-Pump Parallel Skid',
    modelType: 'skid_bank_hpu',
    tankCapacityL: 650,
    motorPowerKw: 45.0,
    status: 'healthy',
    healthScore: 89,
    confidencePct: 91,
    daysLeft: 96,
    flaggedComponent: 'Mild Return Filter ΔP',
    lastUpdated: '15s ago',
    telemetry: {
      volumetricEfficiencyPct: 91.8,
      caseDrainLpm: 2.1,
      oilDeltaTempC: 7.4,
      pressureRampBarPerSec: 229,
      operatingPressureBar: 158,
      mainFlowLpm: 148.5,
      tankTempC: 47.1,
      oilLevelPct: 91,
      motorCurrentA: 68.4,
      vibrationMmS: 2.3,
    },
    historicalLabels: ['W-7', 'W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'Now'],
    historicalEtaV: [92.6, 92.5, 92.4, 92.2, 92.1, 92.0, 91.9, 91.8],
    forecastLabels: ['+1W', '+2W', '+3W', '+4W'],
    actions: {
      en: 'All 3 skid pumps balanced (89/100) → Minor return-line ΔP rise → Inspect header strainer during month-end PM.',
      ta: 'மூன்று பம்புகளும் சீராக உள்ளன (89/100) → ரிட்டர்ன் பில்டர் அழுத்தம் சிறிது அதிகரிப்பு → மாத இறுதியில் ஸ்ட்ரெய்னர் சுத்தம் செய்யவும்.',
      hi: 'तीनों स्किड पंप संतुलित हैं (89/100) → रिटर्न लाइन दबाव में हल्की वृद्धि → महीने के अंत में हेडर स्ट्रेनर की जांच करें।',
    },
  },
  {
    id: 'HPU-05',
    name: 'HPU-05 · Central Stamping Station',
    shortName: 'Central Stamping Station',
    line: 'Heavy Stamping Hall',
    bay: 'Bay D-01',
    pumpSpec: '6-Motor Dual-Bank Central HPU · 240 bar · 1,800L Tank',
    architectureLabel: 'Dual-Bank Central Station',
    modelType: 'central_station_hpu',
    tankCapacityL: 1800,
    motorPowerKw: 110.0,
    status: 'degraded',
    healthScore: 74,
    confidencePct: 86,
    daysLeft: 39,
    flaggedComponent: 'Bank-A Pump #2 Swash Bearing',
    lastUpdated: '9s ago',
    telemetry: {
      volumetricEfficiencyPct: 87.2,
      caseDrainLpm: 3.1,
      oilDeltaTempC: 10.6,
      pressureRampBarPerSec: 193,
      operatingPressureBar: 234,
      mainFlowLpm: 286.0,
      tankTempC: 53.5,
      oilLevelPct: 88,
      motorCurrentA: 142.8,
      vibrationMmS: 4.1,
    },
    historicalLabels: ['W-7', 'W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'Now'],
    historicalEtaV: [92.8, 92.1, 91.4, 90.6, 89.8, 88.9, 88.1, 87.2],
    forecastLabels: ['+1W', '+2W', '+3W', '+4W'],
    actions: {
      en: 'Bank-A Pump #2 pressure ramp slowing (193 bar/s) → Swash bearing fatigue → Switch Bank-B lead and schedule bearing kit in ~39 days.',
      ta: 'பேங்க்-A பம்ப் #2 அழுத்த வேகம் குறைகிறது (193 bar/s) → ஸ்வாஷ் பேரிங் தேய்மானம் → பேங்க்-B ஐ முதன்மைப்படுத்தி 39 நாட்களில் பராமரிக்கவும்.',
      hi: 'बैंक-A पंप #2 का प्रेशर रैंप धीमा है (193 bar/s) → स्वैश बेयरिंग घिसाव → बैंक-B को मुख्य बनाएं और ~39 दिनों में बेयरिंग किट बदलें।',
    },
  },
];

export const PREDICTION_SIGNALS: PredictionSignalRow[] = [
  {
    signal: 'Volumetric Efficiency (ηv)',
    tapMethod: 'Flow (Q1) / Nominal Displacement Ratio',
    earlyPattern: 'Steady 0.8–1.5% weekly downward regression slope across identical press cycle loads.',
    likelyFault: 'Internal bypass across piston-to-bore clearances or worn port plate.',
    leadTime: '25–40 days',
  },
  {
    signal: 'Case-Drain Flow (Q_drain)',
    tapMethod: 'Inline Drain Flow Sensor via M12 Tap',
    earlyPattern: 'Sustained rise above 2.5% of rated pump output even while discharge pressure holds.',
    likelyFault: 'Piston slipper wear, cylinder barrel scoring, or shaft seal fatigue.',
    leadTime: '20–35 days',
  },
  {
    signal: 'Oil Temperature ΔT',
    tapMethod: 'RTD / 4–20mA Suction vs Case-Drain Tap',
    earlyPattern: 'Pump outlet-to-tank temperature delta widening by +4°C to +8°C at constant ambient temp.',
    likelyFault: 'Internal friction heat from thinning oil film or incipient bearing seizure.',
    leadTime: '14–28 days',
  },
  {
    signal: 'Pressure Ramp Rate (dP/dt)',
    tapMethod: 'Existing 0–250 bar Transducer M12 T-Splitter',
    earlyPattern: '12–18% lag in time-to-peak clamp pressure during stroke initiation.',
    likelyFault: 'Sluggish swash-plate compensator spool, cavitation, or aeration.',
    leadTime: '10–21 days',
  },
];
