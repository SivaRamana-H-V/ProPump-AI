import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePumpState,
  getPumpVisualParams,
  computeRegressionSeries,
  calculatePilotPricing,
  validateLeadForm,
  validateLoginForm,
  submitLeadRequest,
  LEADS_STORAGE_KEY,
  getPowerPackSensorReadouts,
  filterPlantAssets,
  authenticateClient,
} from './pumpModel';
import { PLANT_ASSETS } from '../data/plantAssets';

test('evaluatePumpState classifies healthy, degraded, and failing telemetry accurately', () => {
  const healthy = evaluatePumpState({
    volumetricEfficiencyPct: 94.2,
    caseDrainLpm: 1.6,
    oilDeltaTempC: 6.2,
    pressureRampBarPerSec: 242,
    operatingPressureBar: 210,
    mainFlowLpm: 84,
  });
  assert.equal(healthy.status, 'healthy');
  assert.ok(healthy.health_score >= 85);
  assert.equal(healthy.component, 'none');

  const degraded = evaluatePumpState({
    volumetricEfficiencyPct: 85.4,
    caseDrainLpm: 3.5,
    oilDeltaTempC: 11.4,
    pressureRampBarPerSec: 204,
    operatingPressureBar: 205,
    mainFlowLpm: 77,
  });
  assert.equal(degraded.status, 'degraded');
  assert.ok(degraded.health_score >= 52 && degraded.health_score < 80);
  assert.ok(degraded.days_left >= 14 && degraded.days_left <= 45);

  const failing = evaluatePumpState({
    volumetricEfficiencyPct: 75.8,
    caseDrainLpm: 5.4,
    oilDeltaTempC: 15.2,
    pressureRampBarPerSec: 172,
    operatingPressureBar: 194,
    mainFlowLpm: 68,
  });
  assert.equal(failing.status, 'failing');
  assert.ok(failing.health_score < 52);
  assert.ok(failing.days_left <= 10);
});

test('getPumpVisualParams returns distinct pulse speeds and colors per health state', () => {
  const healthy = getPumpVisualParams('healthy');
  const degraded = getPumpVisualParams('degraded');
  const failing = getPumpVisualParams('failing');

  assert.equal(healthy.coreHex, 0x0ea5e9);
  assert.equal(degraded.coreHex, 0xf59e0b);
  assert.equal(failing.coreHex, 0xef4444);

  // Case drain pulse accelerates as internal leakage increases
  assert.ok(healthy.caseDrainPulseSpeed < degraded.caseDrainPulseSpeed);
  assert.ok(degraded.caseDrainPulseSpeed < failing.caseDrainPulseSpeed);

  // Pressure delivery pulse slows down as volumetric efficiency degrades
  assert.ok(healthy.pressurePulseSpeed > degraded.pressurePulseSpeed);
  assert.ok(degraded.pressurePulseSpeed > failing.pressurePulseSpeed);
});

test('computeRegressionSeries projects downward efficiency drift and connects series cleanly', () => {
  const series = computeRegressionSeries(
    ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
    [93.2, 91.9, 90.4, 88.8, 87.2, 85.4],
    ['W7', 'W8', 'W9', 'W10'],
    78,
  );

  assert.equal(series.labels.length, 10);
  assert.equal(series.historicalEtaV.length, 10);
  assert.equal(series.projectedEtaV.length, 10);
  assert.ok(series.slopePerWeek < -1.0);
  // Anchor point matches final historical observation
  assert.equal(series.projectedEtaV[5], 85.4);
  assert.ok((series.projectedEtaV[9] ?? 100) < 80);
  assert.ok(series.daysToThreshold > 20 && series.daysToThreshold < 50);
});

test('calculatePilotPricing applies volume tier at 10+ units', () => {
  const smallPlant = calculatePilotPricing(4);
  assert.equal(smallPlant.perUnitSetupInr, 32000);
  assert.equal(smallPlant.oneTimeSetupInr, 128000);
  assert.equal(smallPlant.annualSubscriptionInr, 72000);

  const midPlant = calculatePilotPricing(12);
  assert.equal(midPlant.perUnitSetupInr, 28000);
  assert.equal(midPlant.oneTimeSetupInr, 336000);
  assert.equal(midPlant.annualSubscriptionInr, 180000);
});

test('validateLeadForm and validateLoginForm reject empty or malformed inputs', () => {
  const emptyLead = validateLeadForm({
    fullName: '',
    companyName: '',
    contact: '',
    unitCount: 0,
    inquiryType: 'pilot',
  });
  assert.ok(emptyLead.fullName);
  assert.ok(emptyLead.companyName);
  assert.ok(emptyLead.contact);
  assert.ok(emptyLead.unitCount);

  const validLead = validateLeadForm({
    fullName: 'Ramesh Nair',
    companyName: 'Sri Murugan Forgings Pvt Ltd',
    contact: '+91 98422 55109',
    unitCount: 6,
    inquiryType: 'pilot',
  });
  assert.deepEqual(validLead, {});

  const invalidLogin = validateLoginForm({ plantId: 'ab', password: '123' });
  assert.ok(invalidLogin.plantId);
  assert.ok(invalidLogin.password);

  const validLogin = validateLoginForm({ plantId: 'CBE-PRESS-01', password: 'password123' });
  assert.deepEqual(validLogin, {});
});

test('getPumpVisualParams exposes calibrated confidence percentages per state', () => {
  assert.equal(getPumpVisualParams('healthy').payload.confidence_pct, 92);
  assert.equal(getPumpVisualParams('degraded').payload.confidence_pct, 84);
  assert.equal(getPumpVisualParams('failing').payload.confidence_pct, 89);
});

test('submitLeadRequest sends POST to /api/leads and queues in localStorage (online & offline)', async () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  };

  let fetchedUrl = '';
  let fetchedMethod = '';
  const onlineFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    fetchedUrl = String(url);
    fetchedMethod = init?.method ?? 'GET';
    return new Response(
      JSON.stringify({ ok: true, id: 'lead_srv_123', receivedAt: '2026-11-20T12:00:00.000Z' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  const onlineRes = await submitLeadRequest(
    {
      fullName: 'Anand Raj',
      companyName: 'Peelamedu Hydraulics',
      contact: 'anand@peelamedu.in',
      unitCount: 5,
      inquiryType: 'pilot',
    },
    { fetchImpl: onlineFetch, storage: mockStorage },
  );

  assert.equal(fetchedUrl, '/api/leads');
  assert.equal(fetchedMethod, 'POST');
  assert.equal(onlineRes.delivery, 'server');
  assert.equal(onlineRes.id, 'lead_srv_123');

  const offlineFetch = (async () => {
    throw new Error('Network offline');
  }) as unknown as typeof fetch;

  const offlineRes = await submitLeadRequest(
    {
      fullName: 'Meera Devi',
      companyName: 'Hosur Castings',
      contact: '+91 98422 50001',
      unitCount: 3,
      inquiryType: 'demo',
    },
    { fetchImpl: offlineFetch, storage: mockStorage },
  );

  assert.equal(offlineRes.delivery, 'queued_offline');
  const savedQueue = JSON.parse(store.get(LEADS_STORAGE_KEY) ?? '[]');
  assert.equal(savedQueue.length, 2);
  assert.equal(savedQueue[0].synced, false);
  assert.equal(savedQueue[1].synced, true);
});

test('getPowerPackSensorReadouts maps all 8 telemetry values with accurate severity states', () => {
  const failingReadouts = getPowerPackSensorReadouts(PLANT_ASSETS[2].telemetry);
  assert.equal(failingReadouts.length, 8);
  const drain = failingReadouts.find((r) => r.id === 'case-drain-flow');
  const temp = failingReadouts.find((r) => r.id === 'oil-temp-delta');
  assert.equal(drain?.state, 'failing');
  assert.equal(temp?.state, 'failing');

  const healthyReadouts = getPowerPackSensorReadouts(PLANT_ASSETS[1].telemetry);
  assert.ok(healthyReadouts.every((r) => r.state === 'healthy'));
});

test('filterPlantAssets filters 5 power pack archetypes by status and search text', () => {
  assert.equal(PLANT_ASSETS.length, 5);
  assert.equal(filterPlantAssets(PLANT_ASSETS, 'all', '').length, 5);
  assert.equal(filterPlantAssets(PLANT_ASSETS, 'failing', '').length, 1);
  assert.equal(filterPlantAssets(PLANT_ASSETS, 'degraded', '').length, 2);
  assert.equal(filterPlantAssets(PLANT_ASSETS, 'all', 'stamping').length, 1);
  assert.equal(filterPlantAssets(PLANT_ASSETS, 'all', 'HPU-04')[0]?.id, 'HPU-04');
});

test('authenticateClient handles valid 200 and invalid 401 responses cleanly', async () => {
  const invalidFetch = (async () =>
    new Response(JSON.stringify({ ok: false, error: 'Invalid username or password.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

  const badRes = await authenticateClient(
    { plantId: 'wrong-user', password: 'wrong-password' },
    invalidFetch,
  );
  assert.equal(badRes.ok, false);
  assert.ok(badRes.error?.includes('Invalid'));

  const validFetch = (async () =>
    new Response(
      JSON.stringify({
        ok: true,
        token: 'tok_abc123',
        session: {
          username: 'plant-admin',
          plantName: 'Coimbatore Press & Molding Unit',
          location: 'SIDCO Industrial Estate, Coimbatore',
          role: 'Maintenance Supervisor',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )) as typeof fetch;

  const goodRes = await authenticateClient(
    { plantId: 'plant-admin', password: 'ProPump@2026' },
    validFetch,
  );
  assert.equal(goodRes.ok, true);
  assert.equal(goodRes.session?.token, 'tok_abc123');
  assert.equal(goodRes.session?.username, 'plant-admin');
});
