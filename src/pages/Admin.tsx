import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { AddProjectDialog } from "@/components/projects/AddProjectDialog";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { AddTeamLeadDialog } from "@/components/team/AddTeamLeadDialog";
import { AddClientPMDialog } from "@/components/clients/AddClientPMDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Admin() {
  const [openAdd, setOpenAdd] = useState(false);
  const [openAddClient, setOpenAddClient] = useState(false);
  const [openAddTL, setOpenAddTL] = useState(false);
  const [openAddClientPM, setOpenAddClientPM] = useState(false);
  // inline list states
  const [clientsList, setClientsList] = useState<
    Array<{ id: number | string; name: string }>
  >([]);
  const [projectsList, setProjectsList] = useState<
    Array<{ id: number | string; name: string }>
  >([]);
  const [tlsList, setTlsList] = useState<
    Array<{ id: number | string; name: string }>
  >([]);
  const [clientPMsList, setClientPMsList] = useState<
    Array<{ id: number | string; name: string }>
  >([]);
  const [upcomingPackages, setUpcomingPackages] = useState<
    Array<{
      id: number | string;
      projectId: number;
      projectName: string;
      clientName: string;
      tlName: string;
      date: string;
    }>
  >([]);
  const [loadingLists, setLoadingLists] = useState({
    clients: false,
    projects: false,
    tls: false,
    clientpms: false,
    upcoming: false,
  });
  // edit mode states
  const [editClient, setEditClient] = useState<any | null>(null);
  const [editProject, setEditProject] = useState<any | null>(null);
  const [editTL, setEditTL] = useState<any | null>(null);
  const [editClientPM, setEditClientPM] = useState<any | null>(null);
  // search states per entity list
  const [clientSearch, setClientSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [tlSearch, setTlSearch] = useState("");
  const [clientPmSearch, setClientPmSearch] = useState("");

  // loaders & updaters for dialog component
  const loadClients = async () => {
    // Try multiple potential table name variants in case of different casing / legacy
    const candidates = ["Client", "client", "clients"];
    let rows: any[] = [];
    let lastError: any = null;
    for (const table of candidates) {
      try {
        const res: any = await (supabase as any)
          .from(table)
          // select * to avoid missing a needed column for naming fallback
          .select("*")
          .order("createdAt", { ascending: false });
        if (res.error) {
          lastError = res.error;
          continue;
        }
        if (Array.isArray(res.data) && res.data.length > 0) {
          rows = res.data;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }
    if (!rows.length && lastError) {
      console.debug(
        "[Admin] loadClients: last error while fetching clients",
        lastError
      );
    }
    if (!rows.length) {
      console.debug(
        "[Admin] loadClients: no client rows returned from any candidate table"
      );
    }
    const mapped = rows.map((c: any) => {
      const id = c.id ?? c.ID ?? c.Id;
      const name = c.name || c.clientName || c.contactPerson || `Client ${id}`;
      return { id, name };
    });
    setClientsList(mapped);
    return mapped;
  };
  const updateClient = async (id: number | string, name: string) => {
    const res: any = await (supabase as any)
      .from("Client")
      .update({ name, updatedAt: new Date().toISOString() } as any)
      .eq("id", id);
    if (res.error) throw res.error;
  };
  const fetchClient = async (id: number | string) => {
    const res: any = await (supabase as any)
      .from("Client")
      .select("*")
      .eq("id", id)
      .single();
    if (res.error) throw res.error;
    return res.data;
  };
  const loadProjects = async () => {
    const { data, error } = await supabase
      .from("Project")
      .select("id, name")
      .order("createdAt", { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name || `Project ${p.id}`,
    }));
    setProjectsList(mapped);
    return mapped;
  };
  const updateProject = async (id: number | string, name: string) => {
    const res: any = await (supabase as any)
      .from("Project")
      .update({ name, lastUpdated: new Date().toISOString() } as any)
      .eq("id", id);
    if (res.error) throw res.error;
  };
  const fetchProject = async (id: number | string) => {
    const res: any = await (supabase as any)
      .from("Project")
      .select("*")
      .eq("id", id)
      .single();
    if (res.error) throw res.error;
    return res.data;
  };
  const loadTLs = async () => {
    // Some environments store userType capitalized as 'Employee'
    const { data, error } = await supabase
      .from("User")
      .select("id, name, userType")
      .in("userType", ["employee", "Employee"])
      .order("createdAt", { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map((u: any) => ({
      id: u.id,
      name: u.name || `User ${u.id}`,
    }));
    setTlsList(mapped);
    return mapped;
  };
  const updateTL = async (id: number | string, name: string) => {
    const res: any = await (supabase as any)
      .from("User")
      .update({ name } as any)
      .eq("id", id);
    if (res.error) throw res.error;
  };
  const fetchTL = async (id: number | string) => {
    const res: any = await (supabase as any)
      .from("User")
      .select("*")
      .eq("id", id)
      .single();
    if (res.error) throw res.error;
    return res.data;
  };
  const loadClientPMs = async () => {
    const { data, error } = await supabase
      .from("User")
      .select("id, name, userType")
      .in("userType", ["client", "Client"])
      .order("createdAt", { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map((u: any) => ({
      id: u.id,
      name: u.name || `User ${u.id}`,
    }));
    setClientPMsList(mapped);
    return mapped;
  };

  const loadUpcoming = async () => {
    // Time window: now to +3 days (inclusive)
    const now = new Date();
    const in3 = new Date();
    in3.setDate(now.getDate() + 1);
    const from = now.toISOString();
    const to = in3.toISOString();

    // Fetch packages with tentative dates in window
    const { data: pkgs, error: pErr } = await supabase
      .from("ProjectPackage")
      .select("id, projectid, tentativedate")
      .gte("tentativedate", from)
      .lte("tentativedate", to)
      .order("tentativedate", { ascending: true });
    if (pErr) throw pErr;
    const list = pkgs || [];
    if (list.length === 0) {
      setUpcomingPackages([]);
      return [];
    }

    // Build maps for project, client, and TL
    const projectIds = Array.from(
      new Set(list.map((r: any) => r.projectid).filter(Boolean))
    );
    type ProjMeta = {
      name: string;
      clientId: number | null;
      tlId: number | null;
    };
    const projMeta = new Map<number, ProjMeta>();
    let clientIds: number[] = [];
    let tlIds: number[] = [];
    if (projectIds.length > 0) {
      const { data: prows, error: prErr } = await (supabase as any)
        .from("Project")
        .select("*")
        .in("id", projectIds);
      if (prErr) throw prErr;
      (prows || []).forEach((p: any) => {
        const id = p.id;
        const name = p.name || p.projectName || `Project ${id}`;
        const cId = p.clientId ?? p.client_id ?? p.clientID ?? null;
        const tId = p.solTLId ?? p.solTlId ?? p.sol_tl_id ?? p.sol_tlId ?? null;
        projMeta.set(Number(id), {
          name,
          clientId: cId != null ? Number(cId) : null,
          tlId: tId != null ? Number(tId) : null,
        });
      });
      clientIds = Array.from(
        new Set(
          Array.from(projMeta.values())
            .map((m) => m.clientId)
            .filter((v): v is number => v != null)
        )
      );
      tlIds = Array.from(
        new Set(
          Array.from(projMeta.values())
            .map((m) => m.tlId)
            .filter((v): v is number => v != null)
        )
      );
    }

    const clientNameMap = new Map<number, string>();
    if (clientIds.length > 0) {
      try {
        const { data: crows, error: cerr } = await (supabase as any)
          .from("Client")
          .select("*")
          .in("id", clientIds);
        if (!cerr) {
          (crows || []).forEach((c: any) => {
            const id = c.id ?? c.ID ?? c.Id;
            const name =
              c.name ||
              c.clientName ||
              c.companyName ||
              c.client ||
              c.contactPerson ||
              `Client ${id}`;
            if (id != null) clientNameMap.set(Number(id), name);
          });
        }
      } catch {}
    }

    const tlNameMap = new Map<number, string>();
    if (tlIds.length > 0) {
      try {
        const { data: urows, error: uerr } = await (supabase as any)
          .from("User")
          .select("*")
          .in("id", tlIds);
        if (!uerr) {
          (urows || []).forEach((u: any) => {
            const id = u.id ?? u.ID;
            const name =
              u.full_name ||
              u.name ||
              u.display_name ||
              u.email ||
              `User ${id}`;
            if (id != null) tlNameMap.set(Number(id), name);
          });
        }
      } catch {}
    }

    const normalized = list.map((r: any) => {
      const pm = projMeta.get(Number(r.projectid));
      const projectName = pm?.name || `Project ${r.projectid}`;
      const clientName =
        pm?.clientId != null
          ? clientNameMap.get(pm.clientId) || `Client ${pm.clientId}`
          : "—";
      const tlName =
        pm?.tlId != null ? tlNameMap.get(pm.tlId) || `User ${pm.tlId}` : "—";
      return {
        id: r.id,
        projectId: r.projectid,
        projectName,
        clientName,
        tlName,
        date: r.tentativedate,
      };
    });
    setUpcomingPackages(normalized);
    return normalized;
  };

  // delete helpers (optimistic update)
  const deleteClient = async (id: number | string) => {
    if (!confirm("Delete this client? Projects linked may block deletion."))
      return;
    const prev = clientsList;
    setClientsList((l) => l.filter((c) => c.id !== id));
    const { error } = await supabase.from("Client").delete().eq("id", id);
    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      setClientsList(prev); // revert
    } else {
      toast({ title: "Client deleted" });
    }
  };
  const deleteProject = async (id: number | string) => {
    if (!confirm("Delete this project?")) return;
    const prev = projectsList;
    setProjectsList((l) => l.filter((c) => c.id !== id));
    const { error } = await supabase.from("Project").delete().eq("id", id);
    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      setProjectsList(prev);
    } else {
      toast({ title: "Project deleted" });
    }
  };
  const deleteTL = async (id: number | string) => {
    if (!confirm("Delete this team lead user?")) return;
    const prev = tlsList;
    setTlsList((l) => l.filter((c) => c.id !== id));
    const { error } = await supabase.from("User").delete().eq("id", id);
    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      setTlsList(prev);
    } else {
      toast({ title: "Team Lead deleted" });
    }
  };
  const deleteClientPM = async (id: number | string) => {
    if (!confirm("Delete this client PM user?")) return;
    const prev = clientPMsList;
    setClientPMsList((l) => l.filter((c) => c.id !== id));
    const { error } = await supabase.from("User").delete().eq("id", id);
    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      setClientPMsList(prev);
    } else {
      toast({ title: "Client PM deleted" });
    }
  };

  // initial load
  useState(() => {
    (async () => {
      setLoadingLists({
        clients: true,
        projects: true,
        tls: true,
        clientpms: true,
        upcoming: true,
      });
      try {
        await Promise.all([
          loadClients(),
          loadProjects(),
          loadTLs(),
          loadClientPMs(),
          loadUpcoming(),
        ]);
      } finally {
        setLoadingLists({
          clients: false,
          projects: false,
          tls: false,
          clientpms: false,
          upcoming: false,
        });
      }
    })();
  });

  const miniCard = (
    item: { id: number | string; name: string },
    onEdit: () => void,
    onDelete: () => void
  ) => (
    <div
      key={String(item.id)}
      className="flex items-center justify-between rounded border px-2 py-1 bg-background text-xs"
    >
      <span className="truncate pr-2" title={item.name}>
        {item.name}
      </span>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10px]"
          onClick={onEdit}
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10px] text-destructive"
          onClick={onDelete}
        >
          Del
        </Button>
      </div>
    </div>
  );
  const updateClientPM = async (id: number | string, name: string) => {
    const res: any = await (supabase as any)
      .from("User")
      .update({ name } as any)
      .eq("id", id);
    if (res.error) throw res.error;
  };
  const fetchClientPM = async (id: number | string) => {
    const res: any = await (supabase as any)
      .from("User")
      .select("*")
      .eq("id", id)
      .single();
    if (res.error) throw res.error;
    return res.data;
  };
  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
        <p className="text-sm text-muted-foreground max-w-prose">
          Administrative quick actions. Use these cards to add new entities.
          (Wire up dialogs or forms later.)
        </p>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {/* Upcoming submissions at top, spanning full width */}
          <Card className="min-h-[200px] flex flex-col sm:col-span-2 xl:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Upcoming submissions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between text-xs text-muted-foreground">
              <p>Packages with tentative date in the next 1 days.</p>
              <div className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {loadingLists.upcoming && (
                  <div className="text-[11px] text-muted-foreground">
                    Loading...
                  </div>
                )}
                {!loadingLists.upcoming && upcomingPackages.length === 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    No upcoming submissions
                  </div>
                )}
                {upcomingPackages.map((u) => (
                  <div
                    key={String(u.id)}
                    className="rounded border p-2 bg-background text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="truncate font-medium"
                        title={u.projectName}
                      >
                        {u.projectName}
                      </div>
                      <div className="text-[11px] px-2 py-0.5 rounded bg-muted shrink-0">
                        {new Date(u.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div
                      className="text-[11px] text-muted-foreground truncate"
                      title={`Client: ${u.clientName} • TL: ${u.tlName}`}
                    >
                      Client: {u.clientName} • TL: {u.tlName}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Tentative: {String(u.date).slice(0, 10)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="min-h-[240px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Add Client
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between text-xs text-muted-foreground">
              <p>Create a new client record and associate primary metadata.</p>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  className="w-full justify-center"
                  variant="default"
                  onClick={() => setOpenAddClient(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-1" /> New
                </Button>
                {/* Inline list replaces View button */}
              </div>
              <div className="mt-2">
                <input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="w-full h-9 rounded border bg-background px-3 text-xs"
                />
              </div>
              <div className="mt-3 space-y-1 max-h-60 overflow-y-auto pr-1">
                {loadingLists.clients && (
                  <div className="text-[11px] text-muted-foreground">
                    Loading...
                  </div>
                )}
                {!loadingLists.clients && clientsList.length === 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    No clients
                  </div>
                )}
                {clientsList
                  .filter((c) =>
                    c.name.toLowerCase().includes(clientSearch.toLowerCase())
                  )
                  .map((c) =>
                    miniCard(
                      c,
                      async () => {
                        try {
                          const data = await fetchClient(c.id);
                          setEditClient(data);
                          setOpenAddClient(true);
                        } catch (e: any) {
                          toast({
                            title: "Error",
                            description: e.message,
                            variant: "destructive",
                          });
                        }
                      },
                      () => deleteClient(c.id)
                    )
                  )}
              </div>
            </CardContent>
          </Card>
          <Card className="min-h-[240px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Add Project
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between text-xs text-muted-foreground">
              <p>Spin up a project space with basic timeline & status.</p>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  className="w-full justify-center"
                  variant="default"
                  onClick={() => setOpenAdd(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-1" /> New
                </Button>
                {/* Inline list replaces View button */}
              </div>
              <div className="mt-2">
                <input
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full h-9 rounded border bg-background px-3 text-xs"
                />
              </div>
              <div className="mt-3 space-y-1 max-h-60 overflow-y-auto pr-1">
                {loadingLists.projects && (
                  <div className="text-[11px] text-muted-foreground">
                    Loading...
                  </div>
                )}
                {!loadingLists.projects && projectsList.length === 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    No projects
                  </div>
                )}
                {projectsList
                  .filter((p) =>
                    p.name.toLowerCase().includes(projectSearch.toLowerCase())
                  )
                  .map((p) =>
                    miniCard(
                      p,
                      async () => {
                        try {
                          const data = await fetchProject(p.id);
                          setEditProject(data);
                          setOpenAdd(true);
                        } catch (e: any) {
                          toast({
                            title: "Error",
                            description: e.message,
                            variant: "destructive",
                          });
                        }
                      },
                      () => deleteProject(p.id)
                    )
                  )}
              </div>
            </CardContent>
          </Card>
          <Card className="min-h-[240px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Add TL</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between text-xs text-muted-foreground">
              <p>Register or invite a Team Lead and assign initial load.</p>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  className="w-full justify-center"
                  variant="default"
                  onClick={() => setOpenAddTL(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-1" /> New
                </Button>
                {/* Inline list replaces View button */}
              </div>
              <div className="mt-2">
                <input
                  value={tlSearch}
                  onChange={(e) => setTlSearch(e.target.value)}
                  placeholder="Search team leads..."
                  className="w-full h-9 rounded border bg-background px-3 text-xs"
                />
              </div>
              <div className="mt-3 space-y-1 max-h-60 overflow-y-auto pr-1">
                {loadingLists.tls && (
                  <div className="text-[11px] text-muted-foreground">
                    Loading...
                  </div>
                )}
                {!loadingLists.tls && tlsList.length === 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    No team leads
                  </div>
                )}
                {tlsList
                  .filter((t) =>
                    t.name.toLowerCase().includes(tlSearch.toLowerCase())
                  )
                  .map((t) =>
                    miniCard(
                      t,
                      async () => {
                        try {
                          const data = await fetchTL(t.id);
                          setEditTL(data);
                          setOpenAddTL(true);
                        } catch (e: any) {
                          toast({
                            title: "Error",
                            description: e.message,
                            variant: "destructive",
                          });
                        }
                      },
                      () => deleteTL(t.id)
                    )
                  )}
              </div>
            </CardContent>
          </Card>
          <Card className="min-h-[240px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Add Client PM
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between text-xs text-muted-foreground">
              <p>Add a client-side project manager contact for coordination.</p>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  className="w-full justify-center"
                  variant="default"
                  onClick={() => setOpenAddClientPM(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-1" /> New
                </Button>
                {/* Inline list replaces View button */}
              </div>
              <div className="mt-2">
                <input
                  value={clientPmSearch}
                  onChange={(e) => setClientPmSearch(e.target.value)}
                  placeholder="Search client PMs..."
                  className="w-full h-9 rounded border bg-background px-3 text-xs"
                />
              </div>
              <div className="mt-3 space-y-1 max-h-60 overflow-y-auto pr-1">
                {loadingLists.clientpms && (
                  <div className="text-[11px] text-muted-foreground">
                    Loading...
                  </div>
                )}
                {!loadingLists.clientpms && clientPMsList.length === 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    No client PMs
                  </div>
                )}
                {clientPMsList
                  .filter((cp) =>
                    cp.name.toLowerCase().includes(clientPmSearch.toLowerCase())
                  )
                  .map((cp) =>
                    miniCard(
                      cp,
                      async () => {
                        try {
                          const data = await fetchClientPM(cp.id);
                          setEditClientPM(data);
                          setOpenAddClientPM(true);
                        } catch (e: any) {
                          toast({
                            title: "Error",
                            description: e.message,
                            variant: "destructive",
                          });
                        }
                      },
                      () => deleteClientPM(cp.id)
                    )
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Add Project Dialog (re-using existing component) */}
        <AddProjectDialog
          hideTrigger
          open={openAdd}
          onOpenChange={(o) => {
            if (!o) setEditProject(null);
            setOpenAdd(o);
          }}
          initialData={editProject}
          isEdit={!!editProject}
          onProjectAdded={() => {
            setEditProject(null);
            setOpenAdd(false);
          }}
        />
        <AddClientDialog
          hideTrigger
          open={openAddClient}
          onOpenChange={(o) => {
            if (!o) setEditClient(null);
            setOpenAddClient(o);
          }}
          initialData={editClient}
          isEdit={!!editClient}
          onClientAdded={() => {
            setEditClient(null);
            setOpenAddClient(false);
          }}
        />
        <AddTeamLeadDialog
          hideTrigger
          open={openAddTL}
          onOpenChange={(o) => {
            if (!o) setEditTL(null);
            setOpenAddTL(o);
          }}
          initialData={editTL}
          isEdit={!!editTL}
          onAdded={() => {
            setEditTL(null);
            setOpenAddTL(false);
          }}
        />
        <AddClientPMDialog
          hideTrigger
          open={openAddClientPM}
          onOpenChange={(o) => {
            if (!o) setEditClientPM(null);
            setOpenAddClientPM(o);
          }}
          initialData={editClientPM}
          isEdit={!!editClientPM}
          onAdded={() => {
            setEditClientPM(null);
            setOpenAddClientPM(false);
          }}
        />
        {/* EntityListDialog components removed in favor of inline lists */}
      </div>
    </DashboardLayout>
  );
}
