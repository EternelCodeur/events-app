import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  trend?: number[];
  variant?: "green" | "red" | "blue" | "orange";
}

export const KpiCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  variant = "blue",
}: KpiCardProps) => {
  const gradientClass =
    variant === "green"
      ? "bg-gradient-to-br from-emerald-600 via-emerald-300 to-emerald-400"
      : variant === "red"
      ? "bg-gradient-to-br from-red-600 via-rose-300 to-rose-400"
      : variant === "orange"
      ? "bg-gradient-to-br from-orange-600 via-amber-300 to-amber-100"
      : "bg-gradient-to-br from-sky-600 via-blue-300 to-sky-100";

  return (
    <Card className={cn("hover:shadow-xl transition-shadow border-0 overflow-hidden", gradientClass)}>
      <CardContent className="p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-200 mb-1">{title}</p>
            <p className="text-4xl font-bold text-white mb-2">{value}</p>
            {change && (
              <p
                className={cn(
                  "text-sm font-medium",
                  changeType === "positive" && "text-black",
                  changeType === "negative" && "text-red-800",
                  changeType === "neutral" && "text-white/80"
                )}
              >
                {change}
              </p>
            )}
          </div>
          <div className="p-3 rounded-xl bg-black/10">
            <Icon className="w-6 h-6 text-black" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
