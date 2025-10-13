import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[50vh] text-center">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm uppercase tracking-wide">
          Page under construction
        </p>
      </div>
    </DashboardLayout>
  );
}
