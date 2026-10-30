import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, space } from "../theme";

export type Tab = "flights" | "statistics" | "more";

export default function BottomNav({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Item
        tab="flights"
        active={active}
        onChange={onChange}
        icon="globe-outline"
        label="Flights"
      />
      <Item
        tab="statistics"
        active={active}
        onChange={onChange}
        icon="stats-chart"
        label="Statistics"
      />
      <Item
        tab="more"
        active={active}
        onChange={onChange}
        icon="person-outline"
        label="More"
      />
    </View>
  );
}

function Item({
  tab,
  active,
  onChange,
  icon,
  label,
}: {
  tab: Tab;
  active: Tab;
  onChange: (tab: Tab) => void;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}) {
  const isActive = tab === active;
  const color = isActive ? colors.text : colors.textMuted;
  return (
    <Pressable
      style={styles.item}
      onPress={() => onChange(tab)}
      hitSlop={6}
      android_ripple={{ color: colors.surfaceHi, borderless: true }}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: colors.bgElevated,
    paddingTop: space(2),
    paddingBottom: space(6),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: { flex: 1, alignItems: "center", gap: 2, paddingVertical: space(1) },
  label: { fontSize: 11 },
});
