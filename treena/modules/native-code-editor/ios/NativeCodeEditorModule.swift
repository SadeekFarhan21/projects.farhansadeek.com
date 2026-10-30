import ExpoModulesCore

public class NativeCodeEditorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeCodeEditor")

    // Top-level constant so JS-side `requireOptionalNativeModule` reliably
    // returns a non-null object when this module is registered. Without this,
    // a view-only module can be present yet appear absent to the JS proxy.
    Constants([
      "isAvailable": true,
      "moduleVersion": "0.1.0",
    ])

    View(CodeEditorView.self) {
      Events(
        "onChangeText",
        "onSelectionChange",
        "onFocus",
        "onBlur",
        "onScroll",
        "onContentSizeChange"
      )

      Prop("value") { (view: CodeEditorView, value: String) in
        view.setValue(value)
      }

      Prop("fontSize") { (view: CodeEditorView, size: Double) in
        view.setFontSize(size)
      }

      Prop("editable") { (view: CodeEditorView, editable: Bool) in
        view.setEditable(editable)
      }

      Prop("keyboardAppearance") { (view: CodeEditorView, appearance: String) in
        view.setKeyboardAppearance(appearance)
      }

      Prop("bottomInset") { (view: CodeEditorView, inset: Double) in
        view.setBottomInset(inset)
      }

      Prop("wrap") { (view: CodeEditorView, wrap: Bool) in
        view.setWrap(wrap)
      }

      // Phase 2 props are registered as no-ops in Phase 1 so JS can already
      // pass them without crashes.
      Prop("fontFamily") { (_: CodeEditorView, _: String?) in }
      Prop("lineHeightMultiplier") { (_: CodeEditorView, _: Double?) in }
      Prop("theme") { (_: CodeEditorView, _: [String: String]) in }
      Prop("syntaxRanges") { (_: CodeEditorView, _: [[String: Any]]) in }
      Prop("diffRanges") { (_: CodeEditorView, _: [[String: Any]]) in }
      Prop("diagnosticRanges") { (_: CodeEditorView, _: [[String: Any]]) in }
      Prop("indentGuides") { (_: CodeEditorView, _: [[String: Any]]) in }
      Prop("indentWidthChars") { (_: CodeEditorView, _: Int) in }
      Prop("activeLine") { (_: CodeEditorView, _: Int?) in }
      Prop("showGutter") { (_: CodeEditorView, _: Bool) in }

      AsyncFunction("focus") { (view: CodeEditorView) in
        view.focusEditor()
      }.runOnQueue(.main)

      AsyncFunction("blur") { (view: CodeEditorView) in
        view.blurEditor()
      }.runOnQueue(.main)

      AsyncFunction("setSelection") { (view: CodeEditorView, start: Int, end: Int) in
        view.setSelection(start: start, end: end)
      }.runOnQueue(.main)

      AsyncFunction("replaceRange") {
        (view: CodeEditorView, start: Int, end: Int, text: String) in
        view.replaceRange(start: start, end: end, replacement: text)
      }.runOnQueue(.main)

      AsyncFunction("scrollToLine") {
        (view: CodeEditorView, line: Int, position: String) in
        view.scrollToLine(line, position: position)
      }.runOnQueue(.main)
    }
  }
}
