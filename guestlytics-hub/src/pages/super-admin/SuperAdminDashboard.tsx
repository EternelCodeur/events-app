import { useState } from "react";
import { Building2, Users, Calendar, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";

const SuperAdminDashboard = () => {
  // Valeurs mockées pour la démo Super Admin
  const totalCompanies = 24;
  const activeCompanies = 18;
  const totalEvents = 132;
  const totalRevenue = "245 000 FCFA";

  const [selectedYear, setSelectedYear] = useState("2024");

  const revenueByMonth = [
    { month: "Jan", value: 12000 },
    { month: "Fév", value: 18000 },
    { month: "Mar", value: 22000 },
    { month: "Avr", value: 19500 },
    { month: "Mai", value: 26000 },
    { month: "Juin", value: 31500 },
    { month: "Juil", value: 390800 },
    { month: "Aout", value: 9800 },
    { month: "Sept", value: 3500 },
    { month: "Oct", value: 3100 },
    { month: "Nov", value: 3600 },
    { month: "Dec", value: 31500 },
  ];

  const maxRevenue = Math.max(...revenueByMonth.map((r) => r.value));
  const barColors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-orange-500",
    "bg-violet-500",
    "bg-cyan-500",
    "bg-rose-500",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Tableau de bord Super Admin</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de l'activité des entreprises clientes
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Entreprises totales"
          value={totalCompanies}
          change="Toutes entreprises créées"
          changeType="neutral"
          icon={Building2}
          variant="blue"
        />
        <KpiCard
          title="Entreprises actives"
          value={activeCompanies}
          change="Sous abonnement actif"
          changeType="positive"
          icon={Users}
          variant="green"
        />
        <KpiCard
          title="Événements gérés"
          value={totalEvents}
          change="Sur l'ensemble de la plateforme"
          changeType="neutral"
          icon={Calendar}
          variant="orange"
        />
        <KpiCard
          title="CA cumulé estimé"
          value={totalRevenue}
          change="+18% vs période précédente"
          changeType="positive"
          icon={TrendingUp}
          variant="red"
        />
      </div>

      {/* Graphique simple d'évolution mensuelle du CA */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-foreground">Évolution mensuelle du CA</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden sm:inline">Données fictives</span>
              <select
                aria-label="Choisir l'année"
                className="border border-border rounded-md px-2 py-1 text-xs bg-background"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>
          <div className="h-48 flex items-end gap-3 border-t border-border pt-4">
            {revenueByMonth.map((item, index) => {
              const height = (item.value / maxRevenue) * 100;
              const colorClass = barColors[index % barColors.length];
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center justify-end gap-2">
                  <div
                    className={`w-full max-w-[32px] rounded-t-md ${colorClass}`}
                    style={{ height: `${Math.max(height, 10)}%` }}
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    <div>{item.month}</div>
                    <div className="font-semibold text-foreground">{item.value.toLocaleString("fr-FR")} FCFA</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
