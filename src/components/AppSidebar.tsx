import { LayoutDashboard, History, Settings, Package, RotateCcw, Store, ShoppingCart, Database, BarChart3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, type: "single" },
  { 
    title: "Shopify Admin Details", 
    icon: Database, 
    type: "group",
    items: [
      { title: "Products", url: "/products", icon: Package },
      { title: "Shops", url: "/shops", icon: Store },
    ]
  },
  { 
    title: "Activity", 
    icon: ShoppingCart, 
    type: "group",
    items: [
      { title: "Purchase", url: "/purchase", icon: ShoppingCart },
      { title: "Return", url: "/returns", icon: RotateCcw },
    ]
  },
  { title: "History", url: "/history", icon: History, type: "single" },
  { title: "Analytics", url: "/analytics", icon: BarChart3, type: "single" },
  { title: "Settings", url: "/settings", icon: Settings, type: "single" },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Shopify Admin Details": true,
    "Activity": true,
  });

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <Sidebar className={!open ? "w-14" : "w-60"}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={!open ? "px-2" : ""}>
            {open && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (item.type === "single") {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url!}
                          className="hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <item.icon className={!open ? "h-5 w-5" : "mr-2 h-4 w-4"} />
                          {open && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                if (item.type === "group" && open) {
                  return (
                    <Collapsible
                      key={item.title}
                      open={openGroups[item.title]}
                      onOpenChange={() => toggleGroup(item.title)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="hover:bg-sidebar-accent">
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${openGroups[item.title] ? 'rotate-180' : ''}`} />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items?.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink
                                    to={subItem.url}
                                    className="hover:bg-sidebar-accent"
                                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                                  >
                                    <subItem.icon className="mr-2 h-4 w-4" />
                                    <span>{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                if (item.type === "group" && !open) {
                  return item.items?.map((subItem) => (
                    <SidebarMenuItem key={subItem.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={subItem.url}
                          className="hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <subItem.icon className="h-5 w-5" />
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ));
                }

                return null;
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}