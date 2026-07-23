import { mapToCanonicalLfaView, materializeCanonicalProposalToLfaView } from './readAdapter';
import type { CanonicalProposalPayloadV2 } from '../grant-writer/deterministic/types';
import {
  CanonicalLfaView,
  GrantLinkEvidence,
  RawLfaEntry,
  RawLfaProject,
  ValidatedStructuralSkeletonEvidence,
} from './types';

export interface EditorCanonicalProjectLike {
  readonly id: string;
  readonly org_id: string;
  readonly name: string;
  readonly sector?: string | null;
  readonly location?: string | null;
  readonly duration_months?: number | null;
  readonly start_date?: string | null;
  readonly beneficiary_count?: number | null;
  readonly beneficiary_description?: string | null;
  readonly status?: string | null;
  readonly linked_grant_id?: string | null;
  readonly created_at?: string | null;
  readonly updated_at?: string | null;
}

export interface EditorCanonicalEntryLike {
  readonly id?: string | null;
  readonly project_id: string;
  readonly org_id: string;
  readonly level: 'goal' | 'purpose' | 'output' | 'activity';
  readonly sequence?: number | null;
  readonly parent_id?: string | null;
  readonly description?: string | null;
  readonly indicator?: string | null;
  readonly means_of_verification?: string | null;
  readonly assumption?: string | null;
  readonly responsible_party?: string | null;
  readonly timeline_start?: number | null;
  readonly timeline_end?: number | null;
  readonly ai_suggestion?: string | null;
  readonly created_at?: string | null;
  readonly updated_at?: string | null;
}

export interface BuildEditorCanonicalLfaViewInput {
  readonly project: EditorCanonicalProjectLike;
  readonly entries: readonly EditorCanonicalEntryLike[];
  readonly grantLinkEvidence?: GrantLinkEvidence | null;
  readonly skeletonEvidence?: ValidatedStructuralSkeletonEvidence | null;
}

function isRawEntryReady(entry: EditorCanonicalEntryLike): entry is RawLfaEntry {
  return typeof entry.id === 'string' && entry.id.length > 0;
}

export function buildEditorCanonicalLfaView(
  input: BuildEditorCanonicalLfaViewInput
): CanonicalLfaView {
  const rawEntries = input.entries.filter(isRawEntryReady).map((entry) => ({ ...entry }));

  return mapToCanonicalLfaView({
    rawProject: input.project as RawLfaProject,
    rawEntries,
    grantLinkEvidence: input.grantLinkEvidence ?? null,
    skeletonEvidence: input.skeletonEvidence ?? null,
  });
}

export function buildEditorCanonicalLfaViewFromProposal(
  proposal: CanonicalProposalPayloadV2
): CanonicalLfaView {
  return materializeCanonicalProposalToLfaView(proposal);
}