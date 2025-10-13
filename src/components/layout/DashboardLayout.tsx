import { ReactNode, createContext, useContext, useState, useMemo } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface GlobalSearchContextValue {
  query: string;
  setQuery: (q: string) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | undefined>(
  undefined
);

export function useGlobalSearch() {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx)
    throw new Error("useGlobalSearch must be used within DashboardLayout");
  return ctx;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [query, setQuery] = useState("");
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return (
    <GlobalSearchContext.Provider value={value}>
      {/* Set defaultOpen to false so the sidebar starts collapsed by default */}
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <TopBar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </GlobalSearchContext.Provider>
  );
}
