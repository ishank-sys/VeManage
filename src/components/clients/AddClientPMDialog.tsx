import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, UserPlus } from "lucide-react";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

interface AddClientPMDialogProps {
  onAdded?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  isEdit?: boolean;
  initialData?: any | null;
  userId?: number | string | null;
}

interface ClientOption {
  id: number;
  name: string;
}

export function AddClientPMDialog({
  onAdded,
  trigger,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  isEdit = false,
  initialData = null,
  userId = null,
}: AddClientPMDialogProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const [password, setPassword] = useState(() => randomPassword());
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientOpen, setClientOpen] = useState(false);
  const queryClient = useQueryClient();

  function randomPassword(len = 12) {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$#";
    return Array.from(
      { length: len },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res: any = await (supabase as any).from("Client").select("*");
        if (res.error) {
          console.warn("Client load error", res.error?.message || res.error);
          setClients([]);
          return;
        }
        const rows: any[] = Array.isArray(res.data) ? res.data : [];
        const mapped: ClientOption[] = rows.map((c: any) => {
          const id = c.id ?? c.ID ?? c.Id;
          const name =
            c.name ||
            c.companyName ||
            c.clientName ||
            c.client ||
            c.contactPerson ||
            `Client ${id}`;
          return { id, name } as ClientOption;
        });
        setClients(mapped);
      } catch (e: any) {
        console.warn("Client load error", e?.message || e);
        setClients([]);
      }
    };
    if (open) load();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (isEdit && initialData) {
      setName(initialData.name || "");
      setEmail(initialData.email || "");
      setClientId(initialData.clientId ?? null);
    } else if (!isEdit) {
      setName("");
      setEmail("");
      setClientId(null);
    }
  }, [isEdit, initialData, open]);

  const reset = () => {
    setName("");
    setEmail("");
    setClientId(null);
    setPassword(randomPassword());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Client PM name is mandatory",
        variant: "destructive",
      });
      return;
    }
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Email is mandatory",
        variant: "destructive",
      });
      return;
    }
    if (clientId == null) {
      toast({
        title: "Client required",
        description: "Select a client to associate",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        password, // NOTE: should be hashed server-side
        userType: "client",
        clientId: clientId,
        createdAt: now,
      };
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
          title: "Client PM Updated",
          description: `Updated client user '${res.data?.name}'.`,
        });
      } else {
        const res: any = await (supabase as any)
          .from("User")
          .insert([payload] as any)
          .select()
          .single();
        if (res.error) throw res.error;
        toast({
          title: "Client PM Added",
          description: `Created client user '${res.data?.name}'.`,
        });
      }
      reset();
      setOpen(false);
      queryClient.invalidateQueries();
      onAdded?.();
    } catch (err: any) {
      console.error("Error adding client PM", err);
      toast({
        title: "Error",
        description: err.message || "Failed to add client PM.",
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
              <UserPlus className="h-4 w-4" /> Add Client PM
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Client PM" : "Add Client PM"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modify client-side user details."
              : "Create a client-side user; only minimal fields required."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpm-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cpm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., S&H Client"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpm-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cpm-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@client.com"
              />
            </div>
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
                    className="w-full justify-between"
                  >
                    {clientId != null
                      ? clients.find((c) => c.id === clientId)?.name ||
                        `Client ${clientId}`
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
                    <CommandList>
                      <CommandEmpty>No client found.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            onSelect={() => {
                              setClientId(c.id);
                              setClientOpen(false);
                            }}
                          >
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpm-pass">Temp Password</Label>
              <div className="flex gap-2">
                <Input
                  id="cpm-pass"
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
                ? "Saving..."
                : isEdit
                ? "Save Changes"
                : "Add Client PM"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
