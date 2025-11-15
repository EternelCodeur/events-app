import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useParams, useNavigate } from "react-router-dom";

const mockEvents = [
  { id: "1", title: "Mariage Dupont" },
  { id: "2", title: "Conférence Tech 2025" },
  { id: "3", title: "Gala Entreprise ABC" },
];

const EventManagement = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const event = mockEvents.find((e) => e.id === id);
  const hasEvent = Boolean(event);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {hasEvent ? event?.title : "Aucun événement sélectionné"}
          </h1>
          <p className="text-muted-foreground">
            Configurez les invités et les tables pour cet événement.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">
            Actions disponibles
          </h2>
        </CardHeader>
        <CardContent>
          {hasEvent ? (
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                className="flex-1 bg-primary hover:bg-primary-hover text-white"
                onClick={() => navigate(`/admin/events/${id}/tables`)}
              >
                Gestion des tables
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary-hover text-white"
                onClick={() => navigate(`/admin/events/${id}/guests`)}
              >
                Gestion des invités
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary-hover text-white"
                onClick={() => navigate(`/admin/events/${id}/staff`)}
              >
                Gestion des employés
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Aucun événement sélectionné. Retournez à la liste des événements pour en choisir un.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventManagement;
