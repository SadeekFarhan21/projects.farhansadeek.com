import { requireOptionalNativeModule } from "expo-modules-core";

export { default as NativeCodeEditorView } from "./NativeCodeEditorView";
export * from "./NativeCodeEditor.types";

const nativeModule = requireOptionalNativeModule<{ isAvailable?: boolean; moduleVersion?: string }>(
  "NativeCodeEditor",
);

/**
 * True when the native NativeCodeEditor module is registered in the current
 * dev client / build. False when running on Expo Go, an older dev client, or
 * a build where autolinking didn't pick up the module. Use this to gate
 * `<NativeCodeEditorView>` rendering so we don't show a red "Unimplemented
 * component" screen.
 */
export const isNativeCodeEditorAvailable: boolean =
  nativeModule?.isAvailable === true;

export const nativeCodeEditorModuleVersion: string | null =
  nativeModule?.moduleVersion ?? null;

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log(
    `[native-code-editor] available=${isNativeCodeEditorAvailable}, ` +
      `version=${nativeCodeEditorModuleVersion ?? "n/a"}`,
  );
}
