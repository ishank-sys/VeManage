import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

export interface ProjectForm {
  id?: number;
  projectNo?: string;
  solProjectNo?: string | null;
  name: string;
  description?: string | null;
  clientId?: number | null;
  solTLId?: number | null;
  clientPm?: number | null;
  status?: string;
  priority?: string;
  progress?: number;
  branch?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  expectedCompletion?: string | null;
  totalDays?: number | null;
  estimationDate?: string | null;
  totalProjectHours?: string | null;
  actualProjectHours?: string | null;
  totalSheetQty?: string | null;
  weightTonnage?: string | null;
  projectComplexity?: string | null;
  solJobNo?: string | null;
  projectType?: string | null;
  projectSubType?: string | null;
  lastUpdated?: string | null;
  lastActivityDate?: string | null;
  createdAt?: string | null;
}

interface AddProjectDialogProps {
  onProjectAdded?: () => void;
  initialData?: Partial<ProjectForm> | null;
  trigger?: React.ReactNode;
  isEdit?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** If true, suppress rendering of the default trigger button */
  hideTrigger?: boolean;
}

export function AddProjectDialog({
  onProjectAdded,
  initialData = null,
  trigger,
  isEdit = false,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: AddProjectDialogProps) {
  // support controlled open state (when parent manages dialog) or local state
  const [localOpen, setLocalOpen] = useState(false);
  const isControlled = typeof openProp === "boolean";
  const dialogOpen = isControlled ? openProp! : localOpen;
  const setDialogOpen = onOpenChange ?? setLocalOpen;

  const [loading, setLoading] = useState(false);
  const [startDateState, setStartDateState] = useState<Date | undefined>();
  const [endDateState, setEndDateState] = useState<Date | undefined>();

  const [clients, setClients] = useState<
    Array<{ id: string | number | null; name: string }>
  >([]);

  const [employees, setEmployees] = useState<
    Array<{ id: string | number | null; name: string }>
  >([]);
  const [clientPMs, setClientPMs] = useState<
    Array<{ id: string | number | null; name: string }>
  >([]);
  const [clientOpen, setClientOpen] = useState(false);
  const [tlOpen, setTlOpen] = useState(false);
  const [clientPmOpen, setClientPmOpen] = useState(false);

  const [formData, setFormData] = useState<ProjectForm>({
    projectNo: "",
    solProjectNo: "",
    name: "",
    description: "",
    clientId: undefined,
    solTLId: undefined,
    clientPm: undefined,
    status: "Live",
    priority: "MEDIUM",
    progress: 0,
    branch: "",
    startDate: undefined,
    endDate: undefined,
    expectedCompletion: undefined,
    estimationDate: undefined,
    totalDays: null,
    totalProjectHours: "",
    actualProjectHours: "",
    totalSheetQty: "",
    weightTonnage: "",
    projectComplexity: undefined,
    solJobNo: "",
    projectType: "",
    projectSubType: "",
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    // populate form when editing - replace with clean defaults merged with initialData
    if (initialData) {
      const defaults: ProjectForm = {
        projectNo: "",
        solProjectNo: "",
        name: "",
        description: "",
        clientId: undefined,
        solTLId: undefined,
        clientPm: undefined,
        status: "Live",
        priority: "MEDIUM",
        progress: 0,
        branch: "",
        startDate: undefined,
        endDate: undefined,
        expectedCompletion: undefined,
        estimationDate: undefined,
        totalDays: null,
        totalProjectHours: "",
        actualProjectHours: "",
        totalSheetQty: "",
        weightTonnage: "",
        projectComplexity: undefined,
        solJobNo: "",
        projectType: "",
        projectSubType: "",
      };
      const merged = { ...defaults, ...(initialData as any) } as ProjectForm;
      setFormData(merged);
      // populate date pickers
      if (merged.startDate) setStartDateState(new Date(merged.startDate));
      if (merged.endDate) setEndDateState(new Date(merged.endDate));
    }
  }, [initialData]);

  useEffect(() => {
    // load employees/users for team lead select - try common table name variants and normalize
    const loadEmployees = async () => {
      const tableCandidates = [
        "Employee",
        "employee",
        "employees",
        "User",
        "user",
        "users",
      ];
      for (const table of tableCandidates) {
        try {
          // First attempt: server-side filter where userType === 'employee'
          let serverRes: any = null;
          try {
            serverRes = await (supabase as any)
              .from(table)
              .select("*")
              .in("userType", ["employee", "Employee"]);
          } catch (err) {
            serverRes = null;
          }

          if (
            serverRes &&
            !serverRes.error &&
            Array.isArray(serverRes.data) &&
            serverRes.data.length > 0
          ) {
            const normalized = serverRes.data.map((u: any) => {
              const id = u.id ?? u.ID ?? u.Id ?? null;
              const name =
                u.full_name ??
                u.name ??
                u.display_name ??
                u.email ??
                String(id);
              return { id, name };
            });
            setEmployees(normalized);
            return;
          }

          // Fallback: fetch all and use client-side heuristics to detect employee-like users
          const res = await (supabase as any).from(table).select("*");
          if (res.error) continue;
          const data = res.data as any[] | null;
          if (!data || data.length === 0) continue;

          const filtered = (data as any[]).filter((u: any) => {
            const rawType =
              u.userType ??
              u.type ??
              u.user_type ??
              u.role ??
              u.userRole ??
              u.user_type_name ??
              u.account_type ??
              null;
            const isFlag = u.isEmployee ?? u.is_employee ?? u.employee ?? null;

            if (isFlag === true) return true;
            if (typeof rawType === "string") {
              const t = rawType.toLowerCase();
              return t === "employee" || t === "emp" || t === "staff";
            }
            return false;
          });

          const normalized = filtered.map((u: any) => {
            const id = u.id ?? u.ID ?? u.Id ?? null;
            const name =
              u.full_name ?? u.name ?? u.display_name ?? u.email ?? String(id);
            return { id, name };
          });

          if (normalized.length > 0) {
            setEmployees(normalized);
            return;
          }
        } catch (err) {
          console.debug(`Error reading ${table}:`, err);
        }
      }
      setEmployees([]);
    };
    loadEmployees();
  }, []);

  useEffect(() => {
    // load clients for client select - try common table name variants and normalize
    const loadClients = async () => {
      const tableCandidates = ["Client", "client", "clients"];
      for (const table of tableCandidates) {
        try {
          const res = await (supabase as any).from(table).select("*");
          if (res.error) {
            console.debug(
              `Client fetch from ${table} returned error:`,
              res.error.message || res.error
            );
            continue;
          }
          const data = res.data as any[] | null;
          if (!data || data.length === 0) continue;

          const normalized = data.map((c: any) => {
            const id = c.id ?? c.ID ?? c.Id ?? null;
            const name =
              c.clientName ??
              c.client_name ??
              c.name ??
              c.client ??
              c.contactPerson ??
              String(id);
            return { id, name };
          });
          setClients(normalized);
          return;
        } catch (err) {
          console.debug(`Error reading ${table}:`, err);
        }
      }
      // fallback to empty
      setClients([]);
    };
    loadClients();
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    // load client PM choices FROM User table where userType = 'Client'
    const loadClientPMs = async () => {
      const userTableCandidates = [
        "User",
        "user",
        "users",
        "Employee",
        "employee",
        "employees",
      ];
      for (const table of userTableCandidates) {
        try {
          // Try server-side filter first if column exists
          let res: any = null;
          try {
            res = await (supabase as any)
              .from(table)
              .select("*")
              .in("userType", ["Client", "client"]);
          } catch (e) {
            res = null;
          }

          if (
            res &&
            !res.error &&
            Array.isArray(res.data) &&
            res.data.length > 0
          ) {
            const normalized = res.data.map((u: any) => {
              const id = u.id ?? u.ID ?? u.Id ?? null;
              const name =
                u.full_name ??
                u.name ??
                u.display_name ??
                u.email ??
                String(id);
              return { id, name };
            });
            setClientPMs(normalized);
            return;
          }

          // Fallback: fetch and client-side filter
          const all = await (supabase as any).from(table).select("*");
          if (all.error) continue;
          const rows: any[] = Array.isArray(all.data) ? all.data : [];
          const filtered = rows.filter((u: any) => {
            const rawType =
              u.userType ??
              u.type ??
              u.user_type ??
              u.role ??
              u.userRole ??
              null;
            if (typeof rawType === "string") {
              const t = rawType.toLowerCase();
              return t === "client";
            }
            return false;
          });
          if (filtered.length > 0) {
            const normalized = filtered.map((u: any) => {
              const id = u.id ?? u.ID ?? u.Id ?? null;
              const name =
                u.full_name ??
                u.name ??
                u.display_name ??
                u.email ??
                String(id);
              return { id, name };
            });
            setClientPMs(normalized);
            return;
          }
        } catch (err) {
          console.debug(`Error reading ${table}:`, err);
        }
      }
      // If nothing found, leave as empty (no mirroring from clients)
      setClientPMs([]);
    };
    loadClientPMs();
  }, [dialogOpen]);

  // Remove mirroring; client PMs should strictly be Users of type Client

  // Ensure the client PM select shows the current selection when editing
  useEffect(() => {
    if (initialData?.clientPm != null) {
      setClientPMs((prev) => {
        const exists = prev.some(
          (c) => String(c.id) === String(initialData.clientPm)
        );
        if (exists) return prev;
        return [
          ...prev,
          { id: initialData.clientPm, name: `User ${initialData.clientPm}` },
        ];
      });
    }
  }, [initialData]);

  // Legacy mapping: if initialData.clientPm was stored as a Client id, try to find a matching User with that clientId
  useEffect(() => {
    const tryMapLegacyClientPm = async () => {
      if (!dialogOpen) return;
      const legacyVal = initialData?.clientPm;
      if (legacyVal == null) return;
      const found = clientPMs.some((c) => String(c.id) === String(legacyVal));
      if (found) return; // already a proper user id present in list
      try {
        const res: any = await (supabase as any)
          .from("User")
          .select("*")
          .eq("clientId", legacyVal)
          .in("userType", ["client", "Client"])
          .limit(1);
        if (!res.error && Array.isArray(res.data) && res.data.length === 1) {
          const u = res.data[0];
          const uid = u.id ?? u.ID ?? u.Id ?? null;
          if (uid != null) {
            const name =
              u.full_name ||
              u.name ||
              u.display_name ||
              u.email ||
              `User ${uid}`;
            setClientPMs((prev) => {
              const already = prev.some((c) => String(c.id) === String(uid));
              return already ? prev : [...prev, { id: uid, name }];
            });
            // update form value to the actual user id
            setFormData((prev) => ({ ...prev, clientPm: Number(uid) }));
          }
        }
      } catch (e) {
        console.debug("Legacy clientPm mapping failed", e);
      }
    };
    tryMapLegacyClientPm();
  }, [dialogOpen, initialData, clientPMs]);

  // Ensure the client select shows the current client immediately when editing
  useEffect(() => {
    if (initialData?.clientId != null) {
      setClients((prev) => {
        const exists = prev.some(
          (c) => String(c.id) === String(initialData.clientId)
        );
        if (exists) return prev;
        // Insert a placeholder entry; will be replaced if real list loads later
        return [
          ...prev,
          { id: initialData.clientId, name: `Client ${initialData.clientId}` },
        ];
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const solProjectNoTrimmed = (formData.solProjectNo || "").trim();
      const nameTrimmed = (formData.name || "").trim();
      if (!solProjectNoTrimmed) {
        toast({
          title: "Missing SOL Project No",
          description: "SOL Project No is required to save the project.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (!nameTrimmed) {
        toast({
          title: "Missing Project Name",
          description: "Project Name is required to save the project.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (formData.clientId == null) {
        toast({
          title: "Client Required",
          description: "Please select a client before saving the project.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      // Build payload according to SteelVault Project schema
      const payload: any = {
        projectNo: formData.projectNo || `P-${Date.now()}`,
        solProjectNo: solProjectNoTrimmed,
        name: formData.name,
        description: formData.description || null,
        clientId: Number(formData.clientId),
        status: formData.status || "Live",
        priority: formData.priority || "MEDIUM",
        progress: formData.progress ? Number(formData.progress) : 0,
        branch: formData.branch || null,
        solTLId:
          formData.solTLId === undefined || formData.solTLId === null
            ? null
            : Number(formData.solTLId),
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        totalDays: formData.totalDays ?? null,
        expectedCompletion: formData.expectedCompletion || null,
        estimationDate: formData.estimationDate || null,
        totalProjectHours: formData.totalProjectHours || null,
        actualProjectHours: formData.actualProjectHours || null,
        totalSheetQty: formData.totalSheetQty || null,
        weightTonnage: formData.weightTonnage || null,
        projectComplexity: formData.projectComplexity || null,
        solJobNo: formData.solJobNo || null,
        projectType: formData.projectType || null,
        projectSubType: formData.projectSubType || null,
        clientPm:
          formData.clientPm === undefined || formData.clientPm === null
            ? null
            : Number(formData.clientPm),
      };

      let data: any = null;
      let error: any = null;

      if (isEdit && formData.id) {
        // cast to any for Supabase generic typing in this codebase
        const res = await (supabase as any)
          .from("Project")
          .update(payload as any)
          .eq("id", formData.id)
          .select()
          .single();
        data = res.data;
        error = res.error;
      } else {
        const res = await (supabase as any)
          .from("Project")
          .insert([payload] as any)
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: isEdit
          ? "Project updated successfully!"
          : "Project added successfully!",
      });

      // Reset form only for add
      if (!isEdit) {
        setFormData({
          projectNo: "",
          solProjectNo: "",
          name: "",
          description: "",
          clientId: undefined,
          solTLId: undefined,
          clientPm: undefined,
          status: "Live",
          priority: "MEDIUM",
          progress: 0,
          branch: "",
          startDate: undefined,
          endDate: undefined,
          totalDays: null,
          estimationDate: undefined,
          totalProjectHours: "",
          actualProjectHours: "",
          totalSheetQty: "",
          weightTonnage: "",
          projectComplexity: undefined,
          solJobNo: "",
          projectType: "",
          projectSubType: "",
        });
      }
      // clear date pickers
      setStartDateState(undefined);
      setEndDateState(undefined);
      // close dialog (controlled or local)
      setDialogOpen(false);

      // Call the callback to refresh the projects list
      onProjectAdded?.();
    } catch (error) {
      console.error("Error adding project:", error);
      toast({
        title: "Error",
        description: "Failed to add project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen as any}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : isEdit ? null : (
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Project
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Project" : "Add New Project"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modify details and save changes."
              : "Fill in the required project details and submit."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectNo">Client Project No</Label>
              <Input
                id="projectNo"
                value={formData.projectNo}
                onChange={(e) => handleInputChange("projectNo", e.target.value)}
                placeholder="e.g., P-1234 (auto-generated if empty)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="solProjectNo">
                SOL Project No <span className="text-destructive">*</span>
              </Label>
              <Input
                id="solProjectNo"
                required
                value={formData.solProjectNo || ""}
                onChange={(e) =>
                  handleInputChange("solProjectNo", e.target.value)
                }
                placeholder="e.g., SOL-2024-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Metro Station Complex"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Client <span className="text-destructive">*</span>
              </Label>
              <Popover open={clientOpen} onOpenChange={setClientOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientOpen}
                    className="w-full justify-between"
                  >
                    {formData.clientId != null
                      ? clients.find(
                          (c) => String(c.id) === String(formData.clientId)
                        )?.name || `Client ${formData.clientId}`
                      : "Select client"}
                    <span className="ml-2 text-muted-foreground">⌕</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-[--radix-popover-trigger-width]"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Search client..."
                      className="h-9"
                    />
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((c) => (
                        <CommandItem
                          key={String(c.id)}
                          value={String(c.name)}
                          onSelect={() => {
                            handleInputChange("clientId", Number(c.id));
                            setClientOpen(false);
                          }}
                        >
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Location</Label>
              <Select
                value={formData.branch || "__none"}
                onValueChange={(value) => {
                  if (value === "__none") return;
                  handleInputChange("branch", value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" disabled>
                    Select location
                  </SelectItem>
                  <SelectItem value="Noida">Noida</SelectItem>
                  <SelectItem value="Mysore">Mysore</SelectItem>
                  <SelectItem value="Kannur">Kannur</SelectItem>
                  <SelectItem value="Dheradun">Dheradun</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Team Lead (User)</Label>
              <Popover open={tlOpen} onOpenChange={setTlOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={tlOpen}
                    className="w-full justify-between"
                  >
                    {formData.solTLId != null
                      ? employees.find(
                          (e) => String(e.id) === String(formData.solTLId)
                        )?.name || `User ${formData.solTLId}`
                      : "To be Decided"}
                    <span className="ml-2 text-muted-foreground">⌕</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-[--radix-popover-trigger-width]"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Search team lead..."
                      className="h-9"
                    />
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        key="__tbd"
                        value="To be Decided"
                        onSelect={() => {
                          handleInputChange("solTLId", undefined as any);
                          setTlOpen(false);
                        }}
                      >
                        To be Decided
                      </CommandItem>
                      {employees.map((e) => (
                        <CommandItem
                          key={String(e.id)}
                          value={String(e.name)}
                          onSelect={() => {
                            handleInputChange("solTLId", Number(e.id));
                            setTlOpen(false);
                          }}
                        >
                          {e.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Client PM (Client User)</Label>
              <Popover open={clientPmOpen} onOpenChange={setClientPmOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientPmOpen}
                    className="w-full justify-between"
                  >
                    {formData.clientPm != null
                      ? clientPMs.find(
                          (c) => String(c.id) === String(formData.clientPm)
                        )?.name || `Client PM ${formData.clientPm}`
                      : "Select client PM"}
                    <span className="ml-2 text-muted-foreground">⌕</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-[--radix-popover-trigger-width]"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Search client PM..."
                      className="h-9"
                    />
                    <CommandEmpty>No client PM found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        key="__none"
                        value="None"
                        onSelect={() => {
                          handleInputChange("clientPm", undefined as any);
                          setClientPmOpen(false);
                        }}
                      >
                        None
                      </CommandItem>
                      {clientPMs.map((c) => (
                        <CommandItem
                          key={String(c.id)}
                          value={String(c.name)}
                          onSelect={() => {
                            handleInputChange("clientPm", Number(c.id));
                            setClientPmOpen(false);
                          }}
                        >
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDateState && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDateState ? (
                      format(startDateState, "PPP")
                    ) : (
                      <span>Pick start</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDateState}
                    onSelect={(d) => {
                      setStartDateState(d as Date | undefined);
                      handleInputChange(
                        "startDate",
                        d ? (d as Date).toISOString() : null
                      );
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDateState && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDateState ? (
                      format(endDateState, "PPP")
                    ) : (
                      <span>Pick end</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDateState}
                    onSelect={(d) => {
                      setEndDateState(d as Date | undefined);
                      handleInputChange(
                        "endDate",
                        d ? (d as Date).toISOString() : null
                      );
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="progress">Progress (%)</Label>
              <Input
                id="progress"
                type="number"
                min={0}
                max={100}
                value={String(formData.progress ?? 0)}
                onChange={(e) =>
                  handleInputChange("progress", Number(e.target.value) || 0)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status || "Live"}
              onValueChange={(value) => handleInputChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Live">Live</SelectItem>
                <SelectItem value="Sent For Approval">
                  Sent For Approval
                </SelectItem>
                <SelectItem value="Sent for Fabrication">
                  Sent for Fabrication
                </SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="On-Hold">On-Hold</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="See Remarks">See Remarks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Complexity field removed as requested */}

          <div className="space-y-2">
            <Label htmlFor="projectType">Project Type</Label>
            <Input
              id="projectType"
              value={formData.projectType || ""}
              onChange={(e) => handleInputChange("projectType", e.target.value)}
              placeholder="e.g., Structural"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectSubType">Project Sub-Type</Label>
            <Input
              id="projectSubType"
              value={formData.projectSubType || ""}
              onChange={(e) =>
                handleInputChange("projectSubType", e.target.value)
              }
              placeholder="e.g., Architectural"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weightTonnage">Weight / Tonnage</Label>
              <Input
                id="weightTonnage"
                value={formData.weightTonnage || ""}
                onChange={(e) =>
                  handleInputChange("weightTonnage", e.target.value)
                }
                placeholder="e.g., 120T"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalSheetQty">Total Sheet Qty</Label>
              <Input
                id="totalSheetQty"
                value={formData.totalSheetQty || ""}
                onChange={(e) =>
                  handleInputChange("totalSheetQty", e.target.value)
                }
                placeholder="e.g., 450"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalProjectHours">Total Project Hours</Label>
            <Input
              id="totalProjectHours"
              value={formData.totalProjectHours || ""}
              onChange={(e) =>
                handleInputChange("totalProjectHours", e.target.value)
              }
              placeholder="e.g., 1200h"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalDays">Total Days</Label>
              <Input
                id="totalDays"
                type="number"
                value={formData.totalDays ?? ""}
                onChange={(e) =>
                  handleInputChange("totalDays", Number(e.target.value) || 0)
                }
                placeholder="e.g., 90"
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Completion</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expectedCompletion && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expectedCompletion ? (
                      format(new Date(formData.expectedCompletion), "PPP")
                    ) : (
                      <span>Pick date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      formData.expectedCompletion
                        ? new Date(formData.expectedCompletion)
                        : undefined
                    }
                    onSelect={(d) => {
                      handleInputChange(
                        "expectedCompletion",
                        d ? (d as Date).toISOString() : ""
                      );
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Estimation Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.estimationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.estimationDate ? (
                      format(new Date(formData.estimationDate), "PPP")
                    ) : (
                      <span>Pick date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      formData.estimationDate
                        ? new Date(formData.estimationDate)
                        : undefined
                    }
                    onSelect={(d) => {
                      handleInputChange(
                        "estimationDate",
                        d ? (d as Date).toISOString() : ""
                      );
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Estimation Date removed as requested */}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Brief description of the project..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEdit
                  ? "Saving..."
                  : "Adding..."
                : isEdit
                ? "Save"
                : "Add Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
