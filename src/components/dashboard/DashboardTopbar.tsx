import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Bell, LogOut, User as UserIcon, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/providers/AuthProvider';

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function humanizePath(path: string): string[] {
  if (path === '/dashboard') return ['Dashboard'];
  const parts = path.replace(/^\//, '').split('/').filter(Boolean);
  return parts.map((s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
}

export function DashboardTopbar() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const crumbs = humanizePath(location.pathname);

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-3 backdrop-blur-md md:px-5">
      <SidebarTrigger />
      <nav aria-label="Breadcrumb" className="hidden text-sm md:block">
        <ol className="flex items-center gap-1.5 text-muted-foreground">
          {crumbs.map((c, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground/50">/</span>}
              <span className={i === crumbs.length - 1 ? 'font-medium text-foreground' : ''}>{c}</span>
            </li>
          ))}
        </ol>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-1 inline-flex items-center gap-2 rounded-full p-0.5 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Akun saya"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? 'avatar'} />
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-medium">
                  {initials(profile?.full_name, user?.email)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{profile?.full_name ?? 'Pengguna'}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
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
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}