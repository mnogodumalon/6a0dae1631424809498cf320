import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a0dae1647009f1f0dcb7676';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormRechnungsverwaltung() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Rechnungsverwaltung — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="rechnungsnummer">Rechnungsnummer</Label>
            <Input
              id="rechnungsnummer"
              placeholder=""
              value={fields.rechnungsnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, rechnungsnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rechnungsdatum">Rechnungsdatum</Label>
            <DatePicker
              id="rechnungsdatum"
              placeholder=""
              mode="date"
              value={fields.rechnungsdatum ?? null}
              onChange={v => setFields(f => ({ ...f, rechnungsdatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faelligkeitsdatum">Fälligkeitsdatum</Label>
            <DatePicker
              id="faelligkeitsdatum"
              placeholder=""
              mode="date"
              value={fields.faelligkeitsdatum ?? null}
              onChange={v => setFields(f => ({ ...f, faelligkeitsdatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nettobetrag">Nettobetrag (€)</Label>
            <Input
              id="nettobetrag"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.nettobetrag ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, nettobetrag: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mehrwertsteuersatz">Mehrwertsteuersatz</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.mehrwertsteuersatz) === 'mwst_7'}
                onClick={() => setFields(f => ({ ...f, mehrwertsteuersatz: (lookupKey(f.mehrwertsteuersatz) === 'mwst_7' ? undefined : 'mwst_7') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.mehrwertsteuersatz) === 'mwst_7'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                7 %
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.mehrwertsteuersatz) === 'mwst_0'}
                onClick={() => setFields(f => ({ ...f, mehrwertsteuersatz: (lookupKey(f.mehrwertsteuersatz) === 'mwst_0' ? undefined : 'mwst_0') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.mehrwertsteuersatz) === 'mwst_0'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                0 % (steuerfrei)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.mehrwertsteuersatz) === 'mwst_19'}
                onClick={() => setFields(f => ({ ...f, mehrwertsteuersatz: (lookupKey(f.mehrwertsteuersatz) === 'mwst_19' ? undefined : 'mwst_19') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.mehrwertsteuersatz) === 'mwst_19'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                19 %
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtbetrag">Gesamtbetrag brutto (€)</Label>
            <Input
              id="gesamtbetrag"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.gesamtbetrag ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, gesamtbetrag: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zahlungsart">Zahlungsart</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsart) === 'ueberweisung'}
                onClick={() => setFields(f => ({ ...f, zahlungsart: (lookupKey(f.zahlungsart) === 'ueberweisung' ? undefined : 'ueberweisung') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsart) === 'ueberweisung'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Überweisung
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsart) === 'lastschrift'}
                onClick={() => setFields(f => ({ ...f, zahlungsart: (lookupKey(f.zahlungsart) === 'lastschrift' ? undefined : 'lastschrift') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsart) === 'lastschrift'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Lastschrift
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsart) === 'bar'}
                onClick={() => setFields(f => ({ ...f, zahlungsart: (lookupKey(f.zahlungsart) === 'bar' ? undefined : 'bar') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsart) === 'bar'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Bar
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsart) === 'paypal'}
                onClick={() => setFields(f => ({ ...f, zahlungsart: (lookupKey(f.zahlungsart) === 'paypal' ? undefined : 'paypal') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsart) === 'paypal'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                PayPal
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsart) === 'kreditkarte'}
                onClick={() => setFields(f => ({ ...f, zahlungsart: (lookupKey(f.zahlungsart) === 'kreditkarte' ? undefined : 'kreditkarte') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsart) === 'kreditkarte'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Kreditkarte
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zahlungsstatus">Zahlungsstatus</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsstatus) === 'offen'}
                onClick={() => setFields(f => ({ ...f, zahlungsstatus: (lookupKey(f.zahlungsstatus) === 'offen' ? undefined : 'offen') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsstatus) === 'offen'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Offen
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsstatus) === 'teilweise_bezahlt'}
                onClick={() => setFields(f => ({ ...f, zahlungsstatus: (lookupKey(f.zahlungsstatus) === 'teilweise_bezahlt' ? undefined : 'teilweise_bezahlt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsstatus) === 'teilweise_bezahlt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Teilweise bezahlt
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsstatus) === 'bezahlt'}
                onClick={() => setFields(f => ({ ...f, zahlungsstatus: (lookupKey(f.zahlungsstatus) === 'bezahlt' ? undefined : 'bezahlt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsstatus) === 'bezahlt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Bezahlt
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsstatus) === 'ueberfaellig'}
                onClick={() => setFields(f => ({ ...f, zahlungsstatus: (lookupKey(f.zahlungsstatus) === 'ueberfaellig' ? undefined : 'ueberfaellig') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsstatus) === 'ueberfaellig'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Überfällig
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zahlungsstatus) === 'storniert_rechnung'}
                onClick={() => setFields(f => ({ ...f, zahlungsstatus: (lookupKey(f.zahlungsstatus) === 'storniert_rechnung' ? undefined : 'storniert_rechnung') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zahlungsstatus) === 'storniert_rechnung'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Storniert
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rechnungsnotiz">Notiz auf der Rechnung</Label>
            <Textarea
              id="rechnungsnotiz"
              placeholder=""
              value={fields.rechnungsnotiz ?? ''}
              onChange={e => setFields(f => ({ ...f, rechnungsnotiz: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
