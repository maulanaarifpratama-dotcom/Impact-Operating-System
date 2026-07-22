import GrantWriterQuickWizardLegacy from './GrantWriterQuickWizardLegacy';
import GrantWriterQuickWizardProvisional from './GrantWriterQuickWizardProvisional';

export function GrantWriterQuickWizardSelector({
  isDevelopment,
}: {
  isDevelopment: boolean;
}) {
  return isDevelopment
    ? <GrantWriterQuickWizardProvisional />
    : <GrantWriterQuickWizardLegacy />;
}

export default function GrantWriterQuickWizard() {
  return (
    <GrantWriterQuickWizardSelector
      isDevelopment={import.meta.env.DEV}
    />
  );
}
