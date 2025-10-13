import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalSearch } from "@/components/layout/DashboardLayout";
import { MoreHorizontal, Filter, ArrowUpDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddProjectDialog } from "./AddProjectDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Mock data - replace with Supabase data later
const projects = [
  {
    id: 1,
    portalName: "Noida",
    solProjectNo: "SOL-2024-001",
    projectName: "Metro Station Complex",
    client: "Delhi Metro Rail Corporation",
    teamLead: "John Smith",
    expectedDate: "2024-12-15",
    percentCompleted: 75,
    status: "In Progress",
  },
  {
    id: 2,
    portalName: "Dehradun",
    solProjectNo: "SOL-2024-002",
    projectName: "Shopping Mall Infrastructure",
    client: "Retail Development Corp",
    teamLead: "Sarah Johnson",
    expectedDate: "2024-11-30",
    percentCompleted: 45,
    status: "In Progress",
  },
  {
    id: 3,
    portalName: "Mysore",
    solProjectNo: "SOL-2024-003",
    projectName: "Hospital Building",
    client: "Healthcare Systems Ltd",
    teamLead: "Mike Chen",
    expectedDate: "2025-01-20",
    percentCompleted: 90,
    status: "In Progress",
  },
  {
    id: 4,
    portalName: "Kannur",
    solProjectNo: "SOL-2024-004",
    projectName: "Port Development",
    client: "Maritime Authority",
    teamLead: "Emma Wilson",
    expectedDate: "2024-10-15",
    percentCompleted: 25,
    status: "On Hold",
  },
];

// New canonical statuses from DB
export const STATUS_OPTIONS = [
  "Live",
  "Sent For Approval",
  "Sent for Fabrication",
  "Closed",
  "On-Hold",
  "Cancelled",
  "See Remarks",
];

// Legacy -> new mapping (fallback for already stored older enum-like values)
const LEGACY_STATUS_MAP: Record<string, string> = {
  IN_PROGRESS: "Live",
  PLANNING: "Live",
  COMPLETED: "Closed",
  ON_HOLD: "On-Hold",
  CANCELLED: "Cancelled",
};

const getStatusColor = (statusLabel: string) => {
  switch (statusLabel) {
    case "Live":
      return "bg-primary text-primary-foreground";
    case "Sent For Approval":
      return "bg-warning text-warning-foreground"; // using warning palette
    case "Sent for Fabrication":
      return "bg-info text-info-foreground"; // neutral/info shade
    case "Closed":
      return "bg-success text-success-foreground";
    case "On-Hold":
      return "bg-warning text-warning-foreground";
    case "Cancelled":
      return "bg-destructive text-destructive-foreground";
    case "See Remarks":
      return "bg-secondary text-secondary-foreground";
    default:
      return "bg-secondary text-secondary-foreground";
  }
};

const getProgressColor = (percent: number) => {
  if (percent >= 80) return "bg-success";
  if (percent >= 50) return "bg-warning";
  return "bg-destructive";
};

const LOCATION_OPTIONS = ["Noida", "Mysore", "Kannur", "Dheradun"]; // canonical UI list
function normalizeLocation(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const val = raw.trim();
  if (/^dehra?dun$/i.test(val)) return "Dheradun"; // map both Dehradun & Dheradun to one spelling
  // match ignoring case
  const found = LOCATION_OPTIONS.find(
    (l) => l.toLowerCase() === val.toLowerCase()
  );
  return found || val;
}

interface ProjectsTableProps {
  showTLSelect?: boolean;
  showClientSelect?: boolean;
  filterNoTL?: boolean; // when true, only show projects without assigned TL
  clientFilterId?: number | null; // externally controlled client filter (e.g., from treemap click)
  onClearClientFilter?: () => void; // callback to clear external filter
  statusFilterExternal?: string | null; // externally controlled status filter
  onClearStatusFilter?: () => void; // clear external status filter
  restrictToLive?: boolean; // when true, force only Live status rows regardless of filters
  hideAddProject?: boolean; // when true, suppress Add Project dialog trigger (used for dashboard)
}

export function ProjectsTable({
  showTLSelect = false,
  showClientSelect = false,
  filterNoTL = false,
  clientFilterId = null,
  onClearClientFilter,
  statusFilterExternal = null,
  onClearStatusFilter,
  restrictToLive = false,
  hideAddProject = false,
}: ProjectsTableProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { query: globalSearch } = (() => {
    try {
      return useGlobalSearch();
    } catch {
      return { query: "" } as any; // fallback if not inside layout
    }
  })();
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<DisplayProject | null>(
    null
  );
  interface DisplayProject {
    id: number;
    projectNo: string;
    solProjectNo?: string;
    name: string;
    description?: string;
    client: string;
    clientId?: number | null;
    clientPM?: string | null;
    clientPm?: number | null; // user id when available
    solTLId?: number | null;
    branch?: string | null;
    expectedCompletion?: string | null;
    estimationDate?: string | null;
    teamLead?: string | null;
    startDate?: string;
    endDate?: string;
    createdAt?: string;
    projectType?: string;
    progress?: number;
    status?: string; // raw status
    statusLabel?: string; // normalized label for display
  }

  const [projects, setProjects] = useState<DisplayProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<
    { id: string; name: string; solTlNo?: string | null }[]
  >([]);
  const [clientsList, setClientsList] = useState<
    { id: string; name: string }[]
  >([]);
  // edit dialog state
  const [editProject, setEditProject] = useState<DisplayProject | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("Project")
        .select("*")
        .order("createdAt", { ascending: false });

      if (error) {
        throw error;
      }

      // Also try to fetch clients so we can display client names; normalize results
      const clientCandidates = ["Client", "client", "clients"];
      const clientMap = new Map<string, string>();
      for (const table of clientCandidates) {
        try {
          const res = await (supabase as any).from(table).select("*");
          if (res.error) continue;
          const clientsData = res.data as any[] | null;
          if (!clientsData) continue;
          clientsData.forEach((c: any) => {
            const id = c.id ?? c.ID ?? c.Id ?? null;
            const name =
              c.clientName ??
              c.client_name ??
              c.name ??
              c.client ??
              c.contactPerson ??
              String(id);
            if (id !== null && id !== undefined)
              clientMap.set(String(id), name);
          });
          if (clientMap.size > 0) break;
        } catch (err) {
          console.debug(`Error loading clients from ${table}:`, err);
        }
      }
      // expose a simple clients list for optional client-select dropdowns
      if (clientMap.size > 0) {
        const cl = Array.from(clientMap.entries()).map(([id, name]) => ({
          id,
          name,
        }));
        setClientsList(cl);
      } else {
        setClientsList([]);
      }
      if (clientMap.size === 0)
        console.debug(
          "No clients found when fetching client tables (Client/client/clients)"
        );

      // Also fetch employees/users to map team lead SOL TL No (try common table names)
      const employeeCandidates = [
        "Employee",
        "employee",
        "employees",
        "User",
        "user",
        "users",
      ];
      const employeeMap = new Map<string, any>();
      const employeeSolMap = new Map<string, any>();
      const clientPMMap = new Map<string, string>();
      const userNameById = new Map<string, string>();
      for (const table of employeeCandidates) {
        try {
          const res = await (supabase as any).from(table).select("*");
          if (res.error) continue;
          const rows = res.data as any[] | null;
          if (!rows || rows.length === 0) continue;
          rows.forEach((r: any) => {
            const id = r.id ?? r.ID ?? r.user_id ?? null;
            if (id == null) return;
            // probe for possible SOL TL number column names
            const solTlNo =
              (r.sol_tl_no ??
                r.solTlNo ??
                r.sol_tl_no_str ??
                r.sol_tl ??
                r.sol_tl_number ??
                r.solTl) ||
              null;
            const name =
              r.full_name ?? r.name ?? r.display_name ?? r.email ?? String(id);
            const rec = { id, name, solTlNo };
            employeeMap.set(String(id), rec);
            if (solTlNo) employeeSolMap.set(String(solTlNo), rec);
            userNameById.set(String(id), name);

            // Attempt to map client PM by presence of clientId/client_id and role-like field
            const cId = r.clientId ?? r.client_id ?? null;
            if (cId != null) {
              const roleStr = (r.role || r.position || "")
                .toString()
                .toLowerCase();
              // Heuristic: include if role indicates pm / manager OR first seen for that client
              if (!clientPMMap.has(String(cId)) || /pm|manager/.test(roleStr)) {
                const pmName =
                  r.full_name ||
                  r.name ||
                  r.display_name ||
                  r.email ||
                  `User ${id}`;
                clientPMMap.set(String(cId), pmName);
              }
            }
          });
          if (employeeMap.size > 0) break;
        } catch (err) {
          console.debug(`Error loading employees from ${table}:`, err);
        }
      }
      if (employeeMap.size === 0)
        console.debug("No employees/users found when fetching employee tables");

      // Build leads list for TL select dropdown
      const leadsList = Array.from(employeeMap.values()).map((r: any) => ({
        id: String(r.id),
        name: r.name,
        solTlNo: r.solTlNo || null,
      }));
      setLeads(leadsList);

      const transformedProjects: DisplayProject[] = (data as any[]).map(
        (project: any) => {
          const rawStatus =
            project.status ||
            project.projectStatus ||
            project.project_status ||
            "";
          // Map legacy enum-like values to new canonical labels if needed
          const upper = (rawStatus || "").toString().toUpperCase();
          const mapped = LEGACY_STATUS_MAP[upper] || rawStatus;

          // Dynamically capture solTLId / sol_tl_id / similar variants from project row
          let solTlIdValue: any = null;
          for (const k of Object.keys(project)) {
            const kl = k.toLowerCase();
            if (
              kl === "soltlid" ||
              kl === "sol_tl_id" ||
              kl === "soltl_id" ||
              kl === "sol_tlno" ||
              kl === "sol_tl_no" ||
              (kl.includes("sol") && kl.includes("tl") && kl.endsWith("id"))
            ) {
              solTlIdValue = project[k];
              break;
            }
          }
          // Also fallback to a few explicit fields if loop didn't catch
          if (solTlIdValue == null) {
            solTlIdValue =
              project.solTLId ||
              project.solTLid ||
              project.sol_tl_id ||
              project.sol_tl_no ||
              project.solTlId ||
              project.teamLeadSolNo ||
              null;
          }

          const rawLeadValue =
            project.teamLead || project.team_lead || project.teamLead || null;

          const resolvedTeamLeadName = (() => {
            // 1. Primary: sol TL id value referencing employee solTlNo
            if (solTlIdValue != null) {
              const bySol = employeeSolMap.get(String(solTlIdValue));
              if (bySol) return bySol.name;
              // If the solTlIdValue actually matches an employee id
              const byId = employeeMap.get(String(solTlIdValue));
              if (byId) return byId.name;
            }
            // 2. Fallback: interpret raw teamLead field
            if (rawLeadValue != null) {
              const byId = employeeMap.get(String(rawLeadValue));
              if (byId) return byId.name;
              const bySol = employeeSolMap.get(String(rawLeadValue));
              if (bySol) return bySol.name;
            }
            return rawLeadValue ? String(rawLeadValue) : "";
          })();

          if (!resolvedTeamLeadName) {
            console.debug("[TeamLeadResolve] Unresolved:", {
              projectId: project.id,
              solTlIdValue,
              rawLeadValue,
              projectKeys: Object.keys(project),
            });
          }

          const clientIdVal = project.clientId ?? project.client_id ?? null;
          // Attempt to read client PM user id directly from project if present under common keys
          const clientPmIdVal: number | null = (() => {
            for (const k of Object.keys(project)) {
              const kl = k.toLowerCase();
              if (
                kl === "clientpm" ||
                kl === "client_pm" ||
                (kl.includes("client") &&
                  kl.includes("pm") &&
                  kl.endsWith("id"))
              ) {
                const val = project[k];
                const num = Number(val);
                return Number.isFinite(num) ? (num as number) : null;
              }
            }
            return project.clientPm ?? null;
          })();
          return {
            id: project.id,
            projectNo: project.projectNo || project.project_no || "",
            solProjectNo:
              project.solProjectNo ||
              project.sol_project_no ||
              project.solProject ||
              "",
            name:
              project.name || project.projectName || project.project_name || "",
            description: project.description || "",
            client:
              clientMap.get(String(project.clientId)) ||
              String(project.clientId ?? "-"),
            clientId: project.clientId ?? project.client_id ?? null,
            clientPM: (() => {
              if (clientPmIdVal != null) {
                // prefer exact name by user id if available
                const exact = userNameById.get(String(clientPmIdVal));
                if (exact) return exact;
              }
              return clientIdVal != null
                ? clientPMMap.get(String(clientIdVal)) || null
                : null;
            })(),
            clientPm: clientPmIdVal,
            solTLId: solTlIdValue ?? null,
            branch:
              project.branch || project.location || project.portalName || "",
            teamLead: resolvedTeamLeadName,
            expectedCompletion:
              project.expectedCompletion ||
              project.expected_completion ||
              project.expectedDate ||
              null,
            estimationDate:
              project.estimationDate || project.estimation_date || null,
            startDate: project.startDate || project.start_date || "",
            endDate:
              project.endDate || project.end_date || project.expectedDate || "",
            createdAt: project.createdAt || project.created_at || "",
            projectType: project.projectType || project.project_type || "",
            progress:
              project.progress ??
              project.percentCompleted ??
              project.percent_completed ??
              0,
            status: mapped,
            statusLabel: mapped,
          } as DisplayProject;
        }
      );

      setProjects(transformedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: "Failed to fetch projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (force = false) => {
    if (!projectToDelete) return;

    try {
      if (force) {
        // First, try to delete related records if possible
        // Note: This is a simplified approach. In production, you'd want more sophisticated handling
        const relatedTables = ["DocumentLog"]; // Add other related tables as needed

        for (const table of relatedTables) {
          try {
            await supabase
              .from(table)
              .delete()
              .eq("projectId", projectToDelete.id);
          } catch (err) {
            console.warn(`Could not delete from ${table}:`, err);
          }
        }
      }

      const { error } = await supabase
        .from("Project")
        .delete()
        .eq("id", projectToDelete.id);

      if (error) {
        // Handle foreign key constraint errors specifically
        if (error.code === "23503") {
          const tableName =
            error.details?.match(/table "(\w+)"/)?.[1] || "related records";

          if (!force) {
            toast({
              title: "Cannot Delete Project",
              description: `This project has related ${tableName.toLowerCase()} records. Use "Force Delete All" to remove all related data.`,
              variant: "destructive",
            });
            return;
          } else {
            toast({
              title: "Force Delete Failed",
              description: `Could not delete project and its related ${tableName.toLowerCase()} records. You may need to remove them manually.`,
              variant: "destructive",
            });
            return;
          }
        } else {
          // Handle other database errors
          toast({
            title: "Delete Failed",
            description:
              error.message || "Failed to delete project. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Success",
        description: `Project "${projectToDelete.name}" ${
          force ? "and related data" : ""
        } deleted successfully!`,
      });

      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setProjectToDelete(null);

      // Refresh projects list
      await fetchProjects();
    } catch (error: any) {
      console.error("Error deleting project:", error);

      // Handle network or other errors
      if (error?.code === "23503") {
        const tableName =
          error?.details?.match(/table "(\w+)"/)?.[1] || "related records";

        if (!force) {
          toast({
            title: "Cannot Delete Project",
            description: `This project has related ${tableName.toLowerCase()} records. Use "Force Delete All" to remove all related data.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Force Delete Failed",
            description: `Could not delete project and its related ${tableName.toLowerCase()} records.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description:
            "Failed to delete project. Please check your connection and try again.",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectAdded = () => {
    fetchProjects();
  };

  const filteredProjects = projects.filter((p) => {
    const project: any = p as any;

    const name = (project.name ?? "").toString();
    const clientName = (project.client ?? "").toString();
    const lead = (project.teamLead ?? "").toString();
    const sol = (project.solProjectNo ?? "").toString();
    const locationRaw = (
      project.portalName ??
      project.location ??
      ""
    ).toString();
    const location = normalizeLocation(locationRaw) || "";

    const activeQuery = (globalSearch || searchTerm).toLowerCase();
    const matchesSearch =
      !activeQuery ||
      name.toLowerCase().includes(activeQuery) ||
      clientName.toLowerCase().includes(activeQuery) ||
      lead.toLowerCase().includes(activeQuery) ||
      sol.toLowerCase().includes(activeQuery);

    const activeStatusFilter = statusFilterExternal ?? statusFilter;
    const matchesStatus = restrictToLive
      ? project.statusLabel === "Live"
      : activeStatusFilter === "all" ||
        project.statusLabel === activeStatusFilter;
    const matchesLocation =
      locationFilter === "all" || location === locationFilter;

    const matchesClient =
      clientFilterId == null ||
      Number(project.clientId) === Number(clientFilterId);
    return matchesSearch && matchesStatus && matchesLocation && matchesClient;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>
                {restrictToLive ? "Active Projects" : "All Projects"}
              </CardTitle>
              <div className="flex gap-2">
                {clientFilterId != null && (
                  <div className="flex items-center gap-2 text-xs rounded border px-2 py-1 bg-muted">
                    <span className="font-medium">
                      Client ID: {clientFilterId}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-[10px] leading-none"
                      onClick={() => onClearClientFilter?.()}
                    >
                      Clear
                    </Button>
                  </div>
                )}
                {statusFilterExternal && statusFilterExternal !== "all" && (
                  <div className="flex items-center gap-2 text-xs rounded border px-2 py-1 bg-muted">
                    <span className="font-medium">
                      Status: {statusFilterExternal}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-[10px] leading-none"
                      onClick={() => onClearStatusFilter?.()}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {!hideAddProject && (
                <AddProjectDialog onProjectAdded={handleProjectAdded} />
              )}
              {/* Local search retained as a secondary filter; hidden if global search active */}
              {!globalSearch && (
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80"
                />
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All Statuses
                  </DropdownMenuItem>
                  {STATUS_OPTIONS.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => setStatusFilter(s)}
                    >
                      {s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Location
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setLocationFilter("all")}>
                    All Locations
                  </DropdownMenuItem>
                  {LOCATION_OPTIONS.map((loc) => (
                    <DropdownMenuItem
                      key={loc}
                      onClick={() => setLocationFilter(loc)}
                    >
                      {loc}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading projects...</div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {showTLSelect && (
                    <TableHead className="w-36">Assign TL</TableHead>
                  )}
                  {showClientSelect && (
                    <TableHead className="w-36">Select Client</TableHead>
                  )}
                  <TableHead>Sol Project No</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Client PM</TableHead>
                  <TableHead>Team Lead</TableHead>
                  <TableHead>Estimated Completion</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        9 + (showTLSelect ? 1 : 0) + (showClientSelect ? 1 : 0)
                      }
                      className="text-center py-8 text-muted-foreground"
                    >
                      No projects found. Click "Add Project" to create your
                      first project.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest(
                            'button, a, select, input, textarea, [data-no-row-nav], [contenteditable="true"]'
                          )
                        ) {
                          return; // ignore clicks on interactive elements
                        }
                        navigate(`/projects/${project.id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/projects/${project.id}`);
                        }
                      }}
                    >
                      {showTLSelect && (
                        <TableCell>
                          <select
                            value={String(project.solTLId ?? "")}
                            onChange={async (e) => {
                              const val = e.target.value;
                              // Optimistic UI update
                              setProjects((prev) =>
                                prev.map((p) =>
                                  p.id === project.id
                                    ? {
                                        ...p,
                                        solTLId: val ? Number(val) : null,
                                        teamLead:
                                          leads.find((l) => l.id === val)
                                            ?.name ?? "",
                                      }
                                    : p
                                )
                              );
                              console.log("Assign TL locally", project.id, val);
                              // TODO: wire Supabase update to persist assignment
                            }}
                            className="rounded border px-2 py-1 text-sm"
                          >
                            <option value="">—</option>
                            {leads.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                      )}
                      {showClientSelect && (
                        <TableCell>
                          <select
                            value={String(project.clientId ?? "")}
                            onChange={async (e) => {
                              const val = e.target.value;
                              setProjects((prev) =>
                                prev.map((p) =>
                                  p.id === project.id
                                    ? {
                                        ...p,
                                        clientId: val ? Number(val) : null,
                                        client:
                                          clientsList.find((c) => c.id === val)
                                            ?.name ?? String(val),
                                      }
                                    : p
                                )
                              );
                              console.log(
                                "Assign Client locally",
                                project.id,
                                val
                              );
                              // TODO: persist client assignment to Supabase if desired
                            }}
                            className="rounded border px-2 py-1 text-sm"
                          >
                            <option value="">—</option>
                            {clientsList.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                      )}
                      <TableCell className="text-muted-foreground">
                        {project.solProjectNo || project.projectNo || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{project.name}</div>
                      </TableCell>
                      <TableCell>{project.client}</TableCell>
                      <TableCell>
                        {project.clientPM || (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {project.teamLead ? (
                          project.teamLead
                        ) : (
                          <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            TBD
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {project.expectedCompletion
                          ? String(project.expectedCompletion).slice(0, 10)
                          : project.estimationDate
                          ? String(project.estimationDate).slice(0, 10)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={Number(project.progress) || 0}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">
                            {Number(project.progress) || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusColor(
                            project.statusLabel || project.status || ""
                          )}
                        >
                          {project.statusLabel || project.status || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() =>
                                navigate(`/projects/${project.id}`)
                              }
                              data-no-row-nav
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                // open the single edit dialog
                                setEditProject(project);
                                setEditOpen(true);
                              }}
                              data-no-row-nav
                            >
                              Edit Project
                            </DropdownMenuItem>
                            <DropdownMenuItem>Assign Team</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => {
                                setProjectToDelete(project);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                              data-no-row-nav
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {/* Controlled edit dialog rendered once to avoid nested dialog inside menu */}
      {editProject && (
        <AddProjectDialog
          isEdit
          hideTrigger
          initialData={{
            id: editProject.id,
            projectNo: editProject.projectNo,
            solProjectNo: editProject.solProjectNo,
            name: editProject.name,
            description: editProject.description,
            clientId: editProject.clientId ?? undefined,
            clientPm: editProject.clientPm ?? undefined,
            solTLId: (editProject as any).solTLId ?? undefined,
            branch: editProject.branch ?? undefined,
            status: editProject.status,
            progress: editProject.progress,
            endDate: editProject.endDate,
          }}
          open={editOpen}
          onOpenChange={(o) => setEditOpen(o)}
          onProjectAdded={() => {
            handleProjectAdded();
            setEditOpen(false);
            setEditProject(null);
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"?
              <br />
              <br />
              <strong>⚠️ Warning:</strong> This action cannot be undone. Choose
              how to proceed:
              <br />
              <br />• <strong>Delete Project:</strong> Safe deletion that
              respects data relationships (recommended)
              <br />• <strong>Force Delete All:</strong> Remove the project AND
              all related data (documents, logs, etc.)
              <br />
              <br />
              <span className="text-orange-600 font-medium">
                ⚠️ Force Delete will permanently remove ALL related data and
                cannot be undone!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteProject(false)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 mr-2"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Project
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleDeleteProject(true)}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Force Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
