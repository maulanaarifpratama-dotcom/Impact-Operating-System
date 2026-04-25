import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Settings as SettingsIcon } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { PRODUCTS } from '@/lib/brand';
import { cn } from '@/lib/utils';

const stageBadge: Record<string, string> = {
  building: 'Coming Chunk 2',
  next: 'Coming Soon',
  planned: 'Coming Soon',
  future: 'Coming Soon',
};

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const path = location.pathname;
  const isActive = (p: string) => path === p || path.startsWith(p + '/');

  const linkClass = ({ isActive: a }: { isActive: boolean }) =>
    cn(
      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      a
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
    );

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-4 py-4">
        {!collapsed ? <Logo variant="light" /> : (
          <div className="flex justify-center">
            <Logo variant="light" className="text-base [&_span:last-child]:hidden" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/60">Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard" isActive={isActive('/dashboard')}>
                  <NavLink to="/dashboard" end className={linkClass}>
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/60">Produk</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {PRODUCTS.map((p) => (
                <SidebarMenuItem key={p.key}>
                  <SidebarMenuButton asChild tooltip={p.name} isActive={isActive(p.href)}>
                    <NavLink to={p.href} className={linkClass}>
                      <p.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{p.name}</span>
                          <Badge variant="outline" className="ml-auto border-sidebar-border bg-sidebar-accent/40 text-[10px] font-normal text-sidebar-foreground/70">
                            {stageBadge[p.releaseStage]}
                          </Badge>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/60">Akun</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="My Projects" isActive={isActive('/dashboard/projects')}>
                  <NavLink to="/dashboard/projects" className={linkClass}>
                    <FolderKanban className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>My Projects</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings" isActive={isActive('/settings')}>
                  <NavLink to="/settings" className={linkClass}>
                    <SettingsIcon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Settings</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}