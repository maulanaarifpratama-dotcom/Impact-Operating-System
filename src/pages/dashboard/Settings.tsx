import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User,
  Building,
  Users,
  ShieldAlert,
  Loader2,
  Mail,
  Phone,
  Link as LinkIcon,
  Plus,
  Compass,
  Briefcase,
  Layers,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Globe,
  Lock,
  Flame,
  FileCheck,
  HeartHandshake
} from 'lucide-react';

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profil');

  // --- Profile state & handlers ---
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
    }
  }, [profile]);

  // --- Fetch active organization ---
  const { data: membership, isLoading: loadingMemberships } = useQuery({
    queryKey: ['organization_members_settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const orgId = useMemo(() => {
    if (!membership) return undefined;
    if (Array.isArray(membership)) {
      return membership[0]?.organization_id;
    }
    return (membership as any)?.organization_id;
  }, [membership]);

  const { data: organization, isLoading: loadingOrg, refetch: refetchOrg } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // --- Fetch team members ---
  const { data: teamMembers, isLoading: loadingTeam, refetch: refetchTeam } = useQuery({
    queryKey: ['team_members', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          role,
          joined_at,
          user_id,
          profiles (
            id,
            email,
            full_name,
            avatar_url,
            phone
          )
        `)
        .eq('organization_id', orgId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // --- Organization states ---
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orgSector, setOrgSector] = useState('Pendidikan');
  const [orgSize, setOrgSize] = useState('Kecil (1-10 staf)');
  const [orgDesc, setOrgDesc] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name ?? '');
      setOrgSlug(organization.slug ?? '');
      
      const rawDesc = organization.description ?? '';
      setOrgDesc(rawDesc);
      
      // Parse sector and size from description if embedded
      if (rawDesc.includes('Sektor:') && rawDesc.includes('Skala:')) {
        const sectorMatch = rawDesc.match(/Sektor:\s*([^|]+)/);
        const sizeMatch = rawDesc.match(/Skala:\s*(.*)/);
        if (sectorMatch) setOrgSector(sectorMatch[1].trim());
        if (sizeMatch) setOrgSize(sizeMatch[2].trim());
      }
    }
  }, [organization]);

  // --- Profile Save Handler ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSavingProfile(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          avatar_url: avatarUrl.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Profil Anda berhasil diperbarui!');
    } catch (err: any) {
      console.error('[Settings] Error saving profile:', err);
      toast.error('Gagal memperbarui profil: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // --- Organization Save Handler ---
  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setSavingOrg(true);

    try {
      // Build the standard description payload with sector and size
      const cleanDesc = `Sektor: ${orgSector} | Skala: ${orgSize}`;

      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgName.trim(),
          slug: orgSlug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-'),
          description: cleanDesc,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId);

      if (error) throw error;

      await refetchOrg();
      await queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      toast.success('Informasi organisasi berhasil diperbarui!');
    } catch (err: any) {
      console.error('[Settings] Error saving org:', err);
      toast.error('Gagal memperbarui organisasi: ' + err.message);
    } finally {
      setSavingOrg(false);
    }
  };

  const handleInviteMock = () => {
    toast.info('Fitur Undang Anggota baru akan segera hadir! Hubungi Administrator untuk penambahan akun.');
  };

  const loadingAny = loadingMemberships || (!!orgId && loadingOrg);

  if (loadingAny) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-muted-foreground animate-pulse">Memuat pengaturan…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1 md:p-2 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
          <span>Pengaturan & Kebijakan</span>
          <Badge className="bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-50 text-xs">
            NGO Growth OS
          </Badge>
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola profil personal, identitas organisasi, struktur tim, serta tinjau kode etik doktrin AI kami.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-50 border border-slate-200/60 p-1 rounded-xl w-full grid grid-cols-4 md:max-w-2xl">
          <TabsTrigger value="profil" className="rounded-lg py-2 flex items-center gap-1.5 text-xs font-semibold">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profil Saya</span>
          </TabsTrigger>
          <TabsTrigger value="organisasi" className="rounded-lg py-2 flex items-center gap-1.5 text-xs font-semibold">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Organisasi</span>
          </TabsTrigger>
          <TabsTrigger value="tim" className="rounded-lg py-2 flex items-center gap-1.5 text-xs font-semibold">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Struktur Tim</span>
          </TabsTrigger>
          <TabsTrigger value="doctrine" className="rounded-lg py-2 flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            <span className="hidden sm:inline">Doktrin Kepercayaan</span>
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 1: PROFIL PERSONAL
            ========================================================================= */}
        <TabsContent value="profil" className="outline-none animate-in fade-in-50 duration-200">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Profil Summary Widget */}
            <Card className="shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow">
              <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
                <Avatar className="h-24 w-24 border-4 border-indigo-50 shadow-sm">
                  <AvatarImage src={avatarUrl || undefined} alt={fullName || 'Avatar'} />
                  <AvatarFallback className="bg-indigo-600 text-white text-2xl font-bold">
                    {initials(fullName, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-slate-800">{fullName || 'Pengguna'}</h3>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="w-full bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Role Akun</span>
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-semibold capitalize">
                      {membership?.role ?? 'Member'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Organisasi Aktif</span>
                    <span className="font-bold text-slate-700 max-w-[130px] truncate">
                      {organization?.name ?? 'Workspace'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profil Edit Form */}
            <Card className="md:col-span-2 shadow-sm border border-slate-100 bg-white">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800">Ubah Profil Personal</CardTitle>
                <CardDescription>Perbarui info pribadi yang ditampilkan pada data proposal, audit, dan laporan.</CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveProfile}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold text-slate-700">Alamat Email (Akun Utama)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        value={user?.email ?? ''}
                        disabled
                        className="pl-10 bg-slate-50/50 cursor-not-allowed border-slate-200 text-slate-500"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Email utama ditautkan langsung dengan otentikasi login Supabase.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs font-bold text-slate-700">Nama Lengkap</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Masukkan nama lengkap Anda"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="pl-10 border-slate-200 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold text-slate-700">Nomor WhatsApp / Telefon</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Contoh: +62812345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10 border-slate-200 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatar" className="text-xs font-bold text-slate-700">Avatar / Foto URL</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="avatar"
                        type="url"
                        placeholder="https://contoh.com/foto-anda.jpg"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        className="pl-10 border-slate-200 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-slate-50 pt-4 bg-slate-50/20 flex justify-end">
                  <Button type="submit" disabled={savingProfile} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                    {savingProfile ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan…
                      </>
                    ) : (
                      'Simpan Perubahan'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 2: INFORMASI ORGANISASI
            ========================================================================= */}
        <TabsContent value="organisasi" className="outline-none animate-in fade-in-50 duration-200">
          <Card className="shadow-sm border border-slate-100 bg-white">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800">Identitas & Skala Organisasi (NGO)</CardTitle>
              <CardDescription>
                Informasi ini digunakan oleh AI Generator untuk mengidentifikasi kepatuhan, menyusun proposal grant, dan menentukan sektor eligibilitas.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveOrg}>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="orgName" className="text-xs font-bold text-slate-700">Nama Organisasi / CSO / Yayasan</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="orgName"
                        type="text"
                        placeholder="Yayasan Dampak Sosial Indonesia"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        required
                        className="pl-10 border-slate-200 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgSlug" className="text-xs font-bold text-slate-700">Slug URL / Domain Organisasi</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="orgSlug"
                        type="text"
                        placeholder="slug-yayasan-anda"
                        value={orgSlug}
                        onChange={(e) => setOrgSlug(e.target.value)}
                        required
                        className="pl-10 border-slate-200 focus:border-indigo-500 font-mono text-xs text-indigo-700"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Hanya menggunakan karakter huruf kecil, angka, dan strip (-).</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="orgSector" className="text-xs font-bold text-slate-700">Sektor Pengabdian Utama</Label>
                    <Select value={orgSector} onValueChange={setOrgSector}>
                      <SelectTrigger className="border-slate-200 focus:border-indigo-500">
                        <SelectValue placeholder="Pilih sektor utama" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendidikan">Pendidikan & Literasi</SelectItem>
                        <SelectItem value="Kesehatan">Kesehatan & Gizi Masyarakat</SelectItem>
                        <SelectItem value="Lingkungan">Lingkungan Hidup & Konservasi</SelectItem>
                        <SelectItem value="Pemberdayaan Ekonomi">Pemberdayaan Ekonomi & UMKM</SelectItem>
                        <SelectItem value="Bantuan Kemanusiaan">Bantuan Kemanusiaan & Bencana</SelectItem>
                        <SelectItem value="Advokasi & HAM">Advokasi, Demokrasi & HAM</SelectItem>
                        <SelectItem value="Lainnya">Lainnya / Lintas Sektor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgSize" className="text-xs font-bold text-slate-700">Skala Organisasi (Staf & Volunteer)</Label>
                    <Select value={orgSize} onValueChange={setOrgSize}>
                      <SelectTrigger className="border-slate-200 focus:border-indigo-500">
                        <SelectValue placeholder="Pilih skala organisasi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kecil (1-10 staf)">Rintisan / Kecil (1-10 staf)</SelectItem>
                        <SelectItem value="Menengah (11-50 staf)">Menengah (11-50 staf)</SelectItem>
                        <SelectItem value="Besar (51-200 staf)">Besar (51-200 staf)</SelectItem>
                        <SelectItem value="Internasional (>200 staf)">Internasional / Nasional (&gt;200 staf)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="orgDesc" className="text-xs font-bold text-slate-700">Arsip Deskripsi / Catatan Tambahan</Label>
                    <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200">Format Snake Compliance</Badge>
                  </div>
                  <Textarea
                    id="orgDesc"
                    rows={4}
                    placeholder="Tuliskan misi ringkas, nomor legalitas yayasan, atau detail operasional di sini..."
                    value={orgDesc}
                    onChange={(e) => setOrgDesc(e.target.value)}
                    className="border-slate-200 focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-muted-foreground">Catatan: Sektor dan Skala disimpan tersemat ke dalam database standar organizations secara otomatis.</p>
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-50 pt-4 bg-slate-50/20 flex justify-end">
                <Button type="submit" disabled={savingOrg} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  {savingOrg ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan…
                    </>
                  ) : (
                    'Simpan Identitas Organisasi'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 3: STRUKTUR TIM (ORGANIZATION MEMBERS)
            ========================================================================= */}
        <TabsContent value="tim" className="outline-none animate-in fade-in-50 duration-200">
          <Card className="shadow-sm border border-slate-100 bg-white">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Daftar Pengelola Workspace</CardTitle>
                <CardDescription>Semua rekan staf yang memiliki otorisasi penuh dalam melihat dan mengelola NGO Growth OS.</CardDescription>
              </div>
              <Button onClick={handleInviteMock} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 self-start md:self-auto">
                <Plus className="h-4 w-4" />
                <span>Undang Rekan Staf</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="p-4 text-xs font-bold uppercase text-slate-500">Nama Anggota</th>
                      <th className="p-4 text-xs font-bold uppercase text-slate-500">Alamat Email</th>
                      <th className="p-4 text-xs font-bold uppercase text-slate-500">Kontak WA</th>
                      <th className="p-4 text-xs font-bold uppercase text-slate-500 text-center">Tingkat Hak Akses</th>
                      <th className="p-4 text-xs font-bold uppercase text-slate-500">Terdaftar Pada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamMembers?.map((m) => {
                      const prof = m.profiles as any;
                      const isCurrentUser = m.user_id === user?.id;

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-indigo-100">
                              <AvatarImage src={prof?.avatar_url ?? undefined} alt={prof?.full_name ?? 'Avatar'} />
                              <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold text-xs">
                                {initials(prof?.full_name, prof?.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span>{prof?.full_name ?? 'Pengguna'}</span>
                                {isCurrentUser && (
                                  <Badge className="bg-indigo-100 border-0 text-indigo-700 hover:bg-indigo-100 text-[9px] font-bold px-1.5 py-0">
                                    Anda
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">ID: {m.user_id?.slice(0, 8)}...</p>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-slate-600">{prof?.email ?? '-'}</td>
                          <td className="p-4 text-sm text-slate-600 font-mono">{prof?.phone ?? '-'}</td>
                          <td className="p-4 text-center">
                            <Badge className={`font-semibold text-xs border ${
                              m.role === 'owner' 
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-700' 
                                : m.role === 'admin' 
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}>
                              {m.role === 'owner' ? 'Pemilik (Owner)' : m.role === 'admin' ? 'Admin' : 'Staf (Member)'}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-slate-500">
                            {new Date(m.joined_at).toLocaleDateString('id-ID', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 4: DOKTRIN KEPERCAYAAN (TRUST DOCTRINE)
            ========================================================================= */}
        <TabsContent value="doctrine" className="outline-none animate-in fade-in-50 duration-200 space-y-6">
          {/* Banner */}
          <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/50 to-rose-100/10 p-5 md:p-6 shadow-sm flex flex-col md:flex-row gap-4 items-start">
            <div className="h-10 w-10 flex shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
              <ShieldAlert className="h-5 w-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-800 text-base">Doktrin Kepercayaan NGO Growth OS (Trust Doctrine)</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-4xl font-medium">
                Sistem G.R.O.W.T.H. mengedepankan etika, transparansi, penjaminan keamanan, dan pencegahan penipuan serta diskriminasi data.
                Kecerdasan buatan dirancang eksklusif untuk mendampingi, mengolah draf, dan mempercepat workflow, namun kendali dan validasi final mutlak berada di bawah tanggung jawab manusia (Human-in-the-Loop).
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* 5 Prinsip Trust Doctrine */}
            <Card className="shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-1.5 text-indigo-700">
                  <Compass className="h-5 w-5" />
                  <span>5 Prinsip Fundamental Trust Doctrine</span>
                </CardTitle>
                <CardDescription>Pilar komitmen etika integrasi sistem operasional dengan teknologi AI.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {[
                  {
                    title: 'Human Review Required (Peninjauan Manusia Wajib)',
                    desc: 'AI mempercepat penyusunan draft, namun seluruh proposal, klaim dampak (impact claim), data grant, dan kisah penerima manfaat wajib melalui proses review manual manusia sebelum didistribusikan.',
                    icon: User,
                  },
                  {
                    title: 'No Fabrication (Anti-Fabrikasi / Halusinasi)',
                    desc: 'Impactory dilarang keras mengarang (halusinasi) deadline pengajuan, kriteria eligibilitas donor, nominal pendanaan, statistik dampak kuantitatif, atau testimoni penerima manfaat yang palsu.',
                    icon: Flame,
                  },
                  {
                    title: 'Document Trust (Kepercayaan & Keamanan Dokumen)',
                    desc: 'Seluruh berkas legalitas, proposal lama, laporan pertanggungjawaban, dan data sensitif diarsip dalam Impact Library secara aman dengan pembatasan hak akses berjenjang.',
                    icon: Lock,
                  },
                  {
                    title: 'Confidence over Conviction (Sajikan Keyakinan, Bukan Kepastian Semu)',
                    desc: 'Rekomendasi pencocokan donor (grant matching) harus menunjukkan tingkat keyakinan (confidence level %) yang transparan, bukan berpura-pura memberikan jaminan kelulusan mutlak.',
                    icon: Sparkles,
                  },
                  {
                    title: 'System, Not Tools (Mesin Sistem, Bukan Sekadar Alat Mandiri)',
                    desc: 'Setiap modul dirancang selaras mengikuti framework G.R.O.W.T.H. agar tools digital bekerja harmonis melahirkan ritme operasional (operating rhythm) yang sehat dan berkelanjutan.',
                    icon: Layers,
                  },
                ].map((p, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 rounded-xl hover:bg-slate-50/50 transition-colors">
                    <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex shrink-0 items-center justify-center font-bold text-xs">
                      {i + 1}
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-800">{p.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 7 Hal Yang TIDAK Boleh Diotomasi AI */}
            <Card className="shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-1.5 text-rose-700">
                  <ShieldAlert className="h-5 w-5" />
                  <span>7 Batasan Mutlak (Dilarang Diotomasi AI)</span>
                </CardTitle>
                <CardDescription>Aktivitas kritis organisasi yang haram didelegasikan sepenuhnya kepada mesin.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {[
                  {
                    title: 'Klaim Dampak & Angka Penerima Manfaat',
                    desc: 'Jumlah statistik, data demografi riil, dan nominal distribusi bantuan di lapangan harus ditarik murni dari pencatatan lapangan secara faktual, bukan rekaan statistik AI.',
                    icon: AlertTriangle,
                  },
                  {
                    title: 'Kisah Nyata Penerima Manfaat (Storytelling)',
                    desc: 'Pengalaman hidup, duka, harapan, dan testimoni penerima manfaat harus berasal langsung dari wawancara narasumber asli tanpa adanya fabrikasi alur cerita fiktif.',
                    icon: CheckCircle,
                  },
                  {
                    title: 'Keputusan Etis & Alokasi Anggaran Kerja',
                    desc: 'Pembagian dana, penetapan prioritas program, penentuan pemenang bantuan, dan tanggung jawab tata kelola keuangan adalah otoritas moral pengurus manusia.',
                    icon: Briefcase,
                  },
                  {
                    title: 'Persetujuan Pengiriman Proposal (Final Submit)',
                    desc: 'Keputusan akhir untuk men-submit proposal hibah ke portal funder harus melalui klik manual dan verifikasi final penanggung jawab (PIC) organisasi.',
                    icon: FileCheck,
                  },
                  {
                    title: 'Komunikasi Intim dengan Donor Utama (Relationship)',
                    desc: 'Menjalin hubungan, diplomasi donor, negosiasi, dan ungkapan terima kasih khusus wajib dilakukan otentik oleh manusia, dilarang digantikan bot otomatis.',
                    icon: HeartHandshake,
                  },
                  {
                    title: 'Verifikasi Legalitas & Kepatuhan Hukum (Compliance)',
                    desc: 'Pemeriksaan keabsahan dokumen hukum akta notaris, NPWP, izin operasional, dan kepatuhan audit tetap membutuhkan verifikasi hukum legal ahli manusia.',
                    icon: Lock,
                  },
                  {
                    title: 'Resolusi Konflik & Manajemen Krisis Sosial',
                    desc: 'Mitigasi kendala sosial di lapangan pengabdian membutuhkan rasa empati mendalam, kearifan lokal, serta negosiasi kultural kontekstual yang tidak dimiliki AI.',
                    icon: compass => <Compass className="h-4 w-4" />
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 rounded-xl hover:bg-slate-50/50 transition-colors">
                    <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex shrink-0 items-center justify-center font-bold text-xs">
                      {i + 1}
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
