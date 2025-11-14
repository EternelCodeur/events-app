import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle } from "lucide-react";

interface AttendanceEntry {
  id: string;
  staffName: string;
  type: "in" | "out" | "pause";
  timestamp: string;
  status: "on-time" | "late";
}

const mockAttendance: AttendanceEntry[] = [
  {
    id: "1",
    staffName: "Marie Dubois",
    type: "in",
    timestamp: "09:00",
    status: "on-time",
  },
  {
    id: "2",
    staffName: "Jean Martin",
    type: "in",
    timestamp: "09:15",
    status: "late",
  },
  {
    id: "3",
    staffName: "Sophie Bernard",
    type: "pause",
    timestamp: "12:00",
    status: "on-time",
  },
];

export const AttendanceFeed = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Pointages en temps réel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockAttendance.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {entry.status === "on-time" ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
                <div>
                  <p className="font-medium text-foreground">{entry.staffName}</p>
                  <p className="text-sm text-muted-foreground">{entry.timestamp}</p>
                </div>
              </div>
              <Badge
                variant={entry.type === "in" ? "default" : "secondary"}
                className={
                  entry.type === "in"
                    ? "bg-success hover:bg-success/90"
                    : ""
                }
              >
                {entry.type === "in" ? "Entrée" : entry.type === "out" ? "Sortie" : "Pause"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
