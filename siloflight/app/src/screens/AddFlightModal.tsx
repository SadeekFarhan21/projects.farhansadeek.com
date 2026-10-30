import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Field from "../components/Field";
import { lookupFlight } from "../api";
import type { FlightInfo } from "../types";
import { colors, radii, space } from "../theme";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function prettyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function AddFlightModal({
  visible,
  onClose,
  onLookup,
}: {
  visible: boolean;
  onClose: () => void;
  onLookup: (flight: FlightInfo) => void;
}) {
  const [flightNumber, setFlightNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!flightNumber.trim()) {
      setError("Enter a flight number.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await lookupFlight(flightNumber.trim().toUpperCase(), date);
      if (result.ok) {
        onLookup(result.flight);
        setFlightNumber("");
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>By flight number</Text>

          {loading ? (
            <View style={styles.loadingArea}>
              <ActivityIndicator color={colors.accent} size="large" />
            </View>
          ) : (
            <>
              <Field
                label="Flight number"
                icon="ticket-outline"
                value={flightNumber}
                onChangeText={(v) => {
                  setFlightNumber(v);
                  setError(null);
                }}
                onClear={() => setFlightNumber("")}
                placeholder="AS21"
                autoCapitalize="characters"
              />

              <Field
                label="Date"
                icon="calendar-outline"
                value={prettyDate(date)}
                onChangeText={(v) => setDate(v)}
                editable={false}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.actions}>
                <Pressable onPress={search} hitSlop={10}>
                  <Text style={styles.search}>Search</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: space(4),
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: space(5),
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: space(3),
  },
  loadingArea: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    marginTop: space(4),
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  search: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: space(2),
  },
});
