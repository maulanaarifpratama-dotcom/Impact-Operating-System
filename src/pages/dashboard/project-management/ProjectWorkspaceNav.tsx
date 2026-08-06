import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Shared tab strip for a Project Management project's sub-pages.
 * Canonical PM P0: three primary tabs.
 */
export function ProjectWorkspaceNav({ projectId }: { projectId: string }) {
  const tabs = [
    { name: 'Work Plan', href: `/dashboard/project-management/${projectId}/wbs` },
    { name: 'Budget', href: `/dashboard/project-management/${projectId}/budget` },
    { name: 'MEAL', href: `/dashboard/project-management/${projectId}/meal` },
  ];

  return (
    <div className="flex items-center gap-1 border-b pb-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.href}
          to={tab.href}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          {tab.name}
        </NavLink>
      ))}
    </div>
  );
}
