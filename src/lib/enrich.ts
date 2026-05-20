import type { EnrichedAuftragsverwaltung, EnrichedRechnungsverwaltung } from '@/types/enriched';
import type { Auftragsverwaltung, Kundenverwaltung, Materialverwaltung, Mitarbeiterverwaltung, Motivkatalog, Rechnungsverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface AuftragsverwaltungMaps {
  kundenverwaltungMap: Map<string, Kundenverwaltung>;
  mitarbeiterverwaltungMap: Map<string, Mitarbeiterverwaltung>;
  motivkatalogMap: Map<string, Motivkatalog>;
  materialverwaltungMap: Map<string, Materialverwaltung>;
}

export function enrichAuftragsverwaltung(
  auftragsverwaltung: Auftragsverwaltung[],
  maps: AuftragsverwaltungMaps
): EnrichedAuftragsverwaltung[] {
  return auftragsverwaltung.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenverwaltungMap, 'kunde_vorname'),
    mitarbeiterName: resolveDisplay(r.fields.mitarbeiter, maps.mitarbeiterverwaltungMap, 'vorname', 'nachname'),
    motivName: resolveDisplay(r.fields.motiv, maps.motivkatalogMap, 'motivname'),
    materialienName: resolveDisplay(r.fields.materialien, maps.materialverwaltungMap, 'materialname'),
  }));
}

interface RechnungsverwaltungMaps {
  auftragsverwaltungMap: Map<string, Auftragsverwaltung>;
  kundenverwaltungMap: Map<string, Kundenverwaltung>;
}

export function enrichRechnungsverwaltung(
  rechnungsverwaltung: Rechnungsverwaltung[],
  maps: RechnungsverwaltungMaps
): EnrichedRechnungsverwaltung[] {
  return rechnungsverwaltung.map(r => ({
    ...r,
    auftragName: resolveDisplay(r.fields.auftrag, maps.auftragsverwaltungMap, 'auftragsnummer'),
    rechnungskundeName: resolveDisplay(r.fields.rechnungskunde, maps.kundenverwaltungMap, 'kunde_vorname'),
  }));
}
