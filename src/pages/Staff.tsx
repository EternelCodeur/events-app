import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const mockStaff = [
  {
    id: "1",
    name: "Marie Dubois",
    role: "Hôtesse",
    status: "active",
    phone: "+33 6 12 34 56 78",
    email: "marie.d@example.com",
  },
  {
    id: "2",
    name: "Jean Martin",
    role: "Serveur",
    status: "active",
    phone: "+33 6 23 45 67 89",
    email: "jean.m@example.com",
  },
  {
    id: "3",
    name: "Sophie Bernard",
    role: "Chef de salle",
    status: "inactive",
    phone: "+33 6 34 56 78 90",
    email: "sophie.b@example.com",
  },
];

const Staff = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Personnel</h1>
          <p className="text-muted-foreground">
            Gérez votre équipe et suivez les pointages
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/staff/attendance">Voir pointages</Link>
          </Button>
          <Button className="bg-primary hover:bg-primary-hover">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter membre
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un membre du personnel..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockStaff.map((staff) => (
          <Card key={staff.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-lg">
                  {staff.name.charAt(0)}
                </div>
                <Badge
                  variant={staff.status === "active" ? "default" : "secondary"}
                  className={
                    staff.status === "active"
                      ? "bg-success hover:bg-success/90"
                      : ""
                  }
                >
                  {staff.status === "active" ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-1">
                {staff.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{staff.role}</p>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">{staff.email}</p>
                <p className="text-muted-foreground">{staff.phone}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Détails
                </Button>
                <Button size="sm" className="flex-1 bg-primary hover:bg-primary-hover">
                  Éditer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Staff;
