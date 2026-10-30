package expo.modules.nativecodeeditor

import android.content.Context
import android.text.InputType
import androidx.appcompat.widget.AppCompatEditText

/**
 * AppCompatEditText subclass that exposes a selection-change callback and
 * disables features that interfere with code editing (autocorrect, autocaps,
 * spell check, smart inserts).
 */
class CodeEditText(context: Context) : AppCompatEditText(context) {

  /** Invoked on every selection change. (selStart, selEnd) */
  var onSelectionListener: ((Int, Int) -> Unit)? = null

  init {
    inputType = InputType.TYPE_CLASS_TEXT or
      InputType.TYPE_TEXT_FLAG_MULTI_LINE or
      InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS or
      InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
    setSingleLine(false)
    isVerticalScrollBarEnabled = true
  }

  override fun onSelectionChanged(selStart: Int, selEnd: Int) {
    super.onSelectionChanged(selStart, selEnd)
    onSelectionListener?.invoke(selStart, selEnd)
  }
}
