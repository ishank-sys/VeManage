import { ClientsTable } from "@/components/clients/ClientsTable";
import { ClientsOverview } from "@/components/clients/ClientsOverview";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function Clients() {
  return (
    <DashboardLayout>
      <div className="space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm">
            Portfolio health, importance tiers & relationship snapshot
          </p>
        </div>
        <ClientsOverview />
        <ClientsTable />
      </div>
    </DashboardLayout>
  );
}
