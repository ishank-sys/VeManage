/**
 * SQL (Supabase) – run these once to create related tables
 *
 * create table if not exists "ProjectRFI" (
 *   id bigint generated always as identity primary key,
 *   projectId bigint not null references "Project"(id) on delete cascade,
 *   rfiNumber text,
 *   date date,
 *   status text,
 *   remark text,
 *   createdAt timestamptz default now()
 * );
 * create index if not exists projectrfi_projectid_idx on "ProjectRFI"(projectId);
 *
 * create table if not exists "ProjectPackage" (
 *   id bigint generated always as identity primary key,
 *   projectId bigint not null references "Project"(id) on delete cascade,
 *   name text not null,
 *   packageNumber text,
 *   tentativeDate date,
 *   status text,
 *   createdAt timestamptz default now()
 * );
 * create index if not exists projectpackage_projectid_idx on "ProjectPackage"(projectId);
 */
import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
// Tabs removed per new layout (overview static + side-by-side RFI & Packages)
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

interface ProjectRecord {
  id: number;
  name: string;
  clientId?: number | null;
  description?: string | null;
  status?: string | null;
  progress?: number | null;
  solProjectNo?: string | null;
  projectNo?: string | null;
  branch?: string | null; // location
  startDate?: string | null;
  endDate?: string | null;
  expectedCompletion?: string | null;
  solTLId?: number | null;
  // Enhanced fields from full schema
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

// NOTE: Actual DB column names are lowercase (no quotes used in DDL)
// projectid, packagenumber, tentativedate, issuedate, createdat, updatedat
// Keep interface aligned with DB response shape from Supabase
interface PackageRecord {
  id: number;
  projectid: number;
  name: string;
  packagenumber?: string | null;
  tentativedate?: string | null;
  issuedate?: string | null;
  status?: string | null;
  tasks?: any[]; // jsonb array
  notes?: string | null;
  createdat?: string | null;
  updatedat?: string | null;
}

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

const ProjectDetailPage = () => {
  const { id } = useParams();
  const projectId = id ? Number(id) : NaN;
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);

  const [rfiList, setRfiList] = useState<RFIRecord[]>([]);
  const [loadingRfi, setLoadingRfi] = useState(false);
  const [pkgList, setPkgList] = useState<PackageRecord[]>([]);
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

  // FETCH PROJECT
  useEffect(() => {
    const load = async () => {
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
        console.error("Failed to load project", e);
        setProject(null);
      } finally {
        setLoadingProject(false);
      }
    };
    load();
  }, [projectId]);

  // FETCH RFIs
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

  // FETCH Packages
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
      // Map camelCase form fields to actual DB column names
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

  const progress = project?.progress ?? 0;
  const statusClass =
    STATUS_CLASS[project?.status || ""] ||
    "bg-secondary text-secondary-foreground";

  const pkgStatusCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    pkgList.forEach((p) => {
      const key = p.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, [pkgList]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Loading / Not Found */}
        {loadingProject ? (
          <div className="text-sm text-muted-foreground">
            Loading project...
          </div>
        ) : !project ? (
          <div className="text-sm text-destructive">Project not found.</div>
        ) : (
          <>
            {/* Compact Header */}
            <Card className="shadow-sm">
              <CardContent className="flex items-start justify-between p-4 gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-semibold truncate">
                    {project.name}
                  </h1>
                  <p className="text-muted-foreground mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="truncate">
                      {project.solProjectNo || project.projectNo}
                    </span>
                    {project.branch && <span>• {project.branch}</span>}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge className={statusClass}>
                      {project.status || "-"}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm font-medium">
                    <div className="flex items-center gap-3">
                      <div>Progress</div>
                      <div className="text-primary font-semibold">
                        {progress}%
                      </div>
                    </div>
                    <Progress value={progress} className="w-36 h-2 mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compact Snapshot & Details */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-m">
                  <div className="space-y-1 py-1">
                    <div className="uppercase text-muted-foreground text-[10px]">
                      RFIs
                    </div>
                    <div className="font-semibold text-sm">
                      {rfiList.length}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {
                        rfiList.filter((r) =>
                          r.status?.toLowerCase().includes("pend")
                        ).length
                      }{" "}
                      pending
                    </div>
                  </div>
                  <div className="space-y-1 py-1">
                    <div className="uppercase text-muted-foreground text-[10px]">
                      Packages
                    </div>
                    <div className="font-semibold text-sm">
                      {pkgList.length}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {Object.keys(pkgStatusCounts).length} statuses
                    </div>
                  </div>
                  <div className="space-y-1 py-1">
                    <div className="uppercase text-muted-foreground text-[10px]">
                      Hours (Est/Act)
                    </div>
                    <div className="font-semibold text-sm">
                      {project.totalProjectHours || "-"} /{" "}
                      {project.actualProjectHours || "-"}
                    </div>
                    {project.totalProjectHours &&
                      project.actualProjectHours && (
                        <div className="text-[11px] text-muted-foreground">
                          {(
                            (project.actualProjectHours /
                              project.totalProjectHours) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                      )}
                  </div>
                  <div className="space-y-1 py-1">
                    <div className="uppercase text-muted-foreground text-[10px]">
                      Days
                    </div>
                    <div className="font-semibold text-sm">
                      {project.totalDays || "-"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {project.branch || "-"}
                    </div>
                  </div>
                  <div className="space-y-1 py-1">
                    <div className="uppercase text-muted-foreground text-[10px]">
                      Priority
                    </div>
                    <div>
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
                  </div>
                  <div className="space-y-1 py-1">
                    <div className="uppercase text-muted-foreground text-[10px]">
                      Complexity
                    </div>
                    <div>
                      <Badge
                        variant={
                          project.projectComplexity === "HIGH"
                            ? "destructive"
                            : project.projectComplexity === "MEDIUM"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {project.projectComplexity || "Not Set"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1 py-1 col-span-2 md:col-span-4">
                    <div className="uppercase text-muted-foreground text-[10px]">
                      Description
                    </div>
                    <div className="text-xs text-muted-foreground leading-snug max-h-20 overflow-y-auto whitespace-pre-wrap bg-muted/20 p-2 rounded">
                      {project.description || "-"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* (old statistics condensed into Snapshot above) */}

            {/* Side-by-side layout: RFIs (left) and Packages (right) */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* RFIs */}
              <Card>
                <CardHeader className="flex items-center justify-between">
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
                          placeholder="Date"
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
                <CardContent className="p-2">
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
                      <Table className="text-[13px]">
                        <TableHeader>
                          <TableRow className="text-[12px]">
                            <TableHead className="w-6">#</TableHead>
                            <TableHead>RFI</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Remark</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rfiList.map((rfi, idx) => (
                            <TableRow key={rfi.id} className="text-xs">
                              <TableCell className="py-1">{idx + 1}</TableCell>
                              <TableCell className="py-1">
                                {rfi.rfiNumber || "-"}
                              </TableCell>
                              <TableCell className="py-1">
                                {rfi.date || "-"}
                              </TableCell>
                              <TableCell className="py-1">
                                <Badge className={rfiStatusColor(rfi.status)}>
                                  {rfi.status || "-"}
                                </Badge>
                              </TableCell>
                              <TableCell
                                className="py-1 max-w-[260px] truncate"
                                title={rfi.remark || ""}
                              >
                                {rfi.remark || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Packages */}
              <Card>
                <CardHeader className="flex items-center justify-between">
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
                <CardContent className="p-2">
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
                      <Table className="text-[13px]">
                        <TableHeader>
                          <TableRow className="text-[12px]">
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
                              <TableRow key={pkg.id} className="text-xs">
                                <TableCell className="py-1 font-medium">
                                  {pkg.name}
                                </TableCell>
                                <TableCell className="py-1">
                                  {pkg.packagenumber || "-"}
                                </TableCell>
                                <TableCell className="py-1">
                                  {pkg.tentativedate || "-"}
                                </TableCell>
                                <TableCell className="py-1">
                                  {pkg.issuedate || "-"}
                                </TableCell>
                                <TableCell className="py-1">
                                  {tasksCount}
                                </TableCell>
                                <TableCell className="py-1">
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
            </div>

            {/* Tentative vs Issued Timeline */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Package Schedule (Tentative vs Issued)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {pkgList.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    No packages to visualize yet.
                  </div>
                ) : (
                  <TimelineChart packages={pkgList} />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// Lightweight in-file component (avoids extra dependency) rendering a pseudo-Gantt timeline
interface TimelineChartProps {
  packages: PackageRecord[];
}

const TimelineChart: React.FC<TimelineChartProps> = ({ packages }) => {
  // Collect valid dates
  const rows = packages
    .map((p) => {
      const tent = p.tentativedate ? new Date(p.tentativedate) : null;
      const issued = p.issuedate ? new Date(p.issuedate) : null;
      return {
        id: p.id,
        name: p.name,
        tentative: tent,
        issued,
      };
    })
    .filter((r) => r.tentative || r.issued);

  if (rows.length === 0)
    return (
      <div className="text-xs text-muted-foreground">
        No tentative / issued dates available.
      </div>
    );

  const times: number[] = [];
  rows.forEach((r) => {
    if (r.tentative) times.push(r.tentative.getTime());
    if (r.issued) times.push(r.issued.getTime());
  });
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const span = Math.max(1, maxT - minT); // avoid divide by zero

  const format = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "-");

  // Color mapping consistent with palette used earlier (primary / success / destructive)
  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-primary" /> Planned (Tentative)
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-green-500 dark:bg-green-400" />{" "}
          Actual (Issued)
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-destructive/70" /> Delay Window
        </div>
        <div className="ml-auto text-[10px]">
          Range: {new Date(minT).toISOString().slice(0, 10)} →{" "}
          {new Date(maxT).toISOString().slice(0, 10)}
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((r) => {
          const tPos = r.tentative
            ? ((r.tentative.getTime() - minT) / span) * 100
            : null;
          const iPos = r.issued
            ? ((r.issued.getTime() - minT) / span) * 100
            : null;
          const delay =
            r.tentative && r.issued
              ? r.issued.getTime() - r.tentative.getTime()
              : 0;
          const delayDays = delay > 0 ? Math.round(delay / 86400000) : 0;
          const left = tPos != null ? tPos : iPos != null ? iPos : 0;
          const right = iPos != null ? iPos : tPos != null ? tPos : 0;
          const delayLeft =
            tPos != null && iPos != null && iPos > tPos ? tPos : null;
          const delayWidth =
            tPos != null && iPos != null && iPos > tPos ? iPos - tPos : 0;
          return (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded border bg-background/40 px-2 py-2"
            >
              <div
                className="w-40 min-w-[8rem] text-xs font-medium truncate"
                title={r.name}
              >
                {r.name}
              </div>
              <div className="flex-1 relative h-5 rounded bg-muted overflow-hidden">
                {delayLeft != null && delayWidth > 0 && (
                  <div
                    className="absolute top-0 h-full bg-destructive/40"
                    style={{ left: `${delayLeft}%`, width: `${delayWidth}%` }}
                    title={`Delay window (${delayDays}d)`}
                  />
                )}
                {tPos != null && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-primary"
                    style={{ left: `${tPos}%` }}
                    title={`Tentative: ${format(r.tentative)}`}
                  />
                )}
                {iPos != null && (
                  <div
                    className={`absolute top-0 h-full w-0.5 ${
                      delayDays > 0
                        ? "bg-green-500 dark:bg-green-400"
                        : "bg-green-500 dark:bg-green-400"
                    }`}
                    style={{ left: `${iPos}%` }}
                    title={`Issued: ${format(r.issued)}`}
                  />
                )}
                {/* Connect line if both exist */}
                {tPos != null && iPos != null && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-px bg-border"
                    style={{
                      left: `${Math.min(tPos, iPos)}%`,
                      width: `${Math.abs(iPos - tPos)}%`,
                    }}
                  />
                )}
              </div>
              <div className="w-20 text-right text-[11px] tabular-nums">
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
