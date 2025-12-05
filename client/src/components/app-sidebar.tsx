import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Server,
  ShoppingCart,
  Plus,
  Users,
  DollarSign,
  Settings,
  LogOut,
  Wallet,
  Package,
  Receipt,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

const customerMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My VPS", url: "/vps", icon: Server },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Billing", url: "/billing", icon: Receipt },
  { title: "Create VPS", url: "/create", icon: Plus },
  { title: "Tariffs", url: "/tariffs", icon: Package },
];

const adminMenuItems = [
  { title: "Admin Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "All Users", url: "/admin/users", icon: Users },
  { title: "All Orders", url: "/admin/orders", icon: ShoppingCart },
  { title: "Pricing", url: "/admin/pricing", icon: DollarSign },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const menuItems = isAdmin ? adminMenuItems : customerMenuItems;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Server className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">RDP Panel</span>
            <span className="text-xs text-muted-foreground">
              {isAdmin ? "Admin" : "Customer"} Portal
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isAdmin ? "Administration" : "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Customer View</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {customerMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-3">
          {user && (
            <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Balance</span>
                <span className="font-mono text-sm font-semibold">
                  ${parseFloat(user.balance?.toString() || "0").toFixed(2)}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {user?.username?.slice(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">{user?.username}</span>
              <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
            </div>
            {isAdmin && (
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            )}
          </div>
          
          <SidebarMenuButton
            onClick={logout}
            className="w-full justify-start text-destructive hover:text-destructive"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
