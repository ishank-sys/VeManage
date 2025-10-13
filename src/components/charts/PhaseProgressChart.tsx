import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PhaseData {
  name: string;
  progress: number;
  status: string;
}

interface PhaseProgressChartProps {
  data: PhaseData[];
}

export function PhaseProgressChart({ data }: PhaseProgressChartProps) {
  const chartColors = useMemo(() => {
    const isDark = document.documentElement.classList.contains("dark");
    if (!isDark) {
      // Light mode using exact blue palette
      return {
        bars: [
          "#e8f0f4", // #e8f0f4 - lightest
          "#b9d2df", // #b9d2df - light
          "#74a5be", // #74a5be - medium
          "#4587a9", // #4587a9 - darker
          "#176993", // #176993 - darkest
        ],
        grid: "rgba(185, 210, 223, 0.6)", // #b9d2df with opacity
        axis: "#176993", // #176993
      };
    }
    // Dark mode using brighter variants for visibility
    return {
      bars: [
        "#b9d2df", // #b9d2df - lightest for dark mode
        "#74a5be", // #74a5be - medium light
        "#4587a9", // #4587a9 - medium
        "#176993", // #176993 - darker (adjusted for dark mode)
        "#125a7a", // darker variant
      ],
      grid: "rgba(23, 105, 147, 0.3)", // #176993 with opacity
      axis: "#b9d2df", // #b9d2df for visibility
    };
  }, []);

  // Generate bar color based on progress value
  const getBarColor = (progress: number, index: number) => {
    if (progress >= 80) return chartColors.bars[4]; // darkest blue for high progress
    if (progress >= 60) return chartColors.bars[3]; // darker blue
    if (progress >= 40) return chartColors.bars[2]; // medium blue
    if (progress >= 20) return chartColors.bars[1]; // light blue
    return chartColors.bars[0]; // lightest blue for low progress
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Phase Progress Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
              stroke={chartColors.axis}
            />
            <YAxis domain={[0, 100]} stroke={chartColors.axis} />
            <Tooltip
              formatter={(value) => [`${value}%`, "Progress"]}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Bar
              dataKey="progress"
              fill={chartColors.bars[1]}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
