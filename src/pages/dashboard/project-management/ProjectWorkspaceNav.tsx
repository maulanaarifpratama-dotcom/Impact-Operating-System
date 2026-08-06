import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Shared tab strip for a Project Management project's sub-pages. PM-1B added
 * Objectives, PM-1C adds Stages -- both need a way to reach the other, since
 * neither page's route implies the sibling exists.
 */
export function ProjectWorkspaceNav({ projectId }: { projectId: string }) {
  const tabs = [
    { name: 'Objectives', href: `/dashboard/project-management/${projectId}/objectives` },
    { name: 'Stages', href: `/dashboard/project-management/${projectId}/stages` },
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
