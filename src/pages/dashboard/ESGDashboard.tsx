// src/pages/dashboard/ESGDashboard.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutiveOverviewCards } from '@/components/esg/ExecutiveOverviewCards';
import { ExecutiveSummaryCard } from '@/components/esg/ExecutiveSummaryCard';
import { OverviewCharts } from '@/components/esg/OverviewCharts';
import { EnvironmentTab } from '@/components/esg/EnvironmentTab';
import { SocialTab } from '@/components/esg/SocialTab';
import { GovernanceTab } from '@/components/esg/GovernanceTab';
import { SDGTab } from '@/components/esg/SDGTab';
import { getOrgESGSummary } from '@/lib/esg/aggregator';
import { ESGSummaryPayload } from '@/lib/esg/types';
import { Globe, RefreshCw, Shield, Building2, Leaf, Users, ShieldCheck, LayoutDashboard } from 'lucide-react';

export default function ESGDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [esgData, setEsgData] = useState<ESGSummaryPayload | null>(null);
  const [orgInfo, setOrgInfo] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        const userId = user?.id;
        let orgId = 'demo-org';
        let orgName = 'Organisasi Impactory';

        if (userId) {
          const { data: member } = await supabase
            .from('organization_members')
            .select('organization_id, organizations(id, name)')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();

          if (member?.organization_id) {
            orgId = member.organization_id;
            orgName = (member.organizations as any)?.name || orgName;
          }
        }

        setOrgInfo({ id: orgId, name: orgName });

        // Aggregate ESG Summary Payload
        const summary = await getOrgESGSummary(orgId, orgName);
        setEsgData(summary);
      } catch (err) {
        console.error('Error loading ESG Dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.id]);

  const handleRefresh = async () => {
    if (!orgInfo) return;
    setLoading(true);
    const summary = await getOrgESGSummary(orgInfo.id, orgInfo.name);
    setEsgData(summary);
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
              <Globe className="w-3.5 h-3.5 mr-1" /> Sustainability Intelligence
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Building2 className="w-3 h-3 mr-1" /> {orgInfo?.name || 'Loading...'}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            ESG & Sustainability Intelligence Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
            Agregasi agregat otomatis indikator Environmental, Social, Governance, dan SDG Alignment yang bersumber langsung dari WBS, RAB Budget, MEAL, dan Beneficiaries secara *read-only*.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </Button>
        </div>
      </div>

      {/* DASHBOARD TABS NAVIGATION */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full md:w-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="overview" className="text-xs font-medium flex items-center gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="environment" className="text-xs font-medium flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-emerald-600" /> Environment
          </TabsTrigger>
          <TabsTrigger value="social" className="text-xs font-medium flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-600" /> Social
          </TabsTrigger>
          <TabsTrigger value="governance" className="text-xs font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Governance
          </TabsTrigger>
          <TabsTrigger value="sdgs" className="text-xs font-medium flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-amber-600" /> SDGs Matrix
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW (EXECUTIVE DASHBOARD ONLY) */}
        <TabsContent value="overview" className="space-y-6">
          {loading || !esgData ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl border" />
              ))}
            </div>
          ) : (
            <>
              {/* SECTION 1: 4 HERO CARDS ONLY */}
              <ExecutiveOverviewCards data={esgData} />

              {/* SECTION 2: EXECUTIVE SUMMARY CARD */}
              <ExecutiveSummaryCard data={esgData} />

              {/* SECTION 3: HIGH LEVEL VISUAL SUMMARY */}
              <OverviewCharts data={esgData} />
            </>
          )}
        </TabsContent>

        {/* TAB 2: ENVIRONMENT (OWN DOMAIN CONTENT ONLY) */}
        <TabsContent value="environment" className="space-y-6">
          {esgData && <EnvironmentTab data={esgData.environment} />}
        </TabsContent>

        {/* TAB 3: SOCIAL (OWN DOMAIN CONTENT ONLY) */}
        <TabsContent value="social" className="space-y-6">
          {esgData && <SocialTab data={esgData.social} />}
        </TabsContent>

        {/* TAB 4: GOVERNANCE (OWN DOMAIN CONTENT ONLY) */}
        <TabsContent value="governance" className="space-y-6">
          {esgData && <GovernanceTab data={esgData.governance} />}
        </TabsContent>

        {/* TAB 5: SDGS MATRIX (OWN DOMAIN CONTENT ONLY) */}
        <TabsContent value="sdgs" className="space-y-6">
          {esgData && <SDGTab data={esgData.sdgs} />}
        </TabsContent>
      </Tabs>

      {/* SUMMARY NOTE & GOVERNANCE GUARANTEE */}
      <Card className="bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Jaminan Integritas Data ESG (ADR-0002 & ADR-0003 Compliant): Seluruh metrik bersifat Read-Only dan teragregasi otomatis dari LFA, WBS, RAB, MEAL, dan Beneficiaries.</span>
        </div>
      </Card>
    </div>
  );
}
