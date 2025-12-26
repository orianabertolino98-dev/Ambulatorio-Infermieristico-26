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
  Settings,
  Maximize,
  Minimize,
  RotateCw,
  Monitor,
  Smartphone,
} from "lucide-react";
import { useState, useEffect } from "react";

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

const AMBULATORI_SHORT = {
  pta_centro: "PTA",
  villa_ginestre: "Villa",
};

export const Layout = () => {
  const { user, logout } = useAuth();
  const { ambulatorio, selectAmbulatorio } = useAmbulatorio();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [orientation, setOrientation] = useState("auto"); // "auto", "landscape", "portrait"

  // Check fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Handle orientation change via CSS
  useEffect(() => {
    const root = document.documentElement;
    if (orientation === "landscape") {
      root.style.setProperty("--app-rotation", "0deg");
      root.classList.remove("portrait-mode");
      root.classList.add("landscape-mode");
    } else if (orientation === "portrait") {
      root.classList.remove("landscape-mode");
      root.classList.add("portrait-mode");
    } else {
      root.classList.remove("landscape-mode", "portrait-mode");
    }
    return () => {
      root.classList.remove("landscape-mode", "portrait-mode");
    };
  }, [orientation]);

  const handleAmbulatorioChange = (amb) => {
    selectAmbulatorio(amb);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const cycleOrientation = () => {
    if (orientation === "auto") {
      setOrientation("landscape");
    } else if (orientation === "landscape") {
      setOrientation("portrait");
    } else {
      setOrientation("auto");
    }
  };

  // Render navigation items
  const renderNavItems = (mobile = false) => (
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

  // Settings Menu Component
  const renderSettingsMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Impostazioni Display</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleFullscreen}>
          {isFullscreen ? (
            <>
              <Minimize className="w-4 h-4 mr-2" />
              Esci da Schermo Intero
            </>
          ) : (
            <>
              <Maximize className="w-4 h-4 mr-2" />
              Schermo Intero
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Orientamento</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setOrientation("auto")} className={orientation === "auto" ? "bg-primary/10" : ""}>
          <RotateCw className="w-4 h-4 mr-2" />
          Auto
          {orientation === "auto" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setOrientation("landscape")} className={orientation === "landscape" ? "bg-primary/10" : ""}>
          <Monitor className="w-4 h-4 mr-2" />
          Orizzontale
          {orientation === "landscape" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setOrientation("portrait")} className={orientation === "portrait" ? "bg-primary/10" : ""}>
          <Smartphone className="w-4 h-4 mr-2" />
          Verticale
          {orientation === "portrait" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Render top right menu
  const renderTopRightMenu = (isMobile = false) => (
    <div className="flex items-center gap-2">
      {/* Settings Button */}
      {renderSettingsMenu()}

      {/* Ambulatorio Selector */}
      {user?.ambulatori?.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size={isMobile ? "sm" : "default"}
              className="gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10"
            >
              <Building2 className="w-4 h-4 text-primary" />
              <span className={isMobile ? "text-xs" : "text-sm"}>
                {isMobile ? AMBULATORI_SHORT[ambulatorio] : AMBULATORI_NAMES[ambulatorio]}
              </span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Cambia Ambulatorio</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user.ambulatori.map((amb) => (
              <DropdownMenuItem
                key={amb}
                onClick={() => handleAmbulatorioChange(amb)}
                className={amb === ambulatorio ? "bg-primary/10 text-primary" : ""}
              >
                <Building2 className="w-4 h-4 mr-2" />
                {AMBULATORI_NAMES[amb]}
                {amb === ambulatorio && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size={isMobile ? "sm" : "default"}
            className="gap-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-sm">
              {user?.username?.charAt(0)}
            </div>
            {!isMobile && (
              <>
                <span className="text-sm font-medium">{user?.username}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-primary-foreground text-lg font-semibold">
                {user?.username?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{user?.username}</p>
                <p className="text-xs text-muted-foreground font-normal">
                  {AMBULATORI_NAMES[ambulatorio]}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Esci
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="sidebar hide-mobile">
        <div className="sidebar-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-md">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Ambulatorio</h2>
              <p className="text-xs text-muted-foreground">Infermieristico</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {renderNavItems(false)}
        </nav>

        {/* Desktop: Simple footer with just app info */}
        <div className="sidebar-footer">
          <div className="text-center text-xs text-muted-foreground py-2">
            <p>v1.0.0</p>
          </div>
        </div>
      </aside>

      {/* Desktop Top Bar with User Menu - RIGHT ALIGNED */}
      <header className="fixed top-0 right-0 left-64 z-40 h-16 bg-background/95 backdrop-blur border-b hide-mobile">
        <div className="h-full px-6 flex items-center justify-end">
          {renderTopRightMenu(false)}
        </div>
      </header>

      {/* Mobile Header */}
      <header className="glass-header hide-desktop p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-md">
                    <Stethoscope className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm">Ambulatorio</h2>
                    <p className="text-xs text-muted-foreground">Infermieristico</p>
                  </div>
                </div>
              </div>
              <nav className="p-4">
                {renderNavItems(true)}
              </nav>
            </SheetContent>
          </Sheet>
          
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-sm">
            <Stethoscope className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>

        {/* Mobile: Top Right Menu */}
        {renderTopRightMenu(true)}
      </header>

      {/* Main Content - adjusted for top bar */}
      <main className="main-content with-sidebar pt-16">
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
