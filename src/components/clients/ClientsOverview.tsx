import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Briefcase, Activity } from "lucide-react";

interface ClientRowRaw {
  id: number;
  name?: string | null;
  companyName?: string | null;
  email?: string | null;
  contactNo?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  activeProjects?: number | null;
  completedProjects?: number | null;
  totalProjects?: number | null;
  lastActivityDate?: string | null;
}

interface ClientRow {
  id: number;
  clientName: string;
  createdAt: string;
  email?: string | null;
  contactNo?: string | null;
  activeProjects?: number | null;
  completedProjects?: number | null;
  totalProjects?: number | null;
  lastActivityDate?: string | null;
  syntheticStatus: string; // derived
}

interface ProjectRow {
  id: number;
  clientId: number | null;
  status?: string | null;
  createdAt?: string | null;
}

// Helpers (placed before use for TS)
function toNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function deriveStatus(r: ClientRowRaw): string {
  const active = toNum(r.activeProjects) || 0;
  const total = toNum(r.totalProjects) || 0;
  if (total === 0) return "prospect";
  if (active > 0) return "active";
  if (r.lastActivityDate) {
    try {
      const days =
        (Date.now() - new Date(r.lastActivityDate).getTime()) / 86400000;
      if (days > 180) return "inactive";
    } catch {}
  }
  return "active";
}

// Simple importance scoring heuristic
function scoreClient(client: ClientRow, projects: ProjectRow[]): number {
  const clientProjects = projects.filter((p) => p.clientId === client.id);
  const projectCount = clientProjects.length;
  if (projectCount === 0) return 0; // dormant
  const latest = clientProjects.reduce<number | null>((acc, p) => {
    const t = p.createdAt ? new Date(p.createdAt).getTime() : 0;
    return acc == null || t > acc ? t : acc;
  }, null);
  const daysSinceLatest = latest ? (Date.now() - latest) / 86400000 : 999;
  let recencyScore = 0;
  if (daysSinceLatest <= 30) recencyScore = 2;
  else if (daysSinceLatest <= 90) recencyScore = 1;
  const activityScore = Math.min(projectCount * 0.8, 4); // cap influence
  const statusBoost = /active/i.test(client.syntheticStatus) ? 1 : 0;
  const contactBoost = client.contactNo ? 0.3 : 0;
  return +(activityScore + recencyScore + statusBoost + contactBoost).toFixed(
    2
  );
}

function labelForScore(score: number): { label: string; color: string } {
  if (score >= 6)
    return { label: "Strategic", color: "bg-primary text-primary-foreground" };
  if (score >= 4)
    return { label: "Key", color: "bg-success text-success-foreground" };
  if (score >= 2)
    return {
      label: "Regular",
      color: "bg-secondary text-secondary-foreground",
    };
  return { label: "Dormant", color: "bg-muted text-muted-foreground" };
}

export const ClientsOverview = () => {
  const clientsQuery = useQuery({
    queryKey: ["clients-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Client")
        .select(
          "id, name, companyName, email, contactNo, createdAt, updatedAt, activeProjects, completedProjects, totalProjects, lastActivityDate"
        )
        .order("createdAt", { ascending: false });
      if (error) throw error;
      const normalized: ClientRow[] = (data as ClientRowRaw[]).map((r) => {
        const clientName = r.name || r.companyName || `Client ${r.id}`;
        const syntheticStatus = deriveStatus(r);
        return {
          id: r.id,
          clientName,
          createdAt: r.createdAt || new Date().toISOString(),
          email: r.email || null,
          contactNo: r.contactNo || null,
          activeProjects: toNum(r.activeProjects),
          completedProjects: toNum(r.completedProjects),
          totalProjects: toNum(r.totalProjects),
          lastActivityDate: r.lastActivityDate || null,
          syntheticStatus,
        };
      });
      return normalized;
    },
  });

  const projectsQuery = useQuery({
    queryKey: ["projects-client-mini"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Project")
        .select("id, clientId, status, createdAt")
        .order("createdAt", { ascending: false });
      if (error) throw error;
      return data as ProjectRow[];
    },
  });

  const loading = clientsQuery.isLoading || projectsQuery.isLoading;

  const enriched = useMemo(() => {
    if (!clientsQuery.data || !projectsQuery.data)
      return [] as Array<ReturnType<typeof buildRecord>>;
    return clientsQuery.data.map((c) => buildRecord(c, projectsQuery.data));
  }, [clientsQuery.data, projectsQuery.data]);

  function buildRecord(client: ClientRow, projects: ProjectRow[]) {
    const score = scoreClient(client, projects);
    const { label, color } = labelForScore(score);
    const projectCount = projects.filter(
      (p) => p.clientId === client.id
    ).length;
    return {
      ...client,
      score,
      importanceLabel: label,
      importanceColor: color,
      projectCount,
    };
  }

  const totals = useMemo(() => {
    if (!enriched.length)
      return {
        active: 0,
        inactive: 0,
        prospect: 0,
        strategic: 0,
        key: 0,
        total: 0,
      };
    const acc = {
      active: 0,
      inactive: 0,
      prospect: 0,
      strategic: 0,
      key: 0,
      total: enriched.length,
    };
    enriched.forEach((c) => {
      if (/active/i.test(c.syntheticStatus)) acc.active++;
      else if (/inactive/i.test(c.syntheticStatus)) acc.inactive++;
      else if (/prospect/i.test(c.syntheticStatus)) acc.prospect++;
      if (c.importanceLabel === "Strategic") acc.strategic++;
      else if (c.importanceLabel === "Key") acc.key++;
    });
    return acc;
  }, [enriched]);

  const topClients = [...enriched]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.active} active • {totals.prospect} prospects
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Strategic / Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totals.strategic + totals.key}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.strategic} strategic • {totals.key} key
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectsQuery.data?.length ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              linked to clients
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topClients[0]?.score ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {topClients[0]?.clientName || "–"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Top Clients by Importance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {topClients.length === 0 && (
            <div className="text-sm text-muted-foreground">No clients yet.</div>
          )}
          <div className="grid md:grid-cols-3 gap-4">
            {topClients.map((c) => (
              <div
                key={c.id}
                className="border rounded-md p-4 flex flex-col gap-2 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="font-medium leading-tight text-sm line-clamp-2">
                    {c.clientName}
                  </div>
                  <Badge className={c.importanceColor}>
                    {c.importanceLabel}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Score {c.score}</span>
                  <span className="inline-block h-1 w-1 rounded-full bg-border" />
                  <span>{c.projectCount} proj</span>
                </div>
                <div className="w-full h-2 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary/70"
                    style={{ width: `${Math.min(100, c.score * 12)}%` }}
                  />
                </div>
                {c.contactNo && (
                  <div className="text-[10px] text-muted-foreground">
                    Contact: {c.contactNo}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
