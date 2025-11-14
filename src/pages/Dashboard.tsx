import { Calendar, Users, UserCheck, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AttendanceFeed } from "@/components/dashboard/AttendanceFeed";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";

const Dashboard = () => {
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
          value={8}
          change="+2 ce mois"
          changeType="positive"
          icon={Calendar}
        />
        <KpiCard
          title="Invités totaux"
          value="1,248"
          change="+18%"
          changeType="positive"
          icon={Users}
        />
        <KpiCard
          title="Personnel actif"
          value={24}
          change="3 en service"
          changeType="neutral"
          icon={UserCheck}
        />
        <KpiCard
          title="Revenu mensuel"
          value="89,400€"
          change="+12.5%"
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UpcomingEvents />
        </div>
        <div>
          <AttendanceFeed />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
