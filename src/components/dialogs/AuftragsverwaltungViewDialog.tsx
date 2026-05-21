import type { Auftragsverwaltung, Kundenverwaltung, Mitarbeiterverwaltung, Motivkatalog, Materialverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface AuftragsverwaltungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Auftragsverwaltung | null;
  onEdit: (record: Auftragsverwaltung) => void;
  kundenverwaltungList: Kundenverwaltung[];
  mitarbeiterverwaltungList: Mitarbeiterverwaltung[];
  motivkatalogList: Motivkatalog[];
  materialverwaltungList: Materialverwaltung[];
}

export function AuftragsverwaltungViewDialog({ open, onClose, record, onEdit, kundenverwaltungList, mitarbeiterverwaltungList, motivkatalogList, materialverwaltungList }: AuftragsverwaltungViewDialogProps) {
  function getKundenverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kundenverwaltungList.find(r => r.record_id === id)?.fields.kunde_vorname ?? '—';
  }

  function getMitarbeiterverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return mitarbeiterverwaltungList.find(r => r.record_id === id)?.fields.nachname ?? '—';
  }

  function getMotivkatalogDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return motivkatalogList.find(r => r.record_id === id)?.fields.motivname ?? '—';
  }

  function getMaterialverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return materialverwaltungList.find(r => r.record_id === id)?.fields.materialname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Auftragsverwaltung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Auftragsnummer</Label>
            <p className="text-sm">{record.fields.auftragsnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Auftragsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.auftragsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Auftragsstatus</Label>
            <Badge variant="secondary">{record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kunde</Label>
            <p className="text-sm">{getKundenverwaltungDisplayName(record.fields.kunde)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zuständiger Mitarbeiter</Label>
            <p className="text-sm">{getMitarbeiterverwaltungDisplayName(record.fields.mitarbeiter)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Druckmotiv</Label>
            <p className="text-sm">{getMotivkatalogDisplayName(record.fields.motiv)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Druckbreite (cm)</Label>
            <p className="text-sm">{record.fields.druckbreite_cm ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Druckhöhe (cm)</Label>
            <p className="text-sm">{record.fields.druckhoehe_cm ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verwendete Materialien</Label>
            {Array.isArray(record.fields.materialien) && record.fields.materialien.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {record.fields.materialien.map((url: any, i: number) => (
                  <span key={i} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getMaterialverwaltungDisplayName(url)}</span>
                ))}
              </div>
            ) : <p className="text-sm">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wunschtermin</Label>
            <p className="text-sm">{formatDate(record.fields.wunschtermin)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lieferart</Label>
            <Badge variant="secondary">{record.fields.lieferart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lieferstraße</Label>
            <p className="text-sm">{record.fields.liefer_strasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lieferhausnummer</Label>
            <p className="text-sm">{record.fields.liefer_hausnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Liefer-PLZ</Label>
            <p className="text-sm">{record.fields.liefer_plz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lieferort</Label>
            <p className="text-sm">{record.fields.liefer_ort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sonderanforderungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.sonderanforderungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Interne Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.interne_notizen ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.AUFTRAGSVERWALTUNG} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}