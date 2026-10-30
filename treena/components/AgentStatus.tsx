import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, fontSize, spacing } from "@/constants/theme";

interface AgentStatusProps {
  status: string;
}

export default function AgentStatus({ status }: AgentStatusProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  text: {
    fontFamily: fonts.sans,
    fontSize: fontSize.chatLabel,
    color: colors.textMuted,
  },
});
