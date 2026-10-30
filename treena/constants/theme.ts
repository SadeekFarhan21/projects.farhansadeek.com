export const colors = {
  bg: "#121212",
  surface: "#1A1A1A",
  surfaceLight: "#242424",
  surfaceElevated: "#1E1E1E",
  headerBg: "#161616",
  inputBg: "#1C1C1E",
  inputBorder: "#3A3A3C",
  chatBg: "#121212",
  labelBg: "#2C2C2E",
  border: "#2A2A2A",
  borderLight: "#383838",
  text: "#E8E8E8",
  textSecondary: "#8E8E93",
  textMuted: "#636366",
  accent: "#00E676",
  accentDim: "#00C853",
  accentText: "#000000",
  accentWarm: "#FF6B35",
  success: "#00E676",
  error: "#FF453A",
  warning: "#FFAA00",
  // Gutter
  lineNumber: "#858585",
  activeLineBg: "#2A2D2E",
  activeLineNumber: "#FFFFFF",
  // Terminal
  terminalGreen: "#00E676",
  // Chat bubbles
  userBubble: "#2C2C2E",
  // VS Code editor
  editorBg: "#1E1E1E",
  explorerSelectedBg: "#2A2D2E",
  folderIcon: "#DCAD73",
  modifiedYellow: "#E2C08D",
  diffAddedBg: "#1E4620",
  diffRemovedBg: "#4B1818",
  diffAddedBar: "#4EC994",
  diffRemovedBar: "#F14C4C",
  gitModified: "#E2C08D",
  gitUntracked: "#73C991",
  gitDeleted: "#F14C4C",
  // Provider dots for model picker
  openai: "#10A37F",
  anthropic: "#D97706",
  google: "#4285F4",
  meta: "#0668E1",
  mistral: "#F97316",
  deepseek: "#4D6BFE",
  // Quick-start chips
  chipBg: "#1E2E24",
  chipBorder: "#00E67630",
  agentGrey: "#3C3C3C",
} as const;

export const fonts = {
  mono: "JetBrainsMono_400Regular",
  monoBold: "JetBrainsMono_700Bold",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemiBold: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
} as const;

export const spacing = {
  xs: 4,
  xs2: 6,
  sm: 8,
  md: 12,
  md2: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  code: 18,
  lineNumber: 10,
  explorerHeader: 11,
  explorerItems: 14,
  chatBody: 16,
  chatLabel: 13,
  headerTitle: 17,
  headerSubtitle: 12,
  inputText: 16,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xl2: 20,
  xxl: 24,
  full: 999,
} as const;
