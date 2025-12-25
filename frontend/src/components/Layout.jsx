import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth, useAmbulatorio } from "@/App";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Calendar,
  Users,
  FileText,
  BarChart3,
  Home,
  LogOut,
  Menu,
  Building2,
  ChevronDown,
  Stethoscope,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Home", icon: Home },
  { path: "/agenda", label: "Agenda", icon: Calendar },
  { path: "/pazienti", label: "Pazienti", icon: Users },
  { path: "/modulistica", label: "Modulistica", icon: FileText },
  { path: "/statistiche", label: "Statistiche", icon: BarChart3 },
];

const AMBULATORI_NAMES = {
  pta_centro: "PTA Centro",
  villa_ginestre: "Villa delle Ginestre",
};

export const Layout = () => {
  const { user, logout } = useAuth();
  const { ambulatorio, selectAmbulatorio } = useAmbulatorio();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleAmbulatorioChange = (amb) => {
    selectAmbulatorio(amb);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const NavContent = ({ mobile = false }) => (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => mobile && setMobileOpen(false)}
          className={({ isActive }) =>
            `sidebar-nav-item ${isActive ? "active" : ""}`
          }
        >
          <item.icon className="w-5 h-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="sidebar hide-mobile">
        <div className="sidebar-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Ambulatorio</h2>
              <p className="text-xs text-muted-foreground">Infermieristico</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavContent />
        </nav>

        <div className="sidebar-footer">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-auto py-2">
                <div className="flex items-center gap-2 text-left">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                    {user?.username?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.username}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {AMBULATORI_NAMES[ambulatorio]}
                    </p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user?.ambulatori?.length > 1 && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                    Cambia Ambulatorio
                  </DropdownMenuLabel>
                  {user.ambulatori.map((amb) => (
                    <DropdownMenuItem
                      key={amb}
                      onClick={() => handleAmbulatorioChange(amb)}
                      className={amb === ambulatorio ? "bg-accent" : ""}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      {AMBULATORI_NAMES[amb]}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Esci
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="glass-header hide-desktop p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">{AMBULATORI_NAMES[ambulatorio]}</span>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">Ambulatorio</h2>
                  <p className="text-xs text-muted-foreground">Infermieristico</p>
                </div>
              </div>
            </div>
            <nav className="p-4">
              <NavContent mobile />
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                    {user?.username?.charAt(0)}
                  </div>
                  <span className="text-sm font-medium">{user?.username}</span>
                </div>
              </div>
              {user?.ambulatori?.length > 1 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Cambia Ambulatorio</p>
                  <div className="flex gap-2">
                    {user.ambulatori.map((amb) => (
                      <Button
                        key={amb}
                        variant={amb === ambulatorio ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          handleAmbulatorioChange(amb);
                          setMobileOpen(false);
                        }}
                      >
                        {amb === "pta_centro" ? "PTA" : "Villa"}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Esci
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="main-content with-sidebar">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        {NAV_ITEMS.slice(0, 4).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
