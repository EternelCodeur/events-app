
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, LogOut, Clock, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignatureCanvas } from "@/components/ui/signature-canvas";

const mockUsers = [
  {
    id: 1,
    name: "Jean Martin",
    role: "Serveur",
    needsArrivalSignature: true,
    hasArrivalSignature: false,
  },
  {
    id: 2,
    name: "Marie Dubois",
    role: "Hôtesse",
    needsArrivalSignature: true,
    hasArrivalSignature: true,
  },
  {
    id: 3,
    name: "Paul Dupont",
    role: "Maître d'hôtel",
    needsArrivalSignature: true,
    hasArrivalSignature: false,
  },
  {
    id: 4,
    name: "Sophie Laurent",
    role: "Sécurité",
    needsArrivalSignature: true,
    hasArrivalSignature: true,
  },
  {
    id: 5,
    name: "Marie Dubois",
    role: "Hôtesse",
    needsArrivalSignature: true,
    hasArrivalSignature: true,
  },
  {
    id: 6,
    name: "Paul Dupont",
    role: "Maître d'hôtel",
    needsArrivalSignature: true,
    hasArrivalSignature: false,
  },
  {
    id: 7,
    name: "Sophie Laurent",
    role: "Sécurité",
    needsArrivalSignature: true,
    hasArrivalSignature: true,
  },
];

// Pour la démo, on met des dates fixes; en réel, ça viendra du backend
const mockEvents = [
  {
    id: 1,
    name: "Mariage Dupont (21h-02h)",
    date: "2024-06-01", // AAAA-MM-JJ
    startTime: "21:00", // 21h
    endTime: "02:00", // 2h du matin (traverse minuit)
  },
  {
    id: 2,
    name: "Conférence Matinale (08h-12h)",
    date: "2024-06-02",
    startTime: "08:00",
    endTime: "12:00",
  },
];

type Mode = "arrival" | "departure";

const UserPointages = () => {
  const [mode, setMode] = useState<Mode>("arrival");
  const [selectedEventId, setSelectedEventId] = useState<number>(mockEvents[0].id);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const selectedEvent = mockEvents.find((e) => e.id === selectedEventId)!;

  const parseTimeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const isNowWithinWindow = () => {
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const start = parseTimeToMinutes(selectedEvent.startTime);

    // Gestion de la date de l'événement
    const [y, m, d] = (selectedEvent.date || "").split("-").map(Number);
    const eventDate = new Date(y, (m || 1) - 1, d || 1);

    // Normaliser à minuit pour comparer uniquement les jours
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    if (today < eventDay) {
      // Jour pas encore arrivé -> pointage fermé
      return false;
    }

    if (today > eventDay) {
      // Jour passé -> pointage toujours ouvert
      return true;
    }

    // Jour J: on ouvre à partir d'1h avant le début, puis sans limite
    const threshold = Math.max(0, start - 60);
    return minutesNow >= threshold;
  };

  const pointageOuvert = isNowWithinWindow();

  const filteredUsers = mockUsers.filter((u) =>
    mode === "arrival" ? u.needsArrivalSignature && !u.hasArrivalSignature : u.hasArrivalSignature,
  );

  const handleOpenSignature = (user: any) => {
    setSelectedUser(user);
  };

  const handleCloseSignature = () => {
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Barre d'onglets en haut, même style que la navigation admin, collée aux bords et sticky */}
      <div className="-mx-6 -my-7 mb-4 border-b border-border bg-gradient-to-r from-sky-500 via-blue-500 to-orange-400 px-6 py-2 h-16 lg:h-24 sticky top-16 z-10">
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as Mode)}
        >
          <TabsList className="w-full justify-center bg-transparent p-1 flex flex-wrap gap-2 text-white">
            <TabsTrigger
              value="arrival"
              disabled={!pointageOuvert}
              className="rounded-xl px-1.5 lg:mt-1 py-1.5 min-w-[32px] h-[40px] md:min-w-[140px] md:h-[60px] text-[14px] font-semibold text-black bg-gradient-to-br from-white via-gray-300 to-white data-[state=active]:from-black data-[state=active]:via-black data-[state=active]:to-black data-[state=active]:text-white shadow-sm flex flex-col items-center justify-center gap-1 text-center whitespace-normal break-words"
            >
              <LogIn className="h-4 w-4 lg:h-6 lg:w-6" />
              <span className="hidden md:inline leading-tight">Fiche d'arrivée</span>
            </TabsTrigger>
            <TabsTrigger
              value="departure"
              disabled={!pointageOuvert}
              className="rounded-xl px-1.5 py-1.5 min-w-[32px] h-[40px] md:min-w-[140px] md:h-[60px] text-[14px] font-semibold text-black bg-gradient-to-br from-white via-gray-300 to-white data-[state=active]:from-black data-[state=active]:via-black data-[state=active]:to-black data-[state=active]:text-white shadow-sm flex flex-col items-center justify-center gap-1 text-center whitespace-normal break-words"
            >
              <LogOut className="h-4 w-4 lg:h-6 lg:w-6" />
              <span className="hidden md:inline leading-tight">Fiche de départ</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Signature des pointages</h1>
            <p className="text-muted-foreground text-sm">
              Choisissez l'événement puis la fiche d'arrivée ou de départ.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <select
              aria-label="Sélectionner un événement"
              className="border rounded-md bg-blue-100 px-6 py-2 text-sm bg-background"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(Number(e.target.value))}
            >
              {mockEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">
                {selectedEvent.startTime} - {selectedEvent.endTime}
              </Badge>
              <Badge variant={pointageOuvert ? "default" : "destructive"}>
                {pointageOuvert ? "Pointage ouvert" : "Pointage fermé"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {!pointageOuvert && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Le pointage pour cet événement est fermé. Veuillez revenir pendant la fenêtre
          {" "}
          <span className="font-semibold">
            {selectedEvent.startTime} - {selectedEvent.endTime}
          </span>
          .
        </p>
      )}

      {pointageOuvert && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle className="text-base font-semibold">
                {mode === "arrival" ? "Fiche de présence (arrivée)" : "Fiche de présence (départ)"}
              </CardTitle>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-white/90">
              Cliquez sur votre nom pour pointer votre
              {" "}
              {mode === "arrival" ? "arrivée" : "départ"} pour cet événement
              {" "}
              <span className="font-semibold">
                ({selectedEvent.startTime} - {selectedEvent.endTime})
              </span>
              .
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => (
                <Card
                  key={user.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:bg-accent border-border"
                  onClick={() => handleOpenSignature(user)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{user.name}</h3>
                        <p className="text-xs text-muted-foreground">{user.role}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {mode === "arrival" ? "Arrivée à signer" : "Départ à signer"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">
                  Aucun utilisateur à afficher pour cette fiche.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && handleCloseSignature()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Signature {mode === "arrival" ? "d'arrivée" : "de départ"}
            </DialogTitle>
            <DialogDescription>
              Utilisateur&nbsp;: <span className="font-semibold">{selectedUser?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Signez ci-dessous pour confirmer le pointage.
            </p>
            <SignatureCanvas
              onSignatureComplete={() => {
                // Ici tu pourras brancher l'enregistrement de la signature plus tard
                handleCloseSignature();
              }}
              width={500}
              height={250}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserPointages;
