import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddProjectDialog } from "@/components/projects/AddProjectDialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useState } from "react";

export default function AdminAddProject() {
  const [refresh, setRefresh] = useState(0);
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Add Project (Admin)
        </h1>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">New Project Wizard</CardTitle>
          </CardHeader>
          <CardContent>
            <AddProjectDialog
              hideTrigger
              onProjectAdded={() => setRefresh((n) => n + 1)}
            />
            {/* The dialog has hideTrigger; expose an external button to open it via state if needed later */}
            <p className="text-xs text-muted-foreground mt-4">
              After adding a project, navigate to Projects to view or edit more
              details.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
