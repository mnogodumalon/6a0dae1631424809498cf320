import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { KundenverwaltungDialog } from '@/components/dialogs/KundenverwaltungDialog';
import { MotivkatalogDialog } from '@/components/dialogs/MotivkatalogDialog';
import { MaterialverwaltungDialog } from '@/components/dialogs/MaterialverwaltungDialog';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import type { Kundenverwaltung, Motivkatalog, Materialverwaltung, Mitarbeiterverwaltung } from '@/types/app';
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
  IconChevronRight,
  IconChevronLeft,
  IconCheck,
  IconAlertTriangle,
  IconPlus,
  IconUser,
  IconPhoto,
  IconPackage,
  IconTruck,
  IconClipboardCheck,
  IconCircleCheck,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Kunde' },
  { label: 'Motiv' },
  { label: 'Materialien' },
  { label: 'Details' },
  { label: 'Zusammenfassung' },
];

export default function NeuenAuftragErstellenPage() {
  const [searchParams] = useSearchParams();
  const initialStep = Math.min(
    Math.max(parseInt(searchParams.get('step') ?? '1', 10), 1),
    5
  );

  const { kundenverwaltung, motivkatalog, materialverwaltung, mitarbeiterverwaltung, loading, error, fetchAll } = useDashboardData();

  const [currentStep, setCurrentStep] = useState(initialStep);

  // Step 1 — Kunde
  const initialKundeId = searchParams.get('kundeId') ?? '';
  const [selectedKundeId, setSelectedKundeId] = useState<string>(initialKundeId);
  const [kundeDialogOpen, setKundeDialogOpen] = useState(false);

  // Step 2 — Motiv
  const [selectedMotivId, setSelectedMotivId] = useState<string>('');
  const [motivDialogOpen, setMotivDialogOpen] = useState(false);
  const [druckbreite, setDruckbreite] = useState<string>('');
  const [druckhoehe, setDruckhoehe] = useState<string>('');

  // Step 3 — Materialien
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);

  // Step 4 — Details
  const [auftragsnummer, setAuftragsnummer] = useState('');
  const [wunschtermin, setWunschtermin] = useState('');
  const [lieferart, setLieferart] = useState('');
  const [lieferStrasse, setLieferStrasse] = useState('');
  const [lieferHausnummer, setLieferHausnummer] = useState('');
  const [lieferPlz, setLieferPlz] = useState('');
  const [lieferOrt, setLieferOrt] = useState('');
  const [selectedMitarbeiterId, setSelectedMitarbeiterId] = useState('');
  const [sonderanforderungen, setSonderanforderungen] = useState('');
  const [interneNotizen, setInterneNotizen] = useState('');

  // Step 5 — Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdAuftragId, setCreatedAuftragId] = useState<string | null>(null);

  // Derived selections
  const selectedKunde: Kundenverwaltung | undefined = kundenverwaltung.find(k => k.record_id === selectedKundeId);
  const selectedMotiv: Motivkatalog | undefined = motivkatalog.find(m => m.record_id === selectedMotivId);
  const selectedMaterialien: Materialverwaltung[] = materialverwaltung.filter(m => selectedMaterialIds.has(m.record_id));
  const selectedMitarbeiter: Mitarbeiterverwaltung | undefined = mitarbeiterverwaltung.find(m => m.record_id === selectedMitarbeiterId);

  // Price calculation
  const breiteNum = parseFloat(druckbreite) || 0;
  const hoeheNum = parseFloat(druckhoehe) || 0;
  const flaeche = (breiteNum / 100) * (hoeheNum / 100);
  const preis = flaeche * (selectedMotiv?.fields.preis_pro_qm ?? 0);

  const handleMotivSelect = useCallback((id: string) => {
    setSelectedMotivId(id);
    const motiv = motivkatalog.find(m => m.record_id === id);
    if (motiv) {
      if (motiv.fields.standardbreite_cm) setDruckbreite(String(motiv.fields.standardbreite_cm));
      if (motiv.fields.standardhoehe_cm) setDruckhoehe(String(motiv.fields.standardhoehe_cm));
    }
  }, [motivkatalog]);

  const toggleMaterial = (id: string) => {
    setSelectedMaterialIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedKundeId || !selectedMotivId || !auftragsnummer) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const materialUrls = Array.from(selectedMaterialIds).map(id =>
        createRecordUrl(APP_IDS.MATERIALVERWALTUNG, id)
      );
      const fields: Record<string, unknown> = {
        auftragsnummer,
        auftragsdatum: today,
        status: 'neu',
        kunde: createRecordUrl(APP_IDS.KUNDENVERWALTUNG, selectedKundeId),
        motiv: createRecordUrl(APP_IDS.MOTIVKATALOG, selectedMotivId),
        materialien: materialUrls,
        druckbreite_cm: breiteNum || undefined,
        druckhoehe_cm: hoeheNum || undefined,
        wunschtermin: wunschtermin || undefined,
        lieferart: lieferart || undefined,
        sonderanforderungen: sonderanforderungen || undefined,
        interne_notizen: interneNotizen || undefined,
      };
      if (selectedMitarbeiterId) {
        fields.mitarbeiter = createRecordUrl(APP_IDS.MITARBEITERVERWALTUNG, selectedMitarbeiterId);
      }
      if (lieferart && lieferart !== 'selbstabholung') {
        fields.liefer_strasse = lieferStrasse || undefined;
        fields.liefer_hausnummer = lieferHausnummer || undefined;
        fields.liefer_plz = lieferPlz || undefined;
        fields.liefer_ort = lieferOrt || undefined;
      }
      const result = await LivingAppsService.createAuftragsverwaltungEntry(fields as any);
      const newId = result && typeof result === 'object' ? (Object.keys(result)[0] ?? null) : null;
      setCreatedAuftragId(newId);
      setSubmitSuccess(true);
      await fetchAll();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSubmitting(false);
    }
  };

  const lieferartOptions = LOOKUP_OPTIONS['auftragsverwaltung']?.lieferart ?? [];
  const showDeliveryFields = lieferart && lieferart !== 'selbstabholung';

  const kundenName = (k: Kundenverwaltung) =>
    [k.fields.kunde_vorname, k.fields.kunde_nachname].filter(Boolean).join(' ') || '(Kein Name)';

  return (
    <IntentWizardShell
      title="Neuen Auftrag erstellen"
      subtitle="Schritt-für-Schritt zum fertigen Druckauftrag"
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ─── STEP 1: Kunde wählen ─── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconUser size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Kunde wählen</h2>
              <p className="text-xs text-muted-foreground">Wähle einen bestehenden Kunden oder lege einen neuen an.</p>
            </div>
          </div>

          <EntitySelectStep
            items={kundenverwaltung.map(k => ({
              id: k.record_id,
              title: kundenName(k),
              subtitle: k.fields.firmenname
                ? k.fields.firmenname
                : (k.fields.kundenkategorie?.label ?? ''),
            }))}
            onSelect={(id) => {
              setSelectedKundeId(id);
              setCurrentStep(2);
            }}
            searchPlaceholder="Kunde suchen..."
            emptyIcon={<IconUser size={32} />}
            emptyText="Noch kein Kunde vorhanden."
            createLabel="Neuen Kunden anlegen"
            onCreateNew={() => setKundeDialogOpen(true)}
            createDialog={
              <KundenverwaltungDialog
                open={kundeDialogOpen}
                onClose={() => setKundeDialogOpen(false)}
                onSubmit={async (fields) => {
                  const result = await LivingAppsService.createKundenverwaltungEntry(fields);
                  await fetchAll();
                  if (result && typeof result === 'object') {
                    const newId = Object.keys(result)[0];
                    if (newId) {
                      setSelectedKundeId(newId);
                      setCurrentStep(2);
                    }
                  }
                }}
                enablePhotoScan={AI_PHOTO_SCAN['Kundenverwaltung']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Kundenverwaltung']}
              />
            }
          />

          {selectedKundeId && (
            <div className="pt-2 flex justify-end">
              <Button onClick={() => setCurrentStep(2)} className="gap-2">
                Weiter
                <IconChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 2: Motiv auswählen ─── */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconPhoto size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Motiv auswählen</h2>
              <p className="text-xs text-muted-foreground">Wähle ein Motiv aus dem Katalog und passe die Druckmaße an.</p>
            </div>
          </div>

          <EntitySelectStep
            items={motivkatalog
              .filter(m => m.fields.motiv_aktiv === true)
              .map(m => ({
                id: m.record_id,
                title: m.fields.motivname ?? '(Kein Name)',
                subtitle: m.fields.kategorie?.label ?? '',
                stats: m.fields.preis_pro_qm !== undefined
                  ? [{ label: 'Preis/m\u00b2', value: `${m.fields.preis_pro_qm.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} \u20ac` }]
                  : [],
              }))}
            onSelect={handleMotivSelect}
            searchPlaceholder="Motiv suchen..."
            emptyIcon={<IconPhoto size={32} />}
            emptyText="Kein aktives Motiv vorhanden."
            createLabel="Neues Motiv anlegen"
            onCreateNew={() => setMotivDialogOpen(true)}
            createDialog={
              <MotivkatalogDialog
                open={motivDialogOpen}
                onClose={() => setMotivDialogOpen(false)}
                onSubmit={async (fields) => {
                  const result = await LivingAppsService.createMotivkatalogEntry(fields);
                  await fetchAll();
                  if (result && typeof result === 'object') {
                    const newId = Object.keys(result)[0];
                    if (newId) handleMotivSelect(newId);
                  }
                }}
                enablePhotoScan={AI_PHOTO_SCAN['Motivkatalog']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Motivkatalog']}
              />
            }
          />

          {selectedMotivId && (
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Druckmaße festlegen</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="druckbreite">Druckbreite (cm)</Label>
                  <Input
                    id="druckbreite"
                    type="number"
                    step="any"
                    min="1"
                    placeholder="z. B. 80"
                    value={druckbreite}
                    onChange={e => setDruckbreite(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="druckhoehe">Druckh\u00f6he (cm)</Label>
                  <Input
                    id="druckhoehe"
                    type="number"
                    step="any"
                    min="1"
                    placeholder="z. B. 60"
                    value={druckhoehe}
                    onChange={e => setDruckhoehe(e.target.value)}
                  />
                </div>
              </div>
              {breiteNum > 0 && hoeheNum > 0 && selectedMotiv?.fields.preis_pro_qm !== undefined && (
                <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Fl\u00e4che: {flaeche.toLocaleString('de-DE', { maximumFractionDigits: 2 })} m\u00b2
                    </p>
                    <p className="text-sm font-semibold text-primary mt-0.5">
                      Gesch\u00e4tzter Preis: {preis.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-2">
              <IconChevronLeft size={16} />
              Zur\u00fcck
            </Button>
            <Button
              onClick={() => setCurrentStep(3)}
              disabled={!selectedMotivId}
              className="gap-2"
            >
              Weiter
              <IconChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Materialien wählen ─── */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <IconPackage size={16} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Materialien w\u00e4hlen</h2>
                <p className="text-xs text-muted-foreground">W\u00e4hle alle ben\u00f6tigten Materialien aus.</p>
              </div>
            </div>
            <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-1">
              {selectedMaterialIds.size} ausgew\u00e4hlt
            </span>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setMaterialDialogOpen(true)} className="gap-1.5">
              <IconPlus size={15} />
              Neues Material anlegen
            </Button>
            <MaterialverwaltungDialog
              open={materialDialogOpen}
              onClose={() => setMaterialDialogOpen(false)}
              onSubmit={async (fields) => {
                const result = await LivingAppsService.createMaterialverwaltungEntry(fields);
                await fetchAll();
                if (result && typeof result === 'object') {
                  const newId = Object.keys(result)[0];
                  if (newId) {
                    setSelectedMaterialIds(prev => new Set([...prev, newId]));
                  }
                }
              }}
              enablePhotoScan={AI_PHOTO_SCAN['Materialverwaltung']}
              enablePhotoLocation={AI_PHOTO_LOCATION['Materialverwaltung']}
            />
          </div>

          {materialverwaltung.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="mb-3 flex justify-center opacity-40">
                <IconPackage size={32} />
              </div>
              <p className="text-sm">Noch kein Material vorhanden.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {materialverwaltung.map(material => {
                const isSelected = selectedMaterialIds.has(material.record_id);
                const isLow =
                  material.fields.aktueller_bestand !== undefined &&
                  material.fields.mindestbestand !== undefined &&
                  material.fields.aktueller_bestand <= material.fields.mindestbestand;
                return (
                  <button
                    key={material.record_id}
                    onClick={() => toggleMaterial(material.record_id)}
                    className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-colors overflow-hidden ${
                      isSelected
                        ? 'bg-primary/5 border-primary/40'
                        : 'bg-card border-border hover:bg-accent hover:border-primary/20'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                    }`}>
                      {isSelected && <IconCheck size={12} stroke={3} className="text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {material.fields.materialname ?? '(Kein Name)'}
                        </span>
                        {material.fields.materialtyp && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                            {material.fields.materialtyp.label}
                          </span>
                        )}
                        {isLow && (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                            <IconAlertTriangle size={11} />
                            Niedriger Bestand
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {material.fields.aktueller_bestand !== undefined && (
                          <span>
                            Bestand:{' '}
                            <span className="font-medium text-foreground">
                              {material.fields.aktueller_bestand} {material.fields.einheit?.label ?? ''}
                            </span>
                          </span>
                        )}
                        {material.fields.preis_pro_einheit !== undefined && (
                          <span>
                            Preis:{' '}
                            <span className="font-medium text-foreground">
                              {material.fields.preis_pro_einheit.toLocaleString('de-DE', {
                                style: 'currency',
                                currency: 'EUR',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              / {material.fields.einheit?.label ?? 'Einheit'}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(2)} className="gap-2">
              <IconChevronLeft size={16} />
              Zur\u00fcck
            </Button>
            <Button onClick={() => setCurrentStep(4)} className="gap-2">
              Weiter
              <IconChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 4: Details & Lieferung ─── */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconTruck size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Details &amp; Lieferung</h2>
              <p className="text-xs text-muted-foreground">Vervollst\u00e4ndige die Auftragsdaten.</p>
            </div>
          </div>

          {/* Summary sidebar */}
          <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Zusammenfassung</p>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Kunde</span>
              <span className="font-medium truncate max-w-[60%] text-right">
                {selectedKunde ? kundenName(selectedKunde) : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Motiv</span>
              <span className="font-medium truncate max-w-[60%] text-right">
                {selectedMotiv?.fields.motivname ?? '—'}
              </span>
            </div>
            {breiteNum > 0 && hoeheNum > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Ma\u00dfe</span>
                <span className="font-medium">{breiteNum} \u00d7 {hoeheNum} cm</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Materialien</span>
              <span className="font-medium">{selectedMaterialIds.size} ausgew\u00e4hlt</span>
            </div>
            {preis > 0 && (
              <div className="flex justify-between gap-2 pt-1 border-t">
                <span className="text-muted-foreground">Gesch. Preis</span>
                <span className="font-semibold text-primary">
                  {preis.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="auftragsnummer">
                Auftragsnummer <span className="text-destructive">*</span>
              </Label>
              <Input
                id="auftragsnummer"
                placeholder="z. B. AU-2026-001"
                value={auftragsnummer}
                onChange={e => setAuftragsnummer(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wunschtermin">Wunschtermin</Label>
              <Input
                id="wunschtermin"
                type="date"
                value={wunschtermin}
                onChange={e => setWunschtermin(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lieferart">Lieferart</Label>
              <Select value={lieferart} onValueChange={setLieferart}>
                <SelectTrigger id="lieferart">
                  <SelectValue placeholder="Lieferart w\u00e4hlen" />
                </SelectTrigger>
                <SelectContent>
                  {lieferartOptions.map(opt => (
                    <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showDeliveryFields && (
              <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lieferadresse</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="liefer_strasse">Stra\u00dfe</Label>
                    <Input
                      id="liefer_strasse"
                      placeholder="z. B. Hauptstra\u00dfe"
                      value={lieferStrasse}
                      onChange={e => setLieferStrasse(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="liefer_hausnummer">Hausnummer</Label>
                    <Input
                      id="liefer_hausnummer"
                      placeholder="z. B. 12a"
                      value={lieferHausnummer}
                      onChange={e => setLieferHausnummer(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="liefer_plz">Postleitzahl</Label>
                    <Input
                      id="liefer_plz"
                      placeholder="z. B. 10115"
                      value={lieferPlz}
                      onChange={e => setLieferPlz(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="liefer_ort">Ort</Label>
                    <Input
                      id="liefer_ort"
                      placeholder="z. B. Berlin"
                      value={lieferOrt}
                      onChange={e => setLieferOrt(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="mitarbeiter">Zust\u00e4ndiger Mitarbeiter</Label>
              <Select value={selectedMitarbeiterId} onValueChange={setSelectedMitarbeiterId}>
                <SelectTrigger id="mitarbeiter">
                  <SelectValue placeholder="Mitarbeiter w\u00e4hlen (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Kein Mitarbeiter —</SelectItem>
                  {mitarbeiterverwaltung.map(m => (
                    <SelectItem key={m.record_id} value={m.record_id}>
                      {[m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ')}
                      {m.fields.position?.label ? ` · ${m.fields.position.label}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sonderanforderungen">Sonderanforderungen</Label>
              <Textarea
                id="sonderanforderungen"
                placeholder="Besondere W\u00fcnsche, Hinweise..."
                value={sonderanforderungen}
                onChange={e => setSonderanforderungen(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="interne_notizen">Interne Notizen</Label>
              <Textarea
                id="interne_notizen"
                placeholder="Nur f\u00fcr interne Zwecke..."
                value={interneNotizen}
                onChange={e => setInterneNotizen(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(3)} className="gap-2">
              <IconChevronLeft size={16} />
              Zur\u00fcck
            </Button>
            <Button
              onClick={() => setCurrentStep(5)}
              disabled={!auftragsnummer.trim()}
              className="gap-2"
            >
              Zur Zusammenfassung
              <IconChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 5: Zusammenfassung & Erstellen ─── */}
      {currentStep === 5 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconClipboardCheck size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Zusammenfassung &amp; Erstellen</h2>
              <p className="text-xs text-muted-foreground">\u00dcberpr\u00fcfe alle Daten und erstelle den Auftrag.</p>
            </div>
          </div>

          {submitSuccess ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <IconCircleCheck size={32} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Auftrag erfolgreich erstellt!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Der Auftrag <span className="font-medium text-foreground">{auftragsnummer}</span> wurde angelegt.
                </p>
              </div>
              <div className="flex gap-3">
                <a href="#/auftragsverwaltung" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
                  Zur Auftragsliste
                  <IconChevronRight size={15} />
                </a>
                {createdAuftragId && (
                  <a
                    href={`#/auftragsverwaltung`}
                    className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium"
                  >
                    Auftrag ansehen
                  </a>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl border bg-card overflow-hidden divide-y">
                {/* Kundendaten */}
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Kunde</p>
                  {selectedKunde ? (
                    <div>
                      <p className="font-medium">{kundenName(selectedKunde)}</p>
                      {selectedKunde.fields.firmenname && (
                        <p className="text-sm text-muted-foreground">{selectedKunde.fields.firmenname}</p>
                      )}
                      {selectedKunde.fields.kundenkategorie?.label && (
                        <p className="text-xs text-muted-foreground mt-0.5">{selectedKunde.fields.kundenkategorie.label}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-destructive">Kein Kunde ausgew\u00e4hlt</p>
                  )}
                </div>

                {/* Motivdaten */}
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Motiv &amp; Ma\u00dfe</p>
                  {selectedMotiv ? (
                    <div>
                      <p className="font-medium">{selectedMotiv.fields.motivname ?? '—'}</p>
                      {selectedMotiv.fields.kategorie?.label && (
                        <p className="text-sm text-muted-foreground">{selectedMotiv.fields.kategorie.label}</p>
                      )}
                      {breiteNum > 0 && hoeheNum > 0 && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {breiteNum} \u00d7 {hoeheNum} cm &middot; {flaeche.toLocaleString('de-DE', { maximumFractionDigits: 2 })} m\u00b2
                        </p>
                      )}
                      {preis > 0 && (
                        <p className="text-sm font-semibold text-primary mt-1">
                          Gesch\u00e4tzter Preis:{' '}
                          {preis.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-destructive">Kein Motiv ausgew\u00e4hlt</p>
                  )}
                </div>

                {/* Materialien */}
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Materialien ({selectedMaterialien.length})
                  </p>
                  {selectedMaterialien.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Keine Materialien ausgew\u00e4hlt</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMaterialien.map(m => (
                        <span key={m.record_id} className="text-xs bg-muted text-foreground px-2 py-1 rounded-full">
                          {m.fields.materialname ?? '—'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lieferdetails */}
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Lieferung</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Auftragsnummer</span>
                      <span className="font-medium">{auftragsnummer || '—'}</span>
                    </div>
                    {wunschtermin && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Wunschtermin</span>
                        <span className="font-medium">
                          {new Date(wunschtermin).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    )}
                    {lieferart && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Lieferart</span>
                        <span className="font-medium">
                          {lieferartOptions.find(o => o.key === lieferart)?.label ?? lieferart}
                        </span>
                      </div>
                    )}
                    {showDeliveryFields && (lieferStrasse || lieferOrt) && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Adresse</span>
                        <span className="font-medium text-right max-w-[60%]">
                          {[lieferStrasse, lieferHausnummer].filter(Boolean).join(' ')}
                          {lieferPlz || lieferOrt ? `, ${[lieferPlz, lieferOrt].filter(Boolean).join(' ')}` : ''}
                        </span>
                      </div>
                    )}
                    {selectedMitarbeiter && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Mitarbeiter</span>
                        <span className="font-medium">
                          {[selectedMitarbeiter.fields.vorname, selectedMitarbeiter.fields.nachname].filter(Boolean).join(' ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notizen */}
                {(sonderanforderungen || interneNotizen) && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notizen</p>
                    {sonderanforderungen && (
                      <div className="mb-2">
                        <p className="text-xs text-muted-foreground mb-0.5">Sonderanforderungen</p>
                        <p className="text-sm">{sonderanforderungen}</p>
                      </div>
                    )}
                    {interneNotizen && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Interne Notizen</p>
                        <p className="text-sm">{interneNotizen}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {submitError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  <IconAlertTriangle size={16} className="shrink-0" />
                  {submitError}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setCurrentStep(4)} className="gap-2">
                  <IconChevronLeft size={16} />
                  Zur\u00fcck
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedKundeId || !selectedMotivId || !auftragsnummer.trim()}
                  className="gap-2 min-w-[160px]"
                >
                  {submitting ? (
                    <>Wird erstellt...</>
                  ) : (
                    <>
                      <IconCheck size={16} />
                      Auftrag erstellen
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </IntentWizardShell>
  );
}
