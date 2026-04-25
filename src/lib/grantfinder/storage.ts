import { useCallback, useEffect, useState } from 'react';
import type { ApplicationStatus, OrgProfile, SavedApplication } from './types';

const PROFILE_KEY = 'grantfinder.profile.v1';
const APPS_KEY = 'grantfinder.applications.v1';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('grantfinder:storage', { detail: { key } }));
}

export function useOrgProfile() {
  const [profile, setProfile] = useState<OrgProfile | null>(() => read<OrgProfile | null>(PROFILE_KEY, null));

  useEffect(() => {
    const onChange = (e: Event) => {
      const ev = e as CustomEvent<{ key: string }>;
      if (ev.detail?.key === PROFILE_KEY) {
        setProfile(read<OrgProfile | null>(PROFILE_KEY, null));
      }
    };
    window.addEventListener('grantfinder:storage', onChange);
    return () => window.removeEventListener('grantfinder:storage', onChange);
  }, []);

  const save = useCallback((next: OrgProfile) => {
    write(PROFILE_KEY, next);
    setProfile(next);
  }, []);

  const clear = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(PROFILE_KEY);
    window.dispatchEvent(new CustomEvent('grantfinder:storage', { detail: { key: PROFILE_KEY } }));
    setProfile(null);
  }, []);

  return { profile, save, clear };
}

export function useApplications() {
  const [apps, setApps] = useState<SavedApplication[]>(() => read<SavedApplication[]>(APPS_KEY, []));

  useEffect(() => {
    const onChange = (e: Event) => {
      const ev = e as CustomEvent<{ key: string }>;
      if (ev.detail?.key === APPS_KEY) {
        setApps(read<SavedApplication[]>(APPS_KEY, []));
      }
    };
    window.addEventListener('grantfinder:storage', onChange);
    return () => window.removeEventListener('grantfinder:storage', onChange);
  }, []);

  const upsert = useCallback((grantId: string, status: ApplicationStatus, notes?: string) => {
    const now = new Date().toISOString();
    setApps((prev) => {
      const idx = prev.findIndex((a) => a.grantId === grantId);
      let next: SavedApplication[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...next[idx], status, notes: notes ?? next[idx].notes, updatedAt: now };
      } else {
        next = [...prev, { grantId, status, notes, savedAt: now, updatedAt: now }];
      }
      write(APPS_KEY, next);
      return next;
    });
  }, []);

  const remove = useCallback((grantId: string) => {
    setApps((prev) => {
      const next = prev.filter((a) => a.grantId !== grantId);
      write(APPS_KEY, next);
      return next;
    });
  }, []);

  const get = useCallback(
    (grantId: string) => apps.find((a) => a.grantId === grantId) ?? null,
    [apps],
  );

  return { apps, upsert, remove, get };
}