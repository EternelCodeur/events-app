import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Users, UserCheck, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/dashboard";
import { getEvents, type EventItem } from "@/lib/events";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const Dashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  useEffect(() => {
    (async () => {
      try {
        const m = await getDashboardMetrics();
        setMetrics(m);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const es = await getEvents();
        setEvents(Array.isArray(es) ? es : []);
      } catch {
        setEvents([]);
      }
    })();
  }, []);

  const fmtCfa = (n: number | undefined) =>
    typeof n === "number" ? `${new Intl.NumberFormat("fr-FR").format(n)} CFA` : "-";

  const parseCfa = (s?: string) => {
    const digits = (s || "").replace(/\D+/g, "");
    return digits ? parseInt(digits, 10) : 0;
  };

  const revenueByMonth = useMemo(() => {
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

  const chartConfig = { value: { label: "Budget (CFA)", color: "hsl(var(--primary))" } } as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de vos événements et activités
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Événements à venir"
          value={loading ? "…" : (metrics?.eventsUpcomingCount ?? 0)}
          change={undefined}
          changeType="positive"
          icon={Calendar}
          variant="blue"
        />
        <KpiCard
          title="Salles occupées"
          value={loading ? "…" : (metrics?.venuesOccupiedCount ?? 0)}
          change={loading ? undefined : `sur ${metrics?.venuesTotal ?? 0}`}
          changeType="neutral"
          icon={Users}
          variant="green"
        />
        <KpiCard
          title="Employés actifs"
          value={loading ? "…" : (metrics?.staffActiveCount ?? 0)}
          change={undefined}
          changeType="neutral"
          icon={UserCheck}
          variant="orange"
        />
        <KpiCard
          title="Revenu mensuel"
          value={loading ? "…" : fmtCfa(metrics?.monthlyRevenueCfa || 0)}
          change={undefined}
          changeType="positive"
          icon={TrendingUp}
          variant="red"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-foreground">Évolution mensuelle du budget</h2>
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
        <div className="lg:col-span-3">
          <UpcomingEvents />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
