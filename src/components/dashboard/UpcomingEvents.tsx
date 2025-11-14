import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  guests: number;
  status: "confirmed" | "pending" | "completed";
}

const mockEvents: Event[] = [
  {
    id: "1",
    title: "Mariage Dupont",
    date: "2025-01-20",
    venue: "Salle Royale",
    guests: 150,
    status: "confirmed",
  },
  {
    id: "2",
    title: "Conférence Tech 2025",
    date: "2025-01-25",
    venue: "Centre Convention",
    guests: 300,
    status: "pending",
  },
  {
    id: "3",
    title: "Gala Entreprise ABC",
    date: "2025-02-10",
    venue: "Grand Hôtel",
    guests: 200,
    status: "confirmed",
  },
];

const statusColors = {
  confirmed: "bg-success hover:bg-success/90",
  pending: "bg-accent hover:bg-accent/90",
  completed: "bg-muted hover:bg-muted/90",
};

const statusLabels = {
  confirmed: "Confirmé",
  pending: "En attente",
  completed: "Terminé",
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
          <Link to="/events">Voir tout</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockEvents.map((event) => (
            <div
              key={event.id}
              className="p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow"
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
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
