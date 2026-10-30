import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, space } from "../theme";

export type SavedFlight = {
  id: string;
  date: string;
  airlineName: string | null;
  fromIata: string | null;
  fromCity: string | null;
  toIata: string | null;
  toCity: string | null;
  distanceMi: number | null;
};

type TopTab = "done" | "next";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function partition(flights: SavedFlight[]): {
  done: SavedFlight[];
  next: SavedFlight[];
} {
  const today = todayISO();
  const done: SavedFlight[] = [];
  const next: SavedFlight[] = [];
  for (const f of flights) {
    if (f.date < today) done.push(f);
    else next.push(f);
  }
  return { done, next };
}

export default function FlightsListScreen({
  flights,
  onAdd,
}: {
  flights: SavedFlight[];
  onAdd: () => void;
}) {
  const [tab, setTab] = useState<TopTab>("done");
  const { done, next } = partition(flights);
  const visible = tab === "done" ? done : next;

  return (
    <View style={styles.outer}>
      <View style={styles.root}>
        <View style={styles.hero}>
          <View style={styles.heroFilter}>
            <Ionicons name="filter" size={22} color={colors.text} />
          </View>
        </View>

        <View style={styles.tabs}>
          <TopTabItem label="Done" active={tab === "done"} onPress={() => setTab("done")} />
          <TopTabItem label="Next" active={tab === "next"} onPress={() => setTab("next")} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {visible.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {tab === "done" ? "No past flights" : "No upcoming flights"}
              </Text>
              <Text style={styles.emptyHint}>
                Tap the + button to add a flight.
              </Text>
            </View>
          ) : (
            visible.map((f) => <FlightCard key={f.id} flight={f} />)
          )}
          <View style={{ height: space(24) }} />
        </ScrollView>

        <Pressable style={styles.fab} onPress={onAdd} hitSlop={8}>
          <Ionicons name="add" size={32} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function TopTabItem({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      android_ripple={{ color: colors.surfaceHi }}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FlightCard({ flight }: { flight: SavedFlight }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardDate}>{flight.date}</Text>
        <Text style={styles.cardAirline}>{flight.airlineName ?? "—"}</Text>
      </View>
      <View style={styles.cardRoute}>
        <View style={styles.cardEnd}>
          <Text style={styles.iata}>{flight.fromIata ?? "—"}</Text>
          <Text style={styles.city}>{flight.fromCity ?? ""}</Text>
        </View>
        <View style={styles.line}>
          <View style={styles.dot} />
          <View style={styles.lineSegment} />
          <Ionicons name="airplane" size={16} color={colors.accent} />
        </View>
        <View style={[styles.cardEnd, { alignItems: "flex-end" }]}>
          <Text style={styles.iata}>{flight.toIata ?? "—"}</Text>
          <Text style={styles.city}>{flight.toCity ?? ""}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.bg, padding: space(3) },
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  hero: {
    height: 220,
    backgroundColor: "#1a3a4a",
    paddingTop: space(12),
    paddingHorizontal: space(4),
  },
  heroFilter: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    paddingTop: space(2),
    backgroundColor: colors.bg,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: space(3) },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { color: colors.textMuted, fontSize: 16 },
  tabTextActive: { color: colors.accent, fontWeight: "600" },
  scroll: { paddingHorizontal: space(4), paddingTop: space(3) },
  empty: { paddingVertical: space(20), alignItems: "center" },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: space(2),
  },
  emptyHint: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space(4),
    marginBottom: space(3),
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: space(2),
  },
  cardDate: { color: colors.textMuted, fontSize: 13 },
  cardAirline: { color: colors.textMuted, fontSize: 13 },
  cardRoute: { flexDirection: "row", alignItems: "center" },
  cardEnd: { flex: 0, minWidth: 80 },
  iata: { color: colors.text, fontSize: 28, fontWeight: "300" },
  city: { color: colors.textMuted, fontSize: 13 },
  line: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: space(2),
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  lineSegment: { flex: 1, height: 1, backgroundColor: colors.borderHi },
  fab: {
    position: "absolute",
    right: space(4),
    bottom: space(8),
    width: 60,
    height: 60,
    borderRadius: radii.lg,
    backgroundColor: colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 10,
    elevation: 10,
  },
});
