import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/database.types';
import type { WizardData } from './types';

type GwProjectRow = Database['public']['Tables']['gw_projects']['Row'];

export interface UseWizardProjectResult<TData = WizardData> {
  project: GwProjectRow | null;
  data: TData;
  loading: boolean;
  saving: boolean;
  lastSavedAt: Date | null;
  error: string | null;
  setData: (updater: (prev: TData) => TData) => void;
  setStep: (step: number) => Promise<void>;
  saveNow: () => Promise<void>;
}

/**
 * Loads a gw_projects row, exposes wizard_data with optimistic updates,
 * and autosaves changes to Supabase (debounced 800ms).
 */
export function useWizardProject<TData = WizardData>(
  projectId: string | undefined,
): UseWizardProjectResult<TData> {
  const [project, setProject] = useState<GwProjectRow | null>(null);
  const [data, setDataState] = useState<TData>({} as TData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dataRef = useRef<TData>({} as TData);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  // Initial load
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: row, error: err } = await supabase
        .from('gw_projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();
      if (cancelled) return;
      if (err) {
        setError(err.message);
      } else if (row) {
        setProject(row);
        const wd = ((row.wizard_data as unknown) as TData) ?? ({} as TData);
        setDataState(wd);
        dataRef.current = wd;
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const persist = useCallback(async () => {
    if (!projectId || !dirtyRef.current) return;
    setSaving(true);
    const payload = { wizard_data: dataRef.current as never };
    const { error: err } = await supabase
      .from('gw_projects')
      .update(payload)
      .eq('id', projectId);
    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      dirtyRef.current = false;
      setLastSavedAt(new Date());
    }
  }, [projectId]);

  const setData = useCallback(
    (updater: (prev: TData) => TData) => {
      setDataState((prev) => {
        const next = updater(prev);
        dataRef.current = next;
        dirtyRef.current = true;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          void persist();
        }, 800);
        return next;
      });
    },
    [persist],
  );

  const setStep = useCallback(
    async (step: number) => {
      if (!projectId) return;
      // Flush any pending wizard_data save first.
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      const { error: err } = await supabase
        .from('gw_projects')
        .update({
          current_step: step,
          wizard_data: dataRef.current as never,
        })
        .eq('id', projectId);
      if (err) {
        setError(err.message);
        return;
      }
      dirtyRef.current = false;
      setLastSavedAt(new Date());
      setProject((p) => (p ? { ...p, current_step: step } : p));
    },
    [projectId],
  );

  const saveNow = useCallback(async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    await persist();
  }, [persist]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        // Fire-and-forget final save
        void persist();
      }
    };
  }, [persist]);

  return { project, data, loading, saving, lastSavedAt, error, setData, setStep, saveNow };
}