import React, { useEffect, useState } from "react";
import { Calendar, Users, UserCheck, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/dashboard";

const Dashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  const fmtCfa = (n: number | undefined) =>
    typeof n === "number" ? `${new Intl.NumberFormat("fr-FR").format(n)} CFA` : "-";

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
          <UpcomingEvents />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
