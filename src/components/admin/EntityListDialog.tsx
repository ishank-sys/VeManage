import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw, Pencil, Eye, Search } from "lucide-react";

export interface EntityListDialogProps {
  title: string;
  description?: string;
  triggerLabel?: string;
  queryKey: any[];
  loadItems: () => Promise<Array<{ id: number | string; name: string }>>;
  onEdit: (id: number | string) => void; // open external full dialog
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function EntityListDialog({
  title,
  description,
  triggerLabel = "View",
  queryKey,
  loadItems,
  onEdit,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: EntityListDialogProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;
  // No inline edit state; edit handled by external dialog

  const {
    data: items = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey,
    queryFn: loadItems,
    enabled: open, // only load when dialog open
  });

  const [search, setSearch] = useState("");
  const lowerSearch = search.toLowerCase();
  const filtered = !search
    ? items
    : items.filter((i) => i.name.toLowerCase().includes(lowerSearch));

  // removed inline edit logic

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button size="sm" variant="secondary" className="gap-1">
            <Eye className="h-4 w-4" /> {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-3 mb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading..."
                : `${filtered.length} / ${items.length} record(s)`}
            </div>
            <div className="flex items-center gap-2 w-full max-w-xs ml-auto">
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isRefetching || isLoading}
                title="Refresh"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </div>
        <div className="border rounded-md max-h-[60vh] overflow-y-auto">
          <Table className="relative">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70%]">Name</TableHead>
                <TableHead className="text-right w-[30%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((it) => (
                <TableRow key={String(it.id)}>
                  <TableCell>
                    <span className="truncate block" title={it.name}>
                      {it.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onEdit(it.id)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    No records
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
