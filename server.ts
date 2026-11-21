import express from 'express';
import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLANT_ASSETS } from './src/data/plantAssets.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const portArgIdx = process.argv.indexOf('--port');
const cliPort = portArgIdx !== -1 ? Number(process.argv[portArgIdx + 1]) : NaN;
const PORT =
  Number.isFinite(cliPort) && cliPort > 0
    ? cliPort
    : Number(process.env.PORT || 3000);

const DIST_PATH = path.resolve(__dirname, 'dist');
const HAS_DIST_BUILD = fsSync.existsSync(path.join(DIST_PATH, 'index.html'));
const IS_DEV_PROCESS =
  process.env.npm_lifecycle_event === 'dev' ||
  process.argv.includes('--dev') ||
  process.execArgv.some((arg) => arg.includes('tsx'));
const IS_PROD =
  process.env.NODE_ENV === 'production' ||
  process.env.npm_lifecycle_event === 'start' ||
  (HAS_DIST_BUILD && !IS_DEV_PROCESS);

const DATA_DIR = path.resolve(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

// Single configured plant client credential (overridable via environment variables)
const CLIENT_USERNAME = (process.env.CLIENT_USERNAME || 'plant-admin').trim().toLowerCase();
const CLIENT_PASSWORD = process.env.CLIENT_PASSWORD || 'ProPump@2026';

interface ActiveSession {
  token: string;
  username: string;
  plantName: string;
  location: string;
  role: string;
  createdAt: number;
}

const activeSessions = new Map<string, ActiveSession>();

function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+([A-Za-z0-9._-]+)$/i.exec(authHeader.trim());
  return match ? match[1] : null;
}

function verifySession(authHeader?: string): ActiveSession | null {
  const token = extractBearerToken(authHeader);
  if (!token) return null;
  return activeSessions.get(token) ?? null;
}

interface StoredLead {
  id: string;
  fullName: string;
  companyName: string;
  contact: string;
  unitCount: number;
  inquiryType: 'pilot' | 'demo' | 'expert';
  receivedAt: string;
  forwarded: boolean;
}

async function readLeads(): Promise<StoredLead[]> {
  try {
    const raw = await fs.readFile(LEADS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveLead(lead: StoredLead): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const existing = await readLeads();
  existing.unshift(lead);
  await fs.writeFile(LEADS_FILE, JSON.stringify(existing, null, 2), 'utf8');
}

function isValidContact(value: string): boolean {
  const trimmed = value.trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  const digitsOnly = trimmed.replace(/[\s\-+()]/g, '');
  const isPhone = /^\d{10,13}$/.test(digitsOnly);
  return isEmail || isPhone;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'propump-ai' });
  });

  // =========================================================================
  // CLIENT AUTHENTICATION & PROTECTED PRIVATE PUMP DATA ROUTES
  // =========================================================================
  app.post('/api/auth/login', (req, res) => {
    const body = req.body ?? {};
    const username = String(body.username ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!username || !password) {
      res.status(400).json({
        ok: false,
        error: 'Enter both username and password.',
      });
      return;
    }

    if (username !== CLIENT_USERNAME || password !== CLIENT_PASSWORD) {
      res.status(401).json({
        ok: false,
        error: 'Invalid username or password. Verify your plant portal credentials and try again.',
      });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    const session: ActiveSession = {
      token,
      username: CLIENT_USERNAME,
      plantName: 'Coimbatore Press & Molding Unit',
      location: 'SIDCO Industrial Estate, Coimbatore',
      role: 'Maintenance Supervisor',
      createdAt: Date.now(),
    };
    activeSessions.set(token, session);

    res.status(200).json({
      ok: true,
      token,
      session: {
        username: session.username,
        plantName: session.plantName,
        location: session.location,
        role: session.role,
      },
    });
  });

  app.get('/api/auth/session', (req, res) => {
    const session = verifySession(req.headers.authorization);
    if (!session) {
      res.status(401).json({ ok: false, error: 'Session expired or unauthorized.' });
      return;
    }
    res.json({
      ok: true,
      session: {
        username: session.username,
        plantName: session.plantName,
        location: session.location,
        role: session.role,
      },
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearerToken(req.headers.authorization);
    if (token) {
      activeSessions.delete(token);
    }
    res.json({ ok: true });
  });

  app.get('/api/client/pumps', (req, res) => {
    const session = verifySession(req.headers.authorization);
    if (!session) {
      res.status(401).json({
        ok: false,
        error: 'Authentication required to access private hydraulic power pack data.',
      });
      return;
    }

    res.json({
      ok: true,
      plant: {
        name: session.plantName,
        location: session.location,
        gatewayId: 'EDGE-CBE-01',
        syncMode: 'Local LAN + Private Cloud Sync',
      },
      assets: PLANT_ASSETS,
    });
  });

  // =========================================================================
  // LEAD PIPELINE ROUTES
  // =========================================================================
  app.get('/api/leads', async (_req, res) => {
    const leads = await readLeads();
    res.json({ count: leads.length, leads });
  });

  app.post('/api/leads', async (req, res) => {
    const body = req.body ?? {};
    const fullName = String(body.fullName ?? '').trim();
    const companyName = String(body.companyName ?? '').trim();
    const contact = String(body.contact ?? '').trim();
    const unitCount = Number(body.unitCount ?? 0);
    const inquiryType =
      body.inquiryType === 'pilot' || body.inquiryType === 'expert'
        ? body.inquiryType
        : 'demo';

    const errors: Record<string, string> = {};
    if (fullName.length < 2) errors.fullName = 'Enter your name (at least 2 characters).';
    if (companyName.length < 2) errors.companyName = 'Enter your factory or company name.';
    if (!isValidContact(contact)) {
      errors.contact = 'Provide a valid email address or 10-digit phone number.';
    }
    if (!Number.isFinite(unitCount) || unitCount < 1 || unitCount > 500) {
      errors.unitCount = 'Enter between 1 and 500 hydraulic power packs.';
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ ok: false, errors });
      return;
    }

    const record: StoredLead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fullName,
      companyName,
      contact,
      unitCount: Math.round(unitCount),
      inquiryType,
      receivedAt: new Date().toISOString(),
      forwarded: false,
    };

    const webhookUrl = process.env.LEAD_WEBHOOK_URL;
    if (webhookUrl && /^https?:\/\//i.test(webhookUrl)) {
      try {
        const fw = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(record),
        });
        record.forwarded = fw.ok;
      } catch {
        record.forwarded = false;
      }
    }

    try {
      await saveLead(record);
    } catch {
      // Even if disk write fails in a read-only environment, still confirm capture
    }

    res.status(201).json({
      ok: true,
      id: record.id,
      receivedAt: record.receivedAt,
      forwarded: record.forwarded,
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_PATH));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ ok: false, error: 'API route not found.' });
        return;
      }
      res.sendFile(path.join(DIST_PATH, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `ProPump AI server listening on http://0.0.0.0:${PORT} (${IS_PROD ? 'production' : 'development'})`,
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start ProPump AI server:', err);
  process.exit(1);
});
