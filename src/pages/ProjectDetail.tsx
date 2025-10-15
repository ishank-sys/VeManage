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
import { Plus, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  ifaversion?: string | null;
  ifcversion?: string | null;
  ifadate?: string | null;
  bfadate?: string | null;
  ifcdate?: string | null;
  drawingCount?: number | null;
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
  const [pkgToEdit, setPkgToEdit] = useState<PackageRecord | null>(null);

  const [newRfi, setNewRfi] = useState({
    rfiNumber: "",
    date: "",
    status: "",
    remark: "",
  });
  const [newPkg, setNewPkg] = useState({
    serialNo: "",
    name: "",
    ifaDate: "",
    bfaDate: "",
    ifcDate: "",
    submitalStatus: "IN_PROGRESS",
    remarks: "",
    ifaVersion: "",
    ifcVersion: "",
  });
  // When non-null, `pkgToEdit` indicates we're editing an existing package.

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
        packagenumber: newPkg.serialNo || null,
        ifadate: newPkg.ifaDate || null,
        bfadate: newPkg.bfaDate || null,
        ifcdate: newPkg.ifcDate || null,
        ifaversion: newPkg.ifaVersion || null,
        ifcversion: newPkg.ifcVersion || null,
        status: newPkg.submitalStatus || "IN_PROGRESS",
        notes: newPkg.remarks || null,
      } as any;

      console.log("Saving package payload:", payload, "pkgToEdit:", pkgToEdit);
      // helper to perform update/insert
      const performSave = async (pl: any) => {
        if (pkgToEdit) {
          const { data: updated, error } = await (supabase as any)
            .from("ProjectPackage")
            .update(pl as any)
            .eq("id", pkgToEdit.id)
            .select()
            .single();
          if (error) throw error;
          return updated;
        } else {
          const insertPayload = { ...pl, tasks: [], drawingCount: 0 };
          const { data: inserted, error } = await (supabase as any)
            .from("ProjectPackage")
            .insert(insertPayload as any)
            .select()
            .single();
          if (error) throw error;
          return inserted;
        }
      };

      try {
        const result = await performSave(payload);
        console.log(
          pkgToEdit ? "Updated package:" : "Inserted package:",
          result
        );
        toast({
          title: pkgToEdit ? "Package updated" : "Package created",
          description: `${result?.name} saved successfully.`,
        });
      } catch (e: any) {
        // If PostgREST schema cache missing columns (PGRST204), retry without version fields
        const msg = String(e?.message || e);
        if (
          e?.code === "PGRST204" ||
          msg.includes("Could not find the 'ifaversion'") ||
          msg.includes("ifaversion") ||
          msg.includes("ifcversion")
        ) {
          console.warn(
            "Schema missing version columns, retrying without them:",
            msg
          );
          const fallback = { ...payload };
          delete fallback.ifaversion;
          delete fallback.ifcversion;
          try {
            const result2 = await performSave(fallback);
            console.log("Saved without version columns:", result2);
            toast({
              title: pkgToEdit
                ? "Package updated (partial)"
                : "Package created (partial)",
              description: `${result2?.name} saved but version fields are not present in DB.`,
            });
          } catch (e2) {
            throw e2;
          }
        } else {
          throw e;
        }
      }

      // reset
      setNewPkg({
        serialNo: "",
        name: "",
        ifaDate: "",
        bfaDate: "",
        ifcDate: "",
        submitalStatus: "IN_PROGRESS",
        remarks: "",
        ifaVersion: "",
        ifcVersion: "",
      });
      setPkgToEdit(null);
      setOpenPkgDialog(false);
      await reloadPackages();
    } catch (e) {
      console.error("Add Package failed", e);
      toast({
        title: "Save failed",
        description: String(e),
        variant: "destructive" as any,
      });
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
                            <TableHead>S.No</TableHead>
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
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end mb-3">
                    <Dialog
                      open={openPkgDialog}
                      onOpenChange={(v) => {
                        setOpenPkgDialog(v);
                        if (!v) setPkgToEdit(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                          <Plus className="h-4 w-4" /> Add Package
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {pkgToEdit ? "Edit Package" : "New Package"}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium">
                                S.No
                              </label>
                              <Input
                                placeholder="S.No"
                                value={newPkg.serialNo}
                                onChange={(e) =>
                                  setNewPkg((p) => ({
                                    ...p,
                                    serialNo: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">
                                Name *
                              </label>
                              <Input
                                placeholder="Package Name"
                                value={newPkg.name}
                                onChange={(e) =>
                                  setNewPkg((p) => ({
                                    ...p,
                                    name: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-sm font-medium">
                                IFA Date
                              </label>
                              <Input
                                type="date"
                                value={newPkg.ifaDate}
                                onChange={(e) =>
                                  setNewPkg((p) => ({
                                    ...p,
                                    ifaDate: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">
                                BFA Date
                              </label>
                              <Input
                                type="date"
                                value={newPkg.bfaDate}
                                onChange={(e) =>
                                  setNewPkg((p) => ({
                                    ...p,
                                    bfaDate: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">
                                IFC Date
                              </label>
                              <Input
                                type="date"
                                value={newPkg.ifcDate}
                                onChange={(e) =>
                                  setNewPkg((p) => ({
                                    ...p,
                                    ifcDate: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium">
                                IFA Version
                              </label>
                              <Input
                                placeholder="e.g., IFA-01"
                                value={newPkg.ifaVersion}
                                onChange={(e) =>
                                  setNewPkg((p) => ({
                                    ...p,
                                    ifaVersion: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">
                                IFC Version
                              </label>
                              <Input
                                placeholder="e.g., IFC-01"
                                value={newPkg.ifcVersion}
                                onChange={(e) =>
                                  setNewPkg((p) => ({
                                    ...p,
                                    ifcVersion: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          {/* Tentative/Actual date inputs removed per request */}

                          <div>
                            <label className="text-sm font-medium">
                              Submital Status
                            </label>
                            <select
                              className="w-full rounded border px-3 py-2 text-sm"
                              value={newPkg.submitalStatus}
                              onChange={(e) =>
                                setNewPkg((p) => ({
                                  ...p,
                                  submitalStatus: e.target.value,
                                }))
                              }
                            >
                              <option value="IN_PROGRESS">IN_PROGRESS</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="PENDING">PENDING</option>
                              <option value="APPROVED">APPROVED</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              Remarks
                            </label>
                            <Input
                              placeholder="Remarks"
                              value={newPkg.remarks}
                              onChange={(e) =>
                                setNewPkg((p) => ({
                                  ...p,
                                  remarks: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setOpenPkgDialog(false);
                                setPkgToEdit(null);
                              }}
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
                  </div>
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
                            <TableHead>S. No</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>IFA Date</TableHead>
                            <TableHead>BFA Date</TableHead>
                            <TableHead>IFC Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Remarks</TableHead>
                            <TableHead className="text-right">Delete</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pkgList.map((pkg) => {
                            return (
                              <TableRow key={pkg.id}>
                                <TableCell>
                                  {pkg.packagenumber || "-"}
                                </TableCell>
                                <TableCell className="font-medium">
                                  <button
                                    className="text-left text-primary underline"
                                    onClick={() => {
                                      // open dialog in edit mode
                                      setPkgToEdit(pkg);
                                      setNewPkg({
                                        serialNo: pkg.packagenumber || "",
                                        name: pkg.name || "",
                                        ifaDate: pkg.ifadate || "",
                                        bfaDate: pkg.bfadate || "",
                                        ifcDate: pkg.ifcdate || "",
                                        submitalStatus:
                                          pkg.status || "IN_PROGRESS",
                                        remarks: pkg.notes || "",
                                        ifaVersion: pkg.ifaversion || "",
                                        ifcVersion: pkg.ifcversion || "",
                                      });
                                      setOpenPkgDialog(true);
                                    }}
                                  >
                                    {pkg.name}
                                  </button>
                                </TableCell>
                                <TableCell>
                                  {pkg.ifadate
                                    ? new Date(pkg.ifadate).toLocaleDateString()
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {pkg.bfadate
                                    ? new Date(pkg.bfadate).toLocaleDateString()
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {pkg.ifcdate
                                    ? new Date(pkg.ifcdate).toLocaleDateString()
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge className={pkgStatusColor(pkg.status)}>
                                    {pkg.status || "-"}
                                  </Badge>
                                </TableCell>
                                <TableCell>{pkg.notes || "-"}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="gap-1"
                                    onClick={async () => {
                                      const ok = window.confirm(
                                        `Delete package "${pkg.name}"?`
                                      );
                                      if (!ok) return;
                                      try {
                                        const { error } = await supabase
                                          .from("ProjectPackage")
                                          .delete()
                                          .eq("id", pkg.id);
                                        if (error) throw error;
                                        toast({
                                          title: "Package deleted",
                                          description: `${pkg.name} removed successfully`,
                                        });
                                        await reloadPackages();
                                      } catch (err) {
                                        console.error("Delete failed", err);
                                        toast({
                                          title: "Delete failed",
                                          description: String(err),
                                          variant: "destructive" as any,
                                        });
                                      }
                                    }}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
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

            {/* Submittals removed as requested */}

            {/* Upcoming submissions (from IFA or IFC date) */}
            <TabsContent value="gantt">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Submissions</CardTitle>
                  <CardDescription>
                    Packages ordered by next submission date (IFA &gt; IFC)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pkgList.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      No packages yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pkgList
                        .map((p) => ({
                          ...p,
                          nextDate: p.ifadate
                            ? new Date(p.ifadate)
                            : p.ifcdate
                            ? new Date(p.ifcdate)
                            : null,
                        }))
                        .filter((p) => p.nextDate)
                        .sort(
                          (a, b) =>
                            a.nextDate!.getTime() - b.nextDate!.getTime()
                        )
                        .map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between"
                          >
                            <div className="text-sm font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground tabular-nums">
                              {p.nextDate!.toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                    </div>
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
// Timeline chart removed — replaced by Upcoming Submissions view in the Gantt tab

export default ProjectDetailPage;
