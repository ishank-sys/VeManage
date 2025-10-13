import { useEffect, useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface StatusSlice {
  name: string;
  value: number;
}

// Custom blue palette: #176993, #4587a9, #74a5be, #b9d2df, #e8f0f4
const buildPalette = (dark: boolean) => {
  if (dark) {
    // Dark mode - adjusted brightness for visibility
    return [
      "#b9d2df", // #b9d2df - lightest for dark mode
      "#74a5be", // #74a5be - medium light
      "#4587a9", // #4587a9 - medium
      "#176993", // #176993 - darkest (original)
      "#125a7a", // darker variant of #176993
      "#0e4761", // even darker variant
    ];
  }
  // Light mode - exact palette
  return [
    "#e8f0f4", // #e8f0f4 - lightest
    "#b9d2df", // #b9d2df - light
    "#74a5be", // #74a5be - medium
    "#4587a9", // #4587a9 - darker
    "#176993", // #176993 - darkest
    "#125a7a", // darker variant for more slices
  ];
};

const getIsDark = () =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark");

// Attempt to detect a status field variant on a project row
const detectStatus = (p: any): string => {
  return (
    p.status ||
    p.projectStatus ||
    p.currentStatus ||
    p.state ||
    p.phaseStatus ||
    "Unknown"
  );
};

interface ProjectStatusPieChartProps {
  onSelectStatus?: (status: string | null) => void;
  selectedStatus?: string | null;
}

export const ProjectStatusPieChart = ({
  onSelectStatus,
  selectedStatus,
}: ProjectStatusPieChartProps) => {
  const [data, setData] = useState<StatusSlice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: projects, error } = await supabase
          .from("Project")
          .select("*");
        if (error) throw error;
        const counts = new Map<string, number>();
        (projects || []).forEach((p) => {
          const status = detectStatus(p) || "Unknown";
          // Filter out "near completion" and any similar variants
          const normalizedStatus = status.toLowerCase().replace(/\s+/g, "");
          if (
            normalizedStatus.includes("nearcompletion") ||
            normalizedStatus.includes("near_completion") ||
            normalizedStatus.includes("nearlycompletion") ||
            status.toLowerCase().includes("near completion")
          ) {
            return; // Skip this project completely
          }
          counts.set(status, (counts.get(status) || 0) + 1);
        });
        const slices: StatusSlice[] = Array.from(counts.entries()).map(
          ([name, value]) => ({ name, value })
        );
        slices.sort((a, b) => b.value - a.value);
        setData(slices);
        setTotal(slices.reduce((sum, s) => sum + s.value, 0));
      } catch (e) {
        console.error("Failed to load project statuses", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const palette = useMemo(
    () => buildPalette(getIsDark()),
    [data, themeToggleKey()]
  );

  // Hack: trigger palette recompute on theme switch by reading a CSS var value
  function themeToggleKey() {
    if (typeof window === "undefined") return 0;
    return getComputedStyle(document.documentElement).getPropertyValue(
      "--background"
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects by Status</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground">No project data.</div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-2/3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={94}
                    paddingAngle={2}
                    stroke="hsl(var(--background))"
                    strokeOpacity={0.4}
                    onClick={(_, idx) => {
                      if (!onSelectStatus) return;
                      const slice = data[idx];
                      if (!slice) return;
                      const next =
                        selectedStatus === slice.name ? null : slice.name;
                      onSelectStatus(next);
                    }}
                  >
                    {data.map((entry, index) => {
                      const fill = palette[index % palette.length];
                      const isSelected = selectedStatus === entry.name;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={fill}
                          stroke={
                            isSelected
                              ? "hsl(var(--foreground))"
                              : "hsl(var(--background))"
                          }
                          strokeWidth={isSelected ? 3 : 1}
                          style={{
                            cursor: onSelectStatus ? "pointer" : "default",
                            transition: "stroke 120ms, stroke-width 120ms",
                          }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                    formatter={(value: any, name: any) => [value, name]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {data.map((s, i) => {
                const pct = total
                  ? ((s.value / total) * 100).toFixed(1)
                  : "0.0";
                const swatch = palette[i % palette.length];
                return (
                  <div
                    key={s.name}
                    className={`flex items-center justify-between text-sm ${
                      selectedStatus === s.name ? "font-semibold" : ""
                    }`}
                    onClick={() => {
                      if (!onSelectStatus) return;
                      const next = selectedStatus === s.name ? null : s.name;
                      onSelectStatus(next);
                    }}
                    style={{ cursor: onSelectStatus ? "pointer" : "default" }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{
                          background: swatch,
                          boxShadow: "0 0 0 1px hsl(var(--border)) inset",
                        }}
                      />
                      <span>
                        {s.name}
                        {selectedStatus === s.name ? " •" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{s.value}</Badge>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
