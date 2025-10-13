import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Users } from "lucide-react";

// Internal normalized client shape used by UI.
interface ClientRowUI {
  id: number;
  clientName: string;
  poc: string | null; // client PM name (userType=client)
  activeProjects: number | null;
  lastActivityDate: string | null;
  completedProjects: number | null; // total projects done
  createdAt: string;
  updatedAt: string;
}

export function ClientsTable() {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: clients = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      // Select only columns we are confident exist based on provided schema example
      // Provided schema columns (sample insert): id, name, email, companyName, contactNo, address, createdAt, updatedAt,
      // activeProjects, completedProjects, lastActivityDate, totalProjectValue, totalProjects, totalWeightage
      // We guard against 400 by keeping selection minimal & valid.
      const { data: clientData, error } = await supabase
        .from("Client")
        .select(
          // Keep selection minimal & safe (remove companyName if not present in live schema)
          "id, name, createdAt, updatedAt, lastActivityDate"
        )
        .order("createdAt", { ascending: false });
      if (error) throw error;

      // Fetch all projects with multiple potential status field variants to derive active counts
      const projRes: any = await (supabase as any).from("Project").select(
        // select common variants we have seen in codebase & legacy data
        "id, clientId, status, projectStatus, project_status, currentStatus, phaseStatus"
      );
      const projectRows: any[] =
        !projRes.error && Array.isArray(projRes.data) ? projRes.data : [];

      // Helper to robustly detect a project's status string from possible variants
      const detectStatus = (p: any): string => {
        return (
          p?.status ||
          p?.projectStatus ||
          p?.project_status ||
          p?.currentStatus ||
          p?.phaseStatus ||
          ""
        );
      };

      // Normalize & map legacy to canonical
      const LEGACY_MAP: Record<string, string> = {
        in_progress: "Live",
        planning: "Live",
        active: "Live",
      };

      const ACTIVE_SET = new Set([
        "live",
        "in progress",
        "in_progress",
        "active",
      ]);

      const projectGroups = projectRows.reduce(
        (acc: Record<number, { total: number; live: number }>, p: any) => {
          const cid = p.clientId;
          if (cid == null) return acc;
          if (!acc[cid]) acc[cid] = { total: 0, live: 0 };
          acc[cid].total += 1;
          const rawStatus = detectStatus(p);
          if (rawStatus) {
            const norm = rawStatus.toString().trim();
            const lower = norm.toLowerCase();
            const mapped = LEGACY_MAP[lower.replace(/\s+/g, "_")] || norm;
            const canonicalLower = mapped.toLowerCase();
            if (ACTIVE_SET.has(canonicalLower)) {
              acc[cid].live += 1;
            }
          }
          return acc;
        },
        {}
      );

      // Optional debug: if there are projects but all active counts zero, log sample statuses
      if (projectRows.length > 0) {
        const anyLive = (
          Object.values(projectGroups) as Array<{ total: number; live: number }>
        ).some((g) => g.live > 0);
        if (!anyLive) {
          // Collect distinct statuses for inspection (limited)
          const distinct = Array.from(
            new Set(
              projectRows
                .map((p) => detectStatus(p))
                .filter(Boolean)
                .map((s) => s.toString().trim())
            )
          ).slice(0, 10);
          console.debug(
            "[ClientsTable] No active projects detected; distinct raw statuses:",
            distinct
          );
        }
      }

      const base = (clientData as any[]).map((row) => ({
        id: row.id,
        clientName: row.name || `Client ${row.id}`,
        activeProjects: projectGroups[row.id]?.live ?? 0,
        completedProjects: projectGroups[row.id]?.total ?? 0,
        lastActivityDate: row.lastActivityDate || null,
        createdAt: row.createdAt ?? new Date().toISOString(),
        updatedAt: row.updatedAt ?? row.createdAt ?? new Date().toISOString(),
      }));

      // Fetch client POCs (client users) in one query
      const ids = base.map((c) => c.id);
      let pocMap: Record<number, string> = {};
      if (ids.length) {
        const userRes: any = await (supabase as any)
          .from("User")
          .select("id, name, clientId, userType, createdAt")
          .in("clientId", ids)
          .eq("userType", "client");
        if (!userRes.error && Array.isArray(userRes.data)) {
          // Choose earliest created or first for each client
          (userRes.data as any[]).forEach((u) => {
            const cid = u.clientId;
            if (cid == null) return;
            if (!pocMap[cid]) pocMap[cid] = u.name || `User ${u.id}`;
          });
        }
      }

      const normalized: ClientRowUI[] = base.map((c) => ({
        ...c,
        poc: pocMap[c.id] || null,
      }));
      return normalized;
    },
  });

  function toNumberSafe(v: any): number | null {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  const lowerSearch = searchTerm.toLowerCase();
  const filteredClients = clients.filter((client: ClientRowUI) => {
    const name = client.clientName?.toLowerCase() ?? "";
    const poc = client.poc?.toLowerCase() ?? "";
    return [name, poc].some((f) => f.includes(lowerSearch));
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading clients...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-destructive">
              Error loading clients: {error.message}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clients ({filteredClients.length})
          </CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredClients.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">
              {clients.length === 0
                ? "No clients found"
                : "No clients match your search"}
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>POC</TableHead>
                <TableHead>Active Projects</TableHead>
                <TableHead>Last Active Date</TableHead>
                <TableHead>Projects Done</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client: ClientRowUI) => {
                const lastDate = client.lastActivityDate
                  ? new Date(client.lastActivityDate).toLocaleDateString()
                  : "-";
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.clientName}
                    </TableCell>
                    <TableCell>{client.poc || "-"}</TableCell>
                    <TableCell>{client.activeProjects ?? 0}</TableCell>
                    <TableCell>{lastDate}</TableCell>
                    <TableCell>{client.completedProjects ?? 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
