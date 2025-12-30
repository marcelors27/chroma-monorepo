import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CompanyLink from "./pages/CompanyLink";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import NewsDetails from "./pages/NewsDetails";
import Condos from "./pages/Condos";
import Orders from "./pages/Orders";
import Settings from "./pages/Settings";
import Checkout from "./pages/Checkout";
import ProductDetails from "./pages/ProductDetails";
import AccessPending from "./pages/AccessPending";
import Recurrences from "./pages/Recurrences";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/company-link" element={<CompanyLink />} />
            <Route path="/access-pending" element={<AccessPending />} />
            <Route path="/onboarding" element={<Onboarding />} />
            
            {/* Routes with sidebar layout */}
            <Route element={<AppLayout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/news/:id" element={<NewsDetails />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/condos" element={<Condos />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/recurrences" element={<Recurrences />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
