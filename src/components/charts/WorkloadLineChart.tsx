import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  parseISO,
  startOfWeek,
  startOfMonth,
  startOfYear,
  format,
} from "date-fns";

interface PackageRow {
  id: number;
  projectid: number;
  name: string;
  tentativedate?: string | null;
  createdat?: string | null;
}

interface Point {
  date: string;
  submissions: number;
}

type Granularity = "day" | "week" | "month" | "year";

export function WorkloadLineChart() {
  const [dailyData, setDailyData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<Granularity>("month");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from("ProjectPackage")
          .select("id, projectid, name, tentativedate, createdat")
          .order("tentativedate", { ascending: true });
        if (error) throw error;
        const rows = (data || []) as PackageRow[];
        // Aggregate by tentative date (fallback to createdat if missing)
        const counts: Record<string, number> = {};
        for (const r of rows) {
          const raw = r.tentativedate || r.createdat;
          if (!raw) continue;
          const d = raw.slice(0, 10); // YYYY-MM-DD
          counts[d] = (counts[d] || 0) + 1;
        }
        const points = Object.entries(counts)
          .sort((a, b) => (a[0] < b[0] ? -1 : 1))
          .map(([date, submissions]) => ({ date, submissions }));
        setDailyData(points);
      } catch (e: any) {
        console.error("Workload chart load failed", e);
        setError(e.message || "Failed to load workload data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Aggregate based on chosen granularity
  const data = useMemo(() => {
    if (granularity === "day") return dailyData;
    const map: Record<string, number> = {};
    for (const p of dailyData) {
      const d = parseISO(p.date);
      let key: string;
      switch (granularity) {
        case "week": {
          const wkStart = startOfWeek(d, { weekStartsOn: 1 });
          key = format(wkStart, "yyyy-MM-dd");
          break;
        }
        case "month": {
          const mStart = startOfMonth(d);
          key = format(mStart, "yyyy-MM-01");
          break;
        }
        case "year": {
          const yStart = startOfYear(d);
          key = format(yStart, "yyyy-01-01");
          break;
        }
        default:
          key = p.date;
      }
      map[key] = (map[key] || 0) + p.submissions;
    }
    return Object.entries(map)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, submissions]) => ({ date, submissions }));
  }, [dailyData, granularity]);

  const xFormatter = (value: string) => {
    try {
      const d = parseISO(value);
      if (granularity === "day") return format(d, "MMM d");
      if (granularity === "week") return format(d, "MMM d");
      if (granularity === "month") return format(d, "MMM yyyy");
      if (granularity === "year") return format(d, "yyyy");
    } catch {}
    return value;
  };

  const chartColors = useMemo(() => {
    const isDark = document.documentElement.classList.contains("dark");
    if (!isDark) {
      // Light mode using exact blue palette
      return {
        line: "#4587a9", // #4587a9 - medium blue
        lineGradient: "linear-gradient(135deg, #4587a9 0%, #176993 100%)",
        grid: "rgba(185, 210, 223, 0.6)", // #b9d2df with opacity
        dot: "#176993", // #176993 - darkest blue for dots
        dotActive: "#4587a9", // #4587a9 for active dots
        axis: "#176993", // #176993 for axis
        brush: "rgba(23, 105, 147, 0.1)", // #176993 with opacity
      };
    }
    // Dark mode using brighter variants
    return {
      line: "#74a5be", // #74a5be - medium for visibility
      lineGradient: "linear-gradient(135deg, #74a5be 0%, #b9d2df 100%)",
      grid: "rgba(23, 105, 147, 0.3)", // #176993 with opacity
      dot: "#b9d2df", // #b9d2df - lighter for dark mode
      dotActive: "#74a5be", // #74a5be for active
      axis: "#b9d2df", // #b9d2df for axis
      brush: "rgba(116, 165, 190, 0.2)", // #74a5be with opacity
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Submissions Over Time</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {(["day", "week", "month", "year"] as Granularity[]).map((g) => (
            <Button
              key={g}
              size="sm"
              variant={granularity === g ? "default" : "outline"}
              onClick={() => setGranularity(g)}
              className="text-xs"
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">
            Loading workload...
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No submission data.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                dataKey="date"
                fontSize={12}
                stroke={chartColors.axis}
                tickFormatter={xFormatter}
              />
              <YAxis stroke={chartColors.axis} allowDecimals={false} />
              <Tooltip
                labelFormatter={(l) => xFormatter(l as string)}
                formatter={(value) => [`${value}`, "Submissions"]}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="submissions"
                stroke={chartColors.line}
                strokeWidth={3}
                dot={{ fill: chartColors.dot, strokeWidth: 0, r: 4 }}
                activeDot={{
                  r: 6,
                  fill: chartColors.dotActive,
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
              />
              <Brush
                dataKey="date"
                height={20}
                travellerWidth={8}
                stroke={chartColors.axis}
                fill={chartColors.brush}
                tickFormatter={xFormatter}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
