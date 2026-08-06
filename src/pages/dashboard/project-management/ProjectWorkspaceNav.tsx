import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Shared tab strip for a Project Management project's sub-pages. PM-1B added
 * Objectives, PM-1C adds Stages, PM-2 adds WBS and Budget, PM-3 adds MEAL,
 * Deliverables, Activity, and Overview -- each needs a way to reach the
 * others, since no single page's route implies the rest exist.
 */
export function ProjectWorkspaceNav({ projectId }: { projectId: string }) {
  const tabs = [
    { name: 'Overview', href: `/dashboard/project-management/${projectId}/overview` },
    { name: 'Work Plan', href: `/dashboard/project-management/${projectId}/wbs` },
    { name: 'Budget', href: `/dashboard/project-management/${projectId}/budget` },
    { name: 'MEAL', href: `/dashboard/project-management/${projectId}/meal` },
    { name: 'Deliverables', href: `/dashboard/project-management/${projectId}/deliverables` },
    { name: 'Activity', href: `/dashboard/project-management/${projectId}/activity` },
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
