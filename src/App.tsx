import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import Clients from "./pages/Clients";
import Team from "./pages/Team";
import ProjectDetail from "./pages/ProjectDetail";
import Admin from "./pages/Admin";
import AdminAddProject from "./pages/AdminAddProject";
import Files from "./pages/Files";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { AuthProvider, RequireAuth, RequireRole } from "@/context/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* public */}
              <Route path="/login" element={<Login />} />

              {/* protected */}
              <Route element={<RequireAuth />}>
                <Route path="/" element={<Index />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/team" element={<Team />} />
                <Route path="/files" element={<Files />} />
                <Route path="/settings" element={<Settings />} />

                {/* admin-only */}
                <Route element={<RequireRole allowed={["admin"]} />}>
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/add-project" element={<AdminAddProject />} />
                </Route>
              </Route>

              {/* fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
