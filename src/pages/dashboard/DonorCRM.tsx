import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Plus,
  ArrowRight,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Users,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  ExternalLink,
  Edit,
  ChevronRight,
  User,
  Heart,
  Loader2,
  Check,
  Clipboard,
  X,
  FileText,
  MapPin,
  Tag,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Core Type Definitions for Donor CRM
interface Donor {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  city: string | null;
  source: 'campaign' | 'referral' | 'organic' | 'event' | 'corporate' | 'other';
  campaign_source: string | null;
  journey_stage: 'awareness' | 'interest' | 'trust' | 'donation' | 'thank_you' | 'impact_update' | 'repeat_donation';
  first_donation_date: string | null;
  total_cumulative: number;
  issue_interest: string[];
  followup_status: 'not_contacted' | 'contacted' | 'responded' | 'no_response';
  last_contact_date: string | null;
  next_action: string | null;
  next_action_due: string | null;
  donor_type: 'one_time' | 'recurring' | 'corporate';
  recurring_amount: number | null;
  recurring_frequency: 'monthly' | 'quarterly' | 'yearly' | null;
  tags: string[];
  notes: string | null;
  is_at_risk: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Donation {
  id: string;
  organization_id: string;
  donor_id: string;
  campaign_name: string | null;
  amount: number;
  donation_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at?: string;
}

interface DonorFollowup {
  id: string;
  organization_id: string;
  donor_id: string;
  contact_date: string;
  channel: 'whatsapp' | 'email' | 'phone' | 'meeting' | 'other';
  summary: string | null;
  outcome: string | null;
  next_action: string | null;
  pic_user_id: string | null;
  created_at?: string;
}

// Config constants for Journey Stages
const STAGES = [
  { key: 'awareness', label: 'Awareness', tip: 'Kirim konten edukasi', bg: 'bg-slate-50 border-slate-200 text-slate-700', iconColor: 'text-slate-500' },
  { key: 'interest', label: 'Interest', tip: 'Kirim newsletter', bg: 'bg-blue-50 border-blue-200 text-blue-700', iconColor: 'text-blue-500' },
  { key: 'trust', label: 'Trust', tip: 'Kirim bukti impact', bg: 'bg-purple-50 border-purple-200 text-purple-700', iconColor: 'text-purple-500' },
  { key: 'donation', label: 'Donation', tip: 'Campaign appeal + urgency', bg: 'bg-amber-50 border-amber-200 text-amber-700', iconColor: 'text-amber-500' },
  { key: 'thank_you', label: 'Thank You', tip: 'Follow-up dalam 24 jam', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', iconColor: 'text-emerald-500' },
  { key: 'impact_update', label: 'Impact Update', tip: 'Laporan bulanan', bg: 'bg-indigo-50 border-indigo-200 text-indigo-700', iconColor: 'text-indigo-500' },
  { key: 'repeat_donation', label: 'Repeat Donation', tip: 'Campaign baru + anniversary', bg: 'bg-pink-50 border-pink-200 text-pink-700', iconColor: 'text-pink-500' },
];

const STAGE_LABELS: Record<string, string> = {
  awareness: 'Awareness',
  interest: 'Interest',
  trust: 'Trust',
  donation: 'Donation (Active Appeal)',
  thank_you: 'Thank You Sent',
  impact_update: 'Impact Updated',
  repeat_donation: 'Repeat Donor',
};

const FOLLOWUP_COLORS: Record<string, string> = {
  not_contacted: 'bg-slate-100 text-slate-800 border-slate-300',
  contacted: 'bg-blue-100 text-blue-800 border-blue-300',
  responded: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  no_response: 'bg-red-100 text-red-800 border-red-300',
};

const FOLLOWUP_LABELS: Record<string, string> = {
  not_contacted: 'Belum Dihubungi',
  contacted: 'Sudah Dihubungi',
  responded: 'Ada Respon',
  no_response: 'Tidak Merespon',
};

export default function DonorCRM() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('semua');

  // Modal / Sheet States
  const [selectedDonorId, setSelectedDonorId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Custom Transaction Forms
  const [isAddDonationOpen, setIsAddDonationOpen] = useState(false);
  const [isAddFollowupOpen, setIsAddFollowupOpen] = useState(false);
  const [donationForm, setDonationForm] = useState({ amount: '', campaign: '', method: '', notes: '', date: new Date().toISOString().split('T')[0] });
  const [followupForm, setFollowupForm] = useState({ channel: 'whatsapp', summary: '', outcome: '', next_action: '', next_due: '', date: new Date().toISOString().split('T')[0] });

  // List search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterFollowup, setFilterFollowup] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // New Donor Form state
  const [newDonor, setNewDonor] = useState({
    name: '', email: '', whatsapp: '', city: '',
    source: 'campaign', campaign_source: '', journey_stage: 'awareness',
    donor_type: 'one_time', recurring_amount: '', recurring_frequency: '',
    issue_interest: '', tags: '', notes: '',
    next_action: '', next_action_due: ''
  });

  // 1. Fetch organization context
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
      return membership[0]?.organization_id;
    }
    return (membership as any)?.organization_id;
  }, [membership]);

  // 2. Fetch all donors
  const { data: donors, isLoading: isDonorsLoading, refetch: refetchDonors } = useQuery({
    queryKey: ['donors', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from('donors')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Donor[];
    },
    enabled: !!organizationId,
  });

  // 3. Fetch active donations for selected donor
  const { data: donations, refetch: refetchDonations } = useQuery({
    queryKey: ['donations', selectedDonorId],
    queryFn: async () => {
      if (!selectedDonorId) return [];
      const { data, error } = await (supabase as any)
        .from('donations')
        .select('*')
        .eq('donor_id', selectedDonorId)
        .order('donation_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Donation[];
    },
    enabled: !!selectedDonorId,
  });

  // 4. Fetch followups for selected donor
  const { data: followups, refetch: refetchFollowups } = useQuery({
    queryKey: ['donor_followups', selectedDonorId],
    queryFn: async () => {
      if (!selectedDonorId) return [];
      const { data, error } = await (supabase as any)
        .from('donor_followups')
        .select('*')
        .eq('donor_id', selectedDonorId)
        .order('contact_date', { ascending: false });
      if (error) throw error;
      return (data || []) as DonorFollowup[];
    },
    enabled: !!selectedDonorId,
  });

  // MUTATIONS

  // Create Donor
  const addDonorMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!organizationId) throw new Error('No organization context');
      const { error } = await (supabase as any)
        .from('donors')
        .insert({
          organization_id: organizationId,
          ...payload,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Donor baru berhasil didaftarkan');
      setIsAddModalOpen(false);
      void refetchDonors();
      // Reset form
      setNewDonor({
        name: '', email: '', whatsapp: '', city: '',
        source: 'campaign', campaign_source: '', journey_stage: 'awareness',
        donor_type: 'one_time', recurring_amount: '', recurring_frequency: '',
        issue_interest: '', tags: '', notes: '',
        next_action: '', next_action_due: ''
      });
    },
    onError: (err: any) => {
      toast.error(`Gagal mendaftar donor: ${err.message}`);
    }
  });

  // Update Donor Stage or fields
  const updateDonorMutation = useMutation({
    mutationFn: async (payload: { id: string; [key: string]: any }) => {
      const { id, ...fields } = payload;
      const { error } = await (supabase as any)
        .from('donors')
        .update(fields)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void refetchDonors();
    },
    onError: (err: any) => {
      toast.error(`Gagal memperbarui data donor: ${err.message}`);
    }
  });

  // Add Donation & Update Cumulative total
  const addDonationMutation = useMutation({
    mutationFn: async (payload: { donor: Donor; amount: number; campaign: string; method: string; notes: string; date: string }) => {
      if (!organizationId) throw new Error('No organization context');
      
      // 1. Insert Donation
      const { error: donationError } = await (supabase as any)
        .from('donations')
        .insert({
          organization_id: organizationId,
          donor_id: payload.donor.id,
          amount: payload.amount,
          campaign_name: payload.campaign || null,
          payment_method: payload.method || null,
          notes: payload.notes || null,
          donation_date: payload.date,
        });
      if (donationError) throw donationError;

      // 2. Recalculate Donor totals
      const currentCumulative = Number(payload.donor.total_cumulative) + payload.amount;
      const isFirstDonation = !payload.donor.first_donation_date;
      
      const donorFields: any = {
        total_cumulative: currentCumulative,
        is_at_risk: false, // Reset at-risk status since they just donated
      };
      if (isFirstDonation) {
        donorFields.first_donation_date = payload.date;
      }

      const { error: donorError } = await (supabase as any)
        .from('donors')
        .update(donorFields)
        .eq('id', payload.donor.id);
        
      if (donorError) throw donorError;
    },
    onSuccess: () => {
      toast.success('Catatan donasi berhasil ditambahkan');
      setIsAddDonationOpen(false);
      setDonationForm({ amount: '', campaign: '', method: '', notes: '', date: new Date().toISOString().split('T')[0] });
      void refetchDonors();
      void refetchDonations();
    },
    onError: (err: any) => {
      toast.error(`Gagal mencatat donasi: ${err.message}`);
    }
  });

  // Add Followup Note
  const addFollowupMutation = useMutation({
    mutationFn: async (payload: { donorId: string; channel: string; summary: string; outcome: string; nextAction: string; nextDue: string; date: string }) => {
      if (!organizationId) throw new Error('No organization context');
      
      // 1. Insert follow-up log
      const { error: followupError } = await (supabase as any)
        .from('donor_followups')
        .insert({
          organization_id: organizationId,
          donor_id: payload.donorId,
          contact_date: payload.date,
          channel: payload.channel,
          summary: payload.summary || null,
          outcome: payload.outcome || null,
          next_action: payload.nextAction || null,
          pic_user_id: user?.id || null,
        });
      if (followupError) throw followupError;

      // 2. Update donor master record
      const updateFields: any = {
        last_contact_date: payload.date,
        followup_status: 'contacted',
      };
      if (payload.nextAction) {
        updateFields.next_action = payload.nextAction;
      }
      if (payload.nextDue) {
        updateFields.next_action_due = payload.nextDue;
      }

      const { error: donorError } = await (supabase as any)
        .from('donors')
        .update(updateFields)
        .eq('id', payload.donorId);
        
      if (donorError) throw donorError;
    },
    onSuccess: () => {
      toast.success('Catatan follow-up berhasil disimpan');
      setIsAddFollowupOpen(false);
      setFollowupForm({ channel: 'whatsapp', summary: '', outcome: '', next_action: '', next_due: '', date: new Date().toISOString().split('T')[0] });
      void refetchDonors();
      void refetchFollowups();
    },
    onError: (err: any) => {
      toast.error(`Gagal mencatat follow-up: ${err.message}`);
    }
  });

  // CALCULATED METRICS
  const metrics = useMemo(() => {
    if (!donors) return { total: 0, newThisMonth: 0, active: 0, retentionRate: 0, atRisk: 0 };
    
    const today = new Date();
    const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    let total = donors.length;
    let newThisMonth = 0;
    let active = 0;
    let atRisk = 0;
    
    donors.forEach(d => {
      // New this month check
      if (d.created_at) {
        const createDate = new Date(d.created_at);
        if (createDate >= firstOfCurrentMonth) newThisMonth++;
      }
      
      // Active check (has donation date, and it was less than 6 months ago)
      if (d.first_donation_date) {
        const firstDon = new Date(d.first_donation_date);
        // If last_contact_date or similar is within 6 months, we count as active
        if (firstDon >= sixMonthsAgo && d.total_cumulative > 0) {
          active++;
        }
      }

      // At risk check (6 months inactivity)
      if (d.first_donation_date) {
        const firstDon = new Date(d.first_donation_date);
        if (firstDon < sixMonthsAgo && d.total_cumulative > 0) {
          atRisk++;
        }
      }
    });

    const retentionRate = total === 0 ? 0 : Math.round(((total - atRisk) / total) * 100);

    return { total, newThisMonth, active, retentionRate, atRisk };
  }, [donors]);

  // Selected Donor details lookup
  const selectedDonor = useMemo(() => {
    if (!selectedDonorId || !donors) return null;
    return donors.find(d => d.id === selectedDonorId) || null;
  }, [selectedDonorId, donors]);

  // Search & Filters filtering logic
  const filteredDonors = useMemo(() => {
    if (!donors) return [];
    return donors.filter(d => {
      // 1. Search Query
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || 
        d.name.toLowerCase().includes(q) || 
        (d.email && d.email.toLowerCase().includes(q)) || 
        (d.whatsapp && d.whatsapp.toLowerCase().includes(q));

      // 2. Filters
      const matchStage = filterStage === 'all' || d.journey_stage === filterStage;
      const matchSource = filterSource === 'all' || d.source === filterSource;
      const matchType = filterType === 'all' || d.donor_type === filterType;
      const matchFollowup = filterFollowup === 'all' || d.followup_status === filterFollowup;

      return matchSearch && matchStage && matchSource && matchType && matchFollowup;
    });
  }, [donors, searchQuery, filterStage, filterSource, filterType, filterFollowup]);

  // Pagination slicing
  const paginatedDonors = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredDonors.slice(startIndex, startIndex + pageSize);
  }, [filteredDonors, currentPage]);

  const totalPages = Math.ceil(filteredDonors.length / pageSize) || 1;

  // Kanban Pipeline stages donor arrays
  const kanbanColumns = useMemo(() => {
    const columns: Record<string, Donor[]> = {
      awareness: [], interest: [], trust: [], donation: [],
      thank_you: [], impact_update: [], repeat_donation: []
    };
    if (donors) {
      donors.forEach(d => {
        if (columns[d.journey_stage]) {
          columns[d.journey_stage].push(d);
        }
      });
    }
    return columns;
  }, [donors]);

  // Follow-up Today array
  const followupTodayDonors = useMemo(() => {
    if (!donors) return [];
    const todayStr = new Date().toISOString().split('T')[0];
    return donors
      .filter(d => {
        if (!d.next_action_due) return false;
        // Due today or overdue, and status is not yet fully responded/resolved
        return d.next_action_due <= todayStr && d.followup_status !== 'responded';
      })
      .sort((a, b) => {
        const d1 = a.next_action_due || '';
        const d2 = b.next_action_due || '';
        return d1.localeCompare(d2); // Oldest/Overdue first
      });
  }, [donors]);

  // At-Risk list (Inactivity check > 180 days)
  const atRiskDonors = useMemo(() => {
    if (!donors) return [];
    const halfYearAgo = new Date();
    halfYearAgo.setDate(halfYearAgo.getDate() - 180);
    const dateStr = halfYearAgo.toISOString().split('T')[0];

    return donors.filter(d => {
      // Must have made at least one donation, but first_donation_date or last_contact_date is > 180 days ago
      if (!d.first_donation_date || d.total_cumulative <= 0) return false;
      return d.first_donation_date < dateStr;
    });
  }, [donors]);

  // Triggering quick Stage Move
  const handleMoveStage = (donorId: string, currentStage: string, direction: 'forward' | 'backward') => {
    const stageKeys = STAGES.map(s => s.key);
    const currIndex = stageKeys.indexOf(currentStage);
    let nextIndex = currIndex;
    
    if (direction === 'forward' && currIndex < stageKeys.length - 1) {
      nextIndex = currIndex + 1;
    } else if (direction === 'backward' && currIndex > 0) {
      nextIndex = currIndex - 1;
    }

    if (nextIndex !== currIndex) {
      const targetStage = stageKeys[nextIndex];
      updateDonorMutation.mutate({ id: donorId, journey_stage: targetStage });
      toast.success(`Journey stage diperbarui ke ${STAGE_LABELS[targetStage]}`);
    }
  };

  // Re-engage At-Risk Donor (auto move to 'interest' + set next action)
  const handleReengageAtRisk = (donor: Donor) => {
    updateDonorMutation.mutate({
      id: donor.id,
      journey_stage: 'interest',
      followup_status: 'not_contacted',
      next_action: 'Kirim WhatsApp re-engagement campaign',
      next_action_due: new Date().toISOString().split('T')[0],
    });
    toast.success(`${donor.name} dipindahkan ke stage Interest dengan tindakan follow-up hari ini!`);
  };

  // WA Template Generator
  const generateWaMessage = (donor: Donor) => {
    if (!donor) return '';
    const name = donor.name;
    const stage = donor.journey_stage;

    let text = '';
    if (stage === 'awareness') {
      text = `Halo ${name}, terima kasih telah menunjukkan ketertarikan pada program sosial kami di Impactory. Kami baru saja meluncurkan konten edukasi dampak terbaru. Mari pelajari lebih lanjut di website kami!`;
    } else if (stage === 'interest') {
      text = `Halo ${name}, senang sekali Anda tertarik dengan aktivitas kami. Kami mengundang Anda untuk membaca newsletter bulanan kami untuk melihat perkembangan program pemberdayaan masyarakat kami.`;
    } else if (stage === 'trust') {
      text = `Halo ${name}, terima kasih atas kepercayaan Anda. Berikut adalah ringkasan laporan dampak penyaluran donasi kami sebelumnya. Setiap dukungan Anda sangat berarti bagi para penerima manfaat.`;
    } else if (stage === 'donation') {
      text = `Halo ${name}, kampanye sosial kami membutuhkan dukungan mendesak dari Anda hari ini. Bersama-sama, kita bisa membantu memberikan perubahan nyata bagi masyarakat yang membutuhkan.`;
    } else if (stage === 'thank_you') {
      text = `Halo ${name}, terima kasih banyak atas donasi yang telah Anda berikan. Dukungan Anda telah kami terima dengan baik dan akan segera kami salurkan kepada penerima manfaat.`;
    } else if (stage === 'impact_update') {
      text = `Halo ${name}, kami ingin menyampaikan laporan terbaru mengenai dampak donasi Anda. Program bantuan telah berhasil dilaksanakan dan membantu ratusan penerima manfaat. Terima kasih banyak!`;
    } else {
      text = `Halo ${name}, dedikasi Anda sungguh luar biasa. Kami meluncurkan program sosial baru dan ingin mengundang Anda untuk kembali berkolaborasi menciptakan senyuman baru bagi penerima manfaat.`;
    }
    return text;
  };

  // Quick Copy clipboard
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Pesan disalin ke clipboard');
  };

  // Submitting new donor
  const handleCreateDonor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDonor.name) {
      toast.error('Nama lengkap wajib diisi');
      return;
    }
    
    // Parse interests & tags
    const interestsArray = newDonor.issue_interest ? newDonor.issue_interest.split(',').map(s => s.trim()) : [];
    const tagsArray = newDonor.tags ? newDonor.tags.split(',').map(s => s.trim()) : [];

    const payload = {
      name: newDonor.name,
      email: newDonor.email || null,
      whatsapp: newDonor.whatsapp || null,
      city: newDonor.city || null,
      source: newDonor.source,
      campaign_source: newDonor.campaign_source || null,
      journey_stage: newDonor.journey_stage,
      issue_interest: interestsArray,
      tags: tagsArray,
      notes: newDonor.notes || null,
      donor_type: newDonor.donor_type,
      recurring_amount: newDonor.recurring_amount ? Number(newDonor.recurring_amount) : null,
      recurring_frequency: newDonor.recurring_frequency || null,
      next_action: newDonor.next_action || null,
      next_action_due: newDonor.next_action_due || null,
    };

    addDonorMutation.mutate(payload);
  };

  if (isMembershipLoading || isDonorsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground animate-pulse">Menghubungkan ke basis data donor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      
      {/* 1. Header & Quick Analytics row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Donor CRM Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola donor journey dan rhythm follow-up dari awareness hingga repeat donation secara terpusat.
          </p>
        </div>

        <Button 
          type="button" 
          onClick={() => setIsAddModalOpen(true)}
          className="h-10 text-xs font-bold bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Tambah Donor Baru
        </Button>
      </div>

      {/* Analytics Card Row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4 shadow-sm flex items-center gap-4 border-border bg-card">
          <div className="h-10 w-10 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Donor</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{metrics.total}</p>
          </div>
        </Card>

        <Card className="p-4 shadow-sm flex items-center gap-4 border-border bg-card">
          <div className="h-10 w-10 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Donor Baru (Bln)</p>
            <p className="text-xl font-bold text-foreground mt-0.5">+{metrics.newThisMonth}</p>
          </div>
        </Card>

        <Card className="p-4 shadow-sm flex items-center gap-4 border-border bg-card">
          <div className="h-10 w-10 bg-indigo-500/10 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Donor Aktif</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{metrics.active}</p>
          </div>
        </Card>

        <Card className="p-4 shadow-sm flex items-center gap-4 border-border bg-card">
          <div className="h-10 w-10 bg-purple-500/10 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Retention Rate</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{metrics.retentionRate}%</p>
          </div>
        </Card>

        <Card className="p-4 shadow-sm flex items-center gap-4 border-border bg-card">
          <div className="h-10 w-10 bg-red-500/10 text-red-600 rounded-lg flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">At-Risk Donors</p>
            <p className="text-xl font-bold text-foreground mt-0.5 text-red-500">{metrics.atRisk}</p>
          </div>
        </Card>
      </section>

      {/* 2. Main Tabs System */}
      <Tabs defaultValue="semua" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted border border-border rounded-xl p-1 shrink-0 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="semua" className="text-xs font-semibold rounded-lg">Semua Donor ({filteredDonors.length})</TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs font-semibold rounded-lg">Pipeline Journey</TabsTrigger>
          <TabsTrigger value="followup" className="text-xs font-semibold rounded-lg">Follow-up Hari Ini ({followupTodayDonors.length})</TabsTrigger>
          <TabsTrigger value="at-risk" className="text-xs font-semibold rounded-lg">At-Risk ({atRiskDonors.length})</TabsTrigger>
        </TabsList>

        {/* TAB 1: SEMUA DONOR TABLE VIEW */}
        <TabsContent value="semua" className="space-y-4 outline-none">
          <Card className="border-border bg-card p-4 shadow-sm">
            
            {/* Search & Filter Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cari donor berdasarkan nama, email, atau WhatsApp…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9 h-10 text-xs font-medium border-border"
                />
              </div>

              {/* Filters dropdown row */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterStage}
                  onChange={(e) => { setFilterStage(e.target.value); setCurrentPage(1); }}
                  className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent h-10"
                >
                  <option value="all">Semua Stage</option>
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>

                <select
                  value={filterSource}
                  onChange={(e) => { setFilterSource(e.target.value); setCurrentPage(1); }}
                  className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent h-10"
                >
                  <option value="all">Semua Source</option>
                  <option value="campaign">Campaign</option>
                  <option value="referral">Referral</option>
                  <option value="organic">Organic</option>
                  <option value="event">Event</option>
                  <option value="corporate">Corporate</option>
                  <option value="other">Lainnya</option>
                </select>

                <select
                  value={filterType}
                  onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                  className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent h-10"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="one_time">One-time</option>
                  <option value="recurring">Recurring</option>
                  <option value="corporate">Corporate</option>
                </select>

                <select
                  value={filterFollowup}
                  onChange={(e) => { setFilterFollowup(e.target.value); setCurrentPage(1); }}
                  className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent h-10"
                >
                  <option value="all">Semua Follow-up</option>
                  <option value="not_contacted">Belum Kontak</option>
                  <option value="contacted">Sudah Kontak</option>
                  <option value="responded">Ada Respon</option>
                  <option value="no_response">No Response</option>
                </select>
              </div>
            </div>

            {/* Table layout */}
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="p-3.5">Nama</th>
                    <th className="p-3.5">Kota / Lokasi</th>
                    <th className="p-3.5">Tipe Donor</th>
                    <th className="p-3.5">Stage</th>
                    <th className="p-3.5">Total Donasi</th>
                    <th className="p-3.5">Last Contact</th>
                    <th className="p-3.5">Next Action Due</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDonors.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                        <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                        Belum ada donor terdaftar atau filter tidak cocok.
                      </td>
                    </tr>
                  ) : (
                    paginatedDonors.map(d => (
                      <tr 
                        key={d.id} 
                        onClick={() => setSelectedDonorId(d.id)}
                        className="border-b hover:bg-muted/30 cursor-pointer text-xs transition-colors"
                      >
                        <td className="p-3.5">
                          <div className="font-bold text-foreground">{d.name}</div>
                          <div className="text-[10px] text-muted-foreground">{d.email || d.whatsapp || '-'}</div>
                        </td>
                        <td className="p-3.5 text-muted-foreground font-medium">{d.city || '-'}</td>
                        <td className="p-3.5 capitalize font-semibold">
                          <Badge variant="outline" className="text-[10px]">
                            {d.donor_type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <Badge variant="outline" className={cn("text-[10px] font-bold border", STAGES.find(s => s.key === d.journey_stage)?.bg)}>
                            {STAGE_LABELS[d.journey_stage]}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-bold text-foreground">
                          Rp {Number(d.total_cumulative).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3.5 text-muted-foreground">
                          {d.last_contact_date ? new Date(d.last_contact_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                        </td>
                        <td className="p-3.5">
                          {d.next_action_due ? (
                            <span className={cn("font-medium", d.next_action_due < new Date().toISOString().split('T')[0] ? "text-red-500 font-bold" : "text-muted-foreground")}>
                              {new Date(d.next_action_due).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedDonorId(d.id)}
                            className="h-7 text-[10px] font-bold text-accent"
                          >
                            Detail →
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">
                Showing {filteredDonors.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredDonors.length)} of {filteredDonors.length} donors
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 text-xs font-semibold border-border"
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Prev
                </Button>
                <span className="text-xs font-bold px-3">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-8 text-xs font-semibold border-border"
                >
                  Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

          </Card>
        </TabsContent>

        {/* TAB 2: KANBAN PIPELINE JOURNEY */}
        <TabsContent value="pipeline" className="space-y-4 outline-none">
          <div className="flex overflow-x-auto gap-4 pb-4 select-none">
            {STAGES.map((col) => {
              const list = kanbanColumns[col.key] || [];

              return (
                <div 
                  key={col.key} 
                  className="rounded-xl border bg-muted/20 w-80 shrink-0 p-4 space-y-3 flex flex-col justify-between"
                >
                  <div>
                    {/* Column Header */}
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-foreground uppercase tracking-wider">{col.label}</span>
                      <Badge className="bg-accent/15 text-accent text-[10px] font-bold border border-accent/20">
                        {list.length} donor
                      </Badge>
                    </div>
                    {/* Action Guideline Tip */}
                    <p className="text-[10px] text-muted-foreground italic leading-normal bg-card p-1.5 rounded border mt-2">
                      💡 Tip: <span className="font-semibold text-accent">{col.tip}</span>
                    </p>

                    {/* Donor Cards list */}
                    <div className="mt-4 space-y-2.5 max-h-[50vh] overflow-y-auto">
                      {list.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-center text-[10px] text-muted-foreground/60 bg-card/60">
                          Kolom kosong
                        </div>
                      ) : (
                        list.map(d => (
                          <Card 
                            key={d.id} 
                            onClick={() => setSelectedDonorId(d.id)}
                            className="p-3 cursor-pointer shadow-sm hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-200 bg-card border-border"
                          >
                            <div className="font-bold text-xs leading-normal">{d.name}</div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/60">
                              <span className="font-semibold text-foreground">Rp {Number(d.total_cumulative).toLocaleString('id-ID')}</span>
                              <span>
                                Last: {d.last_contact_date ? new Date(d.last_contact_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Never'}
                              </span>
                            </div>

                            {/* Direct Stage Navigation Controls */}
                            <div className="mt-3 flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleMoveStage(d.id, d.journey_stage, 'backward')}
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleMoveStage(d.id, d.journey_stage, 'forward')}
                              >
                                <ArrowRight className="h-3 w-3 text-accent" />
                              </Button>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 3: FOLLOW-UP HARI INI */}
        <TabsContent value="followup" className="space-y-4 outline-none">
          <Card className="border-border bg-card p-4 shadow-sm">
            <h2 className="text-base font-bold tracking-tight mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              Follow-up Agenda Jatuh Tempo Hari Ini atau Overdue
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Daftar di bawah menunjukkan semua donor dengan tenggat waktu Next Action Due hari ini atau tanggal sebelumnya (Overdue) yang belum berstatus 'Responded'.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {followupTodayDonors.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                  <h3 className="font-semibold text-sm">Semua follow-up selesai!</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Tidak ada agenda jatuh tempo yang perlu dikerjakan saat ini.</p>
                </div>
              ) : (
                followupTodayDonors.map(d => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isOverdue = d.next_action_due && d.next_action_due < todayStr;
                  const messageText = generateWaMessage(d);

                  return (
                    <div 
                      key={d.id} 
                      className={cn(
                        "rounded-xl border p-4 flex flex-col justify-between shadow-sm bg-card transition-shadow hover:shadow-elegant",
                        isOverdue ? "border-red-500/20 bg-red-500/[0.01]" : "border-border"
                      )}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-xs text-foreground leading-snug">{d.name}</span>
                          {d.next_action_due && (
                            <Badge variant="outline" className={cn("text-[9px] font-bold border px-1.5 py-0", isOverdue ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20")}>
                              {isOverdue ? 'Overdue' : 'Hari ini'}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Deadline: <span className="font-bold text-foreground">{d.next_action_due ? new Date(d.next_action_due).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                        </p>

                        <div className="mt-3 rounded-lg border bg-muted/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                          <span className="font-bold text-foreground">Action:</span> {d.next_action || 'Hubungi donor'}
                        </div>
                      </div>

                      {/* WA Quick Actions templates on card */}
                      <div className="mt-4 pt-3 border-t flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                          {d.whatsapp ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleCopyToClipboard(messageText);
                                window.open(`https://wa.me/${d.whatsapp?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(messageText)}`, '_blank');
                              }}
                              className="h-7 text-[10px] font-semibold border-border gap-1"
                            >
                              <MessageSquare className="h-3 w-3 text-emerald-500" /> WhatsApp
                            </Button>
                          ) : (
                            <span className="text-[9px] text-muted-foreground italic">No WhatsApp number</span>
                          )}
                          
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedDonorId(d.id);
                              setIsAddFollowupOpen(true);
                            }}
                            className="h-7 text-[10px] font-bold bg-accent text-accent-foreground hover:bg-accent/90"
                          >
                            Tandai Done
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: AT-RISK */}
        <TabsContent value="at-risk" className="space-y-4 outline-none">
          <Card className="border-border bg-card p-4 shadow-sm">
            <h2 className="text-base font-bold tracking-tight mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Donor Berisiko Churn (Inaktif &gt; 180 hari)
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Auto-flag mendeteksi donor yang pernah berdonasi sebelumnya tetapi tidak melakukan donasi atau respon apa pun dalam 6 bulan terakhir.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {atRiskDonors.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                  <h3 className="font-semibold text-sm">Hebat! Tidak ada donor at-risk</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Semua donor aktif berinteraksi atau donasi di bawah 6 bulan ini.</p>
                </div>
              ) : (
                atRiskDonors.map(d => {
                  // Calculate inactivity months
                  const diffTime = Math.abs(new Date().getTime() - new Date(d.first_donation_date!).getTime());
                  const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.4)) || 1;

                  return (
                    <div 
                      key={d.id} 
                      className="rounded-xl border border-red-500/25 bg-red-500/[0.01] p-4 flex flex-col justify-between shadow-sm bg-card hover:shadow-elegant"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-xs text-foreground leading-snug">{d.name}</span>
                          <Badge variant="outline" className="text-[9px] font-bold border px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/20">
                            {diffMonths} Bulan Inaktif
                          </Badge>
                        </div>
                        
                        <div className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
                          <p>Total Cumulative: <span className="font-bold text-foreground">Rp {Number(d.total_cumulative).toLocaleString('id-ID')}</span></p>
                          <p>Donasi Pertama: <span className="font-medium text-foreground">{d.first_donation_date ? new Date(d.first_donation_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span></p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                        <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Churn Risk
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleReengageAtRisk(d)}
                          className="h-7 text-[10px] font-bold bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                          Re-engage (Move to Interest)
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 3. DONOR DETAIL SHEET (Side Panel Profile) */}
      <Sheet open={!!selectedDonorId} onOpenChange={(open) => { if (!open) setSelectedDonorId(null); }}>
        {selectedDonor && (
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto max-h-screen bg-card border-l border-border animate-slide-left p-6">
            <SheetHeader className="border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <SheetTitle className="text-xl font-bold tracking-tight">{selectedDonor.name}</SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className={cn("text-[9px] font-bold border py-0", STAGES.find(s => s.key === selectedDonor.journey_stage)?.bg)}>
                      {STAGE_LABELS[selectedDonor.journey_stage]}
                    </Badge>
                    <span>|</span>
                    <span className="capitalize">{selectedDonor.donor_type} Donor</span>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="py-6 space-y-6">
              
              {/* WhatsApp Quick Messaging Section */}
              <Card className="p-4 border-accent-soft/80 bg-accent-soft/10">
                <h4 className="text-xs font-bold text-accent flex items-center gap-1.5 mb-2">
                  <MessageSquare className="h-3.5 w-3.5 animate-pulse" />
                  WhatsApp Quick Template (Berbasis Stage)
                </h4>
                <p className="text-[10px] text-muted-foreground leading-normal mb-3">
                  Pesan di bawah otomatis menyesuaikan tahapan journey donor saat ini untuk mempercepat rhythm komunikasi Anda.
                </p>
                <div className="rounded-lg border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground font-medium border-border/80">
                  {generateWaMessage(selectedDonor)}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyToClipboard(generateWaMessage(selectedDonor))}
                    className="h-7 text-[10px] font-semibold border-border gap-1"
                  >
                    Salin Teks
                  </Button>
                  {selectedDonor.whatsapp && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleCopyToClipboard(generateWaMessage(selectedDonor));
                        window.open(`https://wa.me/${selectedDonor.whatsapp?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(generateWaMessage(selectedDonor))}`, '_blank');
                      }}
                      className="h-7 text-[10px] font-bold bg-accent text-accent-foreground hover:bg-accent/90 gap-1"
                    >
                      Buka Chat WA <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </Card>

              {/* Journey Stage selector */}
              <div className="space-y-1.5 border-t pt-4">
                <Label className="text-xs font-bold">Ubah Journey Stage</Label>
                <select
                  value={selectedDonor.journey_stage}
                  onChange={(e) => updateDonorMutation.mutate({ id: selectedDonor.id, journey_stage: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>

              {/* Grid 15 Full fields details */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border bg-muted/20 p-4 text-xs">
                <div>
                  <p className="font-bold text-muted-foreground">Email</p>
                  <p className="mt-1 font-semibold text-foreground truncate">{selectedDonor.email || '-'}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground">WhatsApp / HP</p>
                  <p className="mt-1 font-semibold text-foreground truncate">{selectedDonor.whatsapp || '-'}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground">Kota / Domisili</p>
                  <p className="mt-1 font-semibold text-foreground">{selectedDonor.city || '-'}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground">Source Akuisisi</p>
                  <p className="mt-1 font-semibold text-foreground capitalize">{selectedDonor.source}</p>
                </div>
                {selectedDonor.campaign_source && (
                  <div className="col-span-2 border-t pt-2 border-border/40">
                    <p className="font-bold text-muted-foreground">Campaign Akuisisi</p>
                    <p className="mt-1 font-semibold text-foreground">{selectedDonor.campaign_source}</p>
                  </div>
                )}
                <div className="border-t pt-2 border-border/40">
                  <p className="font-bold text-muted-foreground">First Donation Date</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {selectedDonor.first_donation_date ? new Date(selectedDonor.first_donation_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </p>
                </div>
                <div className="border-t pt-2 border-border/40">
                  <p className="font-bold text-muted-foreground">Cumulative Donasi</p>
                  <p className="mt-1 font-bold text-accent">Rp {Number(selectedDonor.total_cumulative).toLocaleString('id-ID')}</p>
                </div>

                {selectedDonor.donor_type === 'recurring' && (
                  <>
                    <div className="col-span-2 border-t pt-2 border-border/40 grid grid-cols-2 gap-2">
                      <div>
                        <p className="font-bold text-muted-foreground font-semibold">Recurring Amount</p>
                        <p className="mt-0.5 font-bold text-foreground">Rp {Number(selectedDonor.recurring_amount || 0).toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="font-bold text-muted-foreground font-semibold">Frequency</p>
                        <p className="mt-0.5 font-semibold text-foreground capitalize">{selectedDonor.recurring_frequency || '-'}</p>
                      </div>
                    </div>
                  </>
                )}

                <div className="col-span-2 border-t pt-2 border-border/40">
                  <p className="font-bold text-muted-foreground">Minat Isu & Program</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedDonor.issue_interest.length === 0 ? (
                      <span className="text-muted-foreground/60 italic">Belum diset</span>
                    ) : (
                      selectedDonor.issue_interest.map(interest => <Badge key={interest} variant="outline" className="text-[10px]">{interest}</Badge>)
                    )}
                  </div>
                </div>

                <div className="col-span-2 border-t pt-2 border-border/40">
                  <p className="font-bold text-muted-foreground">Tags</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedDonor.tags.length === 0 ? (
                      <span className="text-muted-foreground/60 italic">Belum diset</span>
                    ) : (
                      selectedDonor.tags.map(tag => <Badge key={tag} className="text-[10px] bg-accent/15 text-accent border border-accent/20">{tag}</Badge>)
                    )}
                  </div>
                </div>

                {selectedDonor.notes && (
                  <div className="col-span-2 border-t pt-2 border-border/40">
                    <p className="font-bold text-muted-foreground">Catatan Tambahan</p>
                    <p className="mt-1 leading-relaxed text-muted-foreground italic font-medium">{selectedDonor.notes}</p>
                  </div>
                )}
              </div>

              {/* Transactions Tab sections inside Sidebar details */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-500" /> Riwayat Transaksi Donasi
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddDonationOpen(!isAddDonationOpen)}
                    className="h-7 text-[10px] font-bold border-border"
                  >
                    {isAddDonationOpen ? 'Batal' : '+ Tambah Donasi'}
                  </Button>
                </div>

                {/* Sub donation form */}
                {isAddDonationOpen && (
                  <Card className="p-3 border-border bg-muted/10 space-y-3 animate-slide-down">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <Label className="text-[10px] font-bold">Nominal (Rp)</Label>
                        <Input
                          type="number"
                          value={donationForm.amount}
                          onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
                          className="h-8 text-xs font-bold mt-1"
                          placeholder="Jumlah Rupiah"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold">Nama Kampanye</Label>
                        <Input
                          type="text"
                          value={donationForm.campaign}
                          onChange={(e) => setDonationForm({ ...donationForm, campaign: e.target.value })}
                          className="h-8 text-xs font-medium mt-1"
                          placeholder="Campaign/Program"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold">Metode Pembayaran</Label>
                        <Input
                          type="text"
                          value={donationForm.method}
                          onChange={(e) => setDonationForm({ ...donationForm, method: e.target.value })}
                          className="h-8 text-xs font-medium mt-1"
                          placeholder="Transfer Bank / QRIS"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold">Tanggal Donasi</Label>
                        <Input
                          type="date"
                          value={donationForm.date}
                          onChange={(e) => setDonationForm({ ...donationForm, date: e.target.value })}
                          className="h-8 text-xs font-medium mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[10px] font-bold">Keterangan / Notes</Label>
                        <Input
                          type="text"
                          value={donationForm.notes}
                          onChange={(e) => setDonationForm({ ...donationForm, notes: e.target.value })}
                          className="h-8 text-xs font-medium mt-1"
                          placeholder="Opsional"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!donationForm.amount) {
                            toast.error('Nominal donasi wajib diisi');
                            return;
                          }
                          addDonationMutation.mutate({
                            donor: selectedDonor,
                            amount: Number(donationForm.amount),
                            campaign: donationForm.campaign,
                            method: donationForm.method,
                            notes: donationForm.notes,
                            date: donationForm.date,
                          });
                        }}
                        className="h-7 text-[10px] font-bold bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        Simpan Transaksi
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Donations Timeline list */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {donations && donations.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/60 italic text-center py-4">Belum ada riwayat transaksi donasi.</p>
                  ) : (
                    donations?.map(don => (
                      <div key={don.id} className="rounded-lg border bg-muted/10 p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-foreground">Rp {Number(don.amount).toLocaleString('id-ID')}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{don.campaign_name || 'General Program'} • {don.payment_method || 'Unknown method'}</div>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {new Date(don.donation_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Followups Tab sections inside Sidebar details */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-accent" /> Log Hubungi & Follow-up
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddFollowupOpen(!isAddFollowupOpen)}
                    className="h-7 text-[10px] font-bold border-border"
                  >
                    {isAddFollowupOpen ? 'Batal' : '+ Tambah Log'}
                  </Button>
                </div>

                {/* Sub follow-up form */}
                {isAddFollowupOpen && (
                  <Card className="p-3 border-border bg-muted/10 space-y-3 animate-slide-down">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <Label className="text-[10px] font-bold">Saluran Kontak</Label>
                        <select
                          value={followupForm.channel}
                          onChange={(e) => setFollowupForm({ ...followupForm, channel: e.target.value })}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent h-8"
                        >
                          <option value="whatsapp">WhatsApp</option>
                          <option value="email">Email</option>
                          <option value="phone">Panggilan Telepon</option>
                          <option value="meeting">Pertemuan</option>
                          <option value="other">Lainnya</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold">Tanggal Hubungi</Label>
                        <Input
                          type="date"
                          value={followupForm.date}
                          onChange={(e) => setFollowupForm({ ...followupForm, date: e.target.value })}
                          className="h-8 text-xs font-medium mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[10px] font-bold">Rangkuman / Catatan Diskusi</Label>
                        <Input
                          type="text"
                          value={followupForm.summary}
                          onChange={(e) => setFollowupForm({ ...followupForm, summary: e.target.value })}
                          className="h-8 text-xs font-medium mt-1"
                          placeholder="Bahas laporan impact atau komitmen donasi..."
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[10px] font-bold">Hasil Interaksi (Outcome)</Label>
                        <Input
                          type="text"
                          value={followupForm.outcome}
                          onChange={(e) => setFollowupForm({ ...followupForm, outcome: e.target.value })}
                          className="h-8 text-xs font-medium mt-1"
                          placeholder="Tertarik berdonasi rutin, belum membalas, dll."
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold">Langkah Berikutnya (Next Action)</Label>
                        <Input
                          type="text"
                          value={followupForm.next_action}
                          onChange={(e) => setFollowupForm({ ...followupForm, next_action: e.target.value })}
                          className="h-8 text-xs font-medium mt-1"
                          placeholder="Kirim proposal baru / tagih komitmen"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold">Jatuh Tempo Next Action</Label>
                        <Input
                          type="date"
                          value={followupForm.next_due}
                          onChange={(e) => setFollowupForm({ ...followupForm, next_due: e.target.value })}
                          className="h-8 text-xs font-medium mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!followupForm.summary) {
                            toast.error('Rangkuman diskusi wajib diisi');
                            return;
                          }
                          addFollowupMutation.mutate({
                            donorId: selectedDonor.id,
                            channel: followupForm.channel as any,
                            summary: followupForm.summary,
                            outcome: followupForm.outcome,
                            nextAction: followupForm.next_action,
                            nextDue: followupForm.next_due,
                            date: followupForm.date,
                          });
                        }}
                        className="h-7 text-[10px] font-bold bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        Simpan Log Kontak
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Followups timeline logs */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {followups && followups.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/60 italic text-center py-4">Belum ada catatan aktivitas komunikasi.</p>
                  ) : (
                    followups?.map(fol => (
                      <div key={fol.id} className="rounded-lg border bg-muted/10 p-3 space-y-2 text-xs">
                        <div className="flex justify-between items-start gap-2 border-b border-border/40 pb-1.5">
                          <span className="font-bold text-accent capitalize flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" /> {fol.channel}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {new Date(fol.contact_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="leading-relaxed text-muted-foreground font-medium">{fol.summary}</p>
                        {fol.outcome && (
                          <p className="text-[10px] text-muted-foreground italic"><span className="font-semibold text-foreground">Hasil:</span> {fol.outcome}</p>
                        )}
                        {fol.next_action && (
                          <p className="text-[10px] text-accent"><span className="font-bold text-foreground">Next Action:</span> {fol.next_action}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </SheetContent>
        )}
      </Sheet>

      {/* 4. ADD DONOR MODAL DIALOG */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-card border border-border p-6 rounded-2xl shadow-elegant animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Registrasi Donor Baru</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Lengkapi formulir profil pendaftaran awal untuk memulai penempatan pipeline journey donor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDonor} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3.5">
              
              <div className="col-span-2">
                <Label className="text-xs font-bold">Nama Lengkap *</Label>
                <Input
                  type="text"
                  required
                  placeholder="Nama lengkap donor"
                  value={newDonor.name}
                  onChange={(e) => setNewDonor({ ...newDonor, name: e.target.value })}
                  className="mt-1 h-9 text-xs font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Alamat Email</Label>
                <Input
                  type="email"
                  placeholder="donor@domain.org"
                  value={newDonor.email}
                  onChange={(e) => setNewDonor({ ...newDonor, email: e.target.value })}
                  className="mt-1 h-9 text-xs font-medium"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">WhatsApp / No. HP</Label>
                <Input
                  type="text"
                  placeholder="628123456789"
                  value={newDonor.whatsapp}
                  onChange={(e) => setNewDonor({ ...newDonor, whatsapp: e.target.value })}
                  className="mt-1 h-9 text-xs font-medium"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Kota / Lokasi</Label>
                <Input
                  type="text"
                  placeholder="Jakarta / Bandung"
                  value={newDonor.city}
                  onChange={(e) => setNewDonor({ ...newDonor, city: e.target.value })}
                  className="mt-1 h-9 text-xs font-medium"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Source Akuisisi</Label>
                <select
                  value={newDonor.source}
                  onChange={(e) => setNewDonor({ ...newDonor, source: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent h-9"
                >
                  <option value="campaign">Campaign</option>
                  <option value="referral">Referral</option>
                  <option value="organic">Organic</option>
                  <option value="event">Event</option>
                  <option value="corporate">Corporate</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-bold">Campaign Asal (Jika Ada)</Label>
                <Input
                  type="text"
                  placeholder="Nama program / kampanye donasi"
                  value={newDonor.campaign_source}
                  onChange={(e) => setNewDonor({ ...newDonor, campaign_source: e.target.value })}
                  className="mt-1 h-9 text-xs font-medium"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Default Journey Stage</Label>
                <select
                  value={newDonor.journey_stage}
                  onChange={(e) => setNewDonor({ ...newDonor, journey_stage: e.target.value as any })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent h-9"
                >
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold">Tipe Komitmen Donor</Label>
                <select
                  value={newDonor.donor_type}
                  onChange={(e) => setNewDonor({ ...newDonor, donor_type: e.target.value as any })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent h-9"
                >
                  <option value="one_time">One-time (Satu kali)</option>
                  <option value="recurring">Recurring (Rutin)</option>
                  <option value="corporate">Corporate (Lembaga)</option>
                </select>
              </div>

              {newDonor.donor_type === 'recurring' && (
                <>
                  <div>
                    <Label className="text-xs font-bold font-semibold">Nominal Rutin (Rp)</Label>
                    <Input
                      type="number"
                      placeholder="Nominal komitmen"
                      value={newDonor.recurring_amount}
                      onChange={(e) => setNewDonor({ ...newDonor, recurring_amount: e.target.value })}
                      className="mt-1 h-9 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold font-semibold">Frekuensi</Label>
                    <select
                      value={newDonor.recurring_frequency}
                      onChange={(e) => setNewDonor({ ...newDonor, recurring_frequency: e.target.value })}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent h-9"
                    >
                      <option value="">Pilih Frekuensi</option>
                      <option value="monthly">Bulanan</option>
                      <option value="quarterly">Kuartal</option>
                      <option value="yearly">Tahunan</option>
                    </select>
                  </div>
                </>
              )}

              <div className="col-span-2 border-t pt-3 border-border/40">
                <Label className="text-xs font-bold">Isu / Bidang Minat (Pisahkan dengan koma)</Label>
                <Input
                  type="text"
                  placeholder="Kesehatan, Pendidikan, Pemberdayaan Perempuan"
                  value={newDonor.issue_interest}
                  onChange={(e) => setNewDonor({ ...newDonor, issue_interest: e.target.value })}
                  className="mt-1 h-9 text-xs font-medium"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-bold">Tags (Pisahkan dengan koma)</Label>
                <Input
                  type="text"
                  placeholder="prioritas-tinggi, veteran-donor"
                  value={newDonor.tags}
                  onChange={(e) => setNewDonor({ ...newDonor, tags: e.target.value })}
                  className="mt-1 h-9 text-xs font-medium"
                />
              </div>

              <div className="col-span-2 border-t pt-3 border-border/40">
                <Label className="text-xs font-bold">Rencana Agenda Hubungi (Next Action)</Label>
                <Input
                  type="text"
                  placeholder="Kirim proposal perkenalan lembaga"
                  value={newDonor.next_action}
                  onChange={(e) => setNewDonor({ ...newDonor, next_action: e.target.value })}
                  className="mt-1 h-9 text-xs font-medium"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-bold">Tanggal Tenggat Hubungi</Label>
                <Input
                  type="date"
                  value={newDonor.next_action_due}
                  onChange={(e) => setNewDonor({ ...newDonor, next_action_due: e.target.value })}
                  className="mt-1 h-9 text-xs font-medium"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-bold">Catatan Profil</Label>
                <Textarea
                  placeholder="Keterangan tambahan latar belakang donor, relasi, atau preferensi komunikasi khusus."
                  value={newDonor.notes}
                  onChange={(e) => setNewDonor({ ...newDonor, notes: e.target.value })}
                  className="mt-1 min-h-[60px] text-xs font-medium"
                />
              </div>

            </div>

            <div className="flex justify-end gap-2 border-t pt-4 mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddModalOpen(false)}
                className="h-10 text-xs font-semibold"
                disabled={addDonorMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="h-10 text-xs font-bold bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={addDonorMutation.isPending}
              >
                {addDonorMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Menyimpan…
                  </>
                ) : (
                  <>
                    Simpan Profil Donor
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
