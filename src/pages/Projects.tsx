import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProjectsTable } from "@/components/projects/ProjectsTable";

const Projects = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground">
              Manage and track all your active projects
            </p>
          </div>
        </div>
        <ProjectsTable />
      </div>
    </DashboardLayout>
  );
};

export default Projects;