import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Field from "../components/Field";
import {
  flightDepartureTime,
  flightDistance,
  flightDuration,
} from "../derive";
import type { FlightInfo } from "../types";
import { colors, radii, space } from "../theme";

function airportLabel(name: string | null, iata: string | null): string {
  if (name && iata) return `${name} (${iata})`;
  return name ?? iata ?? "";
}

function airlineLabel(
  name: string | null,
  iata: string | null,
): string {
  if (name && iata) return `${name} (${iata})`;
  return name ?? iata ?? "";
}

function aircraftLabel(model: string | null): string {
  if (!model) return "";
  return /\(.*\)/.test(model) ? model : `${model} (${model})`;
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

export default function CreateFlightScreen({
  flight,
  onBack,
  onSave,
}: {
  flight: FlightInfo;
  onBack: () => void;
  onSave: (data: SaveData) => void;
}) {
  const initial = useMemo(() => buildInitial(flight), [flight]);

  const [date, setDate] = useState(initial.date);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [flightNumber, setFlightNumber] = useState(initial.flightNumber);
  const [departureTime, setDepartureTime] = useState(initial.departureTime);
  const [distance, setDistance] = useState(initial.distance);
  const [airline, setAirline] = useState(initial.airline);
  const [aircraft, setAircraft] = useState(initial.aircraft);
  const [duration, setDuration] = useState(initial.duration);
  const [registration, setRegistration] = useState(initial.registration);
  const [seat, setSeat] = useState("");
  const [reason, setReason] = useState("");
  const [klass, setKlass] = useState("");

  function handleSave() {
    onSave({
      date,
      from,
      to,
      flightNumber,
      departureTime,
      distance,
      airline,
      aircraft,
      duration,
      registration,
      seat,
      reason,
      klass,
    });
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Create a new flight</Text>
        <Pressable onPress={handleSave} hitSlop={12}>
          <Text style={styles.save}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.section}>General</Text>

        <Field
          label="Date"
          icon="calendar-outline"
          value={prettyDate(date)}
          editable={false}
        />
        <Field
          label="From"
          icon="airplane-outline"
          value={from}
          onChangeText={setFrom}
          onClear={() => setFrom("")}
        />
        <Field
          label="To"
          icon="airplane"
          value={to}
          onChangeText={setTo}
          onClear={() => setTo("")}
        />

        <Text style={styles.section}>Details</Text>

        <Field
          label="Flight number"
          icon="ticket-outline"
          value={flightNumber}
          onChangeText={setFlightNumber}
          onClear={() => setFlightNumber("")}
          autoCapitalize="characters"
        />
        <Field
          label="Departure Time"
          icon="time-outline"
          value={departureTime}
          onChangeText={setDepartureTime}
        />
        <Field
          label="Distance"
          icon="arrow-forward"
          value={distance}
          onChangeText={setDistance}
          onClear={() => setDistance("")}
        />
        <Field
          label="Airline"
          icon="airplane-outline"
          value={airline}
          onChangeText={setAirline}
          onClear={() => setAirline("")}
        />
        <Field
          label="Aircraft"
          icon="airplane"
          value={aircraft}
          onChangeText={setAircraft}
          onClear={() => setAircraft("")}
        />
        <Field
          label="Duration"
          icon="hourglass-outline"
          value={duration}
          onChangeText={setDuration}
          onClear={() => setDuration("")}
        />
        <Field
          label="Aircraft Registration"
          icon="airplane-outline"
          value={registration}
          onChangeText={setRegistration}
          onClear={() => setRegistration("")}
          autoCapitalize="characters"
        />

        <Field
          label=""
          icon="walk-outline"
          value={seat}
          onChangeText={setSeat}
          onClear={() => setSeat("")}
          placeholder="Seat"
        />
        <Field
          label=""
          icon="reorder-three-outline"
          value=""
          placeholder="Notes"
          editable={false}
          locked
        />
        <Field
          label=""
          icon="chevron-down"
          value={reason}
          onChangeText={setReason}
          placeholder="Reason"
          editable={false}
        />
        <Field
          label=""
          icon="chevron-down"
          value={klass}
          onChangeText={setKlass}
          placeholder="Class"
          editable={false}
        />
        <Field
          label="Tags"
          icon="pricetag-outline"
          value=""
          editable={false}
          locked
        />

        <View style={{ height: space(8) }} />
      </ScrollView>
    </View>
  );
}

export type SaveData = {
  date: string;
  from: string;
  to: string;
  flightNumber: string;
  departureTime: string;
  distance: string;
  airline: string;
  aircraft: string;
  duration: string;
  registration: string;
  seat: string;
  reason: string;
  klass: string;
};

function buildInitial(f: FlightInfo) {
  const distance = flightDistance(f);
  const duration = flightDuration(f);
  const departureTime = flightDepartureTime(f);
  return {
    date: f.date,
    from: airportLabel(f.departure.airport, f.departure.iata),
    to: airportLabel(f.arrival.airport, f.arrival.iata),
    flightNumber: f.flightNumber,
    departureTime: departureTime ?? "",
    distance: distance != null ? `${distance} mi` : "",
    airline: airlineLabel(f.airline.name, f.airline.iata),
    aircraft: aircraftLabel(f.aircraft?.model ?? null),
    duration: duration ?? "",
    registration: f.aircraft?.registration ?? "",
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space(4),
    paddingTop: space(12),
    paddingBottom: space(3),
    backgroundColor: colors.bgElevated,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
    marginLeft: space(4),
  },
  save: { color: colors.text, fontSize: 16, fontWeight: "500" },
  scroll: {
    paddingHorizontal: space(4),
    paddingTop: space(4),
    paddingBottom: space(8),
  },
  section: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
    marginTop: space(4),
    marginBottom: space(2),
  },
});
