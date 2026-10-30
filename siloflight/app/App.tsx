import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import FlightsListScreen, { type SavedFlight } from "./src/screens/FlightsListScreen";
import AddFlightModal from "./src/screens/AddFlightModal";
import CreateFlightScreen, { type SaveData } from "./src/screens/CreateFlightScreen";
import StatisticsScreen from "./src/screens/StatisticsScreen";
import MoreScreen from "./src/screens/MoreScreen";
import BottomNav, { type Tab } from "./src/components/BottomNav";
import type { FlightInfo } from "./src/types";
import { colors } from "./src/theme";

type Route = { name: "tab" } | { name: "create"; flight: FlightInfo };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "tab" });
  const [tab, setTab] = useState<Tab>("flights");
  const [modalOpen, setModalOpen] = useState(false);
  const [saved, setSaved] = useState<SavedFlight[]>([]);

  function handleLookup(flight: FlightInfo) {
    setModalOpen(false);
    setRoute({ name: "create", flight });
  }

  function handleSave(data: SaveData) {
    const id = `${data.flightNumber}-${data.date}-${Date.now()}`;
    setSaved((prev) => [
      {
        id,
        date: data.date,
        airlineName: data.airline.replace(/\s*\([^)]*\)\s*$/, "") || null,
        fromIata: extractIata(data.from),
        fromCity: stripIata(data.from),
        toIata: extractIata(data.to),
        toCity: stripIata(data.to),
        distanceMi: parseDistance(data.distance),
      },
      ...prev,
    ]);
    setTab("flights");
    setRoute({ name: "tab" });
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {route.name === "create" && (
        <CreateFlightScreen
          flight={route.flight}
          onBack={() => setRoute({ name: "tab" })}
          onSave={handleSave}
        />
      )}

      {route.name === "tab" && (
        <View style={styles.fill}>
          <View style={styles.fill}>
            {tab === "flights" && (
              <FlightsListScreen
                flights={saved}
                onAdd={() => setModalOpen(true)}
              />
            )}
            {tab === "statistics" && <StatisticsScreen flights={saved} />}
            {tab === "more" && <MoreScreen />}
          </View>
          <BottomNav active={tab} onChange={setTab} />
        </View>
      )}

      <AddFlightModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onLookup={handleLookup}
      />
    </View>
  );
}

function extractIata(label: string): string | null {
  const match = label.match(/\(([A-Z]{3})\)\s*$/);
  return match ? match[1] : null;
}

function stripIata(label: string): string | null {
  const cleaned = label.replace(/\s*\([A-Z]{3}\)\s*$/, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function parseDistance(s: string): number | null {
  const match = s.match(/([\d,]+)/);
  if (!match) return null;
  const n = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
});
