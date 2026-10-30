import type { ViewProps } from "react-native";

export type NativeCodeEditorTheme = {
  background: string;
  foreground: string;
  selection: string;
  cursor: string;
  activeLineBg: string;
  gutterFg: string;
  gutterActiveFg: string;
  diffAddedBg: string;
  diffRemovedBg: string;
  diffAddedBar: string;
  diffRemovedBar: string;
  indentGuide: string;
  diagnosticErrorColor: string;
  diagnosticWarnColor: string;
};

export type SyntaxRange = {
  start: number;
  length: number;
  color: string;
};

export type DiffRange = {
  line: number;
  kind: "added" | "removed";
};

export type DiagnosticRange = {
  start: number;
  length: number;
  severity: "error" | "warning";
};

export type IndentGuide = {
  line: number;
  level: number;
};

export type NativeCodeEditorChangeEvent = {
  value: string;
  changeStart: number;
  changeEnd: number;
  replacement: string;
};

export type NativeCodeEditorSelectionEvent = {
  start: number;
  end: number;
};

export type NativeCodeEditorScrollEvent = {
  x: number;
  y: number;
  viewportW: number;
  viewportH: number;
  contentW: number;
  contentH: number;
};

export type NativeCodeEditorContentSizeEvent = {
  width: number;
  height: number;
  lineCount: number;
};

export interface NativeCodeEditorProps extends ViewProps {
  value: string;
  fontSize: number;
  fontFamily?: string;
  lineHeightMultiplier?: number;
  wrap: boolean;
  editable: boolean;
  keyboardAppearance: "dark" | "light";
  theme: NativeCodeEditorTheme;
  syntaxRanges: SyntaxRange[];
  diffRanges: DiffRange[];
  diagnosticRanges: DiagnosticRange[];
  indentGuides: IndentGuide[];
  indentWidthChars: number;
  activeLine?: number;
  showGutter: boolean;
  bottomInset: number;

  onChangeText?: (e: { nativeEvent: NativeCodeEditorChangeEvent }) => void;
  onSelectionChange?: (e: { nativeEvent: NativeCodeEditorSelectionEvent }) => void;
  onScroll?: (e: { nativeEvent: NativeCodeEditorScrollEvent }) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onContentSizeChange?: (e: { nativeEvent: NativeCodeEditorContentSizeEvent }) => void;
}

export interface NativeCodeEditorRef {
  focus: () => void;
  blur: () => void;
  setSelection: (start: number, end: number) => void;
  scrollToLine: (line: number, position?: "top" | "center") => void;
  replaceRange: (start: number, end: number, text: string) => void;
}
