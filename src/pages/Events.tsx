import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const mockEvents = [
  {
    id: "1",
    title: "Mariage Dupont",
    date: "2025-01-20",
    venue: "Salle Royale",
    guests: 150,
    status: "confirmed",
    budget: "15,000€",
  },
  {
    id: "2",
    title: "Conférence Tech 2025",
    date: "2025-01-25",
    venue: "Centre Convention",
    guests: 300,
    status: "pending",
    budget: "30,000€",
  },
  {
    id: "3",
    title: "Gala Entreprise ABC",
    date: "2025-02-10",
    venue: "Grand Hôtel",
    guests: 200,
    status: "confirmed",
    budget: "25,000€",
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

const Events = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Événements</h1>
          <p className="text-muted-foreground">
            Gérez tous vos événements en un seul endroit
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover">
          <Plus className="w-4 h-4 mr-2" />
          Nouvel événement
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un événement..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockEvents.map((event) => (
          <Card
            key={event.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">
                    {event.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Badge className={statusColors[event.status as keyof typeof statusColors]}>
                  {statusLabels[event.status as keyof typeof statusLabels]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lieu</span>
                  <span className="font-medium text-foreground">{event.venue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invités</span>
                  <span className="font-medium text-foreground">{event.guests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium text-foreground">{event.budget}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Détails
                </Button>
                <Button size="sm" className="flex-1 bg-primary hover:bg-primary-hover">
                  Gérer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Events;
