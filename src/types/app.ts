// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Rechnungsverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    rechnungsnummer?: string;
    rechnungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    faelligkeitsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    auftrag?: string; // applookup -> URL zu 'Auftragsverwaltung' Record
    rechnungskunde?: string; // applookup -> URL zu 'Kundenverwaltung' Record
    nettobetrag?: number;
    mehrwertsteuersatz?: LookupValue;
    gesamtbetrag?: number;
    zahlungsart?: LookupValue;
    zahlungsstatus?: LookupValue;
    rechnungsnotiz?: string;
    rechnungsdokument?: string;
  };
}

export interface Auftragsverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    auftragsnummer?: string;
    auftragsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    kunde?: string; // applookup -> URL zu 'Kundenverwaltung' Record
    mitarbeiter?: string; // applookup -> URL zu 'Mitarbeiterverwaltung' Record
    motiv?: string; // applookup -> URL zu 'Motivkatalog' Record
    druckbreite_cm?: number;
    druckhoehe_cm?: number;
    materialien?: string;
    wunschtermin?: string; // Format: YYYY-MM-DD oder ISO String
    lieferart?: LookupValue;
    liefer_strasse?: string;
    liefer_hausnummer?: string;
    liefer_plz?: string;
    liefer_ort?: string;
    sonderanforderungen?: string;
    interne_notizen?: string;
  };
}

export interface Kundenverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kunde_vorname?: string;
    kunde_nachname?: string;
    firmenname?: string;
    kunde_email?: string;
    kunde_telefon?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    kundenkategorie?: LookupValue;
    notizen_kunde?: string;
  };
}

export interface Mitarbeiterverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    nachname?: string;
    position?: LookupValue;
    email?: string;
    telefon?: string;
    eintrittsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    notizen_ma?: string;
    vorname?: string;
  };
}

export interface Motivkatalog {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    motivname?: string;
    motiv_beschreibung?: string;
    kategorie?: LookupValue;
    standardbreite_cm?: number;
    standardhoehe_cm?: number;
    preis_pro_qm?: number;
    vorschaubild?: string;
    motiv_aktiv?: boolean;
  };
}

export interface Materialverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    materialname?: string;
    materialtyp?: LookupValue;
    einheit?: LookupValue;
    aktueller_bestand?: number;
    mindestbestand?: number;
    preis_pro_einheit?: number;
    lieferant?: string;
    notizen_material?: string;
  };
}

export const APP_IDS = {
  RECHNUNGSVERWALTUNG: '6a0dae1647009f1f0dcb7676',
  AUFTRAGSVERWALTUNG: '6a0dae164a2e630e44db32c5',
  KUNDENVERWALTUNG: '6a0dae164ce97ad2bb16007c',
  MITARBEITERVERWALTUNG: '6a0dae172be9236c3fd29363',
  MOTIVKATALOG: '6a0dae1749104149e0dc102c',
  MATERIALVERWALTUNG: '6a0dae176d50aa818bb08078',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'rechnungsverwaltung': {
    mehrwertsteuersatz: [{ key: "mwst_7", label: "7 %" }, { key: "mwst_0", label: "0 % (steuerfrei)" }, { key: "mwst_19", label: "19 %" }],
    zahlungsart: [{ key: "ueberweisung", label: "Überweisung" }, { key: "lastschrift", label: "Lastschrift" }, { key: "bar", label: "Bar" }, { key: "paypal", label: "PayPal" }, { key: "kreditkarte", label: "Kreditkarte" }],
    zahlungsstatus: [{ key: "offen", label: "Offen" }, { key: "teilweise_bezahlt", label: "Teilweise bezahlt" }, { key: "bezahlt", label: "Bezahlt" }, { key: "ueberfaellig", label: "Überfällig" }, { key: "storniert_rechnung", label: "Storniert" }],
  },
  'auftragsverwaltung': {
    status: [{ key: "neu", label: "Neu" }, { key: "in_bearbeitung", label: "In Bearbeitung" }, { key: "druck_laeuft", label: "Druck läuft" }, { key: "qualitaetspruefung", label: "Qualitätsprüfung" }, { key: "versandbereit", label: "Versandbereit" }, { key: "abgeschlossen", label: "Abgeschlossen" }, { key: "storniert", label: "Storniert" }],
    lieferart: [{ key: "selbstabholung", label: "Selbstabholung" }, { key: "versand", label: "Versand" }, { key: "montage_vor_ort", label: "Montage vor Ort" }],
  },
  'kundenverwaltung': {
    kundenkategorie: [{ key: "privatkunde", label: "Privatkunde" }, { key: "geschaeftskunde", label: "Geschäftskunde" }, { key: "wiederverkaeufer", label: "Wiederverkäufer" }],
  },
  'mitarbeiterverwaltung': {
    position: [{ key: "geschaeftsfuehrung", label: "Geschäftsführung" }, { key: "drucktechniker", label: "Drucktechniker" }, { key: "grafikdesigner", label: "Grafikdesigner" }, { key: "vertrieb", label: "Vertrieb" }, { key: "lager_logistik", label: "Lager & Logistik" }, { key: "buchhaltung", label: "Buchhaltung" }, { key: "sonstiges", label: "Sonstiges" }],
  },
  'motivkatalog': {
    kategorie: [{ key: "stadtansichten", label: "Stadtansichten" }, { key: "natur_landschaft", label: "Natur & Landschaft" }, { key: "abstrakt", label: "Abstrakt" }, { key: "architektur", label: "Architektur" }, { key: "tiere", label: "Tiere" }, { key: "kunst_illustration", label: "Kunst & Illustration" }, { key: "individualmotiv", label: "Individualmotiv" }, { key: "sonstiges_motiv", label: "Sonstiges" }],
  },
  'materialverwaltung': {
    materialtyp: [{ key: "drucktinte", label: "Drucktinte" }, { key: "druckmedium", label: "Druckmedium / Untergrund" }, { key: "reinigungsmittel", label: "Reinigungsmittel" }, { key: "verpackungsmaterial", label: "Verpackungsmaterial" }, { key: "sonstiges_material", label: "Sonstiges" }],
    einheit: [{ key: "liter", label: "Liter" }, { key: "kilogramm", label: "Kilogramm" }, { key: "stueck", label: "Stück" }, { key: "meter", label: "Meter" }, { key: "quadratmeter", label: "Quadratmeter" }, { key: "rolle", label: "Rolle" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'rechnungsverwaltung': {
    'rechnungsnummer': 'string/text',
    'rechnungsdatum': 'date/date',
    'faelligkeitsdatum': 'date/date',
    'auftrag': 'applookup/select',
    'rechnungskunde': 'applookup/select',
    'nettobetrag': 'number',
    'mehrwertsteuersatz': 'lookup/select',
    'gesamtbetrag': 'number',
    'zahlungsart': 'lookup/select',
    'zahlungsstatus': 'lookup/select',
    'rechnungsnotiz': 'string/textarea',
    'rechnungsdokument': 'file',
  },
  'auftragsverwaltung': {
    'auftragsnummer': 'string/text',
    'auftragsdatum': 'date/date',
    'status': 'lookup/select',
    'kunde': 'applookup/select',
    'mitarbeiter': 'applookup/select',
    'motiv': 'applookup/select',
    'druckbreite_cm': 'number',
    'druckhoehe_cm': 'number',
    'materialien': 'multipleapplookup/select',
    'wunschtermin': 'date/date',
    'lieferart': 'lookup/select',
    'liefer_strasse': 'string/text',
    'liefer_hausnummer': 'string/text',
    'liefer_plz': 'string/text',
    'liefer_ort': 'string/text',
    'sonderanforderungen': 'string/textarea',
    'interne_notizen': 'string/textarea',
  },
  'kundenverwaltung': {
    'kunde_vorname': 'string/text',
    'kunde_nachname': 'string/text',
    'firmenname': 'string/text',
    'kunde_email': 'string/email',
    'kunde_telefon': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'kundenkategorie': 'lookup/select',
    'notizen_kunde': 'string/textarea',
  },
  'mitarbeiterverwaltung': {
    'nachname': 'string/text',
    'position': 'lookup/select',
    'email': 'string/email',
    'telefon': 'string/tel',
    'eintrittsdatum': 'date/date',
    'notizen_ma': 'string/textarea',
    'vorname': 'string/text',
  },
  'motivkatalog': {
    'motivname': 'string/text',
    'motiv_beschreibung': 'string/textarea',
    'kategorie': 'lookup/select',
    'standardbreite_cm': 'number',
    'standardhoehe_cm': 'number',
    'preis_pro_qm': 'number',
    'vorschaubild': 'file',
    'motiv_aktiv': 'bool',
  },
  'materialverwaltung': {
    'materialname': 'string/text',
    'materialtyp': 'lookup/select',
    'einheit': 'lookup/select',
    'aktueller_bestand': 'number',
    'mindestbestand': 'number',
    'preis_pro_einheit': 'number',
    'lieferant': 'string/text',
    'notizen_material': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateRechnungsverwaltung = StripLookup<Rechnungsverwaltung['fields']>;
export type CreateAuftragsverwaltung = StripLookup<Auftragsverwaltung['fields']>;
export type CreateKundenverwaltung = StripLookup<Kundenverwaltung['fields']>;
export type CreateMitarbeiterverwaltung = StripLookup<Mitarbeiterverwaltung['fields']>;
export type CreateMotivkatalog = StripLookup<Motivkatalog['fields']>;
export type CreateMaterialverwaltung = StripLookup<Materialverwaltung['fields']>;