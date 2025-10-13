import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface StatsState {
  activeProjects: number | null;
  uniqueClients: number | null;
  totalTL: number | null;
}

export function ActiveProjectsCard() {
  const [stats, setStats] = useState<StatsState>({
    activeProjects: null,
    uniqueClients: null,
    totalTL: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Pull minimal fields to compute metrics; fallback to * if constraints unknown
        const { data, error } = (await supabase
          .from("Project")
          .select("id,status,clientId,solTLId")) as any; // removed non-existent client_id, sol_tl_id
        if (error) throw error;
        const rows = (data || []) as any[];
        let active = 0;
        const clientSet = new Set<string>();
        const tlSet = new Set<string>();
        for (const r of rows) {
          const status = (r.status || "").toString();
          if (/^live$/i.test(status)) active++;
          const cid = r.clientId;
          if (cid !== null && cid !== undefined && cid !== "") {
            clientSet.add(String(cid));
          }
          const tl = r.solTLId;
          if (tl !== null && tl !== undefined && tl !== "") {
            tlSet.add(String(tl));
          }
        }
        setStats({
          activeProjects: active,
          uniqueClients: clientSet.size,
          totalTL: tlSet.size,
        });
      } catch (e: any) {
        setError(e.message || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cell = (title: string, value: number | null) => (
    <div className="flex flex-col items-center justify-center gap-2 py-5 px-2">
      <div className="text-[20px] font-bold tracking-wide text-muted-foreground  text-center">
        {title}
      </div>
      <div className="text-3xl font-bold tabular-nums leading-none">
        {loading ? "–" : value ?? 0}
      </div>
    </div>
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold">At a Glance</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 flex-1 flex">
        {error ? (
          <div className="text-destructive text-sm">{error}</div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-y rounded-md border w-full h-full">
            {cell("Active Projects", stats.activeProjects)}
            {cell("Active Clients", stats.uniqueClients)}
            {cell("Total TL", stats.totalTL)}
            {cell("Active Branches", 4)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
