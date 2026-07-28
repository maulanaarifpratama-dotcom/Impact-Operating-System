import GrantWriterQuickWizardProvisional from './GrantWriterQuickWizardProvisional';

/**
 * RC-9B.2 cutover: the 27.5k Brain canonical Quick Proposal renders in every
 * environment.
 *
 * There used to be a `GrantWriterQuickWizardSelector` here that could fall back
 * to a pre-cutover wizard. Nothing reached it: the route guard imports the
 * default export below, which has returned the canonical wizard unconditionally
 * since the cutover, so the only caller left was the test that covered the
 * fallback. The legacy component and the selector are gone.
 */
export default function GrantWriterQuickWizard() {
  return <GrantWriterQuickWizardProvisional />;
}
