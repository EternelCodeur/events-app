import { useEffect, useMemo, useState } from "react";
import { Building2, Users, Calendar, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { getCompanies, type Company } from "@/lib/api";
import { getEvents, type EventItem } from "@/lib/events";

const SuperAdminDashboard = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  const fmtCfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n)} CFA`;
  const parseCfa = (s?: string) => {
    const digits = (s || "").replace(/\D+/g, "");
    return digits ? parseInt(digits, 10) : 0;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [cs, es] = await Promise.all([getCompanies(), getEvents()]);
        if (!mounted) return;
        setCompanies(Array.isArray(cs) ? cs : []);
        setEvents(Array.isArray(es) ? es : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const { totalCompanies, activeCompanies, totalEvents, monthlyBudgetTotalCfa } = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthEnd = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;
    const included: EventItem["status"][] = ["en_attente", "confirme", "en_cours", "termine"];
    const monthlyBudget = events
      .filter(e => included.includes(e.status))
      .filter(e => {
        const d = String(e.date || "");
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((sum, e) => sum + parseCfa(e.budget), 0);
    return {
      totalCompanies: companies.length,
      activeCompanies: companies.filter(c => c.status === "active").length,
      totalEvents: events.length,
      monthlyBudgetTotalCfa: monthlyBudget,
    };
  }, [companies, events]);

  const revenueByMonth = useMemo(() => {
    // Somme des budgets par mois pour l'année sélectionnée (toutes entreprises)
    const year = Number(selectedYear);
    const included: EventItem["status"][] = ["en_attente", "confirme", "en_cours", "termine"];
    const buckets = new Array(12).fill(0) as number[];
    events.forEach(e => {
      if (!included.includes(e.status)) return;
      const d = new Date(e.date);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() !== year) return;
      buckets[d.getMonth()] += parseCfa(e.budget);
    });
    const labels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sept", "Oct", "Nov", "Dec"];
    return labels.map((month, idx) => ({ month, value: buckets[idx] || 0 }));
  }, [events, selectedYear]);

  const chartConfig = { value: { label: "CA (CFA)", color: "hsl(var(--primary))" } } as const;

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
          value={loading ? "…" : totalCompanies}
          changeType="neutral"
          icon={Building2}
          variant="blue"
        />
        <KpiCard
          title="Entreprises actives"
          value={loading ? "…" : activeCompanies}
          change="Sous abonnement actif"
          changeType="positive"
          icon={Users}
          variant="green"
        />
        <KpiCard
          title="Événements gérés"
          value={loading ? "…" : totalEvents}
          change="Sur la plateforme"
          changeType="neutral"
          icon={Calendar}
          variant="orange"
        />
        <KpiCard
          title="CA cumulé estimé du mois"
          value={loading ? "…" : fmtCfa(monthlyBudgetTotalCfa)}
          change={undefined}
          changeType="neutral"
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
              <select
                aria-label="Choisir l'année"
                className="border border-border rounded-md px-2 py-1 text-xs bg-background"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value={String(new Date().getFullYear() - 2)}>{new Date().getFullYear() - 2}</option>
                <option value={String(new Date().getFullYear() - 1)}>{new Date().getFullYear() - 1}</option>
                <option value={String(new Date().getFullYear())}>{new Date().getFullYear()}</option>
              </select>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <ChartContainer config={chartConfig} className="w-full h-64">
              <BarChart data={revenueByMonth}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => new Intl.NumberFormat("fr-FR").format(Number(v || 0))}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${new Intl.NumberFormat("fr-FR").format(Number(value || 0))} CFA`}
                    />
                  }
                />
                <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
