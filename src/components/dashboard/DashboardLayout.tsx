import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopbar } from './DashboardTopbar';
import { OnboardingFlow } from './OnboardingFlow';

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col min-h-0">
          <DashboardTopbar />
          <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4 md:px-8 md:py-5">
            <Outlet />
          </main>
        </div>
      </div>
      <OnboardingFlow />
    </SidebarProvider>
  );
}