const ACTIVE_PROJECT_KEY = 'impactory_active_project_id';

/**
 * Retrieves the currently active project ID from localStorage,
 * falling back to last_materialized_project_id if present.
 */
export function getActiveProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY) || localStorage.getItem('last_materialized_project_id') || null;
  } catch (err) {
    console.warn('[ActiveProject] Error reading active project ID:', err);
    return null;
  }
}

/**
 * Sets the currently active project ID across all Impactory modules.
 */
export function setActiveProjectId(projectId: string): void {
  try {
    if (projectId) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    }
  } catch (err) {
    console.warn('[ActiveProject] Error saving active project ID:', err);
  }
}
