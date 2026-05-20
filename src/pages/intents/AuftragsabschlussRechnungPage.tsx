import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IconFileInvoice,
  IconCircleCheck,
  IconArrowRight,
  IconRefresh,
  IconBuildingStore,
  IconListDetails,
} from '@tabler/icons-react';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Auftragsverwaltung, Kundenverwaltung } from '@/types/app';
import { enrichAuftragsverwaltung } from '@/lib/enrich';
import type { EnrichedAuftragsverwaltung } from '@/types/enriched';

const STEPS = [
  { label: 'Auftrag wählen' },
  { label: 'Details & Status' },
  { label: 'Rechnung erstellen' },
  { label: 'Abschluss' },
];

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function generateRechnungsnummer(): string {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `RE-${year}-${rand}`;
}

function parseMwstPercent(label: string | undefined): number {
  if (!label) return 0;
  const m = label.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return 0;
  return parseFloat(m[1].replace(',', '.'));
}

function formatEuro(val: number): string {
  return val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

interface InvoiceFormState {
  rechnungsnummer: string;
  rechnungsdatum: string;
  faelligkeitsdatum: string;
  nettobetrag: string;
  mehrwertsteuersatz: string;
  zahlungsart: string;
  zahlungsstatus: string;
  rechnungsnotiz: string;
}

export default function AuftragsabschlussRechnungPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Data state — ALL hooks before any early returns
  const [auftraege, setAuftraege] = useState<Auftragsverwaltung[]>([]);
  const [kunden, setKunden] = useState<Kundenverwaltung[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAuftrag, setSelectedAuftrag] = useState<EnrichedAuftragsverwaltung | null>(null);

  // Step 2 state
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusSaveError, setStatusSaveError] = useState<string | null>(null);
  const [statusSaved, setStatusSaved] = useState(false);

  // Step 3 state
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>({
    rechnungsnummer: generateRechnungsnummer(),
    rechnungsdatum: todayIso(),
    faelligkeitsdatum: addDaysIso(todayIso(), 14),
    nettobetrag: '',
    mehrwertsteuersatz: LOOKUP_OPTIONS.rechnungsverwaltung?.mehrwertsteuersatz?.[0]?.key ?? '',
    zahlungsart: LOOKUP_OPTIONS.rechnungsverwaltung?.zahlungsart?.[0]?.key ?? '',
    zahlungsstatus: 'offen',
    rechnungsnotiz: '',
  });
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // Step 4 state
  const [createdRechnungsnummer, setCreatedRechnungsnummer] = useState('');
  const [createdGesamtbetrag, setCreatedGesamtbetrag] = useState(0);
  const [createdFaelligkeit, setCreatedFaelligkeit] = useState('');

  // Computed maps
  const kundenverwaltungMap = useMemo(() => {
    const m = new Map<string, Kundenverwaltung>();
    kunden.forEach(k => m.set(k.record_id, k));
    return m;
  }, [kunden]);

  // Enriched orders
  const enrichedAuftraege = useMemo(() => {
    return enrichAuftragsverwaltung(auftraege, {
      kundenverwaltungMap,
      mitarbeiterverwaltungMap: new Map(),
      motivkatalogMap: new Map(),
      materialverwaltungMap: new Map(),
    });
  }, [auftraege, kundenverwaltungMap]);

  // Filtered: exclude abgeschlossen + storniert
  const filteredAuftraege = useMemo(() => {
    return enrichedAuftraege.filter(a => {
      const key = a.fields.status?.key;
      return key !== 'abgeschlossen' && key !== 'storniert';
    });
  }, [enrichedAuftraege]);

  // Live gesamtbetrag
  const gesamtbetrag = useMemo(() => {
    const netto = parseFloat(invoiceForm.nettobetrag.replace(',', '.'));
    if (isNaN(netto)) return 0;
    const mwstOption = LOOKUP_OPTIONS.rechnungsverwaltung?.mehrwertsteuersatz?.find(
      o => o.key === invoiceForm.mehrwertsteuersatz
    );
    const percent = parseMwstPercent(mwstOption?.label);
    return netto + (netto * percent) / 100;
  }, [invoiceForm.nettobetrag, invoiceForm.mehrwertsteuersatz]);

  // Kunde for selected order
  const selectedKunde = useMemo(() => {
    if (!selectedAuftrag) return null;
    const kundeId = extractRecordId(selectedAuftrag.fields.kunde);
    if (!kundeId) return null;
    return kundenverwaltungMap.get(kundeId) ?? null;
  }, [selectedAuftrag, kundenverwaltungMap]);

  const fetchAll = useCallback(async () => {
    setFetchError(null);
    try {
      const [auftraegeData, kundenData] = await Promise.all([
        LivingAppsService.getAuftragsverwaltung(),
        LivingAppsService.getKundenverwaltung(),
      ]);
      setAuftraege(auftraegeData);
      setKunden(kundenData);
    } catch (err) {
      setFetchError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Deep-link: read ?auftragId= and ?step= from URL on mount
  useEffect(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    if (urlStep >= 1 && urlStep <= 4) {
      setCurrentStep(urlStep);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After data loads: apply ?auftragId= pre-selection
  useEffect(() => {
    if (loading) return;
    const auftragId = searchParams.get('auftragId');
    if (!auftragId || selectedAuftrag) return;
    const found = enrichedAuftraege.find(a => a.record_id === auftragId);
    if (found) {
      setSelectedAuftrag(found);
      setSelectedStatus(found.fields.status?.key ?? '');
      const urlStep = parseInt(searchParams.get('step') ?? '', 10);
      if (urlStep < 2) {
        handleStepChange(2);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, enrichedAuftraege]);

  // Sync step to URL
  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
    const params = new URLSearchParams(searchParams);
    if (step > 1) {
      params.set('step', String(step));
    } else {
      params.delete('step');
    }
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  // Step 1: select order
  const handleSelectAuftrag = (id: string) => {
    const found = enrichedAuftraege.find(a => a.record_id === id);
    if (!found) return;
    setSelectedAuftrag(found);
    setSelectedStatus(found.fields.status?.key ?? '');
    setStatusSaved(false);
    setStatusSaveError(null);
    const params = new URLSearchParams(searchParams);
    params.set('auftragId', id);
    setSearchParams(params, { replace: true });
    handleStepChange(2);
  };

  // Step 2: update status
  const handleStatusUpdate = async () => {
    if (!selectedAuftrag || !selectedStatus) return;
    setStatusSaving(true);
    setStatusSaveError(null);
    try {
      await LivingAppsService.updateAuftragsverwaltungEntry(selectedAuftrag.record_id, {
        status: selectedStatus,
      });
      await fetchAll();
      setStatusSaved(true);
    } catch (err) {
      setStatusSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setStatusSaving(false);
    }
  };

  // Step 3: create invoice
  const handleCreateInvoice = async () => {
    if (!selectedAuftrag) return;
    const netto = parseFloat(invoiceForm.nettobetrag.replace(',', '.'));
    if (isNaN(netto) || netto <= 0) {
      setInvoiceError('Bitte gib einen gültigen Nettobetrag ein.');
      return;
    }
    if (!invoiceForm.rechnungsnummer.trim()) {
      setInvoiceError('Bitte gib eine Rechnungsnummer ein.');
      return;
    }

    const kundeId = extractRecordId(selectedAuftrag.fields.kunde);
    setInvoiceSaving(true);
    setInvoiceError(null);
    try {
      await LivingAppsService.createRechnungsverwaltungEntry({
        rechnungsnummer: invoiceForm.rechnungsnummer.trim(),
        rechnungsdatum: invoiceForm.rechnungsdatum,
        faelligkeitsdatum: invoiceForm.faelligkeitsdatum,
        auftrag: createRecordUrl(APP_IDS.AUFTRAGSVERWALTUNG, selectedAuftrag.record_id),
        rechnungskunde: kundeId
          ? createRecordUrl(APP_IDS.KUNDENVERWALTUNG, kundeId)
          : undefined,
        nettobetrag: netto,
        gesamtbetrag: gesamtbetrag,
        mehrwertsteuersatz: invoiceForm.mehrwertsteuersatz,
        zahlungsart: invoiceForm.zahlungsart,
        zahlungsstatus: invoiceForm.zahlungsstatus,
        rechnungsnotiz: invoiceForm.rechnungsnotiz || undefined,
      });
      setCreatedRechnungsnummer(invoiceForm.rechnungsnummer.trim());
      setCreatedGesamtbetrag(gesamtbetrag);
      setCreatedFaelligkeit(invoiceForm.faelligkeitsdatum);
      handleStepChange(4);
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : 'Fehler beim Erstellen der Rechnung');
    } finally {
      setInvoiceSaving(false);
    }
  };

  // Reset wizard
  const handleReset = () => {
    setSelectedAuftrag(null);
    setSelectedStatus('');
    setStatusSaved(false);
    setStatusSaveError(null);
    setInvoiceForm({
      rechnungsnummer: generateRechnungsnummer(),
      rechnungsdatum: todayIso(),
      faelligkeitsdatum: addDaysIso(todayIso(), 14),
      nettobetrag: '',
      mehrwertsteuersatz: LOOKUP_OPTIONS.rechnungsverwaltung?.mehrwertsteuersatz?.[0]?.key ?? '',
      zahlungsart: LOOKUP_OPTIONS.rechnungsverwaltung?.zahlungsart?.[0]?.key ?? '',
      zahlungsstatus: 'offen',
      rechnungsnotiz: '',
    });
    setInvoiceError(null);
    setCreatedRechnungsnummer('');
    setCreatedGesamtbetrag(0);
    setCreatedFaelligkeit('');
    const params = new URLSearchParams();
    setSearchParams(params, { replace: true });
    handleStepChange(1);
  };

  const updateInvoiceForm = (key: keyof InvoiceFormState, value: string) => {
    setInvoiceForm(prev => ({ ...prev, [key]: value }));
  };

  const statusOptions = LOOKUP_OPTIONS.auftragsverwaltung?.status ?? [];
  const mwstOptions = LOOKUP_OPTIONS.rechnungsverwaltung?.mehrwertsteuersatz ?? [];
  const zahlungsartOptions = LOOKUP_OPTIONS.rechnungsverwaltung?.zahlungsart ?? [];
  const zahlungsstatusOptions = LOOKUP_OPTIONS.rechnungsverwaltung?.zahlungsstatus ?? [];

  return (
    <div className="p-4 sm:p-6">
      <IntentWizardShell
        title="Auftragsabschluss & Rechnungserstellung"
        subtitle="Auftrag prüfen, Status aktualisieren und Rechnung erstellen"
        steps={STEPS}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        loading={loading}
        error={fetchError}
        onRetry={fetchAll}
      >
        {/* STEP 1: Auftrag wählen */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold">Auftrag auswählen</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Wähle einen offenen Auftrag zum Abschließen aus.
                </p>
              </div>
              <a
                href="#/intents/neuen-auftrag-erstellen"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline shrink-0"
              >
                <IconFileInvoice size={15} />
                Neuer Auftrag
              </a>
            </div>
            <EntitySelectStep
              items={filteredAuftraege.map(a => {
                const kundeId = extractRecordId(a.fields.kunde);
                const kunde = kundeId ? kundenverwaltungMap.get(kundeId) : null;
                const kundeName = kunde
                  ? [kunde.fields.kunde_vorname, kunde.fields.kunde_nachname]
                      .filter(Boolean)
                      .join(' ') || kunde.fields.firmenname || '—'
                  : a.kundeName || '—';
                return {
                  id: a.record_id,
                  title: a.fields.auftragsnummer ?? `Auftrag ${a.record_id.slice(-6)}`,
                  subtitle: kundeName,
                  status: a.fields.status
                    ? { key: a.fields.status.key, label: a.fields.status.label }
                    : undefined,
                  stats: [
                    {
                      label: 'Datum',
                      value: formatDate(a.fields.auftragsdatum),
                    },
                    ...(a.fields.wunschtermin
                      ? [{ label: 'Wunschtermin', value: formatDate(a.fields.wunschtermin) }]
                      : []),
                  ],
                };
              })}
              onSelect={handleSelectAuftrag}
              searchPlaceholder="Auftrag suchen..."
              emptyIcon={<IconListDetails size={32} />}
              emptyText="Keine offenen Aufträge gefunden."
            />
          </div>
        )}

        {/* STEP 2: Auftragsdetails & Status */}
        {currentStep === 2 && selectedAuftrag && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Auftragsdetails prüfen</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Überprüfe die Auftragsdaten und aktualisiere den Status.
              </p>
            </div>

            {/* Order summary card */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/40 flex items-center gap-2">
                <IconListDetails size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium">
                  {selectedAuftrag.fields.auftragsnummer ?? 'Auftrag'}
                </span>
                {selectedAuftrag.fields.status && (
                  <StatusBadge
                    statusKey={selectedAuftrag.fields.status.key}
                    label={selectedAuftrag.fields.status.label}
                  />
                )}
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Auftragsdatum</span>
                  <p className="font-medium mt-0.5">{formatDate(selectedAuftrag.fields.auftragsdatum)}</p>
                </div>
                {selectedAuftrag.fields.wunschtermin && (
                  <div>
                    <span className="text-muted-foreground">Wunschtermin</span>
                    <p className="font-medium mt-0.5">{formatDate(selectedAuftrag.fields.wunschtermin)}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Kunde</span>
                  <p className="font-medium mt-0.5 truncate">
                    {selectedKunde
                      ? [
                          selectedKunde.fields.kunde_vorname,
                          selectedKunde.fields.kunde_nachname,
                        ]
                          .filter(Boolean)
                          .join(' ') || selectedKunde.fields.firmenname || '—'
                      : selectedAuftrag.kundeName || '—'}
                  </p>
                  {selectedKunde?.fields.firmenname && (
                    <p className="text-xs text-muted-foreground">{selectedKunde.fields.firmenname}</p>
                  )}
                </div>
                {selectedAuftrag.motivName && (
                  <div>
                    <span className="text-muted-foreground">Motiv</span>
                    <p className="font-medium mt-0.5 truncate">{selectedAuftrag.motivName}</p>
                  </div>
                )}
                {(selectedAuftrag.fields.druckbreite_cm || selectedAuftrag.fields.druckhoehe_cm) && (
                  <div>
                    <span className="text-muted-foreground">Maße</span>
                    <p className="font-medium mt-0.5">
                      {selectedAuftrag.fields.druckbreite_cm ?? '?'} ×{' '}
                      {selectedAuftrag.fields.druckhoehe_cm ?? '?'} cm
                    </p>
                  </div>
                )}
                {selectedAuftrag.fields.lieferart && (
                  <div>
                    <span className="text-muted-foreground">Lieferart</span>
                    <p className="font-medium mt-0.5">{selectedAuftrag.fields.lieferart.label}</p>
                  </div>
                )}
                {selectedAuftrag.fields.sonderanforderungen && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Sonderanforderungen</span>
                    <p className="font-medium mt-0.5 whitespace-pre-line text-sm">
                      {selectedAuftrag.fields.sonderanforderungen}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status update section */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/40">
                <span className="text-sm font-medium">Status aktualisieren</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Aktueller Status:</span>
                  {selectedAuftrag.fields.status ? (
                    <StatusBadge
                      statusKey={selectedAuftrag.fields.status.key}
                      label={selectedAuftrag.fields.status.label}
                    />
                  ) : (
                    <span className="text-muted-foreground">Kein Status</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status-select">Neuer Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger id="status-select" className="w-full max-w-xs">
                      <SelectValue placeholder="Status wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {statusSaveError && (
                  <p className="text-sm text-destructive">{statusSaveError}</p>
                )}
                {statusSaved && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <IconCircleCheck size={15} />
                    Status wurde gespeichert.
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={handleStatusUpdate}
                  disabled={statusSaving || !selectedStatus}
                  className="gap-1.5"
                >
                  {statusSaving ? (
                    <IconRefresh size={15} className="animate-spin" />
                  ) : (
                    <IconRefresh size={15} />
                  )}
                  Status aktualisieren
                </Button>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => handleStepChange(1)}
              >
                Anderen Auftrag wählen
              </Button>
              <Button
                onClick={() => handleStepChange(3)}
                className="gap-1.5"
              >
                Weiter zur Rechnung
                <IconArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Rechnung erstellen */}
        {currentStep === 3 && selectedAuftrag && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Rechnung erstellen</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Fülle die Rechnungsdaten aus. Auftrag und Kunde werden automatisch verknüpft.
              </p>
            </div>

            {/* Order reference badge */}
            <div className="flex items-center gap-2 p-3 rounded-xl border bg-muted/40 text-sm flex-wrap">
              <IconFileInvoice size={15} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Verknüpfter Auftrag:</span>
              <span className="font-medium">{selectedAuftrag.fields.auftragsnummer ?? selectedAuftrag.record_id}</span>
              {selectedKunde && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-medium truncate">
                    {[selectedKunde.fields.kunde_vorname, selectedKunde.fields.kunde_nachname]
                      .filter(Boolean)
                      .join(' ') || selectedKunde.fields.firmenname || '—'}
                  </span>
                </>
              )}
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rechnungsnummer */}
                <div className="space-y-1.5">
                  <Label htmlFor="rechnungsnummer">Rechnungsnummer *</Label>
                  <Input
                    id="rechnungsnummer"
                    value={invoiceForm.rechnungsnummer}
                    onChange={e => updateInvoiceForm('rechnungsnummer', e.target.value)}
                    placeholder="RE-2025-1234"
                  />
                </div>

                {/* Placeholder for alignment */}
                <div className="hidden sm:block" />

                {/* Rechnungsdatum */}
                <div className="space-y-1.5">
                  <Label htmlFor="rechnungsdatum">Rechnungsdatum</Label>
                  <Input
                    id="rechnungsdatum"
                    type="date"
                    value={invoiceForm.rechnungsdatum}
                    onChange={e => updateInvoiceForm('rechnungsdatum', e.target.value)}
                  />
                </div>

                {/* Fälligkeitsdatum */}
                <div className="space-y-1.5">
                  <Label htmlFor="faelligkeitsdatum">Fälligkeitsdatum</Label>
                  <Input
                    id="faelligkeitsdatum"
                    type="date"
                    value={invoiceForm.faelligkeitsdatum}
                    onChange={e => updateInvoiceForm('faelligkeitsdatum', e.target.value)}
                  />
                </div>

                {/* Nettobetrag */}
                <div className="space-y-1.5">
                  <Label htmlFor="nettobetrag">Nettobetrag (€) *</Label>
                  <Input
                    id="nettobetrag"
                    type="text"
                    inputMode="decimal"
                    value={invoiceForm.nettobetrag}
                    onChange={e => updateInvoiceForm('nettobetrag', e.target.value)}
                    placeholder="0,00"
                  />
                </div>

                {/* Mehrwertsteuersatz */}
                <div className="space-y-1.5">
                  <Label htmlFor="mwst-select">Mehrwertsteuersatz</Label>
                  <Select
                    value={invoiceForm.mehrwertsteuersatz}
                    onValueChange={v => updateInvoiceForm('mehrwertsteuersatz', v)}
                  >
                    <SelectTrigger id="mwst-select">
                      <SelectValue placeholder="MwSt. wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mwstOptions.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gesamtbetrag (readonly) */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Gesamtbetrag (berechnet)</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                    <span className="text-xl font-bold text-primary">
                      {formatEuro(gesamtbetrag)}
                    </span>
                    {invoiceForm.nettobetrag && (
                      <span className="text-sm text-muted-foreground">
                        (inkl.{' '}
                        {(() => {
                          const opt = mwstOptions.find(o => o.key === invoiceForm.mehrwertsteuersatz);
                          return opt?.label ?? 'MwSt.';
                        })()}
                        )
                      </span>
                    )}
                  </div>
                </div>

                {/* Zahlungsart */}
                <div className="space-y-1.5">
                  <Label htmlFor="zahlungsart-select">Zahlungsart</Label>
                  <Select
                    value={invoiceForm.zahlungsart}
                    onValueChange={v => updateInvoiceForm('zahlungsart', v)}
                  >
                    <SelectTrigger id="zahlungsart-select">
                      <SelectValue placeholder="Zahlungsart wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {zahlungsartOptions.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Zahlungsstatus */}
                <div className="space-y-1.5">
                  <Label htmlFor="zahlungsstatus-select">Zahlungsstatus</Label>
                  <Select
                    value={invoiceForm.zahlungsstatus}
                    onValueChange={v => updateInvoiceForm('zahlungsstatus', v)}
                  >
                    <SelectTrigger id="zahlungsstatus-select">
                      <SelectValue placeholder="Zahlungsstatus wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {zahlungsstatusOptions.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rechnungsnotiz */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="rechnungsnotiz">Rechnungsnotiz</Label>
                  <Textarea
                    id="rechnungsnotiz"
                    value={invoiceForm.rechnungsnotiz}
                    onChange={e => updateInvoiceForm('rechnungsnotiz', e.target.value)}
                    placeholder="Optionale Notiz zur Rechnung..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {invoiceError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {invoiceError}
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => handleStepChange(2)}
              >
                Zurück
              </Button>
              <Button
                onClick={handleCreateInvoice}
                disabled={invoiceSaving}
                className="gap-1.5"
              >
                {invoiceSaving ? (
                  <IconRefresh size={15} className="animate-spin" />
                ) : (
                  <IconFileInvoice size={15} />
                )}
                Rechnung erstellen
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Abschluss */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Success banner */}
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center">
                  <IconCircleCheck size={28} className="text-green-600" stroke={1.5} />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-800">Rechnung erfolgreich erstellt!</h2>
                <p className="text-sm text-green-700 mt-1">
                  Die Rechnung wurde angelegt und mit dem Auftrag verknüpft.
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/40 text-sm font-medium flex items-center gap-2">
                  <IconFileInvoice size={15} className="text-muted-foreground" />
                  Rechnung
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rechnungsnummer</span>
                    <span className="font-semibold">{createdRechnungsnummer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gesamtbetrag</span>
                    <span className="font-bold text-primary text-base">{formatEuro(createdGesamtbetrag)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fällig am</span>
                    <span className="font-medium">{formatDate(createdFaelligkeit)}</span>
                  </div>
                </div>
              </div>

              {selectedAuftrag && (
                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/40 text-sm font-medium flex items-center gap-2">
                    <IconBuildingStore size={15} className="text-muted-foreground" />
                    Auftrag
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auftragsnummer</span>
                      <span className="font-semibold">
                        {selectedAuftrag.fields.auftragsnummer ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kunde</span>
                      <span className="font-medium truncate max-w-[140px] text-right">
                        {selectedKunde
                          ? [
                              selectedKunde.fields.kunde_vorname,
                              selectedKunde.fields.kunde_nachname,
                            ]
                              .filter(Boolean)
                              .join(' ') || selectedKunde.fields.firmenname || '—'
                          : selectedAuftrag.kundeName || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auftragsdatum</span>
                      <span className="font-medium">{formatDate(selectedAuftrag.fields.auftragsdatum)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleReset}
                className="gap-1.5"
              >
                <IconRefresh size={15} />
                Weiteren Auftrag abschließen
              </Button>
              <Button
                variant="outline"
                asChild
              >
                <a href="#/auftragsverwaltung">
                  Zur Auftragsverwaltung
                </a>
              </Button>
              <Button
                variant="outline"
                asChild
              >
                <a href="#/rechnungsverwaltung">
                  Zur Rechnungsverwaltung
                </a>
              </Button>
            </div>
          </div>
        )}
      </IntentWizardShell>
    </div>
  );
}
