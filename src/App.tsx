import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Staff from "./pages/Staff";
import Guests from "./pages/Guests";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/events" element={<AppLayout><Events /></AppLayout>} />
          <Route path="/staff" element={<AppLayout><Staff /></AppLayout>} />
          <Route path="/guests" element={<AppLayout><Guests /></AppLayout>} />
          <Route path="/venues" element={<AppLayout><div className="p-6"><h1 className="text-3xl font-bold">Salles</h1><p className="text-muted-foreground mt-2">Fonctionnalité à venir</p></div></AppLayout>} />
          <Route path="/logistics" element={<AppLayout><div className="p-6"><h1 className="text-3xl font-bold">Logistique</h1><p className="text-muted-foreground mt-2">Fonctionnalité à venir</p></div></AppLayout>} />
          <Route path="/finance" element={<AppLayout><div className="p-6"><h1 className="text-3xl font-bold">Finance</h1><p className="text-muted-foreground mt-2">Fonctionnalité à venir</p></div></AppLayout>} />
          <Route path="/settings" element={<AppLayout><div className="p-6"><h1 className="text-3xl font-bold">Paramètres</h1><p className="text-muted-foreground mt-2">Fonctionnalité à venir</p></div></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
