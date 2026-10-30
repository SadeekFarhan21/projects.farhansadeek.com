import { requireNativeViewManager } from "expo-modules-core";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { findNodeHandle, UIManager } from "react-native";

import type {
  NativeCodeEditorProps,
  NativeCodeEditorRef,
} from "./NativeCodeEditor.types";

// `requireNativeViewManager` returns a forwardRef-compatible native component
// at runtime; its TS type is a plain ComponentType. Cast through the proper
// forwardRef shape so `<NativeView ref={...}>` typechecks.
const NativeView = requireNativeViewManager("NativeCodeEditor") as unknown as
  ForwardRefExoticComponent<NativeCodeEditorProps & RefAttributes<unknown>>;

const COMMANDS = {
  focus: "focus",
  blur: "blur",
  setSelection: "setSelection",
  scrollToLine: "scrollToLine",
  replaceRange: "replaceRange",
} as const;

function dispatch(
  ref: React.RefObject<unknown>,
  command: string,
  args: unknown[],
) {
  const node = findNodeHandle(ref.current as never);
  if (node == null) return;
  const cfg = (UIManager as unknown as Record<string, { Commands?: Record<string, number | string> }>)
    .NativeCodeEditor;
  const commandId = cfg?.Commands?.[command] ?? command;
  UIManager.dispatchViewManagerCommand(node, commandId as never, args as never);
}

const NativeCodeEditorView = forwardRef<NativeCodeEditorRef, NativeCodeEditorProps>(
  (props, ref) => {
    const innerRef = useRef(null);

    useImperativeHandle(ref, () => ({
      focus: () => dispatch(innerRef, COMMANDS.focus, []),
      blur: () => dispatch(innerRef, COMMANDS.blur, []),
      setSelection: (start, end) =>
        dispatch(innerRef, COMMANDS.setSelection, [start, end]),
      scrollToLine: (line, position = "top") =>
        dispatch(innerRef, COMMANDS.scrollToLine, [line, position]),
      replaceRange: (start, end, text) =>
        dispatch(innerRef, COMMANDS.replaceRange, [start, end, text]),
    }));

    return <NativeView ref={innerRef} {...props} />;
  },
);

NativeCodeEditorView.displayName = "NativeCodeEditorView";

export default NativeCodeEditorView;
