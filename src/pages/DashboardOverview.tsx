import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichAuftragsverwaltung, enrichRechnungsverwaltung } from '@/lib/enrich';
import type { EnrichedAuftragsverwaltung, EnrichedRechnungsverwaltung } from '@/types/enriched';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AuftragsverwaltungDialog } from '@/components/dialogs/AuftragsverwaltungDialog';
import { RechnungsverwaltungDialog } from '@/components/dialogs/RechnungsverwaltungDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash,
  IconClipboardList, IconCurrencyEuro, IconPackage, IconUsers, IconAlertTriangle,
  IconChevronRight, IconFileInvoice,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a0dae1631424809498cf320';
const REPAIR_ENDPOINT = '/claude/build/repair';

const KANBAN_COLUMNS: { key: string; label: string; color: string; bg: string }[] = [
  { key: 'neu', label: 'Neu', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { key: 'in_bearbeitung', label: 'In Bearbeitung', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  { key: 'druck_laeuft', label: 'Druck läuft', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  { key: 'qualitaetspruefung', label: 'Qualitätsprüfung', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  { key: 'versandbereit', label: 'Versandbereit', color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' },
  { key: 'abgeschlossen', label: 'Abgeschlossen', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
];

const STATUS_NEXT: Record<string, string> = {
  neu: 'in_bearbeitung',
  in_bearbeitung: 'druck_laeuft',
  druck_laeuft: 'qualitaetspruefung',
  qualitaetspruefung: 'versandbereit',
  versandbereit: 'abgeschlossen',
};

export default function DashboardOverview() {
  const {
    mitarbeiterverwaltung, kundenverwaltung, motivkatalog, materialverwaltung,
    auftragsverwaltung, rechnungsverwaltung,
    mitarbeiterverwaltungMap, kundenverwaltungMap, motivkatalogMap, materialverwaltungMap, auftragsverwaltungMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedAuftragsverwaltung = enrichAuftragsverwaltung(auftragsverwaltung, {
    kundenverwaltungMap, mitarbeiterverwaltungMap, motivkatalogMap, materialverwaltungMap,
  });
  const enrichedRechnungsverwaltung = enrichRechnungsverwaltung(rechnungsverwaltung, {
    auftragsverwaltungMap, kundenverwaltungMap,
  });

  // All hooks BEFORE early returns
  const [auftragDialog, setAuftragDialog] = useState<{ open: boolean; record?: EnrichedAuftragsverwaltung }>({ open: false });
  const [rechnungDialog, setRechnungDialog] = useState<{ open: boolean; record?: EnrichedRechnungsverwaltung }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'auftrag' | 'rechnung' } | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'kanban' | 'rechnungen'>('kanban');

  const kanbanByStatus = useMemo(() => {
    const map: Record<string, EnrichedAuftragsverwaltung[]> = {};
    for (const col of KANBAN_COLUMNS) map[col.key] = [];
    for (const a of enrichedAuftragsverwaltung) {
      const key = a.fields.status?.key ?? 'neu';
      if (map[key]) map[key].push(a);
    }
    return map;
  }, [enrichedAuftragsverwaltung]);

  const offeneRechnungen = useMemo(
    () => enrichedRechnungsverwaltung.filter(r => r.fields.zahlungsstatus?.key === 'offen'),
    [enrichedRechnungsverwaltung],
  );
  const ueberfaelligeRechnungen = useMemo(
    () => enrichedRechnungsverwaltung.filter(r => r.fields.zahlungsstatus?.key === 'ueberfaellig'),
    [enrichedRechnungsverwaltung],
  );
  const materialUnterMindest = useMemo(
    () => materialverwaltung.filter(m =>
      (m.fields.aktueller_bestand ?? 0) <= (m.fields.mindestbestand ?? 0),
    ),
    [materialverwaltung],
  );

  const gesamtUmsatz = useMemo(
    () => enrichedRechnungsverwaltung
      .filter(r => r.fields.zahlungsstatus?.key === 'bezahlt')
      .reduce((s, r) => s + (r.fields.gesamtbetrag ?? 0), 0),
    [enrichedRechnungsverwaltung],
  );

  const handleAdvanceStatus = async (auftrag: EnrichedAuftragsverwaltung) => {
    const currentKey = auftrag.fields.status?.key ?? 'neu';
    const nextKey = STATUS_NEXT[currentKey];
    if (!nextKey) return;
    setAdvancingId(auftrag.record_id);
    try {
      await LivingAppsService.updateAuftragsverwaltungEntry(auftrag.record_id, { status: nextKey as any });
      fetchAll();
    } finally {
      setAdvancingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'auftrag') {
      await LivingAppsService.deleteAuftragsverwaltungEntry(deleteTarget.id);
    } else {
      await LivingAppsService.deleteRechnungsverwaltungEntry(deleteTarget.id);
    }
    setDeleteTarget(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Workflow Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a href="#/intents/neuen-auftrag-erstellen" className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <IconClipboardList size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">Neuen Auftrag erstellen</p>
            <p className="text-xs text-muted-foreground truncate">Kunde → Motiv → Materialien → Details</p>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground shrink-0" />
        </a>
        <a href="#/intents/auftragsabschluss-rechnung" className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <IconFileInvoice size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">Auftragsabschluss & Rechnung</p>
            <p className="text-xs text-muted-foreground truncate">Status setzen → Rechnung erstellen</p>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground shrink-0" />
        </a>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WandBild Pro</h1>
          <p className="text-sm text-muted-foreground">Produktions-Dashboard</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setRechnungDialog({ open: true })}>
            <IconFileInvoice size={15} className="mr-1.5 shrink-0" />
            <span>Rechnung anlegen</span>
          </Button>
          <Button size="sm" onClick={() => setAuftragDialog({ open: true })}>
            <IconPlus size={15} className="mr-1.5 shrink-0" />
            <span>Neuer Auftrag</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Aktive Aufträge"
          value={String(auftragsverwaltung.filter(a => !['abgeschlossen', 'storniert'].includes(a.fields.status?.key ?? '')).length)}
          description="in Bearbeitung"
          icon={<IconClipboardList size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Umsatz bezahlt"
          value={formatCurrency(gesamtUmsatz)}
          description="Gesamtbetrag brutto"
          icon={<IconCurrencyEuro size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Offene Rechnungen"
          value={String(offeneRechnungen.length + ueberfaelligeRechnungen.length)}
          description={ueberfaelligeRechnungen.length > 0 ? `${ueberfaelligeRechnungen.length} überfällig` : 'zu bezahlen'}
          icon={<IconFileInvoice size={18} className={ueberfaelligeRechnungen.length > 0 ? 'text-destructive' : 'text-muted-foreground'} />}
        />
        <StatCard
          title="Materialengpass"
          value={String(materialUnterMindest.length)}
          description="unter Mindestbestand"
          icon={<IconPackage size={18} className={materialUnterMindest.length > 0 ? 'text-amber-500' : 'text-muted-foreground'} />}
        />
      </div>

      {/* Alerts */}
      {(ueberfaelligeRechnungen.length > 0 || materialUnterMindest.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {ueberfaelligeRechnungen.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex-1">
              <IconAlertTriangle size={15} className="shrink-0" />
              <span className="font-medium">{ueberfaelligeRechnungen.length} überfällige Rechnung{ueberfaelligeRechnungen.length > 1 ? 'n' : ''}</span>
            </div>
          )}
          {materialUnterMindest.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm flex-1">
              <IconAlertTriangle size={15} className="shrink-0" />
              <span className="font-medium">{materialUnterMindest.map(m => m.fields.materialname).join(', ')} — Nachbestellung nötig</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'kanban' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Auftrags-Board
        </button>
        <button
          onClick={() => setActiveTab('rechnungen')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'rechnungen' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Rechnungen {offeneRechnungen.length + ueberfaelligeRechnungen.length > 0 && (
            <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5">
              {offeneRechnungen.length + ueberfaelligeRechnungen.length}
            </span>
          )}
        </button>
      </div>

      {/* Kanban Board */}
      {activeTab === 'kanban' && (
        <div className="overflow-x-auto -mx-6 px-6 pb-4">
          <div className="flex gap-3 min-w-max">
            {KANBAN_COLUMNS.map(col => {
              const cards = kanbanByStatus[col.key] ?? [];
              return (
                <div key={col.key} className="w-64 flex-shrink-0">
                  <div className={`flex items-center justify-between mb-2 px-3 py-2 rounded-xl border ${col.bg}`}>
                    <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 ${col.color}`}>{cards.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[120px]">
                    {cards.length === 0 && (
                      <div className="flex items-center justify-center h-16 text-xs text-muted-foreground rounded-xl border-2 border-dashed border-border">
                        Keine Aufträge
                      </div>
                    )}
                    {cards.map(auftrag => (
                      <KanbanCard
                        key={auftrag.record_id}
                        auftrag={auftrag}
                        colColor={col.color}
                        colBg={col.bg}
                        advancing={advancingId === auftrag.record_id}
                        canAdvance={!!STATUS_NEXT[col.key]}
                        onEdit={() => setAuftragDialog({ open: true, record: auftrag })}
                        onDelete={() => setDeleteTarget({ id: auftrag.record_id, type: 'auftrag' })}
                        onAdvance={() => handleAdvanceStatus(auftrag)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rechnungen Tab */}
      {activeTab === 'rechnungen' && (
        <div className="space-y-3">
          {enrichedRechnungsverwaltung.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <IconFileInvoice size={48} stroke={1.5} />
              <p className="text-sm">Noch keine Rechnungen vorhanden</p>
              <Button size="sm" onClick={() => setRechnungDialog({ open: true })}>
                <IconPlus size={14} className="mr-1" /> Erste Rechnung erstellen
              </Button>
            </div>
          )}
          {enrichedRechnungsverwaltung.map(rechnung => (
            <RechnungRow
              key={rechnung.record_id}
              rechnung={rechnung}
              onEdit={() => setRechnungDialog({ open: true, record: rechnung })}
              onDelete={() => setDeleteTarget({ id: rechnung.record_id, type: 'rechnung' })}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AuftragsverwaltungDialog
        open={auftragDialog.open}
        onClose={() => setAuftragDialog({ open: false })}
        onSubmit={async (fields) => {
          if (auftragDialog.record) {
            await LivingAppsService.updateAuftragsverwaltungEntry(auftragDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createAuftragsverwaltungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={auftragDialog.record?.fields}
        recordId={auftragDialog.record?.record_id}
        kundenverwaltungList={kundenverwaltung}
        mitarbeiterverwaltungList={mitarbeiterverwaltung}
        motivkatalogList={motivkatalog}
        materialverwaltungList={materialverwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['Auftragsverwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Auftragsverwaltung']}
      />

      <RechnungsverwaltungDialog
        open={rechnungDialog.open}
        onClose={() => setRechnungDialog({ open: false })}
        onSubmit={async (fields) => {
          if (rechnungDialog.record) {
            await LivingAppsService.updateRechnungsverwaltungEntry(rechnungDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createRechnungsverwaltungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={rechnungDialog.record?.fields}
        recordId={rechnungDialog.record?.record_id}
        auftragsverwaltungList={auftragsverwaltung}
        kundenverwaltungList={kundenverwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['Rechnungsverwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Rechnungsverwaltung']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description="Dieser Eintrag wird unwiderruflich gelöscht. Fortfahren?"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Team & Lager Übersicht */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mitarbeiter */}
        <div className="rounded-2xl border border-border bg-card p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <IconUsers size={16} className="text-primary shrink-0" /> Team
            </h2>
            <span className="text-xs text-muted-foreground">{mitarbeiterverwaltung.length} Mitarbeiter</span>
          </div>
          <div className="space-y-2">
            {mitarbeiterverwaltung.slice(0, 5).map(ma => (
              <div key={ma.record_id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {(ma.fields.vorname?.[0] ?? '?').toUpperCase()}
                  </div>
                  <span className="text-sm truncate">{ma.fields.vorname} {ma.fields.nachname}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">{ma.fields.position?.label ?? '—'}</span>
              </div>
            ))}
            {mitarbeiterverwaltung.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Noch keine Mitarbeiter erfasst</p>
            )}
          </div>
        </div>

        {/* Material Lager */}
        <div className="rounded-2xl border border-border bg-card p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <IconPackage size={16} className="text-primary shrink-0" /> Materiallager
            </h2>
            <span className="text-xs text-muted-foreground">{materialverwaltung.length} Positionen</span>
          </div>
          <div className="space-y-2">
            {materialverwaltung.slice(0, 5).map(mat => {
              const bestand = mat.fields.aktueller_bestand ?? 0;
              const mindest = mat.fields.mindestbestand ?? 0;
              const isLow = bestand <= mindest;
              const pct = mindest > 0 ? Math.min(100, (bestand / (mindest * 2)) * 100) : 100;
              return (
                <div key={mat.record_id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm truncate min-w-0 mr-2">{mat.fields.materialname}</span>
                    <span className={`text-xs shrink-0 font-medium ${isLow ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {bestand} {mat.fields.einheit?.label ?? ''}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isLow ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {materialverwaltung.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Noch keine Materialien erfasst</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Kanban Card ---
interface KanbanCardProps {
  auftrag: EnrichedAuftragsverwaltung;
  colColor: string;
  colBg: string;
  advancing: boolean;
  canAdvance: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAdvance: () => void;
}

function KanbanCard({ auftrag, advancing, canAdvance, onEdit, onDelete, onAdvance }: KanbanCardProps) {
  const f = auftrag.fields;
  return (
    <div className="bg-white rounded-xl border border-border p-3 shadow-sm space-y-2 overflow-hidden">
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-semibold text-foreground truncate min-w-0">
          {f.auftragsnummer || 'Kein Titel'}
        </span>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Bearbeiten"
          >
            <IconPencil size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Löschen"
          >
            <IconTrash size={13} />
          </button>
        </div>
      </div>
      {auftrag.kundeName && (
        <p className="text-xs text-muted-foreground truncate">{auftrag.kundeName}</p>
      )}
      <div className="flex flex-wrap gap-1">
        {auftrag.motivName && (
          <Badge variant="secondary" className="text-xs">{auftrag.motivName}</Badge>
        )}
        {f.wunschtermin && (
          <span className="text-xs text-muted-foreground">{formatDate(f.wunschtermin)}</span>
        )}
      </div>
      {f.druckbreite_cm && f.druckhoehe_cm && (
        <p className="text-xs text-muted-foreground">{f.druckbreite_cm} × {f.druckhoehe_cm} cm</p>
      )}
      {canAdvance && (
        <button
          onClick={onAdvance}
          disabled={advancing}
          className="w-full flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 text-primary font-medium transition-colors disabled:opacity-50"
        >
          {advancing
            ? <span className="inline-block w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            : <IconChevronRight size={13} />}
          Weiterschalten
        </button>
      )}
    </div>
  );
}

// --- Rechnung Row ---
interface RechnungRowProps {
  rechnung: EnrichedRechnungsverwaltung;
  onEdit: () => void;
  onDelete: () => void;
}

function RechnungRow({ rechnung, onEdit, onDelete }: RechnungRowProps) {
  const f = rechnung.fields;
  const statusKey = f.zahlungsstatus?.key ?? 'offen';
  const statusColors: Record<string, string> = {
    offen: 'bg-blue-100 text-blue-700',
    teilweise_bezahlt: 'bg-amber-100 text-amber-700',
    bezahlt: 'bg-green-100 text-green-700',
    ueberfaellig: 'bg-red-100 text-red-700',
    storniert_rechnung: 'bg-gray-100 text-gray-600',
  };
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors overflow-hidden">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{f.rechnungsnummer || '—'}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[statusKey] ?? 'bg-muted text-muted-foreground'}`}>
            {f.zahlungsstatus?.label ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground truncate">{rechnung.rechnungskundeName || '—'}</span>
          {f.rechnungsdatum && <span className="text-xs text-muted-foreground shrink-0">{formatDate(f.rechnungsdatum)}</span>}
          {f.faelligkeitsdatum && (
            <span className={`text-xs shrink-0 ${statusKey === 'ueberfaellig' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              Fällig: {formatDate(f.faelligkeitsdatum)}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {f.gesamtbetrag != null && (
          <span className="text-sm font-bold text-foreground">{formatCurrency(f.gesamtbetrag)}</span>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Bearbeiten"
        >
          <IconPencil size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Löschen"
        >
          <IconTrash size={14} />
        </button>
      </div>
    </div>
  );
}

// --- Skeleton & Error ---
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);
    const errorContext = JSON.stringify({
      type: 'data_loading', message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });
    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });
      if (!resp.ok || !resp.body) { setRepairing(false); setRepairFailed(true); return; }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch { setRepairing(false); setRepairFailed(true); }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{repairing ? repairStatus : error.message}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
