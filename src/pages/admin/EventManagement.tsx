import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useParams, useNavigate } from "react-router-dom";

const mockEvents = [
  { id: "1", title: "Mariage Dupont" },
  { id: "2", title: "Conférence Tech 2025" },
  { id: "3", title: "Gala Entreprise ABC" },
];

type VenueArea = "interieur" | "exterieur" | "les_deux";
type EventData = { id: string; title: string; areaChoice?: VenueArea };

const EventManagement = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activePhase, setActivePhase] = useState<"avant" | "apres">("avant");

  let event: EventData | undefined = mockEvents.find((e) => e.id === id) as EventData | undefined;
  const raw = typeof window !== "undefined" ? localStorage.getItem("events") : null;
  if (raw) {
    let list: EventData[] | null = null;
    try {
      list = JSON.parse(raw) as EventData[];
    } catch {
      list = null;
    }
    if (list) {
      const found = list.find((ev) => ev.id === id);
      if (found) event = found;
    }
  }
  const hasEvent = Boolean(event);
  const canShowRoomCleaning = event?.areaChoice === "interieur" || event?.areaChoice === "les_deux";

  const goAssign = (task: string) => {
    if (!id) return;
    navigate(`/admin/events/${id}/staff?task=${encodeURIComponent(task)}`);
  };

  const goTables = () => {
    if (!id) return;
    navigate(`/admin/events/${id}/tables`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {hasEvent ? event?.title : "Aucun événement sélectionné"}
          </h1>
          <p className="text-muted-foreground">
            Planifiez et assignez les tâches avant et après l'événement.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">
            Gestion opérationnelle
          </h2>
        </CardHeader>
        <CardContent>
          {hasEvent ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="button"
                  className={`flex-1 ${activePhase === "avant" ? "bg-primary hover:bg-primary-hover text-white" : "bg-muted hover:bg-muted/80 text-foreground"}`}
                  onClick={() => setActivePhase("avant")}
                >
                  Avant l'événement
                </Button>
                <Button
                  type="button"
                  className={`flex-1 ${activePhase === "apres" ? "bg-primary hover:bg-primary-hover text-white" : "bg-muted hover:bg-muted/80 text-foreground"}`}
                  onClick={() => setActivePhase("apres")}
                >
                  Après l'événement
                </Button>
              </div>

              {activePhase === "avant" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border border-border">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-foreground">Personnel de l'événement</h3>
                      <p className="text-sm text-muted-foreground">Assigner des personnes à cet événement</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="flex-1 bg-primary hover:bg-primary-hover text-white"
                          onClick={() => navigate(`/admin/events/${id}/staff`)}
                        >
                          Assigner des personnes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-foreground">Réaménagement</h3>
                      <p className="text-sm text-muted-foreground">Décoration, peinture, nettoyage</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <Button
                          type="button"
                          className="w-full bg-primary hover:bg-primary-hover text-white"
                          onClick={() => goAssign("decoration")}
                        >
                          Décoration
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => goAssign("peinture")}
                        >
                          Peinture
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => goAssign("nettoyage_cour")}
                        >
                          Net de la cour
                        </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => goAssign("nettoyage_salle")}
                          >
                            Net de la salle
                          </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-foreground">Mise en place</h3>
                      <p className="text-sm text-muted-foreground">Tables, placement, assignations</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="flex-1 bg-primary hover:bg-primary-hover text-white"
                          onClick={goTables}
                        >
                          Gestion des tables
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                </div>
              )}

              {activePhase === "apres" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border border-border">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-foreground">Personnel de l'événement</h3>
                      <p className="text-sm text-muted-foreground">Assigner des personnes à cet événement</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="flex-1 bg-primary hover:bg-primary-hover text-white"
                          onClick={() => navigate(`/admin/events/${id}/staff`)}
                        >
                          Assigner des personnes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-foreground">Démontage</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="flex-1 bg-primary hover:bg-primary-hover text-white"
                          onClick={() => goAssign("demontage")}
                        >
                          Assigner à la tâche
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-foreground">Nettoyage</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => goAssign("nettoyage_cour")}
                        >
                          Nettoyage de la cour
                        </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => goAssign("nettoyage_salle")}
                          >
                            Nettoyage de la salle
                          </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
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
