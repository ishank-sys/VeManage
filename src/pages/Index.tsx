import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { ProjectStatusPieChart } from "@/components/charts/ProjectStatusPieChart";
import { ClientProjectsTreemap } from "@/components/charts/ClientProjectsTreemap";
import { useState } from "react";
import { WorkloadLineChart } from "@/components/charts/WorkloadLineChart";
import { ActiveProjectsCard } from "@/components/projects/ActiveProjectsCard";

const Index = () => {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ProjectStatusPieChart
            onSelectStatus={(s) => setSelectedStatus(s)}
            selectedStatus={selectedStatus}
          />
          <ClientProjectsTreemap
            onSelectClient={(cid) => setSelectedClientId(cid)}
            selectedClientId={selectedClientId}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-4 items-stretch">
          <div className="md:col-span-3">
            <WorkloadLineChart />
          </div>
          <ActiveProjectsCard />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6">
          <ProjectsTable
            clientFilterId={selectedClientId}
            onClearClientFilter={() => setSelectedClientId(null)}
            statusFilterExternal={selectedStatus || null}
            onClearStatusFilter={() => setSelectedStatus(null)}
            restrictToLive
            hideAddProject
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
