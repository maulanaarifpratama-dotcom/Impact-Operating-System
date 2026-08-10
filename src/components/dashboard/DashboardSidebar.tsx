import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  Search,
  BookOpen,
  Megaphone,
  BarChart3,
  BarChart2,
  KeyRound,
  Users,
  Settings as SettingsIcon,
  LogOut,
  User as UserIcon,
  ChevronsUpDown,
  CalendarRange,
  Ruler,
  TrendingUp,
  Leaf,
  Globe,
  FolderKanban,
  type LucideIcon,
} from 'lucide-react';

import { Logo } from '@/components/Logo';
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
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';

/** Flat nav items — single-level menu, no nested dropdown. */
interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

const GROWTH_OS_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { name: 'Readiness Scorecard', href: '/dashboard/readiness', icon: ClipboardCheck },
  { name: 'Resource Access', href: '/dashboard/resource-access', icon: KeyRound },
  { name: 'Donor CRM', href: '/dashboard/donor-crm', icon: Users },
];

const PROGRAM_DESIGN_ITEMS: NavItem[] = [
  { name: 'Grant Pipeline', href: '/dashboard/grantfinder', icon: Search },
  { name: 'LFA Builder', href: '/dashboard/lfa-builder', icon: Ruler },
  { name: 'Grantwriter', href: '/dashboard/grant-writer', icon: FileText },
];

const PROJECT_MANAGEMENT_ITEMS: NavItem[] = [
  { name: 'Project Management', href: '/dashboard/project-management', icon: FolderKanban },
];

const IMPACT_ITEMS: NavItem[] = [
  { name: 'Impact Library', href: '/dashboard/impactory-library', icon: BookOpen },
  { name: 'Beneficiary Registry', href: '/dashboard/beneficiary', icon: Users },
  { name: 'Campaign Builder', href: '/dashboard/impactory-ads', icon: Megaphone },
  { name: 'Impact Dashboard', href: '/dashboard/impact', icon: BarChart2 },
  { name: 'SROI Workspace', href: '/dashboard/sroi-workspace', icon: TrendingUp },
  { name: 'Portfolio', href: '/dashboard/portfolio', icon: LayoutDashboard },
  { name: 'E-ROI Carbon', href: '/dashboard/eroi', icon: Leaf },
  { name: 'Monthly Report', href: '/dashboard/monthly-report', icon: BarChart3 },
  { name: 'Operating Review', href: '/dashboard/operating-review', icon: CalendarRange },
];

const SUSTAINABILITY_ITEMS: NavItem[] = [
  { name: 'ESG Dashboard', href: '/dashboard/esg', icon: Globe },
  { name: 'Sustainability Reports', href: '/dashboard/sustainability-reports', icon: FileText },
];


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
  const isActive = (item: NavItem) =>
    item.exact ? path === item.href : path === item.href || path.startsWith(item.href + '/');

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const linkClass = (active: boolean) =>
    cn(
      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
        : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
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
        {/* NGO Growth OS Group */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              NGO Growth OS
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {GROWTH_OS_ITEMS.map((item) => {
                const active = isActive(item);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.name} isActive={active}>
                      <NavLink
                        to={item.href}
                        end={item.exact}
                        className={linkClass(active)}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* PROGRAM DESIGN Group */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              PROGRAM DESIGN
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {PROGRAM_DESIGN_ITEMS.map((item) => {
                const active = isActive(item);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.name} isActive={active}>
                      <NavLink
                        id={
                          item.name === 'LFA Builder' ? 'tour-lfa-builder' :
                          item.name === 'Grantwriter' ? 'tour-grant-writer' :
                          undefined
                        }
                        data-testid={item.name === 'LFA Builder' ? 'nav-lfa-builder' : undefined}
                        to={item.href}
                        end={item.exact}
                        className={linkClass(active)}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* PROJECT MANAGEMENT Group */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              PROJECT MANAGEMENT
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {PROJECT_MANAGEMENT_ITEMS.map((item) => {
                const active = isActive(item);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.name} isActive={active}>
                      <NavLink
                        to={item.href}
                        end={item.exact}
                        className={linkClass(active)}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ENGAGEMENT & IMPACT Group */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              ENGAGEMENT & IMPACT
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {IMPACT_ITEMS.map((item) => {
                const active = isActive(item);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.name} isActive={active}>
                      <NavLink
                        id={item.name === 'Impact Dashboard' ? 'tour-impact-dashboard' : undefined}
                        data-testid={item.name === 'SROI Calculator' ? 'nav-sroi-calculator' : undefined}
                        to={item.href}
                        end={item.exact}
                        className={linkClass(active)}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* SUSTAINABILITY INTELLIGENCE Group */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              SUSTAINABILITY INTELLIGENCE
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {SUSTAINABILITY_ITEMS.map((item) => {
                const active = isActive(item);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.name} isActive={active}>
                      <NavLink
                        to={item.href}
                        end={item.exact}
                        className={linkClass(active)}
                      >
                        <item.icon className="h-4 w-4 shrink-0 text-emerald-500" />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/60">Akun</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings" isActive={path.startsWith('/dashboard/settings')}>
                  <NavLink to="/dashboard/settings" className={linkClass(path.startsWith('/dashboard/settings'))}>
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
              <Link to="/dashboard/settings/profile" className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" /> Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/settings" className="cursor-pointer">
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