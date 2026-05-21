import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Rechnungsverwaltung, Auftragsverwaltung, Kundenverwaltung, Mitarbeiterverwaltung, Motivkatalog, Materialverwaltung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [rechnungsverwaltung, setRechnungsverwaltung] = useState<Rechnungsverwaltung[]>([]);
  const [auftragsverwaltung, setAuftragsverwaltung] = useState<Auftragsverwaltung[]>([]);
  const [kundenverwaltung, setKundenverwaltung] = useState<Kundenverwaltung[]>([]);
  const [mitarbeiterverwaltung, setMitarbeiterverwaltung] = useState<Mitarbeiterverwaltung[]>([]);
  const [motivkatalog, setMotivkatalog] = useState<Motivkatalog[]>([]);
  const [materialverwaltung, setMaterialverwaltung] = useState<Materialverwaltung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [rechnungsverwaltungData, auftragsverwaltungData, kundenverwaltungData, mitarbeiterverwaltungData, motivkatalogData, materialverwaltungData] = await Promise.all([
        LivingAppsService.getRechnungsverwaltung(),
        LivingAppsService.getAuftragsverwaltung(),
        LivingAppsService.getKundenverwaltung(),
        LivingAppsService.getMitarbeiterverwaltung(),
        LivingAppsService.getMotivkatalog(),
        LivingAppsService.getMaterialverwaltung(),
      ]);
      setRechnungsverwaltung(rechnungsverwaltungData);
      setAuftragsverwaltung(auftragsverwaltungData);
      setKundenverwaltung(kundenverwaltungData);
      setMitarbeiterverwaltung(mitarbeiterverwaltungData);
      setMotivkatalog(motivkatalogData);
      setMaterialverwaltung(materialverwaltungData);
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
        const [rechnungsverwaltungData, auftragsverwaltungData, kundenverwaltungData, mitarbeiterverwaltungData, motivkatalogData, materialverwaltungData] = await Promise.all([
          LivingAppsService.getRechnungsverwaltung(),
          LivingAppsService.getAuftragsverwaltung(),
          LivingAppsService.getKundenverwaltung(),
          LivingAppsService.getMitarbeiterverwaltung(),
          LivingAppsService.getMotivkatalog(),
          LivingAppsService.getMaterialverwaltung(),
        ]);
        setRechnungsverwaltung(rechnungsverwaltungData);
        setAuftragsverwaltung(auftragsverwaltungData);
        setKundenverwaltung(kundenverwaltungData);
        setMitarbeiterverwaltung(mitarbeiterverwaltungData);
        setMotivkatalog(motivkatalogData);
        setMaterialverwaltung(materialverwaltungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const auftragsverwaltungMap = useMemo(() => {
    const m = new Map<string, Auftragsverwaltung>();
    auftragsverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [auftragsverwaltung]);

  const kundenverwaltungMap = useMemo(() => {
    const m = new Map<string, Kundenverwaltung>();
    kundenverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kundenverwaltung]);

  const mitarbeiterverwaltungMap = useMemo(() => {
    const m = new Map<string, Mitarbeiterverwaltung>();
    mitarbeiterverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitarbeiterverwaltung]);

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

  return { rechnungsverwaltung, setRechnungsverwaltung, auftragsverwaltung, setAuftragsverwaltung, kundenverwaltung, setKundenverwaltung, mitarbeiterverwaltung, setMitarbeiterverwaltung, motivkatalog, setMotivkatalog, materialverwaltung, setMaterialverwaltung, loading, error, fetchAll, auftragsverwaltungMap, kundenverwaltungMap, mitarbeiterverwaltungMap, motivkatalogMap, materialverwaltungMap };
}