import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Hexagon, 
  ShoppingCart, 
  Package, 
  LogOut, 
  Menu,
  ChevronRight,
  Settings,
  Home,
  Repeat
} from "lucide-react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import CartDrawer from "@/components/CartDrawer";
import { getActiveCondo, listCompanies, setActiveCondo } from "@/lib/medusa";

type CondoOption = {
  id: string;
  name: string;
  cnpj?: string;
};

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [condos, setCondos] = useState<CondoOption[]>([]);
  const [selectedCondo, setSelectedCondo] = useState<CondoOption | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    listCompanies()
      .then((data) => {
        if (!mounted) return;
        const approved = (data?.companies || [])
          .filter((company: any) => company?.approved)
          .map((company: any) => ({
            id: company.id,
            name: company.fantasy_name || company.trade_name || "Empresa",
            cnpj: company.cnpj || undefined,
          }));
        setCondos(approved);
        setSelectedCondo((current) => {
          const stored = getActiveCondo();
          if (stored) {
            const match = approved.find((company: CondoOption) => company.id === stored.id);
            if (match) return match;
          }
          if (current && approved.some((company: CondoOption) => company.id === current.id)) {
            return current;
          }
          return approved[0] || null;
        });
        const active = getActiveCondo();
        if (!active && approved[0]) {
          setActiveCondo(approved[0]);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setCondos([]);
        setSelectedCondo(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 border-r-2 border-border flex-col flex-shrink-0">
        <div className="p-6 border-b-2 border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Hexagon className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-primary">Chroma</span>
          </Link>
        </div>

        {/* Condo Selector */}
        <div className="p-4 border-b-2 border-border">
          <p className="text-sm text-muted-foreground mb-2">Condomínio ativo</p>
          <div className="relative" title={selectedCondo?.name || "Sem empresa aprovada"}>
            <select 
              className="w-full p-3 border-2 border-border bg-card font-medium text-foreground truncate pr-8"
              value={selectedCondo?.id || ""}
              disabled={!condos.length}
              onChange={(e) => {
                const condo = condos.find(c => c.id === e.target.value);
                if (condo) {
                  setSelectedCondo(condo);
                  setActiveCondo(condo);
                }
              }}
            >
              {condos.length === 0 && (
                <option value="">Sem empresa aprovada</option>
              )}
              {condos.map((condo) => (
                <option key={condo.id} value={condo.id}>
                  {condo.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <NavItem icon={<Home />} label="Início" href="/home" active={isActive("/home")} />
            <NavItem icon={<ShoppingCart />} label="Produtos" href="/dashboard" active={isActive("/dashboard")} />
            <NavItem icon={<Package />} label="Meus Pedidos" href="/orders" active={isActive("/orders")} />
            <NavItem icon={<Repeat />} label="Recorrentes" href="/recurrences" active={isActive("/recurrences")} />
            <NavItem icon={<Hexagon />} label="Condomínios" href="/condos" active={isActive("/condos")} />
            <NavItem icon={<Settings />} label="Configurações" href="/settings" active={isActive("/settings")} />
          </ul>
        </nav>

        <div className="p-4 border-t-2 border-border">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 border-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-background border-b-2 border-border z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Hexagon className="h-6 w-6 text-primary" />
            <span className="font-bold text-primary">Chroma</span>
          </div>
          <div className="flex items-center gap-2">
            <CartDrawer />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="border-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-card">
                <div className="p-6 border-b-2 border-border">
                  <div className="flex items-center gap-2">
                    <Hexagon className="h-8 w-8 text-primary" />
                    <span className="text-xl font-bold text-primary">Chroma</span>
                  </div>
                </div>
                <div className="p-4 border-b-2 border-border">
                  <p className="text-sm text-muted-foreground mb-2">Condomínio ativo</p>
                  <div className="relative" title={selectedCondo?.name || "Sem empresa aprovada"}>
                    <select 
                      className="w-full p-3 border-2 border-border bg-background font-medium text-foreground rounded-none appearance-none cursor-pointer text-base min-h-[48px] touch-manipulation truncate pr-8"
                      style={{ fontSize: '16px' }}
                      value={selectedCondo?.id || ""}
                      disabled={!condos.length}
                      onChange={(e) => {
                        const condo = condos.find(c => c.id === e.target.value);
                        if (condo) setSelectedCondo(condo);
                      }}
                    >
                      {condos.length === 0 && (
                        <option value="">Sem empresa aprovada</option>
                      )}
                      {condos.map((condo) => (
                        <option key={condo.id} value={condo.id} className="text-base py-2">
                          {condo.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <nav className="p-4">
                  <ul className="space-y-2">
                    <NavItem 
                      icon={<Home />} 
                      label="Início" 
                      href="/home" 
                      active={isActive("/home")}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <NavItem 
                      icon={<ShoppingCart />} 
                      label="Produtos" 
                      href="/dashboard" 
                      active={isActive("/dashboard")}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <NavItem 
                      icon={<Package />} 
                      label="Meus Pedidos" 
                      href="/orders" 
                      active={isActive("/orders")}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <NavItem 
                      icon={<Repeat />} 
                      label="Recorrentes" 
                      href="/recurrences" 
                      active={isActive("/recurrences")}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <NavItem 
                      icon={<Hexagon />} 
                      label="Condomínios" 
                      href="/condos" 
                      active={isActive("/condos")}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <NavItem 
                      icon={<Settings />} 
                      label="Configurações" 
                      href="/settings" 
                      active={isActive("/settings")}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                  </ul>
                </nav>
                <div className="p-4 border-t-2 border-border mt-auto">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 border-2"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:p-8 p-4 pt-20 lg:pt-8 min-h-screen">
        <Outlet context={{ selectedCondo }} />
      </main>
    </div>
  );
};

const NavItem = ({ 
  icon, 
  label, 
  active = false,
  href,
  onClick
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  href?: string;
  onClick?: () => void;
}) => {
  const content = (
    <div 
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all relative ${
        active 
          ? "bg-primary text-primary-foreground font-semibold" 
          : "hover:bg-secondary"
      }`}
    >
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground" />
      )}
      {icon}
      <span className="font-medium">{label}</span>
      {active ? (
        <div className="ml-auto w-2 h-2 rounded-full bg-primary-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
      )}
    </div>
  );

  if (href) {
    return <Link to={href} onClick={onClick}>{content}</Link>;
  }

  return content;
};

export default AppLayout;
