import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import {
  Cloud,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Laptop,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  ExternalLink,
  Clock,
  User,
  Mail,
  FileText,
  Search,
  SlidersHorizontal,
  ShoppingBag,
  ClipboardList,
  Trash2,
  CheckSquare,
  Ban,
  Info,
  Send,
  RotateCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// Static Data Imports
import { PLATFORMS, Platform, PlatformProduct } from '@/data/platforms';
import { 
  GATEWAY_FILTERS, 
  PRICING_FILTERS, 
  CATEGORY_FILTERS, 
  SORT_OPTIONS,
  FilterGateway,
  FilterPricing,
  FilterCategory,
  FilterSort
} from '@/data/platformFilters';

// Types representing the database schema
interface PlatformAccessRecord {
  id?: string;
  organization_id?: string;
  platform_name: string; // Dynamic support for all platform IDs
  status: 'not_started' | 'submitted' | 'pending' | 'approved' | 'renewal_needed';
  owner_name: string;
  owner_email: string;
  applied_at: string | null;
  approved_at: string | null;
  renewal_at: string | null;
  benefit_notes?: string;
  gag_monthly_spend_usd: number;
  gag_campaigns_count: number;
  gag_activated: boolean;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

// Configs for standard platform icons and colors used dynamically for backward compatibility
const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  techsoup: Cloud,
  goodstack: ShieldCheck,
  canva: Sparkles,
  google: Laptop,
  microsoft: Building2,
};

const DEFAULT_ICON = Sparkles;

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-slate-500/10 text-slate-500 border-slate-500/20 dark:bg-slate-500/25 dark:text-slate-400 dark:border-slate-500/30',
  submitted: 'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-500/25 dark:text-blue-400 dark:border-blue-500/30',
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/25 dark:text-amber-400 dark:border-amber-500/30',
  approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/25 dark:text-emerald-400 dark:border-emerald-500/30',
  renewal_needed: 'bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-500/25 dark:text-red-400 dark:border-red-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Belum Mulai',
  submitted: 'Dalam Proses',
  pending: 'Menunggu Verifikasi',
  approved: 'Terverifikasi (Approved)',
  renewal_needed: 'Perlu Renewal',
};

// Original Hardcoded AI tips kept for exact backward compatibility with the existing inline/bottom AI
const AI_TIPS: Record<string, { checklist: string[]; warning: string; confidence: number }> = {
  techsoup: {
    confidence: 98,
    checklist: [
      'Siapkan Akta Pendirian & SK Kemenkumham Kemenkes/Sosial.',
      'Nama organisasi pada formulir TechSoup harus persis sama dengan dokumen hukum.',
      'Sediakan NPWP atas nama organisasi.',
      'Proses verifikasi memakan waktu sekitar 3-5 hari kerja.',
    ],
    warning: 'Jangan mendaftar dengan nama singkatan jika di Akta Pendirian tertulis nama lengkap organisasi Anda.',
  },
  goodstack: {
    confidence: 96,
    checklist: [
      'Sediakan Rekening Bank atas nama lembaga resmi (bukan personal).',
      'Upload Bank Statement / Rekening Koran terbaru (kurang dari 3 bulan terakhir).',
      'Sediakan AD/ART lengkap.',
      'Pendaftaran ini membuka akses ke program CSR Benevity dan brand internasional.',
    ],
    warning: 'Goodstack sangat ketat mengenai kesesuaian nama pemilik bank dengan nama hukum organisasi.',
  },
  canva: {
    confidence: 97,
    checklist: [
      'Buat akun Canva standar menggunakan email institusi organisasi terlebih dahulu.',
      'Siapkan SK Kemenkumham serta AD/ART sebagai bukti non-profit.',
      'Sediakan deskripsi singkat dampak program sosial dan link website/sosmed aktif.',
      'Canva Pro gratis mendukung kolaborasi hingga 50 anggota tim.',
    ],
    warning: 'Canva sering menolak jika website organisasi Anda kosong atau dinilai tidak menunjukkan aktivitas program sosial.',
  },
  google: {
    confidence: 99,
    checklist: [
      'Selesaikan registrasi TechSoup terlebih dahulu untuk memperoleh "Validation Token".',
      'Buat email domain organisasi resmi (contoh: admin@organisasi.or.id).',
      'Pastikan website sudah HTTPS, bebas konten komersial, dan mencantumkan legalitas lengkap di footer.',
      'Google Ads Grant memberikan kredit promosi senilai US$10,000 per bulan.',
    ],
    warning: 'Jangan pernah mendaftar menggunakan email gmail pribadi pendiri, gunakan workspace domain resmi.',
  },
  microsoft: {
    confidence: 95,
    checklist: [
      'Gunakan Validation Token dari TechSoup untuk bypass verifikasi manual.',
      'Klaim lisensi Microsoft 365 Business Basic gratis hingga 10 user.',
      'Aktifkan credit Azure gratis senilai US$3,500/tahun untuk deployment server/database.',
      'Siapkan calendar alert untuk memantau pengunaan credit Azure Anda agar tidak over-limit.',
    ],
    warning: 'Selalu setup budget alert di portal Microsoft Azure agar saldo gratis Anda tidak terpotong habis tiba-tiba.',
  },
};

// Fallback AI tips function for newer platforms so they don't crash
const getAiTipsForPlatform = (platform: Platform) => {
  const existing = AI_TIPS[platform.id];
  if (existing) return existing;
  
  // Safe dynamic fallback tips based on real-world non-profit verification patterns
  return {
    confidence: 92,
    checklist: [
      `Siapkan dokumen legalitas utama seperti SK Kemenkumham, Akta Notaris, atau AD/ART organisasi Anda.`,
      `Pastikan pendaftaran diajukan melalui portal non-profit resmi di ${new URL(platform.registration.url).hostname}.`,
      `Gunakan email resmi berdomain institusi Anda (@organisasi.org) saat mengajukan permohonan.`,
      `Pastikan profil organisasi dan website publik mencantumkan detail misi kemasyarakatan yang jelas.`
    ],
    warning: `Selalu lakukan tinjauan kelayakan khusus. Platform ini mewajibkan status verifikasi non-profit aktif agar diskon/hibah tidak dicabut.`
  };
};

interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ResourceAccessTracker() {
  const { user } = useAuth();
  
  // States for tracking and forms
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [formState, setFormState] = useState<Partial<PlatformAccessRecord>>({});
  const [expandedMistakes, setExpandedMistakes] = useState(false);
  
  // Accordion Expand/Collapse States (Goodstack expanded by default to follow original logical flow)
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({
    goodstack: true,
  });

  // Active Tab State per expanded Card (defaults to 'products')
  const [activeTabs, setActiveTabs] = useState<Record<string, 'products' | 'register' | 'requirements' | 'usage' | 'admin'>>({});

  // Interactive Checklist Checkboxes (Local Persistence during Session)
  const [checkedDocuments, setCheckedDocuments] = useState<Record<string, Record<number, boolean>>>({});

  // Search & Filter State
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [gateway, setGateway] = useState<FilterGateway>("all");
  const [pricing, setPricing] = useState<FilterPricing>("all");
  const [category, setCategory] = useState<FilterCategory>("all");
  const [sort, setSort] = useState<FilterSort>("priority");

  // Search Debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchText]);

  // Inline AI Assistant states
  const [inlineAiLoading, setInlineAiLoading] = useState<Record<string, boolean>>({});
  const [inlineAiResponses, setInlineAiResponses] = useState<Record<string, typeof AI_TIPS[string] | null>>({});
  const [inlineHumanReviewChecked, setInlineHumanReviewChecked] = useState<Record<string, boolean>>({});
  
  // AI Chat Assistant states
  const [aiSelectedPlatform, setAiSelectedPlatform] = useState<string>('techsoup');
  const [chatsByPlatform, setChatsByPlatform] = useState<Record<string, ChatMessage[]>>({});
  const [chatInput, setAiChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch organization details
  const { data: membership, isLoading: isMembershipLoading } = useQuery({
    queryKey: ['organization_members', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const organizationId = useMemo(() => {
    if (!membership) return undefined;
    if (Array.isArray(membership)) {
      const first = membership[0] as { organization_id: string } | undefined;
      return first?.organization_id;
    }
    return (membership as { organization_id: string }).organization_id;
  }, [membership]);

  // 1b. Fetch organization name for AI prompt personalization
  const { data: organization } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const orgName = organization?.name || 'Organisasi Saya';

  // 2. Fetch platform access records
  const { data: dbPlatforms, isLoading: isPlatformsLoading, refetch } = useQuery({
    queryKey: ['resource_access_platforms', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('resource_access_platforms')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return (data || []) as PlatformAccessRecord[];
    },
    enabled: !!organizationId,
  });

  // 3. Upsert Platform Mutation
  const upsertMutation = useMutation({
    mutationFn: async (payload: Partial<PlatformAccessRecord>) => {
      if (!organizationId) throw new Error('No organization context available');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('resource_access_platforms')
        .upsert({
          organization_id: organizationId,
          ...payload,
        }, { onConflict: 'organization_id,platform_name' });
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pembaruan platform berhasil disimpan ke database');
      setEditingPlatform(null);
      void refetch();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      console.error('[ResourceAccessTracker] Error saving:', err);
      toast.error(`Gagal menyimpan perubahan: ${err.message || 'Kesalahan Server'}`);
    }
  });

  // Transform records into a unified mapping supporting all 24 platforms
  const platformsMap = useMemo(() => {
    const map: Record<string, PlatformAccessRecord> = {};
    
    // Set defaults for ALL static platforms first
    PLATFORMS.forEach(p => {
      map[p.id] = {
        platform_name: p.id,
        status: 'not_started',
        owner_name: '',
        owner_email: '',
        applied_at: null,
        approved_at: null,
        renewal_at: null,
        gag_monthly_spend_usd: 0,
        gag_campaigns_count: 0,
        gag_activated: false,
        notes: '',
      };
    });

    // Populate with actual DB records
    if (dbPlatforms) {
      dbPlatforms.forEach(record => {
        map[record.platform_name] = record;
      });
    }

    return map;
  }, [dbPlatforms]);

  // Statistics
  const stats = useMemo(() => {
    const approved = PLATFORMS.filter(p => platformsMap[p.id]?.status === 'approved').length;
    return { total: PLATFORMS.length, approved };
  }, [platformsMap]);

  // Renewal countdown calculator
  const getCountdownText = (renewalDateStr: string | null | undefined) => {
    if (!renewalDateStr) return null;
    const renewalDate = new Date(renewalDateStr);
    const today = new Date();
    renewalDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: diffDays, text: `Lewat ${Math.abs(diffDays)} hari`, color: 'text-red-500 bg-red-500/10 border-red-500/20 dark:bg-red-500/20 dark:border-red-500/30' };
    }
    if (diffDays === 0) {
      return { days: diffDays, text: 'Renewal HARI INI!', color: 'text-red-500 font-bold bg-red-500/20 animate-pulse border-red-500/30 dark:bg-red-500/30' };
    }
    if (diffDays < 30) {
      return { days: diffDays, text: `${diffDays} hari lagi`, color: 'text-red-500 font-semibold bg-red-500/10 border-red-500/20 dark:bg-red-500/20 dark:border-red-500/30' };
    }
    if (diffDays < 60) {
      return { days: diffDays, text: `${diffDays} hari lagi`, color: 'text-amber-500 font-semibold bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/20 dark:border-amber-500/30' };
    }
    return { days: diffDays, text: `${diffDays} hari lagi`, color: 'text-emerald-500 font-medium bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/20 dark:border-emerald-500/30' };
  };

  // List of active renewals for calendar view
  const renewalItems = useMemo(() => {
    return PLATFORMS
      .map(p => {
        const item = platformsMap[p.id];
        const countdown = getCountdownText(item?.renewal_at);
        return {
          key: p.id,
          displayName: p.name,
          status: item?.status || 'not_started',
          renewalDate: item?.renewal_at || null,
          countdown,
        };
      })
      .filter(item => item.status === 'approved' && item.renewalDate)
      .sort((a, b) => {
        const d1 = new Date(a.renewalDate!).getTime();
        const d2 = new Date(b.renewalDate!).getTime();
        return d1 - d2;
      });
  }, [platformsMap]);

  // Initiate edit mode
  const handleStartEdit = (platformName: string) => {
    const current = platformsMap[platformName];
    // Automatically expand card and switch to PIC & Status tab when editing
    setExpandedPlatforms(prev => ({ ...prev, [platformName]: true }));
    setActiveTabs(prev => ({ ...prev, [platformName]: 'admin' }));
    setEditingPlatform(platformName);
    setFormState({
      platform_name: platformName,
      status: current.status,
      owner_name: current.owner_name || '',
      owner_email: current.owner_email || '',
      applied_at: current.applied_at || '',
      approved_at: current.approved_at || '',
      renewal_at: current.renewal_at || '',
      notes: current.notes || '',
      gag_activated: current.gag_activated || false,
      gag_monthly_spend_usd: current.gag_monthly_spend_usd || 0,
      gag_campaigns_count: current.gag_campaigns_count || 0,
    });
  };

  // Save changes
  const handleSave = () => {
    if (!formState.owner_email && formState.owner_name) {
      toast.warning('Kami menyarankan untuk melengkapi email owner juga.');
    }
    upsertMutation.mutate(formState);
  };

  // Google Ads Grant specific update helper
  const handleSaveGagOnly = (googleItem: PlatformAccessRecord, spend: number, campaigns: number, activated: boolean) => {
    upsertMutation.mutate({
      ...googleItem,
      gag_monthly_spend_usd: spend,
      gag_campaigns_count: campaigns,
      gag_activated: activated,
    });
  };

  // Toggle Accordion Expand
  const toggleExpand = (platformKey: string) => {
    setExpandedPlatforms(prev => ({
      ...prev,
      [platformKey]: !prev[platformKey]
    }));
  };

  // Switch Active Tab for Expanded Card
  const setPlatformActiveTab = (platformKey: string, tab: 'products' | 'register' | 'requirements' | 'usage' | 'admin') => {
    setActiveTabs(prev => ({
      ...prev,
      [platformKey]: tab
    }));
  };

  // Handle Interactive Document Checking
  const toggleDocumentCheck = (platformKey: string, docIndex: number) => {
    setCheckedDocuments(prev => ({
      ...prev,
      [platformKey]: {
        ...(prev[platformKey] || {}),
        [docIndex]: !(prev[platformKey]?.[docIndex])
      }
    }));
  };

  // Handle Inline AI Assistant activation
  const handleTriggerInlineAi = (platformKey: string) => {
    setInlineAiLoading(prev => ({ ...prev, [platformKey]: true }));
    setInlineAiResponses(prev => ({ ...prev, [platformKey]: null }));
    setInlineHumanReviewChecked(prev => ({ ...prev, [platformKey]: false }));

    const matchingPlatform = PLATFORMS.find(p => p.id === platformKey);
    const pName = matchingPlatform ? matchingPlatform.name : platformKey;

    setTimeout(() => {
      const tips = getAiTipsForPlatform(matchingPlatform || { id: platformKey } as Platform);
      setInlineAiResponses(prev => ({ ...prev, [platformKey]: tips }));
      setInlineAiLoading(prev => ({ ...prev, [platformKey]: false }));
      toast.success(`AI Copilot memuat panduan pendaftaran ${pName}`);
    }, 700);
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  };

  // Auto-scroll chat to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [chatsByPlatform, aiSelectedPlatform]);

  // Start chat with contextual priming
  const startPlatformChat = async (platformId: string) => {
    const platform = PLATFORMS.find(p => p.id === platformId) || { id: platformId, name: platformId, requirements: { documents: [] } } as unknown as Platform;
    const pName = platform.name;
    const docsStr = platform.requirements.documents.join(', ');

    const systemPrompt = `Kamu adalah Impactory AI, asisten registrasi platform nonprofit untuk NGO Indonesia. Bantu pengguna mempersiapkan dokumen dan strategi pendaftaran platform nonprofit dengan akurat dan praktis. Selalu jawab dalam Bahasa Indonesia. Berikan jawaban yang konkret, actionable, dan spesifik untuk konteks NGO Indonesia.`;

    const userMessageText = `Saya ingin mendaftar ${pName} untuk organisasi saya ${orgName}. Dokumen yang dibutuhkan: [${docsStr}].
Tolong bantu saya:
1. Checklist dokumen lengkap yang perlu disiapkan
2. Tips spesifik agar aplikasi tidak ditolak  
3. Jebakan umum yang harus dihindari
4. Estimasi waktu proses verifikasi`;

    const systemMsg: ChatMessage = {
      id: 'sys-' + Date.now(),
      role: 'system',
      content: systemPrompt,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: userMessageText,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    const initialMessages = [systemMsg, userMsg];
    setChatsByPlatform(prev => ({
      ...prev,
      [platformId]: initialMessages
    }));

    await triggerStreamingResponse(platformId, initialMessages);
  };

  const triggerStreamingResponse = async (platformId: string, messagesHistory: ChatMessage[]) => {
    setChatLoading(true);
    
    const assistantMsgId = 'assistant-' + Date.now();
    const assistantMsgPlaceholder: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setChatsByPlatform(prev => ({
      ...prev,
      [platformId]: [...(prev[platformId] || []), assistantMsgPlaceholder]
    }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Missing session token');

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Missing Supabase environment variables');

      const url = SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/platform-registration-chat';

      const payloadMessages = messagesHistory.map(m => ({
        role: m.role,
        content: m.content
      }));

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      if (!resp.ok) {
        throw new Error(`Edge Function error ${resp.status}`);
      }
      if (!resp.body) throw new Error('Edge Function returned no body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const ev of events) {
          const line = ev.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const obj = JSON.parse(payload);
            if (obj.delta) {
              accumulatedText += obj.delta;
              setChatsByPlatform(prev => {
                const currentHistory = prev[platformId] || [];
                return {
                  ...prev,
                  [platformId]: currentHistory.map(msg => 
                    msg.id === assistantMsgId ? { ...msg, content: accumulatedText } : msg
                  )
                };
              });
            } else if (obj.error) {
              throw new Error(obj.error);
            }
          } catch (e) {
            // ignore JSON parse errors
          }
        }
      }
    } catch (err) {
      console.error('[Impactory AI] Error streaming chat response:', err);
      const errorMsg = err instanceof Error ? err.message : 'Kesalahan Server';
      toast.error(`Koneksi ke Impactory AI gagal: ${errorMsg}`);
      setChatsByPlatform(prev => {
        const currentHistory = prev[platformId] || [];
        return {
          ...prev,
          [platformId]: currentHistory.map(msg => 
            msg.id === assistantMsgId ? { ...msg, content: `Error: Gagal memuat rekomendasi. Silakan coba lagi.` } : msg
          )
        };
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendCustomMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setAiChatInput("");

    const platformId = aiSelectedPlatform;
    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    const existingHistory = chatsByPlatform[platformId] || [];
    const updatedHistory = [...existingHistory, userMsg];

    setChatsByPlatform(prev => ({
      ...prev,
      [platformId]: updatedHistory
    }));

    await triggerStreamingResponse(platformId, updatedHistory);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendCustomMessage();
    }
  };

  // Handle Contextual AI Assistant Activation from non-gateway registration tab
  const handleTriggerContextualAi = (platform: Platform) => {
    setAiSelectedPlatform(platform.id);
    void startPlatformChat(platform.id);
    
    // Smooth scroll down to the bottom AI Copilot section
    setTimeout(() => {
      const aiSection = document.getElementById('ai-copilot-section');
      if (aiSection) {
        aiSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Trigger chat automatically when selected platform changes or on mount (after organization details load)
  useEffect(() => {
    if (orgName && aiSelectedPlatform) {
      void startPlatformChat(aiSelectedPlatform);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiSelectedPlatform, orgName]);

  // Filter Clear All Action
  const handleClearAllFilters = () => {
    setSearchText("");
    setGateway("all");
    setPricing("all");
    setCategory("all");
    setSort("priority");
    toast.success("Semua penyaringan filter berhasil dibersihkan");
  };

  // Pure frontend cascading filter logic for catalog platforms (excluding gateway)
  const filteredPlatforms = useMemo(() => {
    let result = PLATFORMS.filter(p => !p.category.includes('gateway'));

    // a. Search text filter
    if (debouncedSearchText) {
      const q = debouncedSearchText.toLowerCase();
      result = result.filter(p => {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        const matchesProducts = p.products.some(prod => 
          prod.name.toLowerCase().includes(q) || prod.description.toLowerCase().includes(q)
        );
        return matchesName || matchesDesc || matchesProducts;
      });
    }

    // b. Gateway filter
    if (gateway !== "all") {
      result = result.filter(p => {
        if (gateway === "goodstack") {
          return p.gateway === "goodstack" || p.gateway === "both";
        }
        if (gateway === "techsoup") {
          return p.gateway === "techsoup" || p.gateway === "both";
        }
        return p.gateway === gateway;
      });
    }

    // c. Pricing type filter
    if (pricing !== "all") {
      result = result.filter(p => p.pricing.type === pricing);
    }

    // d. Category filter
    if (category !== "all") {
      result = result.filter(p => p.category.includes(category));
    }

    // e. Sort
    result.sort((a, b) => {
      if (sort === "priority") {
        return a.priority - b.priority;
      }
      if (sort === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sort === "name_desc") {
        return b.name.localeCompare(a.name);
      }
      if (sort === "discount_high") {
        const discA = a.products.reduce((max, prod) => Math.max(max, prod.discount_percent || 0), 0);
        const discB = b.products.reduce((max, prod) => Math.max(max, prod.discount_percent || 0), 0);
        return discB - discA;
      }
      return 0;
    });

    return result;
  }, [debouncedSearchText, gateway, pricing, category, sort]);

  // Isolate pinned gateway platforms (unaffected by filters)
  const gatewayPlatforms = useMemo(() => {
    return PLATFORMS.filter(p => p.category.includes('gateway'));
  }, []);

  const googleItem = platformsMap['google'];
  const googleIsApproved = googleItem?.status === 'approved';

  // Helper nested render function to handle all platform cards styled cleanly
  const renderPlatformCard = (platform: Platform, isGateway: boolean) => {
    const platformKey = platform.id;
    const item = platformsMap[platformKey];
    const isEditing = editingPlatform === platformKey;
    const isExpanded = !!expandedPlatforms[platformKey];
    const countdown = getCountdownText(item?.renewal_at);
    
    // Resolve active tab state (defaults to 'products')
    const activeTab = activeTabs[platformKey] || 'products';

    // Map category names to emoji labels
    const getCategoryLabel = (cat: string) => {
      const match = CATEGORY_FILTERS.find(f => f.id === cat);
      return match ? match.label : cat;
    };

    // Color classes for pricing type
    const getPricingColor = (type: string) => {
      switch(type) {
        case 'free': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/25 dark:text-emerald-400';
        case 'discount': return 'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-500/25 dark:text-blue-400';
        case 'credits': return 'bg-purple-500/10 text-purple-500 border-purple-500/20 dark:bg-purple-500/25 dark:text-purple-400';
        case 'admin_fee': return 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/25 dark:text-amber-400';
        default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      }
    };

    // Gateway labels and chips classes
    const getGatewayChip = (gw: string) => {
      switch(gw) {
        case 'goodstack': return { label: 'Goodstack', style: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-800' };
        case 'techsoup': return { label: 'TechSoup', style: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-800' };
        case 'both': return { label: 'Keduanya', style: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-800' };
        default: return { label: 'Langsung', style: 'bg-slate-500/10 text-slate-600 border-slate-200 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-800' };
      }
    };

    const gwChip = getGatewayChip(platform.gateway);
    const IconComponent = PLATFORM_ICONS[platformKey] || DEFAULT_ICON;
    const sequenceLabel = platform.id === 'goodstack' ? 'Langkah 1' : 'Langkah 2';

    const cardBgStyle = isGateway 
      ? "bg-amber-50/75 border-amber-200/90 dark:bg-amber-950/15 dark:border-amber-900/40"
      : "bg-card border-border/80";

    return (
      <Card 
        key={platformKey} 
        className={cn(
          "relative overflow-hidden border p-5 shadow-card transition-all duration-300 hover:scale-[1.002] hover:shadow-elegant",
          cardBgStyle,
          isExpanded && "ring-1 ring-accent/35 border-accent/30",
          !isGateway && isExpanded && "bg-accent-soft/[0.03]",
          isGateway && isExpanded && "bg-amber-50/90 dark:bg-amber-950/25",
          isEditing && "ring-1 ring-accent border-accent/40 bg-accent-soft/10"
        )}
      >
        {/* Decorative Accent Strip */}
        <div className={cn(
          "absolute top-0 left-0 h-[3px] w-full",
          isGateway ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-gradient-to-r from-accent to-[#155F66]"
        )} />

        {/* TOP ROW BADGES */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3.5 w-full">
          {isGateway ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-sm animate-pulse">
                🔑 MULAI DARI SINI
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 dark:bg-amber-700 text-white text-[10px] font-extrabold px-2.5 py-0.5 shadow-sm">
                {sequenceLabel}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border">
                Prioritas {platform.priority}
              </span>
              <Badge variant="outline" className={cn("text-[9px] font-bold border px-2 py-0", gwChip.style)}>
                {gwChip.label}
              </Badge>
            </div>
          )}
          <Badge variant="outline" className={cn("text-[9px] font-extrabold border px-2 py-0 uppercase tracking-wide shadow-sm", getPricingColor(platform.pricing.type))}>
            {platform.pricing.label}
          </Badge>
        </div>

        {/* CARD CLICKABLE HEADER */}
        <div 
          onClick={() => toggleExpand(platformKey)}
          className="flex items-start justify-between gap-3 cursor-pointer select-none group"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20 shadow-sm shrink-0 transition-transform duration-300 group-hover:scale-105">
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-snug text-foreground flex items-center gap-1.5 group-hover:text-accent transition-colors">
                {platform.name}
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300 shrink-0", isExpanded && "rotate-180")} />
              </h3>
              
              {isGateway && (
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 animate-bounce shrink-0" />
                  Daftar gateway ini DULU sebelum apply platform lain
                </p>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed mt-1 max-w-xl">{platform.description}</p>
              
              {/* CATEGORY OUTLINED CHIPS */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                {platform.category.map(cat => (
                  <span key={cat} className="text-[10px] font-semibold text-muted-foreground/90 bg-muted/20 border px-2 py-0.5 rounded">
                    {getCategoryLabel(cat)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant="outline" className={cn("text-[10px] font-bold px-2.5 py-0.5 shadow-sm border", STATUS_COLORS[item?.status || 'not_started'])}>
              {STATUS_LABELS[item?.status || 'not_started']}
            </Badge>
            
            {/* Collapsed state key metadata preview */}
            {!isExpanded && (
              <div className="hidden md:flex items-center gap-3 text-[11px] text-muted-foreground font-medium mt-1">
                {item?.owner_name && (
                  <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                    <User className="h-3 w-3 text-accent" /> {item.owner_name}
                  </span>
                )}
                {item?.status === 'approved' && countdown && (
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", countdown.color)}>
                    {countdown.text}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* EXPANDED ACCORDION TABS BODY */}
        {isExpanded && (
          <div className="mt-5 pt-5 border-t border-border/40 space-y-4.5 animate-fade-in">
            
            {/* 1. Accordion Header Tabs list */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border/40 pb-2.5 overflow-x-auto no-scrollbar scroll-smooth">
              <button
                onClick={() => setPlatformActiveTab(platformKey, 'products')}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all border shrink-0",
                  activeTab === 'products'
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
                )}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Produk
              </button>
              <button
                onClick={() => setPlatformActiveTab(platformKey, 'register')}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all border shrink-0",
                  activeTab === 'register'
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
                )}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Cara Daftar
              </button>
              <button
                onClick={() => setPlatformActiveTab(platformKey, 'requirements')}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all border shrink-0",
                  activeTab === 'requirements'
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                Syarat Kelayakan
              </button>
              <button
                onClick={() => setPlatformActiveTab(platformKey, 'usage')}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all border shrink-0",
                  activeTab === 'usage'
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Cara Pakai (Use Cases)
              </button>
              <button
                onClick={() => setPlatformActiveTab(platformKey, 'admin')}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all border shrink-0",
                  activeTab === 'admin'
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
                )}
              >
                <User className="h-3.5 w-3.5" />
                PIC & Administrasi
              </button>
            </div>

            {/* 2. Active Tab Content Panels */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[220px]">
              
              {/* TAB CONTENTS (Left 7 cols on Desktop, or Full Width on Gateway Cards if there is no AI helper) */}
              <div className={cn(isGateway ? "md:col-span-12" : "md:col-span-7", "space-y-4")}>
                
                {/* TAB A: PRODUCTS */}
                {activeTab === 'products' && (
                  <div className="space-y-3.5 animate-slide-up">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5 text-accent" />
                      Katalog Produk & Diskon
                    </h4>
                    <div className="space-y-2.5">
                      {platform.products.map((prod, idx) => {
                        // Get status badge colors
                        let statusBadge = null;
                        if (prod.status === 'free') {
                          statusBadge = (
                            <Badge variant="outline" className="text-[9px] font-extrabold px-1.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/25 dark:text-emerald-400 py-0 uppercase">
                              Gratis
                            </Badge>
                          );
                        } else if (prod.status === 'discount') {
                          statusBadge = (
                            <Badge variant="outline" className="text-[9px] font-extrabold px-1.5 bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-500/25 dark:text-blue-400 py-0 uppercase">
                              Diskon
                            </Badge>
                          );
                        } else if (prod.status === 'credits') {
                          statusBadge = (
                            <Badge variant="outline" className="text-[9px] font-extrabold px-1.5 bg-purple-500/10 text-purple-500 border-purple-500/20 dark:bg-purple-500/25 dark:text-purple-400 py-0 uppercase">
                              Credits
                            </Badge>
                          );
                        }

                        return (
                          <div key={idx} className="rounded-xl border bg-muted/10 p-3.5 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-foreground">{prod.name}</span>
                              <div className="flex items-center gap-1.5">
                                {statusBadge}
                                {prod.discount_percent && (
                                  <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-extrabold px-1.5">
                                    Diskon {prod.discount_percent}%
                                  </Badge>
                                )}
                                {prod.nonprofit_price_usd && (
                                  <Badge variant="secondary" className="text-[10px] font-bold bg-accent/10 text-accent border border-accent/20 px-2 py-0">
                                    {prod.nonprofit_price_usd}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-normal">{prod.description}</p>
                            <p className="text-[10px] text-muted-foreground/80 leading-relaxed italic border-t border-border/30 pt-1.5 mt-1.5 font-normal">
                              NGO Use Case: {prod.use_case_ngo}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB B: CARA DAFTAR */}
                {activeTab === 'register' && (
                  <div className="space-y-3.5 animate-slide-up">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5 text-accent" />
                        Instruksi Registrasi Platform
                      </h4>
                      <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20 text-[10px] font-bold py-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Verifikasi: {platform.registration.estimated_time}
                      </Badge>
                    </div>

                    {/* Numbered Steps list */}
                    <div className="space-y-2.5">
                      <p className="text-[11px] font-bold text-foreground">Langkah Pendaftaran:</p>
                      <ol className="space-y-2.5 pl-4 list-decimal text-xs text-muted-foreground leading-relaxed">
                        {platform.registration.steps.map((step, idx) => (
                          <li key={idx} className="pl-1">
                            <span className="text-foreground font-medium">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Gotchas Amber warning box */}
                    {platform.registration.gotchas && platform.registration.gotchas.length > 0 && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.03] p-4 text-xs leading-relaxed text-amber-800 dark:text-amber-400">
                        <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 mb-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Perhatian Penting (Gotchas):
                        </span>
                        <ul className="list-disc pl-4 space-y-1">
                          {platform.registration.gotchas.map((gotcha, idx) => (
                            <li key={idx}>{gotcha}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Registration Direct CTA Button & AI Contextual Help Button */}
                    <div className="pt-2 flex flex-wrap items-center gap-2.5">
                      <Button
                        asChild
                        size="sm"
                        className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-xs shadow-sm h-9"
                      >
                        <a href={platform.registration.url} target="_blank" rel="noopener noreferrer">
                          Daftar Sekarang &rarr;
                        </a>
                      </Button>

                      {!isGateway && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerContextualAi(platform);
                          }}
                          className="h-9 text-xs font-bold border-accent/30 text-accent bg-accent/5 hover:bg-accent/10 shadow-sm"
                        >
                          🤖 Bantu saya siapkan dokumen untuk {platform.name}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB C: SYARAT KELAYAKAN */}
                {activeTab === 'requirements' && (
                  <div className="space-y-3.5 animate-slide-up">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-accent" />
                      Berkas & Kriteria Kelayakan
                    </h4>

                    {/* Documents Checklist */}
                    <div className="rounded-xl border bg-muted/15 p-4 space-y-3">
                      <p className="text-[11px] font-bold text-foreground">
                        Checklist Dokumen Wajib NGO:
                      </p>
                      <div className="space-y-2.5">
                        {platform.requirements.documents.map((doc, idx) => {
                          return (
                            <div 
                              key={idx}
                              className="flex items-start gap-2.5 text-xs text-foreground select-none"
                            >
                              <CheckSquare className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                              <span className="leading-normal font-medium text-foreground">
                                {doc}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Conditions requirements */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-foreground">Kriteria Kelayakan:</p>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                        {platform.requirements.conditions.map((cond, idx) => (
                          <li key={idx}>{cond}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Non-Eligible Criteria */}
                    {platform.not_eligible && platform.not_eligible.length > 0 && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.01] p-3.5 space-y-2.5 text-xs">
                        <p className="font-bold text-[10px] uppercase tracking-wider text-red-500 flex items-center gap-1">
                          <X className="h-3.5 w-3.5 text-red-500" />
                          Tidak Layak / Not Eligible:
                        </p>
                        <div className="space-y-2">
                          {platform.not_eligible.map((not, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-red-600/80 dark:text-red-400/80 leading-normal">
                              <X className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                              <span>{not}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB D: USE CASES (CARA PAKAI) */}
                {activeTab === 'usage' && (
                  <div className="space-y-4 animate-slide-up">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-accent" />
                      Dampak Penggunaan Platform (NGO Use Cases)
                    </h4>

                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-foreground">Saran Solusi Dampak:</p>
                      <ol className="space-y-2.5 pl-4 list-decimal text-xs text-muted-foreground leading-relaxed">
                        {platform.use_cases.map((useCase, idx) => (
                          <li key={idx} className="pl-1">
                            <span className="text-foreground font-semibold">{useCase}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Renewal Info Badge at bottom */}
                    <div className="rounded-xl border bg-muted/15 p-3.5 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-foreground font-bold">
                        <RefreshCw className="h-3.5 w-3.5 text-accent" />
                        <span>Kebijakan Perpanjangan (Renewal)</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-[11px]">
                        Siklus: <span className="font-bold text-foreground">{platform.renewal.period}</span> ({platform.renewal.type === 'auto' ? 'Auto-Renewal' : platform.renewal.type === 'manual' ? 'Manual Renewal' : 'Tanpa Renewal'}). 
                        {platform.renewal.note && <span className="block mt-1 italic text-accent">{platform.renewal.note}</span>}
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB E: PIC & ADMINISTRATIVE STATUS FORM */}
                {activeTab === 'admin' && (
                  <div className="space-y-4 animate-slide-up">
                    
                    {/* VIEW PIC DETAILS MODE */}
                    {!isEditing ? (
                      <div className="space-y-3.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-accent" />
                          PIC & Informasi Administrasi
                        </h4>

                        <div className="grid grid-cols-1 gap-3 rounded-xl border bg-muted/20 p-4 text-xs">
                          <div className="flex items-start gap-3">
                            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="space-y-0.5">
                              <p className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">PIC / Penanggung Jawab</p>
                              <p className="font-semibold text-foreground text-sm">
                                {item?.owner_name || <span className="text-muted-foreground/50 font-normal">Belum ditentukan</span>}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 border-t border-border/40 pt-3">
                            <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="space-y-0.5">
                              <p className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Email Kontak PIC</p>
                              <p className="font-semibold text-foreground">
                                {item?.owner_email || <span className="text-muted-foreground/50 font-normal">Belum ditentukan</span>}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-3">
                            <div className="space-y-0.5">
                              <p className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Tanggal Apply</p>
                              <p className="font-semibold text-foreground">
                                {item?.applied_at ? new Date(item.applied_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                              </p>
                            </div>
                            <div className="space-y-0.5 border-l border-border/40 pl-3">
                              <p className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Tanggal Renewal</p>
                              <p className="font-semibold text-foreground">
                                {item?.renewal_at ? new Date(item.renewal_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {item?.notes ? (
                          <div className="rounded-xl bg-muted/40 p-3.5 border border-dashed border-border text-xs leading-relaxed text-muted-foreground">
                            <span className="font-bold text-foreground block mb-1">Catatan Internal / Token Verifikasi:</span> 
                            {item.notes}
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground/50 text-center py-2 italic">
                            Belum ada catatan internal atau token verifikasi yang disimpan.
                          </div>
                        )}
                      </div>
                    ) : (
                      
                      /* EDIT PIC DETAILS INLINE FORM */
                      <div className="space-y-3.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Edit2 className="h-3.5 w-3.5 text-accent" />
                          Formulir Administrasi PIC
                        </h4>

                        <div className="grid grid-cols-2 gap-3 rounded-xl border p-4 bg-muted/10">
                          <div className="col-span-2">
                            <Label className="text-[10px] font-bold text-foreground">Status Pendaftaran</Label>
                            <select
                              value={formState.status}
                              onChange={(e) => setFormState({ ...formState, status: e.target.value as PlatformAccessRecord['status'] })}
                              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                            >
                              <option value="not_started">Belum Mulai (Not Started)</option>
                              <option value="submitted">Dalam Proses (Submitted)</option>
                              <option value="pending">Menunggu Verifikasi (Pending)</option>
                              <option value="approved">Approved (Terverifikasi)</option>
                              <option value="renewal_needed">Butuh Perpanjangan (Renewal Needed)</option>
                            </select>
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold text-foreground">Nama PIC / Owner</Label>
                            <Input
                              type="text"
                              value={formState.owner_name}
                              placeholder="Budi"
                              onChange={(e) => setFormState({ ...formState, owner_name: e.target.value })}
                              className="mt-1.5 h-8.5 text-xs font-medium"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold text-foreground">Email PIC</Label>
                            <Input
                              type="email"
                              value={formState.owner_email}
                              placeholder="budi@ngo.org"
                              onChange={(e) => setFormState({ ...formState, owner_email: e.target.value })}
                              className="mt-1.5 h-8.5 text-xs font-medium"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold text-foreground">Tanggal Apply</Label>
                            <Input
                              type="date"
                              value={formState.applied_at || ''}
                              onChange={(e) => setFormState({ ...formState, applied_at: e.target.value || null })}
                              className="mt-1.5 h-8.5 text-xs font-medium"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold text-foreground">Tanggal Approved</Label>
                            <Input
                              type="date"
                              value={formState.approved_at || ''}
                              onChange={(e) => setFormState({ ...formState, approved_at: e.target.value || null })}
                              className="mt-1.5 h-8.5 text-xs font-medium"
                            />
                          </div>

                          <div className="col-span-2">
                            <Label className="text-[10px] font-bold text-foreground">Tanggal Renewal (Perpanjangan)</Label>
                            <Input
                              type="date"
                              value={formState.renewal_at || ''}
                              onChange={(e) => setFormState({ ...formState, renewal_at: e.target.value || null })}
                              className="mt-1.5 h-8.5 text-xs font-medium"
                            />
                          </div>

                          <div className="col-span-2">
                            <Label className="text-[10px] font-bold text-foreground">Catatan Pendukung / Token</Label>
                            <Textarea
                              value={formState.notes}
                              placeholder="Simpan token verifikasi atau catatan instruksi khusus perpanjangan akun di sini."
                              onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                              className="mt-1.5 min-h-[55px] text-xs font-medium leading-relaxed"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN (Desktop 5 cols) - Inline AI Integration & Actions (Render only on non-gateway platform cards) */}
              <div className={cn(isGateway ? "md:col-span-12 flex justify-end" : "md:col-span-5 flex flex-col justify-between", "space-y-4")}>
                
                {/* Tanya AI Inline Integration Panel (Only for non-gateway platforms) */}
                {!isGateway && (
                  <div className="space-y-3 flex-1">
                    {!inlineAiResponses[platformKey] ? (
                      <div className="flex flex-col gap-3.5 bg-accent-soft/10 rounded-xl p-4 border border-accent/15">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-accent animate-pulse shrink-0" />
                            Butuh Saran Registrasi Tambahan?
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-normal">
                            AI Copilot dapat menyusun tips taktis, kesiapan token, dan strategi lolos verifikasi secara instan.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerInlineAi(platformKey);
                          }}
                          className="w-fit h-8.5 text-xs font-bold bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 shadow-sm"
                          disabled={inlineAiLoading[platformKey]}
                        >
                          {inlineAiLoading[platformKey] ? (
                            <>
                              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                              Loading…
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-1.5 h-3 w-3" />
                              Tanya AI Copilot
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      // Loaded Inline AI Guide
                      <div className="rounded-xl border border-accent/25 bg-accent-soft/5 p-4 space-y-3.5 animate-slide-up">
                        <div className="flex items-center justify-between border-b border-accent/15 pb-2">
                          <span className="text-xs font-bold text-accent flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                            Rekomendasi Registrasi AI
                          </span>
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 font-extrabold border-emerald-500/20 dark:bg-emerald-500/20">
                            {inlineAiResponses[platformKey]?.confidence}% Confidence
                          </Badge>
                        </div>

                        <div className="space-y-2 text-xs">
                          <p className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Tips Taktis AI:</p>
                          <ul className="space-y-2 list-none pl-0">
                            {inlineAiResponses[platformKey]?.checklist.map((tip: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-muted-foreground leading-relaxed">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Warning Box */}
                        <div className="rounded-lg border border-dashed border-red-500/30 bg-red-500/[0.01] p-3 text-[10px] leading-relaxed text-red-600 dark:text-red-400">
                          <span className="font-bold uppercase tracking-wider block mb-1">⚠️ Perhatian Khusus:</span>
                          {inlineAiResponses[platformKey]?.warning}
                        </div>

                        {/* Human Review Gate checkbox inside the card */}
                        <div className="border-t border-accent/10 pt-3 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`human-review-gate-${platformKey}`}
                            checked={!!inlineHumanReviewChecked[platformKey]}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setInlineHumanReviewChecked(prev => ({ ...prev, [platformKey]: val }));
                            }}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-accent focus:ring-accent cursor-pointer"
                          />
                          <Label 
                            htmlFor={`human-review-gate-${platformKey}`} 
                            className="text-[10px] font-bold text-foreground cursor-pointer select-none"
                          >
                            Saya mengonfirmasi telah membaca panduan ini dan melakukan verifikasi manual
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Controls Footer buttons */}
                <div className="pt-4 border-t border-border/40 flex items-center justify-end gap-2 w-full">
                  {!isEditing ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(platformKey);
                      }}
                      className={cn("h-8.5 text-xs font-bold border-border shadow-sm", isGateway ? "w-auto" : "w-full sm:w-auto")}
                    >
                      <Edit2 className="mr-1.5 h-3 w-3 text-accent" /> Edit PIC & Status
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPlatform(null);
                        }}
                        className="h-8.5 text-xs font-bold"
                        disabled={upsertMutation.isPending}
                      >
                        <X className="mr-1 h-3 w-3" /> Batal
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSave();
                        }}
                        className="h-8.5 text-xs font-bold bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
                        disabled={upsertMutation.isPending}
                      >
                        {upsertMutation.isPending ? (
                          <>
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                            Menyimpan…
                          </>
                        ) : (
                          <>
                            <Save className="mr-1.5 h-3.5 w-3.5" /> Simpan Perubahan
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Always-visible Card Footer: URL link & toggler */}
        <div className="mt-4 pt-3.5 border-t border-border/30 flex items-center justify-between gap-3">
          <a 
            href={platform.registration.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-semibold text-accent hover:text-accent/85 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Situs Resmi {platform.name}
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(platformKey);
            }}
            className="h-7 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? 'Sembunyikan detail' : 'Tampilkan detail'}
          </Button>
        </div>
      </Card>
    );
  };

  if (isMembershipLoading || (!!organizationId && isPlatformsLoading)) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground animate-pulse">Memuat data resource tracker…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 overflow-x-hidden px-4 md:px-0 w-full">
      
      {/* 1. Glassmorphic Hero Banner */}
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent-soft/60 via-background to-background p-6 shadow-card md:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-accent/25 to-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit border-accent/30 bg-accent/15 text-accent hover:bg-accent/20">Resource Access Tracker</Badge>
            <h1 className="text-3xl font-semibold tracking-tight">Resource Access Tracker</h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Pantau pendaftaran, penanggung jawab, serta tanggal kedaluwarsa platform nonprofit Anda agar ekosistem digital tetap terjaga.
            </p>
          </div>
          
          {/* Header Score Circular Meter */}
          <div className="flex shrink-0 items-center gap-4 rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-elegant">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Status Integrasi</p>
              <p className="text-lg font-bold text-foreground">
                {stats.approved} dari {stats.total} Approved
              </p>
              <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full bg-gradient-to-r from-accent to-[#155F66] transition-all duration-500" 
                  style={{ width: `${(stats.approved / stats.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Interactive Search & Filter Bar Section */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            Saring & Cari Platform
          </h2>
        </div>

        <div className="space-y-4 rounded-2xl border bg-card/50 p-5 shadow-sm backdrop-blur-sm">
          {/* Search input bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari platform..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 pr-8 text-xs font-medium h-9"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Clear Filters CTA */}
            {(searchText || gateway !== 'all' || pricing !== 'all' || category !== 'all' || sort !== 'priority') && (
              <Button
                variant="ghost"
                onClick={handleClearAllFilters}
                className="h-9 text-xs font-bold text-red-500 hover:bg-red-500/10 hover:text-red-600 shrink-0"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Hapus Semua Filter
              </Button>
            )}
          </div>

          {/* Filters Grid with custom horizontal scrolling rows */}
          <div className="space-y-4 pt-1.5">
            {/* Line 1: Filter Gateway */}
            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:w-20 shrink-0">Gateway:</span>
              <div className="relative w-full overflow-hidden">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar select-none scroll-smooth -mx-4 px-4 md:mx-0 md:px-0">
                  {GATEWAY_FILTERS.map((f) => {
                    const isActive = gateway === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setGateway(f.id)}
                        className={cn(
                          "whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold transition-all border shrink-0",
                          isActive 
                            ? "bg-accent text-accent-foreground border-accent shadow-sm" 
                            : "bg-background text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground"
                        )}
                      >
                        {f.id === 'all' ? 'Semua' : f.label}
                      </button>
                    );
                  })}
                </div>
                <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden" />
              </div>
            </div>

            {/* Line 2: Filter Pricing */}
            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4 border-t border-border/30 pt-3 md:pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:w-20 shrink-0">Harga:</span>
              <div className="relative w-full overflow-hidden">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar select-none scroll-smooth -mx-4 px-4 md:mx-0 md:px-0">
                  {PRICING_FILTERS.map((f) => {
                    const isActive = pricing === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setPricing(f.id)}
                        className={cn(
                          "whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold transition-all border shrink-0",
                          isActive 
                            ? "bg-accent text-accent-foreground border-accent shadow-sm" 
                            : "bg-background text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground"
                        )}
                      >
                        {f.id === 'all' ? 'Semua' : f.label}
                      </button>
                    );
                  })}
                </div>
                <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden" />
              </div>
            </div>

            {/* Line 3: Filter Category */}
            <div className="flex flex-col gap-1.5 md:flex-row md:items-start md:gap-4 border-t border-border/30 pt-3 md:pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:w-20 shrink-0 md:mt-1.5">Kategori:</span>
              <div className="relative w-full overflow-hidden">
                <div className="flex md:flex-wrap items-center md:items-start gap-2 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 no-scrollbar select-none scroll-smooth -mx-4 px-4 md:mx-0 md:px-0">
                  {CATEGORY_FILTERS.map((f) => {
                    const isActive = category === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setCategory(f.id)}
                        className={cn(
                          "whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold transition-all border shrink-0",
                          isActive 
                            ? "bg-accent text-accent-foreground border-accent shadow-sm" 
                            : "bg-background text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground"
                        )}
                      >
                        {f.id === 'all' ? 'Semua' : f.label}
                      </button>
                    );
                  })}
                </div>
                <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden" />
              </div>
            </div>

            {/* Line 4: Sort Options */}
            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4 border-t border-border/30 pt-3 md:pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:w-20 shrink-0">Urutkan:</span>
              <div className="relative w-full overflow-hidden">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar select-none scroll-smooth -mx-4 px-4 md:mx-0 md:px-0">
                  {SORT_OPTIONS.map((f) => {
                    const isActive = sort === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setSort(f.id)}
                        className={cn(
                          "whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold transition-all border shrink-0",
                          isActive 
                            ? "bg-accent text-accent-foreground border-accent shadow-sm" 
                            : "bg-background text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground"
                        )}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
                <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2b. PINNED GATEWAYS SECTION */}
      <section className="space-y-4">
        <div className="space-y-1 pb-2 border-b border-border/30">
          <h2 className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <span className="text-amber-500">⚠️</span> Wajib Daftar Dulu — Gateway Verifikasi
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Daftarkan organisasi ke kedua platform ini sebelum mengklaim diskon di platform lainnya.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {gatewayPlatforms.map((platform) => renderPlatformCard(platform, true))}
        </div>
      </section>

      {/* 3. Catalog Platform List */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between border-b border-border/30 pb-2">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Katalog Platform Non-profit
          </h2>
          <span className="text-xs font-semibold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/60">
            Menampilkan {filteredPlatforms.length} dari {PLATFORMS.filter(p => !p.category.includes('gateway')).length} platform
          </span>
        </div>

        {filteredPlatforms.length === 0 ? (
          /* EMPTY STATE */
          <Card className="border border-dashed border-border p-10 text-center rounded-2xl bg-card/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Ban className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Tidak ada platform yang cocok dengan filter ini.</h3>
            </div>
            <Button
              onClick={handleClearAllFilters}
              size="sm"
              className="mt-2 bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
            >
              Hapus Semua Filter
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredPlatforms.map((platform) => renderPlatformCard(platform, false))}
          </div>
        )}
      </section>

      {/* 4. Google Ads Grant Sub-Section (renders only when google is approved) */}
      {googleIsApproved && (
        <Card className="border-emerald-500/20 bg-emerald-500/[0.01] p-5 shadow-card relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-1.5 bg-emerald-500" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Google Ads Grant sub-tracker</Badge>
                <Badge variant="outline" className="border-accent text-accent text-[10px]">Aktif</Badge>
              </div>
              <h3 className="text-lg font-bold tracking-tight">Google Ads Grant (GAG) Dashboard</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Google memberikan hibah biaya promosi penelusuran (search ads) senilai US$10.000 per bulan. Anda harus mematuhi kebijakan (seperti minimal CTR 5%) agar akun tidak terkena suspensi.
              </p>
              
              {/* Critical Alert Banner */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-800 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                <div>
                  <span className="font-bold">Perhatian:</span> GAG membutuhkan proses aktivasi terpisah di Google Ads Portal setelah pengajuan Google for Nonprofits Anda disetujui.
                </div>
              </div>
            </div>

            {/* Live Interactive Tracker Card */}
            <div className="rounded-xl border bg-card p-4 shadow-sm w-full lg:w-96 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold">Status Aktivasi GAG</span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold", googleItem.gag_activated ? "text-emerald-500" : "text-muted-foreground")}>
                    {googleItem.gag_activated ? 'AKTIF' : 'BELUM AKTIF'}
                  </span>
                  <Switch
                    checked={googleItem.gag_activated}
                    onCheckedChange={(checked) => handleSaveGagOnly(googleItem, googleItem.gag_monthly_spend_usd, googleItem.gag_campaigns_count, checked)}
                  />
                </div>
              </div>

              {googleItem.gag_activated && (
                <div className="space-y-4 animate-fade-in">
                  {/* Monthly Spend Meter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-muted-foreground">Pengeluaran Bulanan</span>
                      <span className="font-bold text-foreground">
                        ${googleItem.gag_monthly_spend_usd.toLocaleString('id-ID')} / $10.000
                      </span>
                    </div>
                    
                    {/* Visual Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted border border-border">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          (googleItem.gag_monthly_spend_usd / 10000) > 0.8 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min((googleItem.gag_monthly_spend_usd / 10000) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Kredit terpakai: {Math.round((googleItem.gag_monthly_spend_usd / 10000) * 100)}% dari batas limit bulanan.
                    </p>
                  </div>

                  {/* Inline edit forms for Spend & Campaigns */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-[10px] font-bold">Aktual Belanja ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10000"
                        value={googleItem.gag_monthly_spend_usd || ''}
                        onChange={(e) => {
                          const val = Math.min(Number(e.target.value) || 0, 10000);
                          handleSaveGagOnly(googleItem, val, googleItem.gag_campaigns_count, googleItem.gag_activated);
                        }}
                        className="h-8.5 text-xs font-bold mt-1.5"
                        placeholder="Spend USD"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold">Kampanye Aktif</Label>
                      <Input
                        type="number"
                        min="0"
                        value={googleItem.gag_campaigns_count || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          handleSaveGagOnly(googleItem, googleItem.gag_monthly_spend_usd, val, googleItem.gag_activated);
                        }}
                        className="h-8.5 text-xs font-bold mt-1.5"
                        placeholder="Jumlah ad campaign"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 5. Renewal Calendar Section (Dynamic Timeline) */}
      <Card className="p-5 shadow-card border-border bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold tracking-tight">Kalender & Linimasa Renewal</h2>
        </div>

        {renewalItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <h3 className="mt-3 font-semibold text-sm">Belum ada linimasa renewal</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Tanggal perpanjangan akun akan tampil di sini secara urut setelah status platform diubah ke 'Approved' dan diisi Tanggal Renewal-nya.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Urutan jadwal pembaruan platform terdekat untuk memandu tim Anda:</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {renewalItems.map((item) => {
                const isUrgent = item.countdown && item.countdown.days < 30;
                const isWarning = item.countdown && item.countdown.days >= 30 && item.countdown.days < 60;

                return (
                  <div 
                    key={item.key} 
                    className={cn(
                      "rounded-xl border p-4 flex flex-col justify-between shadow-sm bg-card transition-all duration-300 hover:shadow-elegant hover:scale-[1.01]",
                      isUrgent ? "border-red-500/25 bg-red-500/[0.01]" : isWarning ? "border-amber-500/25 bg-amber-500/[0.01]" : "border-border"
                    )}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-xs text-foreground leading-snug">{item.displayName}</span>
                        {item.countdown && (
                          <Badge variant="outline" className={cn("text-[9px] font-bold border px-1.5 py-0", item.countdown.color)}>
                            {item.countdown.text}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Renewal Date: <span className="font-bold text-foreground">{new Date(item.renewalDate!).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        Platform Aktif
                      </span>
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => handleStartEdit(item.key)}
                        className="p-0 h-auto text-[10px] text-accent font-bold hover:underline"
                      >
                        Edit Tanggal
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* 6. Context-Specific AI Assistant Copilot Panel */}
      <Card id="ai-copilot-section" className="border-accent-soft/80 bg-accent-soft/20 p-5 shadow-card relative overflow-hidden w-full">
        <div className="absolute top-0 right-0 h-16 w-16 bg-accent-soft text-accent/15 -mr-4 -mt-4 transform rotate-12 pointer-events-none">
          <Sparkles className="h-16 w-16" />
        </div>
        <div className="flex flex-col md:flex-row gap-5">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent animate-pulse" />
              <Badge className="bg-accent/15 text-accent border border-accent/20">Impactory AI Chat</Badge>
            </div>
            <h3 className="text-lg font-bold tracking-tight font-sans">🤖 Impactory AI</h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
              Asisten Registrasi Platform
            </p>
            
            {/* Platform Selection & Reset Button */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <select
                value={aiSelectedPlatform}
                onChange={(e) => {
                  const pId = e.target.value;
                  setAiSelectedPlatform(pId);
                  void startPlatformChat(pId);
                }}
                className="rounded-md border bg-background px-3 py-1 text-xs font-semibold h-8 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                onClick={() => void startPlatformChat(aiSelectedPlatform)}
                className="h-8 text-xs font-bold bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
                disabled={chatLoading}
              >
                {chatLoading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Memuat…
                  </>
                ) : (
                  <>
                    <RotateCw className="mr-1 h-3 w-3" />
                    Reset & Mulai Ulang
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Interactive Chat Pane */}
          <div className="flex flex-col border rounded-xl bg-card shadow-sm w-full md:w-[480px] h-[600px] overflow-hidden">
            {/* Chat Messages scroll area */}
            <div 
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col scroll-smooth"
            >
              {(() => {
                const msgs = chatsByPlatform[aiSelectedPlatform] || [];
                const visibleMsgs = msgs.filter(m => m.role !== 'system');
                
                if (visibleMsgs.length === 0) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground gap-2">
                      <Sparkles className="h-8 w-8 text-accent animate-pulse" />
                      <p className="text-xs font-bold">Belum ada percakapan</p>
                      <p className="text-[11px] leading-relaxed max-w-xs">
                        Klik tombol di platform card atau tombol di atas untuk memulai asisten registrasi pintar.
                      </p>
                    </div>
                  );
                }

                return visibleMsgs.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div 
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[85%] space-y-1",
                        isUser ? "self-end items-end" : "self-start items-start"
                      )}
                    >
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {isUser ? 'Anda' : '🤖 Impactory AI'}
                      </span>
                      <div 
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line shadow-sm",
                          isUser 
                            ? "bg-accent text-accent-foreground rounded-tr-none" 
                            : "bg-muted text-foreground rounded-tl-none border"
                        )}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-muted-foreground/75 px-1">
                        {msg.timestamp}
                      </span>
                    </div>
                  );
                });
              })()}

              {chatLoading && (
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] bg-muted/35 rounded-full px-3 py-1.5 w-fit animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin text-accent" />
                  <span>Impactory AI sedang mengetik...</span>
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="p-3 border-t bg-muted/10 flex items-center gap-2 shrink-0">
              <Textarea
                rows={1}
                value={chatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tulis pesan follow-up..."
                className="resize-none min-h-[40px] max-h-[80px] text-xs font-medium focus-visible:ring-accent py-2.5 px-3 flex-1"
                disabled={chatLoading}
              />
              <Button
                type="button"
                size="icon"
                onClick={handleSendCustomMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="h-10 w-10 bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 shadow-sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 7. Common Mistakes Collapsible Card (Accordions style) */}
      <Card className="border border-dashed border-border bg-card">
        <button
          type="button"
          onClick={() => setExpandedMistakes(!expandedMistakes)}
          className="flex w-full items-center justify-between p-5 text-left focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold tracking-tight">Kekeliruan Umum (Common Mistakes to Avoid)</h2>
          </div>
          {expandedMistakes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expandedMistakes && (
          <CardContent className="p-5 pt-0 border-t border-dashed border-border grid gap-4 sm:grid-cols-2 animate-fade-in">
            <div className="rounded-xl border bg-muted/10 p-4 space-y-2">
              <h3 className="text-xs font-bold text-foreground leading-normal flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Jangan mendaftar 5 platform di hari yang sama
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pendaftaran Canva, Google, dan Microsoft membutuhkan **Validation Token dari TechSoup**. Dapatkan persetujuan dari TechSoup terlebih dahulu sebelum mendaftar platform lainnya.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/10 p-4 space-y-2">
              <h3 className="text-xs font-bold text-foreground leading-normal flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Setiap platform harus punya owner / PIC jelas
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Platform yang tidak memiliki owner rawan mati diam-diam karena melewatkan verifikasi tahunan atau lupa memantau penggunaan limit kredit seperti hibah Azure.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/10 p-4 space-y-2">
              <h3 className="text-xs font-bold text-foreground leading-normal flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Catat renewal calendar sejak hari pertama disetujui
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Banyak software gratis membatasi akses jika verifikasi legalitas tahunan terlewat. Catat tanggal perpanjangan di linimasa tracker ini sesaat setelah approved.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/10 p-4 space-y-2">
              <h3 className="text-xs font-bold text-foreground leading-normal flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Hindari email pribadi pendiri untuk Google Nonprofits
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gunakan email berdomain organisasi resmi (contoh: `admin@organisasi.or.id`). Akun Google Nonprofits yang terkait dengan Gmail pribadi pendiri sulit diserahkan ke penerus tim IT.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 8. Bottom Navigation Area */}
      <Card className="flex flex-col gap-3 p-5 shadow-card md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h2 className="text-lg font-bold leading-snug">Hubungkan ke Workflow Pertumbuhan Lainnya</h2>
          <p className="text-xs text-muted-foreground">Resource Access Anda siap menjadi fondasi mesin pertumbuhan program sosial organisasi.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="h-9 border-border">
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 border-border">
            <Link to="/dashboard/readiness">Cek Readiness Scorecard</Link>
          </Button>
          <Button asChild size="sm" className="h-9 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/dashboard/impactory-library">Buka Impact Library</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
