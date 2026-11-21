// Pure domain logic for ProPump AI hydraulic regression model, 3D visual state,
// Chart.js trend projections, pricing estimator, lead pipeline, and client auth.

export type PumpHealthStatus = 'healthy' | 'degraded' | 'failing';
export type VernacularLang = 'en' | 'ta' | 'hi';
export type PowerPackModelType =
  | 'compact_hpu'
  | 'accumulator_hpu'
  | 'cooler_hpu'
  | 'skid_bank_hpu'
  | 'central_station_hpu';

export type SensorHighlightKey =
  | 'pressure'
  | 'flow'
  | 'case_drain'
  | 'oil_temp'
  | 'motor'
  | 'tank_level';

export interface PumpTelemetrySnapshot {
  volumetricEfficiencyPct: number; // Nominal 92-96%, warning <88%, failing <80%
  caseDrainLpm: number; // Nominal 1.2-2.2 L/min, warning >3.2, failing >5.0
  oilDeltaTempC: number; // Nominal 4-8°C across pump, warning >11°C
  pressureRampBarPerSec: number; // Nominal 220-260 bar/s, degraded <195 bar/s
  operatingPressureBar: number;
  mainFlowLpm: number;
  tankTempC?: number;
  oilLevelPct?: number;
  motorCurrentA?: number;
  vibrationMmS?: number;
}

export interface SideSensorReadout {
  key: SensorHighlightKey;
  id: string;
  label: string;
  value: string;
  nominalRange: string;
  signalTap: string;
  state: PumpHealthStatus;
}

export interface EdgeRegressionPayload {
  status: PumpHealthStatus;
  component: 'none' | 'piston_shoe' | 'valve_plate' | 'swash_bearing';
  days_left: number;
  health_score: number;
  eta_v_pct: number;
  confidence_pct: number;
}

export interface PumpVisualParams {
  status: PumpHealthStatus;
  label: string;
  coreHex: number;
  accentCss: string;
  emissiveIntensity: number;
  pressurePulseSpeed: number;
  flowPulseSpeed: number;
  caseDrainPulseSpeed: number;
  pulseFrequencyHz: number;
  flaggedComponentLabel: string;
  diagnosticTooltip: string;
  payload: EdgeRegressionPayload;
}

export interface RegressionSeries {
  labels: string[];
  historicalEtaV: (number | null)[];
  projectedEtaV: (number | null)[];
  thresholdLine: number[];
  slopePerWeek: number;
  daysToThreshold: number;
}

export interface LeadFormInput {
  fullName: string;
  companyName: string;
  contact: string;
  unitCount: number;
  inquiryType: 'pilot' | 'demo' | 'expert';
}

export interface LeadFormErrors {
  fullName?: string;
  companyName?: string;
  contact?: string;
  unitCount?: string;
}

export interface LoginFormInput {
  plantId: string;
  password: string;
}

export interface LoginFormErrors {
  plantId?: string;
  password?: string;
  general?: string;
}

export interface ClientSession {
  token: string;
  username: string;
  plantName: string;
  location: string;
  role: string;
}

export interface PricingBreakdown {
  unitCount: number;
  oneTimeSetupInr: number;
  annualSubscriptionInr: number;
  pilotFee60DaysInr: number;
  perUnitSetupInr: number;
  perUnitAnnualInr: number;
}

export const CRITICAL_ETA_V_THRESHOLD = 78;
export const CLIENT_SESSION_STORAGE_KEY = 'propump_client_session';

/**
 * Evaluates hydraulic telemetry through the regression wear model and returns
 * the compact JSON payload expected by the 3D Living Pump Core and dashboard.
 */
export function evaluatePumpState(telemetry: PumpTelemetrySnapshot): EdgeRegressionPayload {
  const etaPenalty = Math.max(0, (94 - telemetry.volumetricEfficiencyPct) * 1.9);
  const drainPenalty = Math.max(0, (telemetry.caseDrainLpm - 2.0) * 5.2);
  const tempPenalty = Math.max(0, (telemetry.oilDeltaTempC - 7.5) * 1.4);
  const rampPenalty = Math.max(0, (225 - telemetry.pressureRampBarPerSec) * 0.14);

  const rawScore = 100 - (etaPenalty + drainPenalty + tempPenalty + rampPenalty);
  const healthScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  let status: PumpHealthStatus = 'healthy';
  let component: EdgeRegressionPayload['component'] = 'none';
  let daysLeft = 142;

  if (healthScore < 52 || telemetry.volumetricEfficiencyPct < 79 || telemetry.caseDrainLpm >= 4.8) {
    status = 'failing';
    component = telemetry.oilDeltaTempC > 14 ? 'valve_plate' : 'piston_shoe';
    daysLeft = Math.max(3, Math.round((telemetry.volumetricEfficiencyPct - 72) * 1.4));
  } else if (healthScore < 80 || telemetry.volumetricEfficiencyPct < 88 || telemetry.caseDrainLpm >= 3.0) {
    status = 'degraded';
    component = telemetry.pressureRampBarPerSec < 195 ? 'swash_bearing' : 'piston_shoe';
    daysLeft = Math.max(14, Math.min(45, Math.round((telemetry.volumetricEfficiencyPct - 76) * 3.1)));
  }

  const confidencePct = status === 'healthy' ? 92 : status === 'degraded' ? 84 : 89;

  return {
    status,
    component,
    days_left: daysLeft,
    health_score: healthScore,
    eta_v_pct: Number(telemetry.volumetricEfficiencyPct.toFixed(1)),
    confidence_pct: confidencePct,
  };
}

/**
 * Builds structured side-panel sensor readouts for the private client dashboard,
 * mapping each hydraulic reading to its 3D sensor tap key and semantic state.
 */
export function getPowerPackSensorReadouts(
  telemetry: PumpTelemetrySnapshot,
): SideSensorReadout[] {
  const etaState: PumpHealthStatus =
    telemetry.volumetricEfficiencyPct < 80
      ? 'failing'
      : telemetry.volumetricEfficiencyPct < 89
        ? 'degraded'
        : 'healthy';

  const drainState: PumpHealthStatus =
    telemetry.caseDrainLpm >= 4.5
      ? 'failing'
      : telemetry.caseDrainLpm >= 2.8
        ? 'degraded'
        : 'healthy';

  const tempState: PumpHealthStatus =
    telemetry.oilDeltaTempC >= 13.5
      ? 'failing'
      : telemetry.oilDeltaTempC >= 9.5
        ? 'degraded'
        : 'healthy';

  const rampState: PumpHealthStatus =
    telemetry.pressureRampBarPerSec < 180
      ? 'failing'
      : telemetry.pressureRampBarPerSec < 210
        ? 'degraded'
        : 'healthy';

  const vib = telemetry.vibrationMmS ?? 2.4;
  const motorState: PumpHealthStatus =
    vib >= 5.5 ? 'failing' : vib >= 3.5 ? 'degraded' : 'healthy';

  const oilLevel = telemetry.oilLevelPct ?? 88;
  const levelState: PumpHealthStatus =
    oilLevel < 75 ? 'failing' : oilLevel < 82 ? 'degraded' : 'healthy';

  return [
    {
      key: 'flow',
      id: 'volumetric-efficiency',
      label: 'Volumetric Efficiency (ηv)',
      value: `${telemetry.volumetricEfficiencyPct.toFixed(1)}%`,
      nominalRange: '90–96%',
      signalTap: 'Q1 / Nominal Ratio',
      state: etaState,
    },
    {
      key: 'pressure',
      id: 'line-pressure',
      label: 'Line Pressure',
      value: `${telemetry.operatingPressureBar} bar`,
      nominalRange: '160–240 bar',
      signalTap: '4–20mA M12 Tap',
      state: rampState,
    },
    {
      key: 'flow',
      id: 'discharge-flow',
      label: 'Discharge Flow Rate',
      value: `${telemetry.mainFlowLpm.toFixed(1)} L/min`,
      nominalRange: 'Cycle Matched',
      signalTap: 'Inline Flow Tap',
      state: etaState,
    },
    {
      key: 'case_drain',
      id: 'case-drain-flow',
      label: 'Case-Drain Leakage',
      value: `${telemetry.caseDrainLpm.toFixed(1)} L/min`,
      nominalRange: '< 2.4 L/min',
      signalTap: 'Case-Drain M12 Tap',
      state: drainState,
    },
    {
      key: 'oil_temp',
      id: 'oil-temp-delta',
      label: 'Oil Temp ΔT (Tank)',
      value: `+${telemetry.oilDeltaTempC.toFixed(1)}°C (${(telemetry.tankTempC ?? 48).toFixed(1)}°C)`,
      nominalRange: '+4.0–8.5°C',
      signalTap: 'RTD Suction/Drain',
      state: tempState,
    },
    {
      key: 'pressure',
      id: 'pressure-ramp',
      label: 'Pressure Ramp (dP/dt)',
      value: `${telemetry.pressureRampBarPerSec} bar/s`,
      nominalRange: '215–260 bar/s',
      signalTap: 'Peak Stroke Edge',
      state: rampState,
    },
    {
      key: 'motor',
      id: 'motor-load',
      label: 'Motor Load & Vib',
      value: `${(telemetry.motorCurrentA ?? 32).toFixed(1)} A · ${vib.toFixed(1)} mm/s`,
      nominalRange: '< 3.2 mm/s RMS',
      signalTap: 'CT Clamp + Piezo',
      state: motorState,
    },
    {
      key: 'tank_level',
      id: 'reservoir-level',
      label: 'Reservoir Oil Level',
      value: `${oilLevel}%`,
      nominalRange: '82–95%',
      signalTap: 'Sight Level Switch',
      state: levelState,
    },
  ];
}

/**
 * Filters a list of power pack assets by status and search text for the left sidebar.
 */
export function filterPlantAssets<
  T extends { id: string; name: string; line: string; status: PumpHealthStatus; pumpSpec: string },
>(assets: T[], statusFilter: 'all' | PumpHealthStatus, query: string): T[] {
  const normalized = query.trim().toLowerCase();
  return assets.filter((asset) => {
    if (statusFilter !== 'all' && asset.status !== statusFilter) return false;
    if (!normalized) return true;
    return (
      asset.id.toLowerCase().includes(normalized) ||
      asset.name.toLowerCase().includes(normalized) ||
      asset.line.toLowerCase().includes(normalized) ||
      asset.pumpSpec.toLowerCase().includes(normalized)
    );
  });
}

/**
 * Maps a pump health state into deterministic Three.js material colors, fluid pulse
 * speeds, diagnostic callout copy, and the live JSON state payload.
 */
export function getPumpVisualParams(status: PumpHealthStatus): PumpVisualParams {
  if (status === 'failing') {
    return {
      status: 'failing',
      label: 'Failing',
      coreHex: 0xef4444,
      accentCss: '#ef4444',
      emissiveIntensity: 1.45,
      pressurePulseSpeed: 0.42,
      flowPulseSpeed: 0.45,
      caseDrainPulseSpeed: 1.75,
      pulseFrequencyHz: 3.4,
      flaggedComponentLabel: 'Valve Plate & Piston Shoe',
      diagnosticTooltip:
        'High case drain (5.4 L/min) → Severe piston shoe & valve plate wear → Schedule overhaul within 6 days',
      payload: {
        status: 'failing',
        component: 'piston_shoe',
        days_left: 6,
        health_score: 36,
        eta_v_pct: 75.8,
        confidence_pct: 89,
      },
    };
  }

  if (status === 'degraded') {
    return {
      status: 'degraded',
      label: 'Degraded',
      coreHex: 0xf59e0b,
      accentCss: '#f59e0b',
      emissiveIntensity: 0.95,
      pressurePulseSpeed: 0.68,
      flowPulseSpeed: 0.72,
      caseDrainPulseSpeed: 1.28,
      pulseFrequencyHz: 1.45,
      flaggedComponentLabel: 'Axial Piston Shoe #3',
      diagnosticTooltip: 'Case drain rising → Piston wear likely → Replace in ~28 days',
      payload: {
        status: 'degraded',
        component: 'piston_shoe',
        days_left: 28,
        health_score: 68,
        eta_v_pct: 85.4,
        confidence_pct: 84,
      },
    };
  }

  return {
    status: 'healthy',
    label: 'Healthy',
    coreHex: 0x0ea5e9,
    accentCss: '#0ea5e9',
    emissiveIntensity: 0.55,
    pressurePulseSpeed: 1.0,
    flowPulseSpeed: 1.0,
    caseDrainPulseSpeed: 0.55,
    pulseFrequencyHz: 0.7,
    flaggedComponentLabel: 'Nominal Clearances',
    diagnosticTooltip:
      'Volumetric efficiency stable (94.2%) → Case drain within baseline → Next check in 140+ days',
    payload: {
      status: 'healthy',
      component: 'none',
      days_left: 142,
      health_score: 94,
      eta_v_pct: 94.2,
      confidence_pct: 92,
    },
  };
}

/**
 * Fits an ordinary least squares (OLS) linear trend to historical volumetric
 * efficiency observations and forecasts forward 4 weeks.
 */
export function computeRegressionSeries(
  historicalLabels: string[],
  historicalValues: number[],
  forecastLabels: string[],
  threshold = CRITICAL_ETA_V_THRESHOLD,
): RegressionSeries {
  const n = historicalValues.length;
  if (n === 0) {
    return {
      labels: [...historicalLabels, ...forecastLabels],
      historicalEtaV: [],
      projectedEtaV: [],
      thresholdLine: [],
      slopePerWeek: 0,
      daysToThreshold: 180,
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += historicalValues[i];
    sumXY += i * historicalValues[i];
    sumXX += i * i;
  }

  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const totalLen = n + forecastLabels.length;
  const labels = [...historicalLabels, ...forecastLabels];

  const historicalEtaV: (number | null)[] = [
    ...historicalValues.map((v) => Number(v.toFixed(1))),
    ...forecastLabels.map(() => null),
  ];

  // Anchor projection at the final historical point so the dashed line connects seamlessly
  const projectedEtaV: (number | null)[] = Array.from({ length: totalLen }, (_, idx) => {
    if (idx < n - 1) return null;
    if (idx === n - 1) return Number(historicalValues[n - 1].toFixed(1));
    const predicted = intercept + slope * idx;
    return Number(Math.max(60, Math.min(99, predicted)).toFixed(1));
  });

  const thresholdLine = Array.from({ length: totalLen }, () => threshold);

  const lastValue = historicalValues[n - 1];
  let daysToThreshold = 180;
  if (slope < -0.05) {
    const weeksLeft = (lastValue - threshold) / Math.abs(slope);
    daysToThreshold = Math.max(2, Math.min(180, Math.round(weeksLeft * 7)));
  }

  return {
    labels,
    historicalEtaV,
    projectedEtaV,
    thresholdLine,
    slopePerWeek: Number(slope.toFixed(2)),
    daysToThreshold,
  };
}

/**
 * Calculates transparent setup, annual subscription, and 60-day paid pilot pricing in INR.
 */
export function calculatePilotPricing(unitCount: number): PricingBreakdown {
  const safeUnits = Math.max(1, Math.min(200, Math.floor(unitCount)));
  // Volume tier discount for larger fleets
  const perUnitSetupInr = safeUnits >= 10 ? 28000 : 32000;
  const perUnitAnnualInr = safeUnits >= 10 ? 15000 : 18000;

  return {
    unitCount: safeUnits,
    oneTimeSetupInr: safeUnits * perUnitSetupInr,
    annualSubscriptionInr: safeUnits * perUnitAnnualInr,
    pilotFee60DaysInr: Math.min(safeUnits, 2) * 15000,
    perUnitSetupInr,
    perUnitAnnualInr,
  };
}

/**
 * Formats INR currency using Indian numbering grouping (e.g. ₹1,28,000).
 */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Strict validation for Book Demo / Start Pilot lead capture form.
 */
export function validateLeadForm(input: LeadFormInput): LeadFormErrors {
  const errors: LeadFormErrors = {};

  if (!input.fullName.trim() || input.fullName.trim().length < 2) {
    errors.fullName = 'Enter your name (at least 2 characters).';
  }

  if (!input.companyName.trim() || input.companyName.trim().length < 2) {
    errors.companyName = 'Enter your factory or company name.';
  }

  const contact = input.contact.trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const digitsOnly = contact.replace(/[\s\-+()]/g, '');
  const isPhone = /^\d{10,13}$/.test(digitsOnly);

  if (!contact) {
    errors.contact = 'Enter a work email or 10-digit WhatsApp/phone number.';
  } else if (!isEmail && !isPhone) {
    errors.contact = 'Provide a valid email address or 10-digit phone number.';
  }

  if (!Number.isFinite(input.unitCount) || input.unitCount < 1 || input.unitCount > 500) {
    errors.unitCount = 'Enter between 1 and 500 hydraulic power packs.';
  }

  return errors;
}

/**
 * Strict validation for Client Portal Login modal.
 */
export function validateLoginForm(input: LoginFormInput): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!input.plantId.trim() || input.plantId.trim().length < 3) {
    errors.plantId = 'Enter your client username (at least 3 characters).';
  }

  if (!input.password || input.password.length < 6) {
    errors.password = 'Enter your password (minimum 6 characters).';
  }

  return errors;
}

export const LEADS_STORAGE_KEY = 'propump_leads_queue';

export interface LeadSubmissionResult {
  ok: boolean;
  id: string;
  delivery: 'server' | 'queued_offline';
  receivedAt: string;
}

export interface QueuedLeadRecord extends LeadFormInput {
  id: string;
  receivedAt: string;
  synced: boolean;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Submits a validated lead to POST /api/leads and persists a copy in localStorage
 * as an offline-resilient fallback queue so no inquiry is ever lost.
 */
export async function submitLeadRequest(
  input: LeadFormInput,
  options?: {
    endpoint?: string;
    fetchImpl?: typeof fetch;
    storage?: StorageLike | null;
  },
): Promise<LeadSubmissionResult> {
  const endpoint = options?.endpoint ?? '/api/leads';
  const fetchFn = options?.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
  const storage =
    options?.storage !== undefined
      ? options.storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;

  const fallbackId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const receivedAt = new Date().toISOString();

  let serverId = fallbackId;
  let serverReceivedAt = receivedAt;
  let synced = false;

  if (fetchFn) {
    try {
      const response = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          ok?: boolean;
          id?: string;
          receivedAt?: string;
        };
        if (data.id) serverId = data.id;
        if (data.receivedAt) serverReceivedAt = data.receivedAt;
        synced = true;
      }
    } catch {
      synced = false;
    }
  }

  if (storage) {
    try {
      const raw = storage.getItem(LEADS_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as QueuedLeadRecord[]) : [];
      const queue = Array.isArray(parsed) ? parsed : [];
      queue.unshift({
        ...input,
        id: serverId,
        receivedAt: serverReceivedAt,
        synced,
      });
      storage.setItem(LEADS_STORAGE_KEY, JSON.stringify(queue.slice(0, 50)));
    } catch {
      // Ignore storage quota errors in restricted browsing modes
    }
  }

  return {
    ok: true,
    id: serverId,
    delivery: synced ? 'server' : 'queued_offline',
    receivedAt: serverReceivedAt,
  };
}

export interface AuthLoginResponse {
  ok: boolean;
  session?: ClientSession;
  error?: string;
}

/**
 * Authenticates against POST /api/auth/login using the client plant username and password.
 */
export async function authenticateClient(
  credentials: LoginFormInput,
  fetchImpl?: typeof fetch,
): Promise<AuthLoginResponse> {
  const fetchFn = fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
  if (!fetchFn) {
    return { ok: false, error: 'Network unavailable. Unable to reach plant login server.' };
  }

  try {
    const res = await fetchFn('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        username: credentials.plantId.trim(),
        password: credentials.password,
      }),
    });

    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      token?: string;
      session?: Omit<ClientSession, 'token'>;
    };

    if (!res.ok || !data.ok || !data.token || !data.session) {
      return {
        ok: false,
        error: data.error || 'Invalid username or password.',
      };
    }

    return {
      ok: true,
      session: {
        token: data.token,
        ...data.session,
      },
    };
  } catch {
    return {
      ok: false,
      error: 'Unable to reach ProPump authentication server. Please try again.',
    };
  }
}
