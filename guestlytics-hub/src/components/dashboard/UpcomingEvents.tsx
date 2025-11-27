import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  guests: number;
  status: "confirme" | "en_attente" | "termine";
  startTime: string;
  endTime: string;
}

const mockEvents: Event[] = [
  {
    id: "1",
    title: "Mariage Dupont",
    date: "2025-01-20",
    venue: "Salle Royale",
    guests: 150,
    status: "confirme",
    startTime: "18:00",
    endTime: "02:00",
  },
  {
    id: "2",
    title: "Conférence Tech 2025",
    date: "2025-01-25",
    venue: "Centre Convention",
    guests: 300,
    status: "en_attente",
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    id: "3",
    title: "Gala Entreprise ABC",
    date: "2025-02-10",
    venue: "Grand Hôtel",
    guests: 200,
    status: "confirme",
    startTime: "20:00",
    endTime: "01:00",
  },
];

const statusColors = {
  confirme: "bg-success hover:bg-success/90",
  en_attente: "bg-accent hover:bg-accent/90",
  termine: "bg-muted hover:bg-muted/90",
};

const statusLabels = {
  confirme: "Confirmé",
  en_attente: "En attente",
  termine: "Terminé",
};

export const UpcomingEvents = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Événements à venir
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/events">Voir tout</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockEvents.map((event) => (
            <div
              key={event.id}
              className="p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow h-full flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{event.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Badge className={statusColors[event.status]}>
                  {statusLabels[event.status]}
                </Badge>
              </div>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {event.startTime} - {event.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{event.venue}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{event.guests} invités</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
