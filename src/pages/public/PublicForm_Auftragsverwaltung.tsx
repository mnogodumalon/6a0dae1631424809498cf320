import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a0dae164a2e630e44db32c5';
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

export default function PublicFormAuftragsverwaltung() {
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
          <h1 className="text-2xl font-bold text-foreground">Auftragsverwaltung — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="auftragsnummer">Auftragsnummer</Label>
            <Input
              id="auftragsnummer"
              placeholder=""
              value={fields.auftragsnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, auftragsnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auftragsdatum">Auftragsdatum</Label>
            <DatePicker
              id="auftragsdatum"
              placeholder=""
              mode="date"
              value={fields.auftragsdatum ?? null}
              onChange={v => setFields(f => ({ ...f, auftragsdatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Auftragsstatus</Label>
            <Select
              value={lookupKey(fields.status) ?? ''}
              onValueChange={v => setFields(f => ({ ...f, status: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="status"><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="neu">Neu</SelectItem>
                <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                <SelectItem value="druck_laeuft">Druck läuft</SelectItem>
                <SelectItem value="qualitaetspruefung">Qualitätsprüfung</SelectItem>
                <SelectItem value="versandbereit">Versandbereit</SelectItem>
                <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                <SelectItem value="storniert">Storniert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="druckbreite_cm">Druckbreite (cm)</Label>
            <Input
              id="druckbreite_cm"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.druckbreite_cm ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, druckbreite_cm: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="druckhoehe_cm">Druckhöhe (cm)</Label>
            <Input
              id="druckhoehe_cm"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.druckhoehe_cm ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, druckhoehe_cm: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="materialien">Verwendete Materialien</Label>
            <Input
              id="materialien"
              value={fields.materialien ?? ''}
              onChange={e => setFields(f => ({ ...f, materialien: e.target.value }))}
              placeholder="Record URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wunschtermin">Wunschtermin</Label>
            <DatePicker
              id="wunschtermin"
              placeholder=""
              mode="date"
              value={fields.wunschtermin ?? null}
              onChange={v => setFields(f => ({ ...f, wunschtermin: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lieferart">Lieferart</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.lieferart) === 'selbstabholung'}
                onClick={() => setFields(f => ({ ...f, lieferart: (lookupKey(f.lieferart) === 'selbstabholung' ? undefined : 'selbstabholung') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.lieferart) === 'selbstabholung'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Selbstabholung
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.lieferart) === 'versand'}
                onClick={() => setFields(f => ({ ...f, lieferart: (lookupKey(f.lieferart) === 'versand' ? undefined : 'versand') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.lieferart) === 'versand'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Versand
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.lieferart) === 'montage_vor_ort'}
                onClick={() => setFields(f => ({ ...f, lieferart: (lookupKey(f.lieferart) === 'montage_vor_ort' ? undefined : 'montage_vor_ort') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.lieferart) === 'montage_vor_ort'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Montage vor Ort
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="liefer_strasse">Lieferstraße</Label>
            <Input
              id="liefer_strasse"
              placeholder=""
              value={fields.liefer_strasse ?? ''}
              onChange={e => setFields(f => ({ ...f, liefer_strasse: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="liefer_hausnummer">Lieferhausnummer</Label>
            <Input
              id="liefer_hausnummer"
              placeholder=""
              value={fields.liefer_hausnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, liefer_hausnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="liefer_plz">Liefer-PLZ</Label>
            <Input
              id="liefer_plz"
              placeholder=""
              value={fields.liefer_plz ?? ''}
              onChange={e => setFields(f => ({ ...f, liefer_plz: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="liefer_ort">Lieferort</Label>
            <Input
              id="liefer_ort"
              placeholder=""
              value={fields.liefer_ort ?? ''}
              onChange={e => setFields(f => ({ ...f, liefer_ort: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sonderanforderungen">Sonderanforderungen</Label>
            <Textarea
              id="sonderanforderungen"
              placeholder=""
              value={fields.sonderanforderungen ?? ''}
              onChange={e => setFields(f => ({ ...f, sonderanforderungen: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interne_notizen">Interne Notizen</Label>
            <Textarea
              id="interne_notizen"
              placeholder=""
              value={fields.interne_notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, interne_notizen: e.target.value }))}
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
