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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

interface AddClientDialogProps {
  onClientAdded?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  isEdit?: boolean;
  initialData?: any | null; // existing client row
  clientId?: number | null; // id to edit (alternative to initialData)
}

interface ClientForm {
  name: string;
  companyName: string;
  email: string;
  contactNo: string;
  address: string;
  notes: string;
}

const emptyForm: ClientForm = {
  name: "",
  companyName: "",
  email: "",
  contactNo: "",
  address: "",
  notes: "",
};

export function AddClientDialog({
  onClientAdded,
  trigger,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  isEdit = false,
  initialData = null,
  clientId = null,
}: AddClientDialogProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Configuration structured state replacing previous free-form JSON
  const [revApprovalMode, setRevApprovalMode] = useState<
    "numeric" | "character"
  >("numeric");
  const [revApprovalStart, setRevApprovalStart] = useState("");
  const [revFabMode, setRevFabMode] = useState<"numeric" | "character">(
    "numeric"
  );
  const [revFabStart, setRevFabStart] = useState("");
  const [revFabFromApproval, setRevFabFromApproval] = useState(false);
  const [revFieldMode, setRevFieldMode] = useState<"numeric" | "character">(
    "numeric"
  );
  const [revFieldStart, setRevFieldStart] = useState("");
  const [revFieldFromApproval, setRevFieldFromApproval] = useState(false);
  const [logTransmittal, setLogTransmittal] = useState(false);
  const [logSubmittal, setLogSubmittal] = useState(false);
  const [logComplete, setLogComplete] = useState(false);
  const [colFinish, setColFinish] = useState(false);
  const [colItemQty, setColItemQty] = useState(false);
  const [colBfaDate, setColBfaDate] = useState(false);
  const [sheetSize, setSheetSize] = useState<"byName" | "byMeasurement">(
    "byName"
  );
  const queryClient = useQueryClient();

  const update = (field: keyof ClientForm, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const reset = () => setForm(emptyForm);

  // load existing client data when editing (run when dialog opens or data changes)
  useEffect(() => {
    if (!open) return; // only prefill when visible
    if (isEdit && initialData) {
      setForm({
        name: initialData.name || "",
        companyName: initialData.companyName || "",
        email: initialData.email || "",
        contactNo: initialData.contactNo || "",
        address: initialData.address || "",
        notes: initialData.notes || "",
      });
      const cfg = initialData.configuration || {};
      try {
        const rev = cfg.revisionStructure || {};
        const approval = rev.approval || {};
        setRevApprovalMode(approval.mode || "numeric");
        setRevApprovalStart(approval.start || "");
        const fab = rev.fabrication || {};
        setRevFabFromApproval(!!fab.startFromApproval);
        setRevFabMode(fab.mode || "numeric");
        setRevFabStart(fab.start || "");
        const field = rev.field || {};
        setRevFieldFromApproval(!!field.startFromApproval);
        setRevFieldMode(field.mode || "numeric");
        setRevFieldStart(field.start || "");
        const logs = cfg.logOptions || {};
        setLogTransmittal(!!logs.transmittal);
        setLogSubmittal(!!logs.submittal);
        setLogComplete(!!logs.complete);
        const cols = cfg.sheetColumns || {};
        setColFinish(!!cols.finish);
        setColItemQty(!!cols.itemQty);
        setColBfaDate(!!cols.bfaDate);
        if (cfg.sheetSize) setSheetSize(cfg.sheetSize);
      } catch {}
    } else if (!isEdit) {
      // ensure fresh blank form when switching from edit to add
      setForm(emptyForm);
    }
  }, [isEdit, initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({
        title: "Name required",
        description: "Client name is mandatory.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      // Build structured configuration object
      const configuration = {
        revisionStructure: {
          approval: { mode: revApprovalMode, start: revApprovalStart || null },
          fabrication: {
            startFromApproval: revFabFromApproval,
            mode: revFabMode,
            start: revFabStart || null,
          },
          field: {
            startFromApproval: revFieldFromApproval,
            mode: revFieldMode,
            start: revFieldStart || null,
          },
        },
        logOptions: {
          transmittal: logTransmittal,
          submittal: logSubmittal,
          complete: logComplete,
        },
        sheetColumns: {
          finish: colFinish,
          itemQty: colItemQty,
          bfaDate: colBfaDate,
        },
        sheetSize,
      };

      const now = new Date().toISOString();
      const payload: any = {
        name: form.name.trim(),
        companyName: form.companyName.trim() || form.name.trim(),
        email: form.email.trim() || null,
        contactNo: form.contactNo.trim() || null,
        address: form.address.trim() || null,
        configuration,
        attachments: null,
        activeProjects: 0,
        completedProjects: 0,
        totalProjects: 0,
        totalProjectValue: 0,
        totalWeightage: 0,
        lastActivityDate: now,
        createdAt: now,
        updatedAt: now,
        notes: form.notes.trim() || null,
      };

      let created: any = null;
      if (isEdit && (initialData?.id || clientId != null)) {
        const id = initialData?.id ?? clientId;
        const updateRes: any = await (supabase as any)
          .from("Client")
          .update({ ...payload, updatedAt: new Date().toISOString() } as any)
          .eq("id", id)
          .select()
          .single();
        if (updateRes.error) throw updateRes.error;
        created = updateRes.data;
        toast({
          title: "Client Updated",
          description: `Updated client '${
            created?.name || created?.companyName || form.name
          }'.`,
        });
      } else {
        const insertRes: any = await (supabase as any)
          .from("Client")
          .insert([payload] as any)
          .select()
          .single();
        if (insertRes.error) throw insertRes.error;
        created = insertRes.data;
        toast({
          title: "Client Added",
          description: `Created client '${
            created?.name || created?.companyName || form.name
          }'.`,
        });
      }
      reset();
      // reset configuration state
      setRevApprovalMode("numeric");
      setRevApprovalStart("");
      setRevFabMode("numeric");
      setRevFabStart("");
      setRevFabFromApproval(false);
      setRevFieldMode("numeric");
      setRevFieldStart("");
      setRevFieldFromApproval(false);
      setLogTransmittal(false);
      setLogSubmittal(false);
      setLogComplete(false);
      setColFinish(false);
      setColItemQty(false);
      setColBfaDate(false);
      setSheetSize("byName");
      setOpen(false);
      // Invalidate queries relying on clients
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients-basic"] });
      onClientAdded?.();
    } catch (err: any) {
      console.error("Error adding client", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create client.",
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
              <Plus className="h-4 w-4" /> Add Client
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Client" : "Add New Client"}</DialogTitle>
          <DialogDescription>
            Provide basic client information. Advanced metadata is optional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">
                Client Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                placeholder="e.g., Acme Infrastructure"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="Defaults to Client Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="contact@client.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactNo">Contact No</Label>
              <Input
                id="contactNo"
                value={form.contactNo}
                onChange={(e) => update("contactNo", e.target.value)}
                placeholder="+91 90000 00000"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                rows={2}
                placeholder="Street, City, State"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              className="px-0 h-auto text-sm"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4 mr-1" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-1" />
              )}
              {showAdvanced ? "Hide configuration" : "Show configuration"}
            </Button>
            {showAdvanced && (
              <div className="grid gap-4 border rounded-md p-4 bg-muted/30 text-sm">
                {/* Revision Structure */}
                <fieldset className="border rounded-md p-3 space-y-3">
                  <legend className="text-xs font-medium px-1">
                    Revision Structure
                  </legend>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <Label className="col-span-3 text-xs">For approval:</Label>
                    <div className="col-span-5">
                      <RadioGroup
                        value={revApprovalMode}
                        onValueChange={(v) => setRevApprovalMode(v as any)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="numeric" id="ra-n" />
                          <Label htmlFor="ra-n" className="text-xs font-normal">
                            Numeric
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="character" id="ra-c" />
                          <Label htmlFor="ra-c" className="text-xs font-normal">
                            Character
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="col-span-4">
                      <Input
                        value={revApprovalStart}
                        onChange={(e) => setRevApprovalStart(e.target.value)}
                        placeholder="Start"
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <Label className="col-span-3 text-xs">
                      For fabrication:
                    </Label>
                    <div className="col-span-2 flex items-center space-x-1">
                      <Checkbox
                        id="fab-appr"
                        checked={revFabFromApproval}
                        onCheckedChange={(v) => setRevFabFromApproval(!!v)}
                      />
                      <Label
                        htmlFor="fab-appr"
                        className="text-[10px] font-normal leading-tight"
                      >
                        START FROM LAST OF APPROVAL OR
                      </Label>
                    </div>
                    <div className="col-span-5">
                      <RadioGroup
                        value={revFabMode}
                        onValueChange={(v) => setRevFabMode(v as any)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="numeric" id="rf-n" />
                          <Label htmlFor="rf-n" className="text-xs font-normal">
                            Numeric
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="character" id="rf-c" />
                          <Label htmlFor="rf-c" className="text-xs font-normal">
                            Character
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={revFabStart}
                        onChange={(e) => setRevFabStart(e.target.value)}
                        placeholder="Start"
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 items-center gap-2">
                    <Label className="col-span-3 text-xs">For field:</Label>
                    <div className="col-span-2 flex items-center space-x-1">
                      <Checkbox
                        id="field-appr"
                        checked={revFieldFromApproval}
                        onCheckedChange={(v) => setRevFieldFromApproval(!!v)}
                      />
                      <Label
                        htmlFor="field-appr"
                        className="text-[10px] font-normal leading-tight"
                      >
                        START FROM LAST OF APPROVAL OR
                      </Label>
                    </div>
                    <div className="col-span-5">
                      <RadioGroup
                        value={revFieldMode}
                        onValueChange={(v) => setRevFieldMode(v as any)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="numeric" id="rfi-n" />
                          <Label
                            htmlFor="rfi-n"
                            className="text-xs font-normal"
                          >
                            Numeric
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="character" id="rfi-c" />
                          <Label
                            htmlFor="rfi-c"
                            className="text-xs font-normal"
                          >
                            Character
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={revFieldStart}
                        onChange={(e) => setRevFieldStart(e.target.value)}
                        placeholder="Start"
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </fieldset>
                {/* Log Options */}
                <fieldset className="border rounded-md p-3 space-y-2">
                  <legend className="text-xs font-medium px-1">
                    Log Options
                  </legend>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={logTransmittal}
                        onCheckedChange={(v) => setLogTransmittal(!!v)}
                      />
                      Transmittal Log
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={logSubmittal}
                        onCheckedChange={(v) => setLogSubmittal(!!v)}
                      />
                      Submittal Log
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={logComplete}
                        onCheckedChange={(v) => setLogComplete(!!v)}
                      />
                      Complete Log
                    </label>
                  </div>
                </fieldset>
                {/* Sheet Columns */}
                <fieldset className="border rounded-md p-3 space-y-2">
                  <legend className="text-xs font-medium px-1">
                    Sheet Columns
                  </legend>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={colFinish}
                        onCheckedChange={(v) => setColFinish(!!v)}
                      />
                      Finish
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={colItemQty}
                        onCheckedChange={(v) => setColItemQty(!!v)}
                      />
                      Item Qty
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={colBfaDate}
                        onCheckedChange={(v) => setColBfaDate(!!v)}
                      />
                      BFA Date
                    </label>
                  </div>
                </fieldset>
                {/* Sheet Size For Logs */}
                <fieldset className="border rounded-md p-3 space-y-2">
                  <legend className="text-xs font-medium px-1">
                    Sheet Size For Logs
                  </legend>
                  <RadioGroup
                    value={sheetSize}
                    onValueChange={(v) => setSheetSize(v as any)}
                    className="flex gap-6 text-xs"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="byName" id="ss-name" />
                      <Label htmlFor="ss-name" className="text-xs font-normal">
                        By Name
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="byMeasurement" id="ss-measure" />
                      <Label
                        htmlFor="ss-measure"
                        className="text-xs font-normal"
                      >
                        By Measurement
                      </Label>
                    </div>
                  </RadioGroup>
                </fieldset>
                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    rows={2}
                    placeholder="Internal notes..."
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEdit
                  ? "Saving..."
                  : "Saving..."
                : isEdit
                ? "Save Changes"
                : "Add Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
