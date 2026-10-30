package expo.modules.nativecodeeditor

import android.content.Context
import android.graphics.Typeface
import android.text.Editable
import android.text.TextWatcher
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.HorizontalScrollView
import androidx.appcompat.widget.AppCompatEditText
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/**
 * Phase 1: minimal AppCompatEditText shell. `value`, `fontSize`, `editable`,
 * change/selection events, `focus`/`blur`/`setSelection`/`replaceRange`/
 * `scrollToLine` imperative methods. Decoration layers in Phase 2.
 */
class CodeEditorView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {

  // Events
  val onChangeText by EventDispatcher()
  val onSelectionChange by EventDispatcher()
  val onFocus by EventDispatcher()
  val onBlur by EventDispatcher()
  val onScroll by EventDispatcher()
  val onContentSizeChange by EventDispatcher()

  internal val editText: CodeEditText = CodeEditText(context)

  /** When > 0, suppress onChangeText echo for programmatic edits. */
  private var programmaticEditDepth: Int = 0
  private var lastSelStart: Int = -1
  private var lastSelEnd: Int = -1
  private var wrap: Boolean = true

  private var horizontalScroll: HorizontalScrollView? = null

  init {
    editText.setBackgroundColor(0x00000000)
    editText.setTextColor(0xFFD4D4D4.toInt())
    editText.setPadding(dp(8), dp(8), dp(12), dp(8))
    editText.gravity = Gravity.TOP or Gravity.START
    editText.typeface = Typeface.MONOSPACE
    editText.includeFontPadding = false
    editText.setHorizontallyScrolling(false)

    editText.addTextChangedListener(object : TextWatcher {
      override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
      override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
      override fun afterTextChanged(s: Editable?) {
        if (programmaticEditDepth > 0) return
        onChangeText(
          mapOf(
            "value" to (s?.toString() ?: ""),
            // Phase 1: full-value transport. Diff metadata in Phase 2.
            "changeStart" to 0,
            "changeEnd" to 0,
            "replacement" to "",
          )
        )
        emitContentSize()
      }
    })

    editText.onSelectionListener = { selStart, selEnd ->
      if (selStart != lastSelStart || selEnd != lastSelEnd) {
        lastSelStart = selStart
        lastSelEnd = selEnd
        onSelectionChange(mapOf("start" to selStart, "end" to selEnd))
      }
    }

    editText.setOnFocusChangeListener { _, hasFocus ->
      if (hasFocus) onFocus(emptyMap()) else onBlur(emptyMap())
    }

    attachChildForCurrentWrapMode()
  }

  // MARK: - Prop setters

  fun setValue(value: String) {
    if (editText.text?.toString() == value) return
    val prevSelStart = editText.selectionStart
    val prevSelEnd = editText.selectionEnd
    programmaticEditDepth++
    editText.setText(value)
    val len = value.length
    val s = prevSelStart.coerceIn(0, len)
    val e = prevSelEnd.coerceIn(s, len)
    editText.setSelection(s, e)
    programmaticEditDepth--
    emitContentSize()
  }

  fun setFontSize(size: Double) {
    editText.setTextSize(TypedValue.COMPLEX_UNIT_PX, dpFloat(size.toFloat()))
  }

  fun setEditable(editable: Boolean) {
    editText.isFocusable = editable
    editText.isFocusableInTouchMode = editable
    editText.isCursorVisible = editable
  }

  fun setKeyboardAppearance(@Suppress("UNUSED_PARAMETER") appearance: String) {
    // Android has no light/dark keyboard appearance API; ignored.
  }

  fun setBottomInset(inset: Double) {
    val padBottom = dp(inset.toInt())
    editText.setPadding(editText.paddingLeft, editText.paddingTop, editText.paddingRight, padBottom)
  }

  fun setWrap(wrap: Boolean) {
    if (this.wrap == wrap) return
    this.wrap = wrap
    attachChildForCurrentWrapMode()
  }

  // MARK: - Imperative methods

  fun focusEditor() {
    editText.requestFocus()
  }

  fun blurEditor() {
    editText.clearFocus()
  }

  fun setSelectionRange(start: Int, end: Int) {
    val len = editText.text?.length ?: 0
    val s = start.coerceIn(0, len)
    val e = end.coerceIn(s, len)
    editText.setSelection(s, e)
  }

  fun replaceRange(start: Int, end: Int, replacement: String) {
    val len = editText.text?.length ?: 0
    val s = start.coerceIn(0, len)
    val e = end.coerceIn(s, len)
    programmaticEditDepth++
    editText.text?.replace(s, e, replacement)
    val cursor = s + replacement.length
    editText.setSelection(cursor, cursor)
    programmaticEditDepth--
    if (lastSelStart != cursor || lastSelEnd != cursor) {
      lastSelStart = cursor
      lastSelEnd = cursor
      onSelectionChange(mapOf("start" to cursor, "end" to cursor))
    }
    emitContentSize()
  }

  fun scrollToLine(line: Int, @Suppress("UNUSED_PARAMETER") position: String) {
    val target = line.coerceAtLeast(1)
    val text = editText.text?.toString() ?: return
    var current = 1
    var idx = 0
    while (idx < text.length && current < target) {
      if (text[idx] == '\n') current++
      idx++
    }
    val layout = editText.layout ?: return
    val lineIndex = layout.getLineForOffset(idx)
    val y = layout.getLineTop(lineIndex)
    editText.scrollTo(0, y)
  }

  // MARK: - Layout helpers

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    super.onLayout(changed, l, t, r, b)
    val container = horizontalScroll ?: editText
    container.layout(0, 0, r - l, b - t)
  }

  private fun attachChildForCurrentWrapMode() {
    removeAllViews()
    horizontalScroll = null

    if (wrap) {
      editText.setHorizontallyScrolling(false)
      addView(
        editText,
        ViewGroup.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT,
        )
      )
    } else {
      editText.setHorizontallyScrolling(true)
      val hsv = HorizontalScrollView(context).apply {
        isFillViewport = true
        isHorizontalFadingEdgeEnabled = false
        setOnScrollChangeListener { _, x, y, _, _ ->
          onScroll(
            mapOf(
              "x" to x,
              "y" to y,
              "viewportW" to width,
              "viewportH" to height,
              "contentW" to (editText.width.coerceAtLeast(width)),
              "contentH" to (editText.height.coerceAtLeast(height)),
            )
          )
        }
      }
      hsv.addView(
        editText,
        ViewGroup.LayoutParams(
          ViewGroup.LayoutParams.WRAP_CONTENT,
          ViewGroup.LayoutParams.MATCH_PARENT,
        )
      )
      horizontalScroll = hsv
      addView(
        hsv,
        ViewGroup.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT,
        )
      )
    }
  }

  private fun emitContentSize() {
    val text = editText.text?.toString() ?: ""
    val lineCount = text.count { it == '\n' } + 1
    onContentSizeChange(
      mapOf(
        "width" to editText.width,
        "height" to editText.height,
        "lineCount" to lineCount,
      )
    )
  }

  private fun dp(value: Int): Int =
    (value * resources.displayMetrics.density).toInt()

  private fun dpFloat(value: Float): Float =
    value * resources.displayMetrics.density
}
