import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, space } from "../theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  icon?: IconName;
  onClear?: () => void;
  editable?: boolean;
  placeholder?: string;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  locked?: boolean;
};

export default function Field({
  label,
  value,
  onChangeText,
  icon,
  onClear,
  editable = true,
  placeholder,
  keyboardType,
  autoCapitalize,
  locked = false,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.labelWrap}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.row}>
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={colors.accent}
            style={styles.icon}
          />
        ) : (
          <View style={styles.iconSpacer} />
        )}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          editable={editable && !locked}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          selectTextOnFocus
        />
        {locked ? (
          <Ionicons
            name="lock-closed"
            size={18}
            color={colors.textMuted}
            style={styles.trail}
          />
        ) : onClear && value.length > 0 ? (
          <Pressable onPress={onClear} hitSlop={10} style={styles.trail}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: space(2),
    borderWidth: 1,
    borderColor: colors.borderHi,
    borderRadius: radii.md,
    paddingHorizontal: space(3),
    paddingTop: space(3),
    paddingBottom: space(2.5),
    backgroundColor: colors.bgElevated,
    position: "relative",
  },
  labelWrap: {
    position: "absolute",
    top: -10,
    left: 14,
    paddingHorizontal: space(1),
    backgroundColor: colors.bg,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
  },
  row: { flexDirection: "row", alignItems: "center" },
  icon: { marginRight: space(2.5), width: 22, textAlign: "center" },
  iconSpacer: { width: 22, marginRight: space(2.5) },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: space(1),
  },
  trail: { marginLeft: space(2) },
});
