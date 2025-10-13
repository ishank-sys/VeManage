import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ──────────────────────────────────────────────
// Interfaces
// ──────────────────────────────────────────────
interface ProjectRecord {
  id: number;
  name: string;
  clientId?: number | null;
  description?: string | null;
  status?: string | null;
  progress?: number | null;
  solProjectNo?: string | null;
  projectNo?: string | null;
  branch?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  expectedCompletion?: string | null;
  solTLId?: number | null;
  estimationDate?: string | null;
  totalProjectHours?: number | null;
  actualProjectHours?: number | null;
  totalSheetQty?: number | null;
  solJobNo?: string | null;
  projectType?: string | null;
  projectSubType?: string | null;
  weightTonnage?: number | null;
  totalDays?: number | null;
  lastActivityDate?: string | null;
  lastUpdated?: string | null;
  priority?: string | null;
  projectComplexity?: string | null;
  createdAt?: string | null;
}

interface RFIRecord {
  id: number;
  projectId: number;
  rfiNumber?: string | null;
  date?: string | null;
  status?: string | null;
  remark?: string | null;
}

interface PackageRecord {
  id: number;
  projectid: number;
  name: string;
  packagenumber?: string | null;
  tentativedate?: string | null;
  issuedate?: string | null;
  status?: string | null;
  tasks?: any[];
  notes?: string | null;
  createdat?: string | null;
  updatedat?: string | null;
}

// ──────────────────────────────────────────────
// Utility styling helpers
// ──────────────────────────────────────────────
const STATUS_CLASS: Record<string, string> = {
  Live: "bg-primary text-primary-foreground",
  "Sent For Approval": "bg-secondary text-secondary-foreground",
  "Sent for Fabrication": "bg-secondary text-secondary-foreground",
  Closed: "bg-muted text-muted-foreground",
  "On-Hold": "bg-warning text-warning-foreground",
  Cancelled: "bg-destructive text-destructive-foreground",
  "See Remarks": "bg-muted text-muted-foreground",
};

const rfiStatusColor = (s?: string | null) => {
  if (!s) return "bg-secondary text-secondary-foreground";
  const lc = s.toLowerCase();
  if (lc.includes("pend")) return "bg-warning text-warning-foreground";
  if (lc.includes("clos") || lc.includes("done") || lc.includes("comp"))
    return "bg-success text-success-foreground";
  return "bg-secondary text-secondary-foreground";
};

const pkgStatusColor = (s?: string | null) => {
  if (!s) return "bg-secondary text-secondary-foreground";
  if (s === "IFC") return "bg-success text-success-foreground";
  if (s === "BFA") return "bg-primary text-primary-foreground";
  if (s.toLowerCase().includes("ffs")) return "bg-muted text-muted-foreground";
  return "bg-secondary text-secondary-foreground";
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
const ProjectDetailPage = () => {
  const { id } = useParams();
  const projectId = id ? Number(id) : NaN;

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);

  const [rfiList, setRfiList] = useState<RFIRecord[]>([]);
  const [pkgList, setPkgList] = useState<PackageRecord[]>([]);
  const [loadingRfi, setLoadingRfi] = useState(false);
  const [loadingPkg, setLoadingPkg] = useState(false);

  const [openRfiDialog, setOpenRfiDialog] = useState(false);
  const [openPkgDialog, setOpenPkgDialog] = useState(false);

  const [newRfi, setNewRfi] = useState({
    rfiNumber: "",
    date: "",
    status: "",
    remark: "",
  });
  const [newPkg, setNewPkg] = useState({
    name: "",
    packageNumber: "",
    tentativeDate: "",
    status: "",
  });

  // ──────────────────────────────────────────────
  // Fetch project
  // ──────────────────────────────────────────────
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;
      try {
        setLoadingProject(true);
        const { data, error } = await supabase
          .from("Project")
          .select("*")
          .eq("id", projectId)
          .single();
        if (error) throw error;
        setProject(data as any);
      } catch (e) {
        console.error("Project load error:", e);
        setProject(null);
      } finally {
        setLoadingProject(false);
      }
    };
    loadProject();
  }, [projectId]);

  // ──────────────────────────────────────────────
  // Fetch RFIs
  // ──────────────────────────────────────────────
  const reloadRfi = async () => {
    if (!projectId) return;
    try {
      setLoadingRfi(true);
      const { data, error } = await supabase
        .from("ProjectRFI")
        .select("*")
        .eq("projectId", projectId)
        .order("date", { ascending: false });
      if (error) throw error;
      setRfiList((data || []) as any);
    } catch (e) {
      console.error("RFI load error", e);
    } finally {
      setLoadingRfi(false);
    }
  };

  useEffect(() => {
    reloadRfi();
  }, [projectId]);

  // ──────────────────────────────────────────────
  // Fetch Packages
  // ──────────────────────────────────────────────
  const reloadPackages = async () => {
    if (!projectId) return;
    try {
      setLoadingPkg(true);
      const { data, error } = await supabase
        .from("ProjectPackage")
        .select("*")
        .eq("projectid", projectId)
        .order("tentativedate", { ascending: true });
      if (error) throw error;
      setPkgList((data || []) as any);
    } catch (e) {
      console.error("Package load error", e);
    } finally {
      setLoadingPkg(false);
    }
  };

  useEffect(() => {
    reloadPackages();
  }, [projectId]);

  // ──────────────────────────────────────────────
  // Insert RFI / Package
  // ──────────────────────────────────────────────
  const handleAddRfi = async () => {
    if (!projectId) return;
    try {
      const payload = { projectId, ...newRfi };
      const { error } = await supabase
        .from("ProjectRFI")
        .insert(payload as any);
      if (error) throw error;
      setNewRfi({ rfiNumber: "", date: "", status: "", remark: "" });
      setOpenRfiDialog(false);
      reloadRfi();
    } catch (e) {
      console.error("Add RFI failed", e);
    }
  };

  const handleAddPackage = async () => {
    if (!projectId) return;
    try {
      if (!newPkg.name) return;
      const payload = {
        projectid: projectId,
        name: newPkg.name,
        packagenumber: newPkg.packageNumber || null,
        tentativedate: newPkg.tentativeDate || null,
        status: newPkg.status || null,
      };
      const { error } = await supabase
        .from("ProjectPackage")
        .insert(payload as any);
      if (error) throw error;
      setNewPkg({ name: "", packageNumber: "", tentativeDate: "", status: "" });
      setOpenPkgDialog(false);
      reloadPackages();
    } catch (e) {
      console.error("Add Package failed", e);
    }
  };

  // ──────────────────────────────────────────────
  // Derived values
  // ──────────────────────────────────────────────
  const progress = project?.progress ?? 0;
  const statusClass =
    STATUS_CLASS[project?.status || ""] ||
    "bg-secondary text-secondary-foreground";

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <DashboardLayout>
      {loadingProject ? (
        <div className="text-sm text-muted-foreground">Loading project...</div>
      ) : !project ? (
        <div className="text-sm text-destructive">Project not found.</div>
      ) : (
        <>
          {/* ─────────────── Header ─────────────── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">{project.name}</h1>
              <p className="text-muted-foreground text-sm">
                {project.solProjectNo || project.projectNo}{" "}
                {project.branch && <>• {project.branch}</>}
              </p>
            </div>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">Status</div>
                <Badge className={statusClass}>{project.status || "-"}</Badge>
              </div>
              <div className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <span>Progress</span>
                  <span className="text-primary font-semibold">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="w-36 h-2 mt-1" />
              </div>
            </div>
          </div>

          {/* ─────────────── Tabs ─────────────── */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-muted/30">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="rfi">RFI</TabsTrigger>
              <TabsTrigger value="packages">Packages</TabsTrigger>
              <TabsTrigger value="submittals">Submittals</TabsTrigger>
              <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Snapshot</CardTitle>
                  <CardDescription>
                    Quick summary of project status
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase">
                      RFIs
                    </div>
                    <div className="font-semibold">{rfiList.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase">
                      Packages
                    </div>
                    <div className="font-semibold">{pkgList.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase">
                      Hours (Est/Act)
                    </div>
                    <div className="font-semibold">
                      {project.totalProjectHours || "-"} /{" "}
                      {project.actualProjectHours || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px] uppercase">
                      Priority
                    </div>
                    <Badge
                      variant={
                        project.priority === "HIGH"
                          ? "destructive"
                          : project.priority === "MEDIUM"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {project.priority || "Not Set"}
                    </Badge>
                  </div>
                  <div className="col-span-2 md:col-span-4">
                    <div className="text-muted-foreground text-[10px] uppercase mb-1">
                      Description
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                      {project.description || "-"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* RFI */}
            <TabsContent value="rfi">
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <CardTitle>Requests for Information</CardTitle>
                  <Dialog open={openRfiDialog} onOpenChange={setOpenRfiDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" /> Add RFI
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New RFI</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input
                          placeholder="RFI Number"
                          value={newRfi.rfiNumber}
                          onChange={(e) =>
                            setNewRfi((r) => ({
                              ...r,
                              rfiNumber: e.target.value,
                            }))
                          }
                        />
                        <Input
                          type="date"
                          value={newRfi.date}
                          onChange={(e) =>
                            setNewRfi((r) => ({ ...r, date: e.target.value }))
                          }
                        />
                        <Input
                          placeholder="Status"
                          value={newRfi.status}
                          onChange={(e) =>
                            setNewRfi((r) => ({ ...r, status: e.target.value }))
                          }
                        />
                        <Input
                          placeholder="Remark"
                          value={newRfi.remark}
                          onChange={(e) =>
                            setNewRfi((r) => ({ ...r, remark: e.target.value }))
                          }
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenRfiDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAddRfi}
                            disabled={!newRfi.status && !newRfi.remark}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {loadingRfi ? (
                    <div className="text-xs text-muted-foreground">
                      Loading RFIs...
                    </div>
                  ) : rfiList.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      No RFIs yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>RFI</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Remark</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rfiList.map((rfi, idx) => (
                            <TableRow key={rfi.id}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>{rfi.rfiNumber || "-"}</TableCell>
                              <TableCell>{rfi.date || "-"}</TableCell>
                              <TableCell>
                                <Badge className={rfiStatusColor(rfi.status)}>
                                  {rfi.status || "-"}
                                </Badge>
                              </TableCell>
                              <TableCell>{rfi.remark || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Packages */}
            <TabsContent value="packages">
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <CardTitle>Project Packages</CardTitle>
                  <Dialog open={openPkgDialog} onOpenChange={setOpenPkgDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" /> Add Package
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New Package</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input
                          placeholder="Name *"
                          value={newPkg.name}
                          onChange={(e) =>
                            setNewPkg((p) => ({ ...p, name: e.target.value }))
                          }
                        />
                        <Input
                          placeholder="Number"
                          value={newPkg.packageNumber || ""}
                          onChange={(e) =>
                            setNewPkg((p) => ({
                              ...p,
                              packageNumber: e.target.value,
                            }))
                          }
                        />
                        <Input
                          type="date"
                          placeholder="Tentative Date"
                          value={newPkg.tentativeDate}
                          onChange={(e) =>
                            setNewPkg((p) => ({
                              ...p,
                              tentativeDate: e.target.value,
                            }))
                          }
                        />
                        <Input
                          placeholder="Status"
                          value={newPkg.status}
                          onChange={(e) =>
                            setNewPkg((p) => ({ ...p, status: e.target.value }))
                          }
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenPkgDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAddPackage}
                            disabled={!newPkg.name}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {loadingPkg ? (
                    <div className="text-xs text-muted-foreground">
                      Loading packages...
                    </div>
                  ) : pkgList.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      No packages yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Number</TableHead>
                            <TableHead>Tentative</TableHead>
                            <TableHead>Issued</TableHead>
                            <TableHead>Tasks</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pkgList.map((pkg) => {
                            const tasksCount = Array.isArray(pkg.tasks)
                              ? pkg.tasks.length
                              : 0;
                            return (
                              <TableRow key={pkg.id}>
                                <TableCell className="font-medium">
                                  {pkg.name}
                                </TableCell>
                                <TableCell>
                                  {pkg.packagenumber || "-"}
                                </TableCell>
                                <TableCell>
                                  {pkg.tentativedate || "-"}
                                </TableCell>
                                <TableCell>{pkg.issuedate || "-"}</TableCell>
                                <TableCell>{tasksCount}</TableCell>
                                <TableCell>
                                  <Badge className={pkgStatusColor(pkg.status)}>
                                    {pkg.status || "-"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Submittals */}
            <TabsContent value="submittals">
              <Card>
                <CardHeader>
                  <CardTitle>Submittals</CardTitle>
                  <CardDescription>
                    Track document and approval progress (placeholder)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    No submittals yet.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gantt Chart */}
            <TabsContent value="gantt">
              <Card>
                <CardHeader>
                  <CardTitle>Package Schedule (Tentative vs Issued)</CardTitle>
                </CardHeader>
                <CardContent>
                  {pkgList.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      No packages to visualize yet.
                    </div>
                  ) : (
                    <TimelineChart packages={pkgList} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </DashboardLayout>
  );
};

// ──────────────────────────────────────────────
// Timeline Component (unchanged)
// ──────────────────────────────────────────────
interface TimelineChartProps {
  packages: PackageRecord[];
}

const TimelineChart: React.FC<TimelineChartProps> = ({ packages }) => {
  const rows = packages
    .map((p) => {
      const tent = p.tentativedate ? new Date(p.tentativedate) : null;
      const issued = p.issuedate ? new Date(p.issuedate) : null;
      return { id: p.id, name: p.name, tentative: tent, issued };
    })
    .filter((r) => r.tentative || r.issued);

  if (rows.length === 0)
    return (
      <div className="text-xs text-muted-foreground">
        No tentative / issued dates available.
      </div>
    );

  const times = rows.flatMap((r) =>
    [r.tentative, r.issued].filter(Boolean).map((d) => (d as Date).getTime())
  );
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const span = Math.max(1, maxT - minT);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-primary" /> Planned (Tentative)
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-green-500 dark:bg-green-400" />{" "}
          Actual (Issued)
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-destructive/70" /> Delay
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => {
          const t = r.tentative?.getTime();
          const i = r.issued?.getTime();
          const delay = t && i && i > t ? i - t : 0;
          const delayDays = delay ? Math.round(delay / 86400000) : 0;

          return (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded border bg-background/40 px-2 py-2"
            >
              <div className="w-40 text-xs font-medium truncate">{r.name}</div>
              <div className="flex-1 relative h-5 rounded bg-muted overflow-hidden">
                {t && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-primary"
                    style={{ left: `${((t - minT) / span) * 100}%` }}
                  />
                )}
                {i && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-green-500"
                    style={{ left: `${((i - minT) / span) * 100}%` }}
                  />
                )}
                {t && i && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-px bg-border"
                    style={{
                      left: `${((Math.min(t, i) - minT) / span) * 100}%`,
                      width: `${(Math.abs(i - t) / span) * 100}%`,
                    }}
                  />
                )}
                {delayDays > 0 && t && i && (
                  <div
                    className="absolute top-0 h-full bg-destructive/40"
                    style={{
                      left: `${((t - minT) / span) * 100}%`,
                      width: `${((i - t) / span) * 100}%`,
                    }}
                  />
                )}
              </div>
              <div className="w-16 text-right text-[11px] tabular-nums">
                {delayDays > 0 ? `+${delayDays}d` : "On time"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectDetailPage;
