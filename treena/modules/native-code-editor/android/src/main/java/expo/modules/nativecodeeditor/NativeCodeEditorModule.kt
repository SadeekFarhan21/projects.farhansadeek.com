package expo.modules.nativecodeeditor

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeCodeEditorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeCodeEditor")

    // Top-level constant so JS-side `requireOptionalNativeModule` reliably
    // returns a non-null object when this module is registered.
    Constants(
      "isAvailable" to true,
      "moduleVersion" to "0.1.0",
    )

    View(CodeEditorView::class) {
      Events(
        "onChangeText",
        "onSelectionChange",
        "onFocus",
        "onBlur",
        "onScroll",
        "onContentSizeChange",
      )

      Prop("value") { view: CodeEditorView, value: String ->
        view.setValue(value)
      }

      Prop("fontSize") { view: CodeEditorView, size: Double ->
        view.setFontSize(size)
      }

      Prop("editable") { view: CodeEditorView, editable: Boolean ->
        view.setEditable(editable)
      }

      Prop("keyboardAppearance") { view: CodeEditorView, appearance: String ->
        view.setKeyboardAppearance(appearance)
      }

      Prop("bottomInset") { view: CodeEditorView, inset: Double ->
        view.setBottomInset(inset)
      }

      Prop("wrap") { view: CodeEditorView, wrap: Boolean ->
        view.setWrap(wrap)
      }

      // Phase 2 props registered as no-ops so JS can already pass them.
      Prop("fontFamily") { _: CodeEditorView, _: String? -> }
      Prop("lineHeightMultiplier") { _: CodeEditorView, _: Double? -> }
      Prop("theme") { _: CodeEditorView, _: Map<String, String> -> }
      Prop("syntaxRanges") { _: CodeEditorView, _: List<Map<String, Any>> -> }
      Prop("diffRanges") { _: CodeEditorView, _: List<Map<String, Any>> -> }
      Prop("diagnosticRanges") { _: CodeEditorView, _: List<Map<String, Any>> -> }
      Prop("indentGuides") { _: CodeEditorView, _: List<Map<String, Any>> -> }
      Prop("indentWidthChars") { _: CodeEditorView, _: Int -> }
      Prop("activeLine") { _: CodeEditorView, _: Int? -> }
      Prop("showGutter") { _: CodeEditorView, _: Boolean -> }

      AsyncFunction("focus") { view: CodeEditorView ->
        view.focusEditor()
      }

      AsyncFunction("blur") { view: CodeEditorView ->
        view.blurEditor()
      }

      AsyncFunction("setSelection") { view: CodeEditorView, start: Int, end: Int ->
        view.setSelectionRange(start, end)
      }

      AsyncFunction("replaceRange") {
        view: CodeEditorView, start: Int, end: Int, text: String ->
        view.replaceRange(start, end, text)
      }

      AsyncFunction("scrollToLine") {
        view: CodeEditorView, line: Int, position: String ->
        view.scrollToLine(line, position)
      }
    }
  }
}
