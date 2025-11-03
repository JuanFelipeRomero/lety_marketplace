import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router";
import {
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  ImageIcon,
  DollarSign,
  Calendar,
  MessageSquare,
  Users,
  BarChart2,
  Loader2,
  Wallet,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import Cookies from "js-cookie";
import { useAuthStore } from "~/stores/useAuthStore";
import type { Vet } from "~/types/usersTypes";

interface SidebarNavProps {
  items: {
    href: string;
    title: string;
    icon: React.ReactNode;
  }[];
}

function SidebarNav({ items }: SidebarNavProps) {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className="grid gap-1">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            }`}
          >
            {item.icon}
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  //extrar info de la veterinaria
  const user = useAuthStore((state) => state.user);
  const userType = useAuthStore((state) => state.userType);

  const vetId =
    user && userType === "vet" ? (user as Vet).id_clinica : undefined;
  console.log(vetId);

  const handleLogout = () => {
    Cookies.remove("auth_token");
    logout();
    navigate("/");
  };

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard-vet",
      icon: <Home className="h-4 w-4" />,
    },
    {
      title: "Información General",
      href: "/dashboard-vet/general-information",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      title: "Fotos",
      href: "/dashboard-vet/photos",
      icon: <ImageIcon className="h-4 w-4" />,
    },
    {
      title: "Servicios y Precios",
      href: "/dashboard-vet/services",
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "Citas",
      href: "/dashboard-vet/appointments",
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      title: "Ganancias",
      href: "/dashboard-vet/earnings",
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      title: "Estadísticas",
      href: "/dashboard-vet/analytics",
      icon: <BarChart2 className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <div className="flex h-full flex-col">
              <div className="flex h-14 items-center border-b px-2">
                <Link
                  to="/dashboard-vet"
                  className="flex items-center gap-2 font-semibold"
                >
                  <Building2 className="h-6 w-6" />
                  <span>LETY MARKETPLACE</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close navigation menu</span>
                </Button>
              </div>
              <div className="flex-1 overflow-auto py-4">
                <SidebarNav items={navItems} />
              </div>
              <div className="border-t p-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Link
          to="/dashboard-vet"
          className="hidden items-center gap-2 font-semibold md:flex"
        >
          <Building2 className="h-6 w-6" />
          <span>LETY MARKETPLACE</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-medium">{user?.nombre}</p>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r md:block">
          <div className="sticky top-16 overflow-auto p-4 h-[calc(100vh-4rem)]">
            <SidebarNav items={navItems} />
            <div className="mt-6 border-t pt-6">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </aside>

        {/* Aquí se renderizan las páginas internas del dashboard */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
