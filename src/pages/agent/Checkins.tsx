import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockCheckins = [
  { id: "1", guest: "Pierre Durand", event: "Mariage Dupont", status: "present" },
  { id: "2", guest: "Claire Martin", event: "Mariage Dupont", status: "pending" },
  { id: "3", guest: "Luc Bernard", event: "Gala ABC", status: "present" },
];

const Checkins = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Pointages</h1>
        <p className="text-muted-foreground">
          Gérez les arrivées et présences des invités
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCheckins.map((item) => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-foreground">
                  {item.guest}
                </h3>
                <Badge
                  className={
                    item.status === "present"
                      ? "bg-success hover:bg-success/90"
                      : "bg-accent hover:bg-accent/90"
                  }
                >
                  {item.status === "present" ? "Présent" : "En attente"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.event}</p>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  className="flex-1 bg-success hover:bg-success/90 text-white"
                >
                  Marquer présent
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Détails
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Checkins;
