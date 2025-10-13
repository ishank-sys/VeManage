import {
  Home,
  Users,
  FolderOpen,
  Settings,
  FileText,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "./Logo";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Projects", url: "/projects", icon: FolderOpen },
  { title: "Clients", url: "/clients", icon: Building2 },
  { title: "Team", url: "/team", icon: Users },
  { title: "Files", url: "/files", icon: FileText },
  { title: "Admin", url: "/admin", icon: ShieldCheck },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const getNavClass = (path: string) => {
    const base =
      "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200";
    if (isActive(path)) {
      return (
        base +
        " bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
      );
    }
    return (
      base +
      " text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/20"
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={isCollapsed ? "px-3 pt-4 pb-3" : "px-4 pt-5 pb-4"}>
          <Logo
            collapsed={isCollapsed}
            showText={!isCollapsed}
            size={isCollapsed ? 42 : 48}
          />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      {/* Accent bar */}
                      <span
                        className={`absolute left-0 top-0 h-full w-1 rounded-r transition-all duration-200 ${
                          isActive(item.url)
                            ? "bg-sidebar-primary-foreground opacity-100"
                            : "bg-sidebar-accent opacity-0 group-hover:opacity-60"
                        }`}
                        aria-hidden="true"
                      />
                      <item.icon
                        className={`h-5 w-5 transition-colors ${
                          isActive(item.url)
                            ? "text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="font-medium">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
