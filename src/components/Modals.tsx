import { FormEvent, useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  authenticateClient,
  ClientSession,
  LeadFormErrors,
  LeadFormInput,
  LeadSubmissionResult,
  LoginFormErrors,
  LoginFormInput,
  submitLeadRequest,
  validateLeadForm,
  validateLoginForm,
} from '../utils/pumpModel';

interface LeadModalProps {
  open: boolean;
  initialType: 'pilot' | 'demo' | 'expert';
  onClose: () => void;
}

export function LeadModal({ open, initialType, onClose }: LeadModalProps) {
  const [form, setForm] = useState<LeadFormInput>({
    fullName: '',
    companyName: '',
    contact: '',
    unitCount: 4,
    inquiryType: initialType,
  });
  const [errors, setErrors] = useState<LeadFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<LeadSubmissionResult | null>(null);

  const nameRef = useRef<HTMLInputElement | null>(null);
  const companyRef = useRef<HTMLInputElement | null>(null);
  const contactRef = useRef<HTMLInputElement | null>(null);
  const unitsRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setForm((prev) => ({ ...prev, inquiryType: initialType }));
      setErrors({});
      setSubmitting(false);
      setSubmission(null);
    }
  }, [open, initialType]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const headingByType = {
    pilot: 'Start a 60-Day Paid Pilot',
    demo: 'Book a Live Technical Demo',
    expert: 'Talk to a Hydraulic Diagnostics Engineer',
  };

  const hasErrors = Object.keys(errors).length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validateLeadForm(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      if (validation.fullName) nameRef.current?.focus();
      else if (validation.companyName) companyRef.current?.focus();
      else if (validation.contact) contactRef.current?.focus();
      else if (validation.unitCount) unitsRef.current?.focus();
      return;
    }

    setErrors({});
    setSubmitting(true);
    const result = await submitLeadRequest(form);
    setSubmitting(false);
    setSubmission(result);
  };

  const inputClass = (hasFieldError?: string) =>
    `mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
      hasFieldError
        ? 'border-rose-600 bg-rose-50/40 focus:border-rose-700 focus:ring-rose-200'
        : 'border-slate-300 bg-white focus:border-sky-600 focus:ring-sky-100'
    }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="lead-modal-title" className="font-display text-xl font-bold text-slate-950">
              {headingByType[form.inquiryType]}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Tell us your hydraulic fleet size. Our field team responds within one business day.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking dialog"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {submission ? (
          <div data-testid="lead-confirmation" className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden="true" />
              <div>
                <h3 className="font-display text-base font-semibold text-slate-950">
                  Request Logged for {form.companyName}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Thank you, {form.fullName}. We will reach out at{' '}
                  <span className="font-medium text-slate-900">{form.contact}</span> to review sensor tap compatibility for your{' '}
                  <span className="font-mono font-medium text-slate-900">{form.unitCount}</span> hydraulic power pack(s).
                </p>
                <p className="mt-2 font-mono text-xs text-slate-500">
                  Ref: {submission.id} ·{' '}
                  {submission.delivery === 'server'
                    ? 'Saved to ProPump lead pipeline'
                    : 'Saved locally (offline queue)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full cursor-pointer rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
              {(
                [
                  { id: 'pilot', label: '60-Day Pilot' },
                  { id: 'demo', label: 'Live Demo' },
                  { id: 'expert', label: 'Talk to Expert' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, inquiryType: tab.id }))}
                  className={`cursor-pointer whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    form.inquiryType === tab.id
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {hasErrors && (
              <div
                role="alert"
                data-testid="lead-error-summary"
                className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <span>Please complete the highlighted fields before submitting your request.</span>
              </div>
            )}

            <div>
              <label htmlFor="lead-name" className="block text-sm font-medium text-slate-800">
                Your Name <span className="text-rose-600" aria-hidden="true">*</span>
              </label>
              <input
                ref={nameRef}
                id="lead-name"
                name="fullName"
                type="text"
                required
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? 'lead-name-error' : undefined}
                value={form.fullName}
                onChange={(e) => {
                  setForm((f) => ({ ...f, fullName: e.target.value }));
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                placeholder="e.g. Karthik Subramanian"
                className={inputClass(errors.fullName)}
              />
              {errors.fullName && (
                <p id="lead-name-error" role="alert" className="mt-1 text-xs font-medium text-rose-700">
                  {errors.fullName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="lead-company" className="block text-sm font-medium text-slate-800">
                Plant / Company Name <span className="text-rose-600" aria-hidden="true">*</span>
              </label>
              <input
                ref={companyRef}
                id="lead-company"
                name="companyName"
                type="text"
                required
                aria-invalid={Boolean(errors.companyName)}
                aria-describedby={errors.companyName ? 'lead-company-error' : undefined}
                value={form.companyName}
                onChange={(e) => {
                  setForm((f) => ({ ...f, companyName: e.target.value }));
                  if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: undefined }));
                }}
                placeholder="e.g. Lakshmi Precision Forgings, Coimbatore"
                className={inputClass(errors.companyName)}
              />
              {errors.companyName && (
                <p id="lead-company-error" role="alert" className="mt-1 text-xs font-medium text-rose-700">
                  {errors.companyName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="lead-contact" className="block text-sm font-medium text-slate-800">
                  Work Email or WhatsApp Number <span className="text-rose-600" aria-hidden="true">*</span>
                </label>
                <input
                  ref={contactRef}
                  id="lead-contact"
                  name="contact"
                  type="text"
                  required
                  aria-invalid={Boolean(errors.contact)}
                  aria-describedby={errors.contact ? 'lead-contact-error' : undefined}
                  value={form.contact}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, contact: e.target.value }));
                    if (errors.contact) setErrors((prev) => ({ ...prev, contact: undefined }));
                  }}
                  placeholder="name@plant.in or +91 98422 00000"
                  className={inputClass(errors.contact)}
                />
                {errors.contact && (
                  <p id="lead-contact-error" role="alert" className="mt-1 text-xs font-medium text-rose-700">
                    {errors.contact}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lead-units" className="block text-sm font-medium text-slate-800">
                  Power Packs
                </label>
                <input
                  ref={unitsRef}
                  id="lead-units"
                  name="unitCount"
                  type="number"
                  min={1}
                  max={500}
                  required
                  aria-invalid={Boolean(errors.unitCount)}
                  aria-describedby={errors.unitCount ? 'lead-units-error' : undefined}
                  value={form.unitCount}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, unitCount: Number(e.target.value) }));
                    if (errors.unitCount) setErrors((prev) => ({ ...prev, unitCount: undefined }));
                  }}
                  className={`${inputClass(errors.unitCount)} font-mono tabular-nums`}
                />
                {errors.unitCount && (
                  <p id="lead-units-error" role="alert" className="mt-1 text-xs font-medium text-rose-700">
                    {errors.unitCount}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer rounded-lg bg-slate-950 px-5 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface ClientLoginModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (session: ClientSession) => void;
}

export function ClientLoginModal({
  open,
  onClose,
  onAuthenticated,
}: ClientLoginModalProps) {
  const [form, setForm] = useState<LoginFormInput>({ plantId: '', password: '' });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const plantIdRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const hasFieldErrors = Boolean(errors.plantId || errors.password);
  const summaryError =
    errors.general ??
    (hasFieldErrors ? 'Enter a valid username and password to access private pump data.' : null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validateLoginForm(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      if (validation.plantId) plantIdRef.current?.focus();
      else if (validation.password) passwordRef.current?.focus();
      return;
    }

    setErrors({});
    setSubmitting(true);
    const result = await authenticateClient(form);
    setSubmitting(false);

    if (!result.ok || !result.session) {
      setErrors({ general: result.error || 'Invalid username or password.' });
      passwordRef.current?.focus();
      return;
    }

    onAuthenticated(result.session);
    onClose();
  };

  const inputClass = (hasFieldError?: string) =>
    `mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
      hasFieldError
        ? 'border-rose-600 bg-rose-50/40 focus:border-rose-700 focus:ring-rose-200'
        : 'border-slate-300 bg-white focus:border-sky-600 focus:ring-sky-100'
    }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4"
    >
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="login-modal-title" className="font-display text-xl font-bold text-slate-950">
              Client Plant Login
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Sign in with your plant username and password to access private hydraulic power pack telemetry.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close client login dialog"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          {summaryError && (
            <div
              role="alert"
              data-testid="login-error-summary"
              className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
              <span>{summaryError}</span>
            </div>
          )}

          <div>
            <label htmlFor="login-plant-id" className="block text-sm font-medium text-slate-800">
              Username <span className="text-rose-600" aria-hidden="true">*</span>
            </label>
            <input
              ref={plantIdRef}
              id="login-plant-id"
              name="username"
              type="text"
              autoComplete="username"
              required
              aria-invalid={Boolean(errors.plantId)}
              aria-describedby={errors.plantId ? 'login-plant-error' : undefined}
              value={form.plantId}
              onChange={(e) => {
                setForm((f) => ({ ...f, plantId: e.target.value }));
                if (errors.plantId || errors.general) {
                  setErrors((prev) => ({ ...prev, plantId: undefined, general: undefined }));
                }
              }}
              placeholder="e.g. plant-admin"
              className={inputClass(errors.plantId)}
            />
            {errors.plantId && (
              <p id="login-plant-error" role="alert" className="mt-1 text-xs font-medium text-rose-700">
                {errors.plantId}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-800">
              Password <span className="text-rose-600" aria-hidden="true">*</span>
            </label>
            <input
              ref={passwordRef}
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              value={form.password}
              onChange={(e) => {
                setForm((f) => ({ ...f, password: e.target.value }));
                if (errors.password || errors.general) {
                  setErrors((prev) => ({ ...prev, password: undefined, general: undefined }));
                }
              }}
              placeholder="Enter plant password"
              className={inputClass(errors.password)}
            />
            {errors.password && (
              <p id="login-password-error" role="alert" className="mt-1 text-xs font-medium text-rose-700">
                {errors.password}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-slate-700">
                Plant login: <strong>plant-admin</strong> / <strong>ProPump@2026</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setErrors({});
                  setForm({ plantId: 'plant-admin', password: 'ProPump@2026' });
                }}
                className="cursor-pointer font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-900"
              >
                Fill credentials
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer rounded-lg bg-slate-950 px-5 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
