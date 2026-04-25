import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Settings as SettingsIcon,
  LogOut,
  User as UserIcon,
  ChevronsUpDown,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';

/** Badge label per produk. Grant Writer sudah live (Chunk 2). */
const stageBadge: Record<string, { label: string; tone: 'live' | 'soon' }> = {
  building: { label: 'Aktif', tone: 'live' },
  next: { label: 'Soon', tone: 'soon' },
  planned: { label: 'Soon', tone: 'soon' },
  future: { label: 'Soon', tone: 'soon' },
};

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const path = location.pathname;
  const isActive = (p: string) => path === p || path.startsWith(p + '/');

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

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
                          <Badge
                            variant="outline"
                            className={cn(
                              'ml-auto text-[10px] font-medium',
                              stageBadge[p.releaseStage].tone === 'live'
                                ? 'border-accent/50 bg-accent/20 text-accent-foreground'
                                : 'border-sidebar-border bg-sidebar-accent/40 font-normal text-sidebar-foreground/70',
                            )}
                          >
                            {stageBadge[p.releaseStage].label}
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

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md p-2 text-left outline-none transition-colors',
                'hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label="Akun saya"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? 'avatar'} />
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-medium">
                  {initials(profile?.full_name, user?.email)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-medium text-sidebar-foreground">
                      {profile?.full_name ?? 'Pengguna'}
                    </p>
                    <p className="truncate text-[11px] text-sidebar-foreground/60">
                      {user?.email}
                    </p>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/60" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={collapsed ? 'right' : 'top'}
            align="start"
            className="w-56"
          >
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{profile?.full_name ?? 'Pengguna'}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings/profile" className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" /> Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <SettingsIcon className="mr-2 h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}