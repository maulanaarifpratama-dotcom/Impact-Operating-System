import type { Page1Input, Unanswered } from './types';

/**
 * Reading page-one answers without tripping over "not answered".
 *
 * The wizard writes the strings 'unknown' and 'unentered' into its numeric
 * fields to keep "the user skipped this" apart from "the user said zero". Both
 * are truthy, so the obvious `input.beneficiary_count || fallback` hands the
 * string straight through, and it only shows up much later:
 *
 *   Math.max('unentered', 500)          -> NaN as an indicator target
 *   funding / 'unentered'               -> NaN, so CONF-012 never fires
 *   beneficiary_count: 'unentered'      -> a string in the canonical proposal
 *
 * Four call sites had grown their own version of the same guard. This is the
 * one place that knows the rule.
 *
 * Anything that must distinguish unanswered from zero — the MISS-00x rules in
 * scoring-runner — reads the raw field instead and tests the sentinels itself.
 */

/** The value if the user actually gave a number, otherwise nothing. */
export function answeredNumber(value: number | Unanswered | undefined | null): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

/**
 * How many beneficiaries, across every spelling the engine accepts.
 *
 * beneficiaryCountValue exists precisely to carry the number when
 * beneficiaryCount holds a sentinel, so it is consulted last rather than
 * skipped.
 */
export function beneficiaryCountOf(input: Page1Input, fallback: number): number {
  return (
    answeredNumber(input.beneficiary_count) ??
    answeredNumber(input.beneficiaryCount) ??
    input.beneficiaryCountValue ??
    fallback
  );
}

/** The programme budget, across every spelling the engine accepts. */
export function fundingAmountOf(input: Page1Input): number | undefined {
  return (
    answeredNumber(input.funding_amount) ??
    answeredNumber(input.fundingAmount) ??
    answeredNumber(input.budgetIdr)
  );
}
