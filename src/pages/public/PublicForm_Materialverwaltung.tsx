import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a0dae176d50aa818bb08078';
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

export default function PublicFormMaterialverwaltung() {
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
          <h1 className="text-2xl font-bold text-foreground">Materialverwaltung — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="materialname">Materialname</Label>
            <Input
              id="materialname"
              placeholder=""
              value={fields.materialname ?? ''}
              onChange={e => setFields(f => ({ ...f, materialname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="materialtyp">Materialtyp</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.materialtyp) === 'drucktinte'}
                onClick={() => setFields(f => ({ ...f, materialtyp: (lookupKey(f.materialtyp) === 'drucktinte' ? undefined : 'drucktinte') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.materialtyp) === 'drucktinte'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Drucktinte
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.materialtyp) === 'druckmedium'}
                onClick={() => setFields(f => ({ ...f, materialtyp: (lookupKey(f.materialtyp) === 'druckmedium' ? undefined : 'druckmedium') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.materialtyp) === 'druckmedium'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Druckmedium / Untergrund
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.materialtyp) === 'reinigungsmittel'}
                onClick={() => setFields(f => ({ ...f, materialtyp: (lookupKey(f.materialtyp) === 'reinigungsmittel' ? undefined : 'reinigungsmittel') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.materialtyp) === 'reinigungsmittel'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Reinigungsmittel
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.materialtyp) === 'verpackungsmaterial'}
                onClick={() => setFields(f => ({ ...f, materialtyp: (lookupKey(f.materialtyp) === 'verpackungsmaterial' ? undefined : 'verpackungsmaterial') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.materialtyp) === 'verpackungsmaterial'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Verpackungsmaterial
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.materialtyp) === 'sonstiges_material'}
                onClick={() => setFields(f => ({ ...f, materialtyp: (lookupKey(f.materialtyp) === 'sonstiges_material' ? undefined : 'sonstiges_material') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.materialtyp) === 'sonstiges_material'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstiges
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="einheit">Einheit</Label>
            <Select
              value={lookupKey(fields.einheit) ?? ''}
              onValueChange={v => setFields(f => ({ ...f, einheit: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="einheit"><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="liter">Liter</SelectItem>
                <SelectItem value="kilogramm">Kilogramm</SelectItem>
                <SelectItem value="stueck">Stück</SelectItem>
                <SelectItem value="meter">Meter</SelectItem>
                <SelectItem value="quadratmeter">Quadratmeter</SelectItem>
                <SelectItem value="rolle">Rolle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aktueller_bestand">Aktueller Bestand</Label>
            <Input
              id="aktueller_bestand"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.aktueller_bestand ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, aktueller_bestand: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mindestbestand">Mindestbestand</Label>
            <Input
              id="mindestbestand"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.mindestbestand ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, mindestbestand: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preis_pro_einheit">Preis pro Einheit (€)</Label>
            <Input
              id="preis_pro_einheit"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.preis_pro_einheit ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, preis_pro_einheit: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lieferant">Lieferant</Label>
            <Input
              id="lieferant"
              placeholder=""
              value={fields.lieferant ?? ''}
              onChange={e => setFields(f => ({ ...f, lieferant: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen_material">Notizen</Label>
            <Textarea
              id="notizen_material"
              placeholder=""
              value={fields.notizen_material ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen_material: e.target.value }))}
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
