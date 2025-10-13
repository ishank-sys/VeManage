import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SubmissionData {
  date: string;
  submissions: number;
}

interface SubmissionLineChartProps {
  data: SubmissionData[];
  teamLead: string;
}

export function SubmissionLineChart({
  data,
  teamLead,
}: SubmissionLineChartProps) {
  // Derive neutral greys based on theme (light: darker greys, dark: lighter greys)
  const neutrals = useMemo(() => {
    const styles = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.classList.contains("dark");
    // Base foreground & border as anchors
    const fg = styles.getPropertyValue("--foreground");
    const border = styles.getPropertyValue("--border");
    // Helper to convert HSL string tokens (space separated) to hsl() string
    const toHsl = (token: string) => `hsl(${token.trim()})`;
    const baseFg = toHsl(fg);
    const baseBorder = toHsl(border);
    if (!isDark) {
      return {
        line: baseFg,
        grid: "hsl(var(--border) / 0.6)",
        dot: baseFg,
        area: "hsl(var(--foreground) / 0.08)",
        axis: "hsl(var(--secondary) / 0.9)",
      };
    }
    return {
      line: "hsl(var(--secondary))",
      grid: "hsl(var(--muted) / 0.35)",
      dot: "hsl(var(--secondary))",
      area: "hsl(var(--secondary) / 0.12)",
      axis: "hsl(var(--muted-foreground))",
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Submissions - {teamLead}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={neutrals.grid} />
            <XAxis dataKey="date" fontSize={12} stroke={neutrals.axis} />
            <YAxis stroke={neutrals.axis} />
            <Tooltip
              formatter={(value) => [`${value}`, "Submissions"]}
              labelStyle={{ color: "var(--foreground)" }}
              contentStyle={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey="submissions"
              stroke={neutrals.line}
              strokeWidth={3}
              dot={{ fill: neutrals.dot, strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, stroke: neutrals.dot, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
