import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ResourcesPanel } from "@/components/resources/ResourcesPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubmissionLineChart } from "@/components/charts/SubmissionLineChart";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { getTeamMembersForLead } from "@/data";

interface TLStat {
  solTLId: number;
  name: string;
  totalProjects: number;
  uniqueClients: number;
  status?: string | null;
  email?: string | null;
  extension?: string | null; // contact number / extension
}

const Team = () => {
  const [selectedLead, setSelectedLead] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [clientMap, setClientMap] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tlStats, setTlStats] = useState<TLStat[]>([]);
  const [assigningProjectId, setAssigningProjectId] = useState<number | null>(
    null
  );
  // Store pending (not yet saved) TL selections for unassigned projects
  const [pendingAssignments, setPendingAssignments] = useState<
    Record<number, string>
  >({});

  // Fetch users and projects, aggregate stats
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Fetch all projects (select * to avoid column mismatch issues)
        const { data: projects, error: pErr } = await supabase
          .from("Project")
          .select("*");
        if (pErr) throw pErr;
        setProjects(projects || []);

        // Fetch client names from the Client table by id (assign using id)
        const clientIds = Array.from(
          new Set(
            (projects || [])
              .map((p: any) => p.clientId ?? p.client_id ?? p.clientID)
              .filter((v) => v !== null && v !== undefined)
              .map((v) => Number(v))
          )
        );
        if (clientIds.length > 0) {
          try {
            const res: any = await (supabase as any)
              .from("Client")
              .select("*")
              .in("id", clientIds);
            const rows: any[] = res && Array.isArray(res.data) ? res.data : [];
            const cMap = new Map<number, string>();
            rows.forEach((r: any) => {
              const id = r.id ?? r.ID ?? r.clientId ?? r.clientID;
              if (id == null) return;
              const name =
                r.name ||
                r.clientName ||
                r.companyName ||
                r.client ||
                r.contactPerson ||
                `Client ${id}`;
              cMap.set(Number(id), name);
            });
            setClientMap(cMap);
          } catch (err) {
            console.debug("Client fetch failed from Client table", err);
            setClientMap(new Map());
          }
        } else {
          setClientMap(new Map());
        }

        // Determine distinct solTLIds present
        const solIds = Array.from(
          new Set(
            (projects || [])
              .map(
                (p: any) =>
                  p.solTLId ?? p.solTlId ?? p.sol_tl_id ?? p.sol_tlId ?? null
              )
              .filter((v) => v !== null && v !== undefined)
          )
        );

        let userMap = new Map<number, any>();
        if (solIds.length > 0) {
          // Attempt to fetch Users table variants and build map
          const userTables = [
            "User",
            "user",
            "users",
            "Employee",
            "employee",
            "employees",
          ]; // heuristic
          for (const t of userTables) {
            try {
              const res = await (supabase as any)
                .from(t)
                .select("*")
                .in("id", solIds);
              if (res.error) continue;
              const rows = res.data as any[] | null;
              if (!rows || rows.length === 0) continue;
              rows.forEach((r: any) => {
                const id = r.id ?? r.ID;
                if (id == null) return;
                const name =
                  r.full_name ||
                  r.name ||
                  r.display_name ||
                  `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
                  r.email ||
                  `User ${id}`;
                const status = r.status || r.employment_status || null;
                const email =
                  r.email ||
                  r.work_email ||
                  r.office_email ||
                  r.company_email ||
                  null;
                const extension =
                  r.contactNo ||
                  r.contact_no ||
                  r.contact_number ||
                  r.phone ||
                  r.phone_number ||
                  r.mobile ||
                  r.telephone ||
                  null;
                userMap.set(Number(id), { id, name, status, email, extension });
              });
              // If we populated map for all solIds, break early (optional)
              if (userMap.size === solIds.length) break;
            } catch (err) {
              console.debug("User table fetch attempt failed", t, err);
            }
          }
        }

        // Aggregate
        const statMap = new Map<
          number,
          { projectIds: number[]; clientIds: Set<number>; meta: any }
        >();
        (projects || []).forEach((p: any) => {
          const sid =
            p.solTLId ?? p.solTlId ?? p.sol_tl_id ?? p.sol_tlId ?? null;
          if (sid == null) return;
          const entry = statMap.get(Number(sid)) || {
            projectIds: [],
            clientIds: new Set<number>(),
            meta: userMap.get(Number(sid)) || {
              id: Number(sid),
              name: `User ${sid}`,
              status: null,
              email: null,
              extension: null,
            },
          };
          entry.projectIds.push(p.id);
          const clientId = p.clientId ?? p.client_id;
          if (clientId != null) entry.clientIds.add(Number(clientId));
          statMap.set(Number(sid), entry);
        });

        const rows: TLStat[] = Array.from(statMap.entries()).map(
          ([sid, val]) => ({
            solTLId: sid,
            name: val.meta.name,
            totalProjects: val.projectIds.length,
            uniqueClients: val.clientIds.size,
            status: val.meta.status,
            email: val.meta.email || null,
            extension: val.meta.extension || null,
          })
        );

        // Sort by name (ascending)
        rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setTlStats(rows);
      } catch (e) {
        console.error("Failed loading team lead stats", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Mock submission data for charts
  // Placeholder (replaced inside TeamLeadDetail with actual package-based aggregation)
  const getSubmissionData = () => [] as { date: string; submissions: number }[];

  const projectsWithoutLead = useMemo(() => {
    return (projects || []).filter((project: any) => {
      const sid =
        project.solTLId ??
        project.solTlId ??
        project.sol_tl_id ??
        project.sol_tlId ??
        project.sol_tl_no ??
        null;
      return sid === null || sid === undefined || sid === "";
    });
  }, [projects]);

  const tlColumnName = useMemo(() => {
    const candidates = ["solTLId", "solTlId", "sol_tl_id", "sol_tlId"];
    for (const project of projects || []) {
      for (const candidate of candidates) {
        if (candidate in project) {
          return candidate;
        }
      }
    }
    return "solTLId";
  }, [projects]);

  // For each TL, count live and on-hold projects
  const sortedTlByLoad = useMemo(() => {
    return Array.from(tlStats)
      .map((tl) => {
        const leadProjects = (projects || []).filter((p: any) => {
          const sid =
            p.solTLId ?? p.solTlId ?? p.sol_tl_id ?? p.sol_tlId ?? null;
          return Number(sid) === tl.solTLId;
        });
        const liveCount = leadProjects.filter((p: any) => {
          const status = (p.status ?? p.projectStatus ?? "").toLowerCase();
          return status === "live";
        }).length;
        const onHoldCount = leadProjects.filter((p: any) => {
          const status = (p.status ?? p.projectStatus ?? "").toLowerCase();
          return status === "on-hold" || status === "on hold";
        }).length;
        return {
          ...tl,
          liveCount,
          onHoldCount,
        };
      })
      .sort((a, b) => {
        if (a.totalProjects === b.totalProjects) {
          return (a.name || "").localeCompare(b.name || "");
        }
        return a.totalProjects - b.totalProjects;
      });
  }, [tlStats, projects]);

  const handleAssignLead = async (projectId: number, value: string) => {
    const leadId = value === "none" ? null : Number(value);
    setAssigningProjectId(projectId);

    try {
      const { error } = await (supabase as any)
        .from("Project")
        .update({ [tlColumnName]: leadId })
        .eq("id", projectId);

      if (error) {
        throw error;
      }

      const leadMeta =
        leadId != null
          ? tlStats.find((tl) => tl.solTLId === leadId)
          : undefined;

      setProjects((prev) =>
        prev.map((project: any) => {
          if (project.id !== projectId) return project;
          const updated = { ...project };
          updated[tlColumnName] = leadId;
          updated.solTLId = leadId;
          updated.solTlId = leadId;
          updated.sol_tl_id = leadId;
          if (leadMeta) {
            updated.teamLead = leadMeta.name;
          }
          return updated;
        })
      );

      toast({
        title: "Team lead updated",
        description: leadId
          ? `Assigned ${leadMeta?.name ?? "team lead"} to the project.`
          : "Project is now unassigned.",
      });

      // Clear pending selection for this project
      setPendingAssignments((prev) => {
        const copy = { ...prev };
        delete copy[projectId];
        return copy;
      });
    } catch (error) {
      console.error("Failed to assign team lead", error);
      toast({
        title: "Update failed",
        description: "Couldn't update the team lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAssigningProjectId(null);
    }
  };

  const getProjectDisplayName = (project: any) =>
    project.name ||
    project.projectName ||
    project.title ||
    `Project ${project.id}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Management</h1>
            <p className="text-muted-foreground">
              Manage team members and their project assignments
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <Card className="h-full lg:basis-[35%] lg:max-w-[35%]">
            <CardHeader>
              <CardTitle>Projects without TL</CardTitle>
              <p className="text-sm text-muted-foreground">
                Assign team leads to unassigned projects directly from here.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[560px] overflow-y-auto pr-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : projectsWithoutLead.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  All projects have a team lead assigned.
                </div>
              ) : (
                projectsWithoutLead.map((project: any) => {
                  const clientId =
                    project.clientId ?? project.client_id ?? null;
                  const clientName =
                    clientId != null
                      ? clientMap.get(Number(clientId)) || `Client ${clientId}`
                      : "—";
                  const pendingValue = pendingAssignments[project.id] ?? "none";
                  const saveDisabled =
                    assigningProjectId === project.id ||
                    pendingValue === "none";
                  return (
                    <div
                      key={project.id}
                      className="flex items-center justify-between gap-4 rounded border px-4 py-3 bg-background"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold leading-snug truncate">
                          {getProjectDisplayName(project)}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {clientName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={pendingValue}
                          onValueChange={(value) =>
                            setPendingAssignments((prev) => ({
                              ...prev,
                              [project.id]: value,
                            }))
                          }
                          disabled={assigningProjectId === project.id}
                        >
                          <SelectTrigger className="w-44 text-xs">
                            <SelectValue placeholder="Assign TL" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {sortedTlByLoad.map((lead) => (
                              <SelectItem
                                key={lead.solTLId}
                                value={String(lead.solTLId)}
                              >
                                {lead.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={saveDisabled}
                          onClick={() =>
                            handleAssignLead(project.id, pendingValue)
                          }
                          className="text-xs"
                        >
                          {assigningProjectId === project.id
                            ? "Saving..."
                            : "Save"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="h-full lg:basis-[65%]">
            <CardHeader>
              <CardTitle>Available Team Leads</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sorted by current project load (lowest first).
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : sortedTlByLoad.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No team leads available.
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team Lead</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Extension</TableHead>
                        <TableHead className="text-right">
                          Live Projects
                        </TableHead>
                        <TableHead className="text-right">
                          On-Hold Projects
                        </TableHead>
                        <TableHead className="text-right">
                          Unique Clients
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTlByLoad.map((lead) => (
                        <TableRow
                          key={lead.solTLId}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            setSelectedLead({
                              id: lead.solTLId,
                              name: lead.name,
                            })
                          }
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src="" />
                                <AvatarFallback>
                                  {lead.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{lead.name}</div>
                                {lead.status && (
                                  <div className="text-xs text-muted-foreground">
                                    {lead.status}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell
                            className="text-xs max-w-[160px] truncate"
                            title={lead.email || undefined}
                          >
                            {lead.email || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {lead.extension || "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {lead.liveCount}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {lead.onHoldCount}
                          </TableCell>
                          <TableCell className="text-right">
                            {lead.uniqueClients}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Team Lead Detail Dialog */}
        <Dialog
          open={!!selectedLead}
          onOpenChange={() => setSelectedLead(null)}
        >
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Team Lead Details</DialogTitle>
            </DialogHeader>
            {selectedLead && (
              <TeamLeadDetail
                lead={selectedLead}
                projects={projects}
                clientMap={clientMap}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

interface TeamLeadDetailProps {
  lead: { id: number; name: string };
  projects: any[];
  clientMap: Map<number, string>;
}

const TeamLeadDetail = ({ lead, projects, clientMap }: TeamLeadDetailProps) => {
  const leadProjects = useMemo(
    () =>
      (projects || []).filter((p: any) => {
        const sid = p.solTLId ?? p.solTlId ?? p.sol_tl_id ?? p.sol_tlId ?? null;
        return Number(sid) === lead.id;
      }),
    [projects, lead.id]
  );

  const uniqueClients = useMemo(() => {
    const set = new Set<number>();
    leadProjects.forEach((p: any) => {
      const cid = p.clientId ?? p.client_id ?? p.clientID;
      if (cid != null) set.add(Number(cid));
    });
    return Array.from(set.values());
  }, [leadProjects]);

  // Fetch packages for this lead's projects and aggregate by date
  const [packageData, setPackageData] = useState<
    { date: string; submissions: number }[]
  >([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    const loadPackages = async () => {
      const projectIds = leadProjects.map((p: any) => p.id).filter(Boolean);
      if (!projectIds.length) {
        setPackageData([]);
        return;
      }
      try {
        setLoadingPackages(true);
        const { data, error } = await supabase
          .from("ProjectPackage")
          .select("id, projectid, tentativedate, issuedate, createdat")
          .in("projectid", projectIds);
        if (error) throw error;
        const counts: Record<string, number> = {};
        (data || []).forEach((pkg: any) => {
          const raw = pkg.issuedate || pkg.tentativedate || pkg.createdat;
          if (!raw) return;
          const key = String(raw).slice(0, 10);
          counts[key] = (counts[key] || 0) + 1;
        });
        const agg = Object.entries(counts)
          .sort((a, b) => (a[0] < b[0] ? -1 : 1))
          .map(([date, submissions]) => ({ date, submissions }));
        setPackageData(agg);
      } catch (e) {
        console.error("Failed to load packages for TL", e);
        setPackageData([]);
      } finally {
        setLoadingPackages(false);
      }
    };
    loadPackages();
  }, [leadProjects]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{lead.name}</h2>
        <p className="text-sm text-muted-foreground">
          {leadProjects.length} project{leadProjects.length !== 1 && "s"} •{" "}
          {uniqueClients.length} client{uniqueClients.length !== 1 && "s"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {uniqueClients.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            No clients assigned.
          </span>
        ) : (
          uniqueClients.map((cid) => (
            <Badge key={cid} variant="secondary">
              {clientMap.get(cid) || `Client ${cid}`}
            </Badge>
          ))
        )}
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expected Completion</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leadProjects.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-sm text-muted-foreground text-center"
                >
                  No projects found.
                </TableCell>
              </TableRow>
            ) : (
              leadProjects.map((p: any) => {
                const clientId = p.clientId ?? p.client_id ?? p.clientID;
                const status =
                  p.status ?? p.projectStatus ?? p.currentStatus ?? "—";
                const priority = p.priority ?? p.projectPriority ?? "—";
                const progress = p.progress ?? p.projectProgress ?? 0;
                const expected =
                  p.expectedCompletion ||
                  p.expected_completion ||
                  p.dueDate ||
                  null;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.name || p.projectName || p.title || `Project ${p.id}`}
                    </TableCell>
                    <TableCell>
                      {clientId != null
                        ? clientMap.get(Number(clientId)) ||
                          `Client ${clientId}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {expected ? String(expected).slice(0, 10) : "—"}
                    </TableCell>
                    <TableCell>{priority}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${Math.min(100, Number(progress) || 0)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs tabular-nums">
                          {Math.min(100, Number(progress) || 0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {/* Team Info (static / JSON-driven) */}
      <div className="rounded-md border bg-background/50">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <h3 className="text-sm font-medium">Team Info</h3>
        </div>
        <div className="max-h-48 overflow-y-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Name</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getTeamMembersForLead(lead.id).map((m, idx) => (
                <TableRow key={idx}>
                  <TableCell className="py-1 font-small">{m.name}</TableCell>
                  <TableCell className="py-1 text-muted-foreground">
                    {m.role}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowTimeline((s) => !s)}
        >
          {showTimeline ? "Hide" : "Show"} Submission Timeline
        </Button>
      </div>
      {showTimeline && (
        <div>
          <h3 className="text-sm font-medium mb-2">Submission Timeline</h3>
          {loadingPackages ? (
            <div className="text-xs text-muted-foreground">
              Loading package submissions...
            </div>
          ) : packageData.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              No package submission activity yet.
            </div>
          ) : (
            <SubmissionLineChart data={packageData} teamLead={lead.name} />
          )}
        </div>
      )}
    </div>
  );
};

export default Team;
