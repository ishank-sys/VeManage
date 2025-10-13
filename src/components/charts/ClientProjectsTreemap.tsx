import { useEffect, useState, useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface NodeDatum {
  name: string;
  size: number;
  clientId: number;
}

// Heuristic client name extractor similar to earlier logic
const getClientName = (c: any, id: number): string => {
  return (
    c?.name ||
    c?.clientName ||
    c?.company_name ||
    c?.title ||
    c?.full_name ||
    `Client ${id}`
  );
};

interface ClientProjectsTreemapProps {
  onSelectClient?: (clientId: number | null) => void;
  selectedClientId?: number | null;
}

export const ClientProjectsTreemap = ({
  onSelectClient,
  selectedClientId,
}: ClientProjectsTreemapProps) => {
  const [data, setData] = useState<NodeDatum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Fetch projects to count by client
        const { data: projects, error } = await supabase
          .from("Project")
          .select("*");
        if (error) throw error;

        const counts = new Map<number, number>();
        (projects || []).forEach((p: any) => {
          const cid =
            p.clientId ??
            p.client_id ??
            p.clientID ??
            p.ClientId ??
            p.ClientID ??
            null;
          if (cid == null) return;
          counts.set(Number(cid), (counts.get(Number(cid)) || 0) + 1);
        });

        // Now fetch client names (try common table name variants)
        const clientTables = ["Client", "client", "clients"];
        const clientMap = new Map<number, any>();
        for (const t of clientTables) {
          if (counts.size === 0) break;
          try {
            const ids = Array.from(counts.keys());
            if (ids.length === 0) break;
            const res = await (supabase as any)
              .from(t)
              .select("*")
              .in("id", ids);
            if (res.error) continue;
            (res.data || []).forEach((row: any) => {
              const id = row.id ?? row.ID ?? row.clientId ?? row.clientID;
              if (id != null && !clientMap.has(Number(id))) {
                clientMap.set(Number(id), row);
              }
            });
            if (clientMap.size === counts.size) break; // gathered all
          } catch (err) {
            console.debug("Client table probe failed", t, err);
          }
        }

        const nodes: NodeDatum[] = Array.from(counts.entries()).map(
          ([id, size]) => ({
            clientId: id,
            size,
            name: getClientName(clientMap.get(id), id),
          })
        );
        nodes.sort((a, b) => b.size - a.size); // largest first
        setData(nodes);
      } catch (e) {
        console.error("Failed to load client treemap", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Shape root for Recharts Treemap
  const treeData = useMemo(
    () => ({
      name: "clients",
      children: data.map((d) => ({
        name: d.name,
        size: d.size,
        clientId: d.clientId,
      })),
    }),
    [data]
  );

  const isDark = () => document.documentElement.classList.contains("dark");
  const strokeColor = isDark() ? "hsl(var(--border))" : "hsl(var(--border))";

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle>Clients by Project Count</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No client/project data.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {/* Treemap with grayscale adaptive rectangles */}
              <Treemap
                data={treeData.children}
                dataKey="size"
                nameKey="name"
                stroke={strokeColor}
                content={
                  <CustomTreemapContent
                    onSelectClient={onSelectClient}
                    selectedClientId={selectedClientId}
                  />
                }
                isAnimationActive={false}
                animationDuration={0}
                onClick={(node: any) => {
                  if (!onSelectClient) return;
                  const cid = node?.clientId ?? node?.payload?.clientId;
                  if (typeof cid === "number") {
                    onSelectClient(cid);
                  }
                }}
              >
                <Tooltip
                  cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  formatter={(value: any, name: any) => [value, name]}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                  animationDuration={0}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Custom content using neutral greys (adaptive to light/dark)
const CustomTreemapContent = (props: any) => {
  const {
    x,
    y,
    width,
    height,
    name,
    size,
    index,
    onSelectClient,
    selectedClientId,
  } = props;
  const clientId = props?.clientId ?? props?.payload?.clientId;
  const dark = document.documentElement.classList.contains("dark");
  // Custom blue palette for treemap rectangles
  const lightPalette = [
    "#e8f0f4", // #e8f0f4 - lightest
    "#b9d2df", // #b9d2df - light
    "#74a5be", // #74a5be - medium
    "#4587a9", // #4587a9 - darker
    "#176993", // #176993 - darkest
  ];
  const darkPalette = [
    "#b9d2df", // #b9d2df - lightest for dark mode
    "#74a5be", // #74a5be - light for dark mode
    "#4587a9", // #4587a9 - medium
    "#176993", // #176993 - darker
    "#125a7a", // darker variant of #176993
  ];
  const palette = dark ? darkPalette : lightPalette;
  const baseFill = palette[index % palette.length];
  const isSelected = selectedClientId != null && clientId === selectedClientId;
  const fill = isSelected ? "hsl(var(--foreground) / 0.18)" : baseFill;
  const fontSize = Math.max(10, Math.min(14, width / 8));
  const truncated =
    width < 60 ? (name.length > 8 ? name.slice(0, 7) + "…" : name) : name;
  const titleColor = dark ? "hsl(var(--foreground))" : "hsl(var(--foreground))";
  const subColor = dark
    ? "hsl(var(--muted-foreground) / 0.85)"
    : "hsl(var(--muted-foreground) / 0.85)";

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill,
          stroke: isSelected
            ? "hsl(var(--foreground) / 0.5)"
            : "hsl(var(--border))",
          strokeWidth: isSelected ? 2 : 1,
          cursor: onSelectClient ? "pointer" : "default",
          transition: "stroke 120ms, fill 120ms",
        }}
        rx={4}
        ry={4}
        onClick={(e) => {
          // Prevent duplicate event firing with Treemap onClick if both present
          e.stopPropagation();
          if (onSelectClient && typeof clientId === "number") {
            onSelectClient(clientId);
          }
        }}
      />
      {width > 24 && height > 18 && (
        <text
          x={x + 6}
          y={y + 16}
          fill={titleColor}
          fontSize={fontSize + (width > 100 ? 2 : 0)}
          fontWeight={dark ? 500 : 550}
          stroke="none"
          strokeWidth={0}
          style={{ paintOrder: "fill", letterSpacing: 0.5 }}
          className="pointer-events-none select-none"
        >
          {truncated}
        </text>
      )}
      {width > 40 && height > 34 && (
        <text
          x={x + 6}
          y={y + 32}
          fill={subColor}
          fontSize={fontSize - 3}
          fontWeight={400}
          stroke="none"
          strokeWidth={0}
          style={{
            textTransform: "uppercase",
            opacity: 0.9,
            paintOrder: "fill",
          }}
          className="pointer-events-none select-none tracking-wide"
        >
          {size} proj
        </text>
      )}
    </g>
  );
};
