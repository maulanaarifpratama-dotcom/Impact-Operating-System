import GrantWriterQuickWizardLegacy from './GrantWriterQuickWizardLegacy';
import GrantWriterQuickWizardProvisional from './GrantWriterQuickWizardProvisional';

export function GrantWriterQuickWizardSelector({
  isDevelopment = true,
  useLegacy = false,
}: {
  isDevelopment?: boolean;
  useLegacy?: boolean;
}) {
  if (useLegacy || isDevelopment === false) {
    return <GrantWriterQuickWizardLegacy />;
  }
  return <GrantWriterQuickWizardProvisional />;
}

export default function GrantWriterQuickWizard() {
  // RC-9B.2 Cutover: Render 27.5k Brain Canonical Quick Proposal in all environments (prod + dev)
  return <GrantWriterQuickWizardProvisional />;
}
