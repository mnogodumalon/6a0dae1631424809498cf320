import type { Auftragsverwaltung, Rechnungsverwaltung } from './app';

export type EnrichedAuftragsverwaltung = Auftragsverwaltung & {
  kundeName: string;
  mitarbeiterName: string;
  motivName: string;
  materialienName: string;
};

export type EnrichedRechnungsverwaltung = Rechnungsverwaltung & {
  auftragName: string;
  rechnungskundeName: string;
};
