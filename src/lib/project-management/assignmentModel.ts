// Work Plan filter keys. The computations backing each filter (Overdue,
// Blocked, execution status) live in executionModel.ts — the single
// canonical source. This file previously also held computeGroupedWorkload/
// computeAssignmentMetrics/buildMemberLookup and their supporting types,
// but none of them were ever called from any live screen; they carried
// their own independent (and inconsistent) Overdue/Blocked logic and were
// removed as orphaned duplicates during the PM execution-model debt purge.
export type WorkPlanFilter = 'all' | 'my-work' | 'unassigned' | 'overdue' | 'blocked';
