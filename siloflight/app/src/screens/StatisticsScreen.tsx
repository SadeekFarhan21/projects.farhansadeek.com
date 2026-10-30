import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SavedFlight } from "./FlightsListScreen";
import { colors, radii, space } from "../theme";

const EARTH_MILES = 24_901;
const CRUISE_MPH = 528;

// Per-stat accent palette so each metric reads as its own thing,
// rather than every tile + bar being the same teal.
const METRIC = {
  flights: { tint: "#5cc8b6", bg: "rgba(92, 200, 182, 0.10)" }, // teal (accent)
  miles: { tint: "#7dd3fc", bg: "rgba(125, 211, 252, 0.10)" }, // sky
  hours: { tint: "#fbbf24", bg: "rgba(251, 191, 36, 0.10)" }, // amber
  airports: { tint: "#a78bfa", bg: "rgba(167, 139, 250, 0.10)" }, // violet
  records: { tint: "#f472b6", bg: "rgba(244, 114, 182, 0.10)" }, // pink
} as const;

export default function StatisticsScreen({
  flights,
}: {
  flights: SavedFlight[];
}) {
  const stats = computeStats(flights);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistics</Text>
        <Text style={styles.headerSub}>
          {stats.totalFlights === 0
            ? "Add your first flight to get started"
            : `${stats.totalFlights} ${
                stats.totalFlights === 1 ? "flight" : "flights"
              } logged`}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {stats.totalFlights === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* 2×2 metric grid — the dashboard hero */}
            <View style={styles.gridRow}>
              <MetricTile
                metric="flights"
                icon="airplane"
                value={String(stats.totalFlights)}
                label="Flights"
              />
              <MetricTile
                metric="miles"
                icon="navigate"
                value={formatCompactMiles(stats.totalMiles)}
                label="Miles"
              />
            </View>
            <View style={styles.gridRow}>
              <MetricTile
                metric="hours"
                icon="time"
                value={stats.airTime}
                label="In the air"
              />
              <MetricTile
                metric="airports"
                icon="business"
                value={String(stats.uniqueAirports)}
                label="Airports"
              />
            </View>

            {/* Around-the-world card */}
            <AroundTheWorld
              miles={stats.totalMiles}
              ratio={stats.aroundTheWorld}
            />

            {/* Records — Longest + Shortest */}
            {(stats.longest || stats.shortest) && (
              <Card title="Records">
                {stats.longest && (
                  <RecordRow
                    icon="trending-up"
                    kind="Longest"
                    flight={stats.longest}
                  />
                )}
                {stats.shortest &&
                  stats.shortest.id !== stats.longest?.id && (
                    <RecordRow
                      icon="trending-down"
                      kind="Shortest"
                      flight={stats.shortest}
                      last
                    />
                  )}
              </Card>
            )}

            {/* Top airlines */}
            {stats.topAirlines.length > 0 && (
              <Card title="Top airlines">
                <BarList
                  items={stats.topAirlines}
                  tint={METRIC.flights.tint}
                />
              </Card>
            )}

            {/* Top routes */}
            {stats.topRoutes.length > 0 && (
              <Card title="Most-flown routes">
                <BarList
                  items={stats.topRoutes}
                  tint={METRIC.miles.tint}
                  mono
                />
              </Card>
            )}

            <View style={{ height: space(10) }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ---------- Components -----------------------------------------------------

function MetricTile({
  metric,
  icon,
  value,
  label,
}: {
  metric: keyof typeof METRIC;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  label: string;
}) {
  const m = METRIC[metric];
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: m.bg }]}>
        <Ionicons name={icon} size={16} color={m.tint} />
      </View>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function AroundTheWorld({
  miles,
  ratio,
}: {
  miles: number;
  ratio: number;
}) {
  const pct = Math.min(1, ratio / 5);
  const remaining = Math.max(0, EARTH_MILES - miles);
  const passedFirst = miles >= EARTH_MILES;
  return (
    <View style={styles.atw}>
      <View style={styles.atwHead}>
        <View>
          <Text style={styles.atwEyebrow}>Around the world</Text>
          <View style={styles.atwHeroRow}>
            <Text style={[styles.atwHero, { color: METRIC.flights.tint }]}>
              {ratio.toFixed(2)}
            </Text>
            <Text style={styles.atwHeroSuffix}>×</Text>
          </View>
        </View>
        <View style={[styles.atwIcon, { backgroundColor: METRIC.flights.bg }]}>
          <Ionicons name="globe" size={24} color={METRIC.flights.tint} />
        </View>
      </View>

      <View style={styles.atwTrack}>
        <View
          style={[
            styles.atwFill,
            {
              width: `${Math.max(2, pct * 100)}%`,
              backgroundColor: METRIC.flights.tint,
            },
          ]}
        />
        {[1, 2, 3, 4].map((mark) => (
          <View
            key={mark}
            style={[
              styles.atwTick,
              { left: `${(mark / 5) * 100}%` },
              ratio >= mark && { backgroundColor: METRIC.flights.tint },
            ]}
          />
        ))}
      </View>
      <View style={styles.atwLegend}>
        <Text style={styles.atwLegendText}>0</Text>
        <Text style={styles.atwLegendText}>5×</Text>
      </View>

      <Text style={styles.atwFootnote}>
        {passedFirst
          ? `You've circled the planet at least once — ${miles.toLocaleString()} mi total.`
          : `${remaining.toLocaleString()} mi to go to circle the planet once.`}
      </Text>
    </View>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={{ marginTop: space(3) }}>{children}</View>
    </View>
  );
}

function BarList({
  items,
  tint,
  mono = false,
}: {
  items: Array<{ key: string; primary: string; count: number }>;
  tint: string;
  mono?: boolean;
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <View style={{ gap: space(3) }}>
      {items.map((it) => {
        const pct = (it.count / max) * 100;
        return (
          <View key={it.key} style={{ gap: space(2) }}>
            <View style={styles.barLabelRow}>
              <Text
                style={[styles.barLabel, mono && styles.barLabelMono]}
                numberOfLines={1}
              >
                {it.primary}
              </Text>
              <Text style={styles.barCount}>{it.count}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${pct}%`, backgroundColor: tint },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function RecordRow({
  icon,
  kind,
  flight,
  last = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  kind: string;
  flight: SavedFlight;
  last?: boolean;
}) {
  const miles = flight.distanceMi ?? 0;
  return (
    <View style={[styles.recordRow, last && { borderBottomWidth: 0 }]}>
      <View
        style={[styles.recordIcon, { backgroundColor: METRIC.records.bg }]}
      >
        <Ionicons name={icon} size={18} color={METRIC.records.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.recordKind}>{kind}</Text>
        <View style={styles.recordRouteRow}>
          <Text style={styles.recordIata}>{flight.fromIata ?? "—"}</Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={colors.textFaint}
            style={{ marginHorizontal: space(2) }}
          />
          <Text style={styles.recordIata}>{flight.toIata ?? "—"}</Text>
        </View>
      </View>
      <View style={styles.recordMilesPill}>
        <Text style={styles.recordMilesText}>
          {miles.toLocaleString()} mi
        </Text>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyBubble}>
        <Ionicons name="bar-chart" size={28} color={colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>Nothing to chart yet</Text>
      <Text style={styles.emptyHint}>
        Add a flight from the Flights tab and your dashboard will fill in
        instantly.
      </Text>
    </View>
  );
}

// ---------- Stats logic ----------------------------------------------------

type Stats = {
  totalFlights: number;
  totalMiles: number;
  uniqueAirports: number;
  uniqueAirlines: number;
  airTime: string;
  aroundTheWorld: number;
  topAirlines: Array<{ key: string; primary: string; count: number }>;
  topRoutes: Array<{ key: string; primary: string; count: number }>;
  longest: SavedFlight | null;
  shortest: SavedFlight | null;
};

function computeStats(flights: SavedFlight[]): Stats {
  const totalFlights = flights.length;
  const totalMiles = flights.reduce((s, f) => s + (f.distanceMi ?? 0), 0);

  const airportCounts = new Map<string, number>();
  const airlineCounts = new Map<string, number>();
  const routeCounts = new Map<string, number>();
  let longest: SavedFlight | null = null;
  let shortest: SavedFlight | null = null;

  for (const f of flights) {
    if (f.fromIata)
      airportCounts.set(f.fromIata, (airportCounts.get(f.fromIata) ?? 0) + 1);
    if (f.toIata)
      airportCounts.set(f.toIata, (airportCounts.get(f.toIata) ?? 0) + 1);
    if (f.airlineName)
      airlineCounts.set(
        f.airlineName,
        (airlineCounts.get(f.airlineName) ?? 0) + 1,
      );
    if (f.fromIata && f.toIata) {
      const route = `${f.fromIata} → ${f.toIata}`;
      routeCounts.set(route, (routeCounts.get(route) ?? 0) + 1);
    }
    if (f.distanceMi != null && f.distanceMi > 0) {
      if (!longest || f.distanceMi > (longest.distanceMi ?? 0)) longest = f;
      if (!shortest || f.distanceMi < (shortest.distanceMi ?? Infinity))
        shortest = f;
    }
  }

  const airMinutes = (totalMiles / CRUISE_MPH) * 60;
  const h = Math.floor(airMinutes / 60);
  const m = Math.round(airMinutes % 60);

  const topN = (m: Map<string, number>, n: number) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key, count]) => ({ key, primary: key, count }));

  return {
    totalFlights,
    totalMiles: Math.round(totalMiles),
    uniqueAirports: airportCounts.size,
    uniqueAirlines: airlineCounts.size,
    airTime: totalFlights === 0 ? "0h" : `${h}h ${m}m`,
    aroundTheWorld: totalMiles / EARTH_MILES,
    topAirlines: topN(airlineCounts, 5),
    topRoutes: topN(routeCounts, 5),
    longest,
    shortest,
  };
}

function formatCompactMiles(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

// ---------- Styles ---------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    paddingTop: space(12),
    paddingBottom: space(5),
    paddingHorizontal: space(5),
    backgroundColor: colors.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },

  scroll: { padding: space(4), gap: space(3) },

  // ----- 2×2 metric grid -----
  gridRow: { flexDirection: "row", gap: space(3) },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: space(4),
    paddingHorizontal: space(4),
    borderWidth: 1,
    borderColor: colors.border,
    gap: space(3),
  },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tileValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  tileLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },

  // ----- Around the world -----
  atw: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: space(5),
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: space(2),
  },
  atwHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  atwEyebrow: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: space(1),
  },
  atwHeroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  atwHero: {
    fontSize: 56,
    fontWeight: "700",
    letterSpacing: -2,
  },
  atwHeroSuffix: {
    color: colors.textMuted,
    fontSize: 28,
    fontWeight: "600",
  },
  atwIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  atwTrack: {
    height: 8,
    backgroundColor: colors.surfaceHi,
    borderRadius: 999,
    overflow: "visible",
    marginTop: space(4),
    position: "relative",
  },
  atwFill: {
    height: "100%",
    borderRadius: 999,
    position: "absolute",
    left: 0,
    top: 0,
  },
  atwTick: {
    position: "absolute",
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: colors.surfaceHi,
    borderRadius: 1,
    marginLeft: -1,
  },
  atwLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: space(2),
  },
  atwLegendText: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "600",
  },
  atwFootnote: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: space(3),
    lineHeight: 19,
  },

  // ----- Card -----
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space(5),
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
  },

  // ----- Bar list -----
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space(3),
  },
  barLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  barLabelMono: {
    fontFamily: "Courier",
    fontSize: 13,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  barCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  barTrack: {
    height: 4,
    backgroundColor: colors.surfaceHi,
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },

  // ----- Records -----
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingVertical: space(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  recordKind: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  recordRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  recordIata: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  recordMilesPill: {
    backgroundColor: METRIC.records.bg,
    paddingHorizontal: space(3),
    paddingVertical: space(1),
    borderRadius: 999,
  },
  recordMilesText: {
    color: METRIC.records.tint,
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  // ----- Empty -----
  empty: {
    paddingTop: space(20),
    alignItems: "center",
    gap: space(3),
  },
  emptyBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: space(8),
    lineHeight: 19,
  },
});
