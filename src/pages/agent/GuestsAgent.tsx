/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Search, Check, Users, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const GuestsAgent = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const { toast } = useToast();

  const mockedGuests = [
    {
      id: 1,
      eventId: 1,
      nom: "DUBOIS",
      prenom: "Marie",
      cote: "mariee",
      personnes: 2,
      table: "Table 1",
      statut: "confirmed",
      telephone: "06 12 34 56 78",
      present: false,
      heureArrivee: null,
      additionalGuests: ["Alice"],
    },
    {
      id: 4,
      eventId: 2,
      nom: "DUPONT",
      prenom: "Julie",
      cote: "marie",
      personnes: 1,
      table: "Table 2",
      statut: "pending",
      telephone: "06 99 88 77 66",
      present: false,
      heureArrivee: null,
    },
    {
      id: 2,
      eventId: 1,
      nom: "MARTIN",
      prenom: "Jean",
      cote: "marie",
      personnes: 1,
      table: "Table 2",
      statut: "confirmed",
      telephone: "06 98 76 54 32",
      present: true,
      heureArrivee: "2024-06-01T14:30:00Z",
    },
    {
      id: 3,
      eventId: 2,
      nom: "DURAND",
      prenom: "Sophie",
      cote: "mariee",
      personnes: 3,
      table: "Table 1",
      statut: "confirmed",
      telephone: "06 11 22 33 44",
      present: false,
      heureArrivee: null,
    },
  ];

  const [allGuests, setAllGuests] = useState<any[]>(mockedGuests);
  const [selectedEventId, setSelectedEventId] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const mockEvents = [
    {
      id: 1,
      name: "Mariage Dupont (21h-02h)",
    },
    {
      id: 2,
      name: "Conférence Matinale (08h-12h)",
    },
  ];

  const guestsForEvent = useMemo(
    () => allGuests.filter((g) => g.eventId === selectedEventId),
    [allGuests, selectedEventId],
  );

  const filteredGuests = useMemo(() => {
    const strip = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\p{Diacritic}]+/gu, "")
        .toLowerCase();
    const q = strip(searchTerm.trim());
    if (!q) return [] as any[];
    return guestsForEvent.filter((guest) => {
      const fullName = `${guest.prenom} ${guest.nom}`;
      const haystacks = [
        guest.nom,
        guest.prenom,
        fullName,
        guest.telephone || "",
      ].map(strip);

      const coteLabel =
        guest.cote === "mariee"
          ? "mariee mariée cote mariee coté mariee mariee"
          : guest.cote === "marie"
          ? "marie marié cote marie coté marie marie"
          : "tous tous_les_cotes les deux tous les cotes";
      haystacks.push(strip(coteLabel));

      return haystacks.some((h) => h.includes(q));
    });
  }, [guestsForEvent, searchTerm]);

  useEffect(() => {
    if (searchTerm.trim() && filteredGuests.length === 1) {
      setSelectedGuest(filteredGuests[0]);
    }
  }, [searchTerm, filteredGuests]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const formatDateTimeLocal = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const markAsArrived = async () => {
    if (!selectedGuest) return;
    try {
      setLoading(true);
      const updated = {
        ...selectedGuest,
        present: true,
        heureArrivee: new Date().toISOString(),
      };
      toast({
        title: "Invité marqué comme arrivé",
        description: `${updated.prenom} ${updated.nom} est présent.`,
      });
      setAllGuests((prev) =>
        prev.map((g) => (g.id === updated.id ? updated : g))
      );
      setSelectedGuest(updated);
    } catch (e: any) {
      toast({
        title: "Erreur",
        description:
          e?.response?.data?.message ||
          e?.message ||
          "Impossible de marquer comme arrivé",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const presentCount = guestsForEvent.reduce(
    (sum, g) => sum + (g.present ? Number(g.personnes || 0) : 0),
    0
  );
  const totalPersons = Math.max(
    1,
    guestsForEvent.reduce((sum, g) => sum + Number(g.personnes || 0), 0)
  );

  return (
    <div className="w-full h-full p-1 space-y-2">
      {/* Bandeau bleu en haut, même design que la barre admin, sticky */}
      <div className="-mx-12 -mt-14 mb-8 border-b border-border bg-gradient-to-r from-sky-500 via-blue-500 to-orange-400 px-6 py-2 h-16 lg:h-24 flex items-center justify-between sticky top-16 z-10">
        <div className="text-white font-semibold text-sm sm:text-base">
          Sélection de l'événement
        </div>
        <div className="flex items-center gap-3">
          <select
            aria-label="Sélectionner un événement"
            className="border rounded-md bg-white/90 px-4 py-1.5 text-xs sm:text-sm text-foreground"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
          >
            {mockEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground">Suivi des Arrivées</h1>
        <p className="text-muted-foreground mt-2">
          Recherchez et validez l'arrivée de vos invités pour l'événement sélectionné
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Invités présents
            </CardTitle>
            <Check className="h-8 w-8 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{presentCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'arrivée</CardTitle>
            <Users className="h-8 w-8 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {Math.round((presentCount / totalPersons) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">des invités totaux</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-6 w-6" />
            Recherche d'invité
          </CardTitle>
          <CardDescription>
            Tapez le nom ou prénom de l'invité pour le retrouver rapidement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative group">
            <Search className="absolute left-3 top-3 h-6 w-6 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Rechercher un invité..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 text-lg h-12 border-2 border-muted-foreground/20 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all duration-300"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedGuest(null);
                }}
                aria-label="Effacer la recherche"
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              {filteredGuests.length > 0
                ? `${filteredGuests.length} résultat${
                    filteredGuests.length > 1 ? "s" : ""
                  } trouvé${filteredGuests.length > 1 ? "s" : ""}`
                : "Aucun résultat"}
            </p>
          )}
        </CardContent>
      </Card>

      {(searchTerm.trim() || selectedGuest) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedGuest ? (
            <Card className="cursor-pointer transition-all hover:shadow-lg ring-2 ring-primary">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {selectedGuest.prenom} {selectedGuest.nom}
                      </CardTitle>
                      <Badge
                        className={
                          selectedGuest.present
                            ? "bg-success text-white"
                            : "bg-yellow-500 text-white"
                        }
                      >
                        {selectedGuest.present ? "Présent" : "En attente"}
                      </Badge>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        {selectedGuest.table_name ||
                          selectedGuest.table ||
                          "Non assignée"}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="h-4 w-4 mr-2" />
                        {selectedGuest.personnes} personne
                        {selectedGuest.personnes > 1 ? "s" : ""}
                      </div>
                      {selectedGuest.additionalGuests && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="h-4 w-4 mr-2" />
                          Invités supplémentaires :
                          {" "}
                          {selectedGuest.additionalGuests.join(", ")}
                        </div>
                      )}
                      {selectedGuest.telephone && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="h-4 w-4 mr-2" />
                          {selectedGuest.telephone}
                        </div>
                      )}
                      <div className="text-center mt-6">
                        {!selectedGuest.present ? (
                          <Button
                            variant="default"
                            size="lg"
                            className="w-full text-sm lg:text-lg h-10 lg:h-14"
                            onClick={markAsArrived}
                            disabled={loading}
                          >
                            <Check className="h-6 w-6" />
                            Marquer comme arrivé
                          </Button>
                        ) : (
                          <div className="text-center p-6 bg-success/10 rounded-lg">
                            <Check className="h-12 w-12 text-success mx-auto mb-2" />
                            <div className="text-lg font-semibold text-success">
                              L'invité est arrivé à
                              {" "}
                              {formatDateTimeLocal(selectedGuest.heureArrivee)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ) : filteredGuests.length > 0 ? (
            filteredGuests.map((g) => (
              <Card
                key={g.id}
                className="cursor-pointer hover:shadow"
                onClick={() => setSelectedGuest(g)}
              >
                <CardHeader className="pb-2 mb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {g.prenom} {g.nom}
                    </CardTitle>
                    <Badge
                      className={
                        g.present
                          ? "bg-success text-white"
                          : "bg-yellow-500 text-white"
                      }
                    >
                      {g.present ? "Présent" : "En attente"}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1 flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {g.table_name || "Non assignée"}
                    </span>
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {g.personnes} pers.
                    </span>
                    <span className="flex items-center gap-2">
                      {g.cote === "mariee"
                        ? "Côté mariée"
                        : g.cote === "marie"
                        ? "Côté marié"
                        : "Tous les côtés"}
                    </span>
                    {g.telephone && (
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {g.telephone}
                      </span>
                    )}
                    {Array.isArray(g.additionalGuests) &&
                      g.additionalGuests.length > 0 && (
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          +{g.additionalGuests.length} invité(s) supp.
                        </span>
                      )}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
          ) : (
            <Card className="border-dashed border-2 border-muted/50">
              <CardContent className="text-center p-12">
                <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-muted/20 mb-6">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Aucun invité trouvé
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Aucun invité ne correspond à
                  {" "}
                  <span className="font-medium text-foreground">
                    "{searchTerm}"
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Essayez avec un nom différent ou vérifiez l'orthographe.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default GuestsAgent;
