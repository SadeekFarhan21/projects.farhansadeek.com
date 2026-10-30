import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, space } from "../theme";

export default function MoreScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Row icon="person-outline" label="Sign in with GitHub" />
        <Row icon="cloud-upload-outline" label="Sync to cloud" hint="Coming soon" />
        <Row icon="information-circle-outline" label="About SiloFlight" />
        <Row icon="logo-github" label="Source on GitHub" />
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  label,
  hint,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  hint?: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color={colors.accent} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: space(12),
    paddingBottom: space(4),
    paddingHorizontal: space(4),
    backgroundColor: colors.bgElevated,
  },
  headerTitle: { color: colors.text, fontSize: 28, fontWeight: "700" },
  scroll: { padding: space(4) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space(4),
    marginBottom: space(2),
    gap: space(3),
  },
  rowText: { flex: 1 },
  rowLabel: { color: colors.text, fontSize: 16 },
  rowHint: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
