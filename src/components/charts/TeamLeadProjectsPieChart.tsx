import { useEffect, useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Slice {
  name: string;
  value: number;
  id: number;
  isOther?: boolean;
}

// Neutral grayscale palette (adaptive). We'll build at runtime to reflect theme.
const buildPalette = (dark: boolean) => {
  if (dark) {
    return [
      "hsl(var(--foreground) / 0.85)",
      "hsl(var(--foreground) / 0.70)",
      "hsl(var(--foreground) / 0.55)",
      "hsl(var(--foreground) / 0.40)",
      "hsl(var(--foreground) / 0.28)",
      "hsl(var(--foreground) / 0.20)",
      "hsl(var(--foreground) / 0.14)",
    ];
  }
  return [
    "hsl(var(--foreground) / 0.82)",
    "hsl(var(--foreground) / 0.64)",
    "hsl(var(--foreground) / 0.48)",
    "hsl(var(--foreground) / 0.34)",
    "hsl(var(--foreground) / 0.24)",
    "hsl(var(--foreground) / 0.16)",
    "hsl(var(--foreground) / 0.10)",
  ];
};
const isDark = () =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark");

const detectSolId = (p: any): number | null => {
  const v = p.solTLId ?? p.solTlId ?? p.sol_tl_id ?? p.sol_tlId ?? null;
  return v == null ? null : Number(v);
};

export const TeamLeadProjectsPieChart = () => {
  const [rawData, setRawData] = useState<Slice[]>([]);
  const [data, setData] = useState<Slice[]>([]); // grouped data (with Other)
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherMembers, setOtherMembers] = useState<Slice[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: projects, error: pErr } = await supabase
          .from("Project")
          .select("*");
        if (pErr) throw pErr;
        const counts = new Map<number, { count: number; name: string }>();

        // Collect distinct sol ids first
        const solIds = Array.from(
          new Set(
            (projects || [])
              .map((p) => detectSolId(p))
              .filter((id) => id != null)
          )
        ) as number[];
        let userMap = new Map<number, { name: string }>();
        if (solIds.length) {
          const userTables = [
            "User",
            "user",
            "users",
            "Employee",
            "employee",
            "employees",
          ];
          for (const t of userTables) {
            try {
              const res = await (supabase as any)
                .from(t)
                .select("*")
                .in("id", solIds);
              if (res.error) continue;
              const rows = res.data as any[] | null;
              if (!rows || !rows.length) continue;
              rows.forEach((r) => {
                const id = r.id ?? r.ID;
                if (id == null) return;
                const name =
                  r.full_name ||
                  r.name ||
                  r.display_name ||
                  `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
                  r.email ||
                  `User ${id}`;
                if (!userMap.has(Number(id))) userMap.set(Number(id), { name });
              });
              if (userMap.size === solIds.length) break;
            } catch {}
          }
        }

        (projects || []).forEach((p) => {
          const id = detectSolId(p);
          if (id == null) return;
          const current = counts.get(id) || {
            count: 0,
            name: userMap.get(id)?.name || `User ${id}`,
          };
          current.count += 1;
          counts.set(id, current);
        });

        const slices: Slice[] = Array.from(counts.entries()).map(
          ([id, { count, name }]) => ({ id, name, value: count })
        );
        slices.sort((a, b) => b.value - a.value);
        setRawData(slices);
        setTotal(slices.reduce((s, x) => s + x.value, 0));
      } catch (e) {
        console.error("Failed to load TL project distribution", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Group TLs with fewer than 5 projects into an Other slice
  useEffect(() => {
    if (!rawData.length) {
      setData([]);
      setOtherMembers([]);
      return;
    }
    const threshold = 5;
    const major = rawData.filter((s) => s.value >= threshold);
    const minor = rawData.filter((s) => s.value < threshold);
    if (minor.length === 0) {
      setData(rawData);
      setOtherMembers([]);
      return;
    }
    const otherValue = minor.reduce((sum, s) => sum + s.value, 0);
    const grouped: Slice[] = [
      ...major,
      { id: -1, name: "Other", value: otherValue, isOther: true },
    ];
    grouped.sort((a, b) => b.value - a.value);
    setData(grouped);
    setOtherMembers(minor);
  }, [rawData]);

  const palette = useMemo(() => buildPalette(isDark()), [rawData, themeKey()]);

  function themeKey() {
    if (typeof window === "undefined") return 0;
    return getComputedStyle(document.documentElement).getPropertyValue(
      "--background"
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects by Team Lead</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground">No data.</div>
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
                    outerRadius={104}
                    paddingAngle={2}
                    stroke="hsl(var(--background))"
                    strokeOpacity={0.5}
                  >
                    {data.map((entry, index) => {
                      const fill = entry.isOther
                        ? "hsl(var(--muted-foreground) / 0.25)"
                        : palette[index % palette.length];
                      return (
                        <Cell
                          key={entry.id}
                          fill={fill}
                          cursor={entry.isOther ? "pointer" : "default"}
                          onClick={() => entry.isOther && setOtherOpen(true)}
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
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{
                          background: s.isOther
                            ? "hsl(var(--muted-foreground) / 0.30)"
                            : palette[i % palette.length],
                          boxShadow: "0 0 0 1px hsl(var(--border)) inset",
                        }}
                      />
                      {s.isOther ? (
                        <button
                          type="button"
                          onClick={() => setOtherOpen(true)}
                          className="underline decoration-dotted underline-offset-4 hover:text-foreground focus:outline-none"
                        >
                          {s.name}
                        </button>
                      ) : (
                        <span>{s.name}</span>
                      )}
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
      <Dialog open={otherOpen} onOpenChange={setOtherOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Other Team Leads (&lt;5 Projects)</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOtherOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          {otherMembers.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No grouped team leads.
            </div>
          ) : (
            <div className="space-y-2">
              {otherMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{m.name}</span>
                  <Badge>{m.value}</Badge>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
