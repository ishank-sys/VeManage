import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Minus, UserPlus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";

interface AddTeamLeadDialogProps {
  onAdded?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  isEdit?: boolean;
  initialData?: any | null;
  userId?: string | number | null;
}

interface TeamMemberRow {
  id: string;
  name: string;
  role: string;
}

export function AddTeamLeadDialog({
  onAdded,
  trigger,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  isEdit = false,
  initialData = null,
  userId = null,
}: AddTeamLeadDialogProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [extension, setExtension] = useState("");
  const [password, setPassword] = useState(() => randomPassword());
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [notes, setNotes] = useState("");
  const [employees, setEmployees] = useState<
    Array<{ id: number; name: string; email: string; contactNo: string | null }>
  >([]);
  const [empSearch, setEmpSearch] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedExistingId, setSelectedExistingId] = useState<number | null>(
    null
  );
  const queryClient = useQueryClient();

  function randomPassword(len = 12) {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$#";
    return Array.from(
      { length: len },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  }

  const addRow = () => {
    setTeamMembers((r) => [
      ...r,
      { id: crypto.randomUUID(), name: "", role: "" },
    ]);
  };
  const updateRow = (id: string, field: "name" | "role", value: string) => {
    setTeamMembers((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };
  const removeRow = (id: string) =>
    setTeamMembers((r) => r.filter((x) => x.id !== id));

  const reset = () => {
    setName("");
    setEmail("");
    setExtension("");
    setPassword(randomPassword());
    setTeamMembers([]);
    setNotes("");
  };

  useEffect(() => {
    if (!open) return;
    if (isEdit && initialData) {
      setName(initialData.name || "");
      setEmail(initialData.email || "");
      setExtension(initialData.contactNo || "");
      if (initialData.teaminfo?.team_members) {
        setTeamMembers(
          initialData.teaminfo.team_members.map((m: any) => ({
            id: crypto.randomUUID(),
            name: m.name,
            role: m.role || "",
          }))
        );
      }
    } else if (!isEdit) {
      setName("");
      setEmail("");
      setExtension("");
      setTeamMembers([]);
      setNotes("");
    }
    // Load existing employees list when dialog opens (for selection)
    const loadEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const { data, error } = await supabase
          .from("User")
          .select("id, name, email, contactNo, userType")
          .in("userType", ["employee", "Employee"])
          .order("createdAt", { ascending: false });
        if (error) throw error;
        setEmployees(
          (data || []).map((u: any) => ({
            id: u.id,
            name: u.name || `User ${u.id}`,
            email: u.email || "",
            contactNo: u.contactNo || null,
          }))
        );
      } catch (err) {
        console.debug("Failed loading employees list", err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    loadEmployees();
  }, [isEdit, initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Team lead name is mandatory.",
        variant: "destructive",
      });
      return;
    }
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Email is mandatory.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      // Build teaminfo JSON only if there are members with at least a name
      const members = teamMembers.filter((m) => m.name.trim());
      const teaminfo = members.length
        ? {
            team_members: members.map((m) => ({
              name: m.name.trim(),
              role: m.role.trim() || null,
            })),
          }
        : null;
      const now = new Date().toISOString();
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        userType: "employee",
        password: password, // NOTE: not hashed – ensure backend hashes or replace later
        contactNo: extension.trim() || undefined,
        teaminfo,
        createdAt: now,
        // We intentionally skip null columns: clientId, address, relievedDate
      };
      // Remove undefined keys
      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k]
      );

      if (isEdit && (initialData?.id || userId != null)) {
        const id = initialData?.id ?? userId;
        const res: any = await (supabase as any)
          .from("User")
          .update(payload as any)
          .eq("id", id)
          .select()
          .single();
        if (res.error) throw res.error;
        toast({
          title: "Team Lead Updated",
          description: `Updated employee '${res.data?.name}'.`,
        });
      } else {
        const res: any = await (supabase as any)
          .from("User")
          .insert([payload] as any)
          .select()
          .single();
        if (res.error) throw res.error;
        toast({
          title: "Team Lead Added",
          description: `Created employee '${res.data?.name}'.`,
        });
      }
      reset();
      setOpen(false);
      queryClient.invalidateQueries();
      onAdded?.();
    } catch (err: any) {
      console.error("Error adding TL", err);
      toast({
        title: "Error",
        description: err.message || "Failed to add team lead.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" /> Add TL
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Team Lead" : "Add Team Lead"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modify team lead details."
              : "Minimal details only – optional team members for teaminfo JSON."}
          </DialogDescription>
        </DialogHeader>
        {/* Existing Employees Selection */}
        {!isEdit && (
          <div className="space-y-2 border rounded-md p-3 bg-muted/30">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">Existing Employees</p>
              <Input
                placeholder="Search..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {loadingEmployees && (
                <div className="text-[11px] text-muted-foreground">
                  Loading employees...
                </div>
              )}
              {!loadingEmployees && employees.length === 0 && (
                <div className="text-[11px] text-muted-foreground">
                  No employees found.
                </div>
              )}
              {employees
                .filter((e) => {
                  const q = empSearch.toLowerCase();
                  if (!q) return true;
                  return (
                    e.name.toLowerCase().includes(q) ||
                    e.email.toLowerCase().includes(q) ||
                    (e.contactNo || "").toLowerCase().includes(q)
                  );
                })
                .slice(0, 50)
                .map((emp) => {
                  const active = selectedExistingId === emp.id;
                  return (
                    <button
                      type="button"
                      key={emp.id}
                      onClick={() => {
                        setSelectedExistingId(emp.id);
                        setName(emp.name);
                        setEmail(emp.email);
                        setExtension(emp.contactNo || "");
                      }}
                      className={`w-full text-left rounded border px-2 py-1 text-[11px] flex justify-between items-center hover:bg-background transition ${
                        active
                          ? "bg-background border-primary"
                          : "bg-background/50"
                      }`}
                    >
                      <span className="truncate pr-2">{emp.name}</span>
                      <span className="text-muted-foreground truncate max-w-[120px]">
                        {emp.email}
                      </span>
                    </button>
                  );
                })}
            </div>
            {selectedExistingId && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  Loaded into form – you can modify then Save.
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setSelectedExistingId(null)}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="tl-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., Alok"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="tl-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tl-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="alok@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tl-ext">Extension</Label>
              <Input
                id="tl-ext"
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                placeholder="e.g., 221"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tl-pass">Temp Password</Label>
              <div className="flex gap-2">
                <Input
                  id="tl-pass"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Auto-generated"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(randomPassword())}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Team Members (teaminfo)</Label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={addRow}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {teamMembers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No team members added.
              </p>
            )}
            <div className="space-y-2">
              {teamMembers.map((tm) => (
                <div
                  key={tm.id}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <Input
                    className="col-span-5 h-8"
                    placeholder="Name"
                    value={tm.name}
                    onChange={(e) => updateRow(tm.id, "name", e.target.value)}
                  />
                  <Input
                    className="col-span-5 h-8"
                    placeholder="Role"
                    value={tm.role}
                    onChange={(e) => updateRow(tm.id, "role", e.target.value)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="col-span-2 h-8"
                    onClick={() => removeRow(tm.id)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tl-notes">Notes (optional)</Label>
            <Textarea
              id="tl-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Add TL"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
