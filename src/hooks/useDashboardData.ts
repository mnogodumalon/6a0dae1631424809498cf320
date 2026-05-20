import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Mitarbeiterverwaltung, Kundenverwaltung, Motivkatalog, Materialverwaltung, Auftragsverwaltung, Rechnungsverwaltung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [mitarbeiterverwaltung, setMitarbeiterverwaltung] = useState<Mitarbeiterverwaltung[]>([]);
  const [kundenverwaltung, setKundenverwaltung] = useState<Kundenverwaltung[]>([]);
  const [motivkatalog, setMotivkatalog] = useState<Motivkatalog[]>([]);
  const [materialverwaltung, setMaterialverwaltung] = useState<Materialverwaltung[]>([]);
  const [auftragsverwaltung, setAuftragsverwaltung] = useState<Auftragsverwaltung[]>([]);
  const [rechnungsverwaltung, setRechnungsverwaltung] = useState<Rechnungsverwaltung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [mitarbeiterverwaltungData, kundenverwaltungData, motivkatalogData, materialverwaltungData, auftragsverwaltungData, rechnungsverwaltungData] = await Promise.all([
        LivingAppsService.getMitarbeiterverwaltung(),
        LivingAppsService.getKundenverwaltung(),
        LivingAppsService.getMotivkatalog(),
        LivingAppsService.getMaterialverwaltung(),
        LivingAppsService.getAuftragsverwaltung(),
        LivingAppsService.getRechnungsverwaltung(),
      ]);
      setMitarbeiterverwaltung(mitarbeiterverwaltungData);
      setKundenverwaltung(kundenverwaltungData);
      setMotivkatalog(motivkatalogData);
      setMaterialverwaltung(materialverwaltungData);
      setAuftragsverwaltung(auftragsverwaltungData);
      setRechnungsverwaltung(rechnungsverwaltungData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [mitarbeiterverwaltungData, kundenverwaltungData, motivkatalogData, materialverwaltungData, auftragsverwaltungData, rechnungsverwaltungData] = await Promise.all([
          LivingAppsService.getMitarbeiterverwaltung(),
          LivingAppsService.getKundenverwaltung(),
          LivingAppsService.getMotivkatalog(),
          LivingAppsService.getMaterialverwaltung(),
          LivingAppsService.getAuftragsverwaltung(),
          LivingAppsService.getRechnungsverwaltung(),
        ]);
        setMitarbeiterverwaltung(mitarbeiterverwaltungData);
        setKundenverwaltung(kundenverwaltungData);
        setMotivkatalog(motivkatalogData);
        setMaterialverwaltung(materialverwaltungData);
        setAuftragsverwaltung(auftragsverwaltungData);
        setRechnungsverwaltung(rechnungsverwaltungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const mitarbeiterverwaltungMap = useMemo(() => {
    const m = new Map<string, Mitarbeiterverwaltung>();
    mitarbeiterverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitarbeiterverwaltung]);

  const kundenverwaltungMap = useMemo(() => {
    const m = new Map<string, Kundenverwaltung>();
    kundenverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kundenverwaltung]);

  const motivkatalogMap = useMemo(() => {
    const m = new Map<string, Motivkatalog>();
    motivkatalog.forEach(r => m.set(r.record_id, r));
    return m;
  }, [motivkatalog]);

  const materialverwaltungMap = useMemo(() => {
    const m = new Map<string, Materialverwaltung>();
    materialverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [materialverwaltung]);

  const auftragsverwaltungMap = useMemo(() => {
    const m = new Map<string, Auftragsverwaltung>();
    auftragsverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [auftragsverwaltung]);

  return { mitarbeiterverwaltung, setMitarbeiterverwaltung, kundenverwaltung, setKundenverwaltung, motivkatalog, setMotivkatalog, materialverwaltung, setMaterialverwaltung, auftragsverwaltung, setAuftragsverwaltung, rechnungsverwaltung, setRechnungsverwaltung, loading, error, fetchAll, mitarbeiterverwaltungMap, kundenverwaltungMap, motivkatalogMap, materialverwaltungMap, auftragsverwaltungMap };
}