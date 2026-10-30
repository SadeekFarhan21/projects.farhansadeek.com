import ExpoModulesCore
import UIKit

/// Native code-editor view backed by a UITextView. Phase 1 is a minimal shell:
/// `value`, `fontSize`, `editable`, change/selection events, focus/blur, and
/// `replaceRange` / `setSelection` imperative methods. Decoration layers
/// (syntax foreground, line backgrounds, diagnostics) arrive in Phase 2.
public final class CodeEditorView: ExpoView, UITextViewDelegate {
  // MARK: - Subviews

  let textView: UITextView = {
    let tv = UITextView()
    tv.backgroundColor = .clear
    tv.autocorrectionType = .no
    tv.autocapitalizationType = .none
    tv.spellCheckingType = .no
    tv.smartDashesType = .no
    tv.smartQuotesType = .no
    tv.smartInsertDeleteType = .no
    tv.textContainerInset = UIEdgeInsets(top: 8, left: 8, bottom: 8, right: 12)
    tv.alwaysBounceVertical = true
    tv.keyboardDismissMode = .interactive
    return tv
  }()

  // MARK: - Events

  let onChangeText = EventDispatcher()
  let onSelectionChange = EventDispatcher()
  let onFocus = EventDispatcher()
  let onBlur = EventDispatcher()
  let onScroll = EventDispatcher()
  let onContentSizeChange = EventDispatcher()

  // MARK: - State

  /// Counter that suppresses `onChangeText` echo for programmatic edits
  /// triggered by `replaceRange`. Increment before mutation, decrement after.
  private var programmaticEditDepth = 0
  private var lastReportedSelection: NSRange = NSRange(location: 0, length: 0)
  private var lastReportedContentSize: CGSize = .zero

  // MARK: - Init

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    textView.delegate = self
    addSubview(textView)
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    textView.frame = bounds
    reportContentSizeIfChanged()
  }

  // MARK: - Prop setters (called from module definition)

  func setValue(_ value: String) {
    if textView.text == value { return }
    let prevSelection = textView.selectedRange
    programmaticEditDepth += 1
    textView.text = value
    // Restore caret as best we can; clamp to new length.
    let len = (value as NSString).length
    let clampedStart = min(prevSelection.location, len)
    let clampedEnd = min(prevSelection.location + prevSelection.length, len)
    textView.selectedRange = NSRange(location: clampedStart, length: max(0, clampedEnd - clampedStart))
    programmaticEditDepth -= 1
    reportContentSizeIfChanged()
  }

  func setFontSize(_ size: Double) {
    let resolved = UIFont(name: "JetBrainsMono-Regular", size: CGFloat(size))
      ?? UIFont.monospacedSystemFont(ofSize: CGFloat(size), weight: .regular)
    textView.font = resolved
  }

  func setEditable(_ editable: Bool) {
    textView.isEditable = editable
  }

  func setKeyboardAppearance(_ appearance: String) {
    textView.keyboardAppearance = appearance == "light" ? .light : .dark
  }

  func setBottomInset(_ inset: Double) {
    var ci = textView.contentInset
    ci.bottom = CGFloat(inset)
    textView.contentInset = ci
    var si = textView.verticalScrollIndicatorInsets
    si.bottom = CGFloat(inset)
    textView.verticalScrollIndicatorInsets = si
  }

  func setWrap(_ wrap: Bool) {
    // TextKit 1 default container width-tracks the view; for non-wrap, we
    // give the container an unbounded width and let the UITextView scroll
    // horizontally inside its own scroll view.
    if wrap {
      textView.textContainer.size = CGSize(
        width: textView.bounds.width,
        height: .greatestFiniteMagnitude
      )
      textView.textContainer.widthTracksTextView = true
    } else {
      textView.textContainer.widthTracksTextView = false
      textView.textContainer.size = CGSize(
        width: .greatestFiniteMagnitude,
        height: .greatestFiniteMagnitude
      )
    }
    textView.setNeedsLayout()
  }

  // MARK: - Imperative methods (called via UIManager dispatch)

  func focusEditor() {
    textView.becomeFirstResponder()
  }

  func blurEditor() {
    textView.resignFirstResponder()
  }

  func setSelection(start: Int, end: Int) {
    let len = (textView.text as NSString).length
    let s = max(0, min(start, len))
    let e = max(s, min(end, len))
    textView.selectedRange = NSRange(location: s, length: e - s)
  }

  func replaceRange(start: Int, end: Int, replacement: String) {
    let str = textView.text ?? ""
    let nsStr = str as NSString
    let len = nsStr.length
    let s = max(0, min(start, len))
    let e = max(s, min(end, len))
    let range = NSRange(location: s, length: e - s)

    programmaticEditDepth += 1
    let undoManager = textView.undoManager
    undoManager?.disableUndoRegistration()
    let newStr = nsStr.replacingCharacters(in: range, with: replacement) as String
    textView.text = newStr
    let cursor = s + (replacement as NSString).length
    textView.selectedRange = NSRange(location: cursor, length: 0)
    undoManager?.enableUndoRegistration()
    programmaticEditDepth -= 1

    // We did suppress onChangeText, but JS still owns truth — we'll have it
    // pushed back on the next render. We still emit selection changes so the
    // caret position is reflected.
    emitSelection()
    reportContentSizeIfChanged()
  }

  func scrollToLine(_ line: Int, position: String) {
    let text = textView.text ?? ""
    let target = max(1, line)
    var currentLine = 1
    var lineStart = text.startIndex
    for idx in text.indices {
      if currentLine == target { break }
      if text[idx] == "\n" {
        currentLine += 1
        lineStart = text.index(after: idx)
      }
    }
    let location = text.distance(from: text.startIndex, to: lineStart)
    let range = NSRange(location: location, length: 0)
    textView.scrollRangeToVisible(range)
  }

  // MARK: - UITextViewDelegate

  public func textViewDidChange(_ textView: UITextView) {
    if programmaticEditDepth > 0 { return }
    onChangeText([
      "value": textView.text ?? "",
      // Phase 1: full-value transport. Diff metadata in Phase 2.
      "changeStart": 0,
      "changeEnd": 0,
      "replacement": "",
    ])
    reportContentSizeIfChanged()
  }

  public func textViewDidChangeSelection(_ textView: UITextView) {
    emitSelection()
  }

  public func textViewDidBeginEditing(_ textView: UITextView) {
    onFocus([:])
  }

  public func textViewDidEndEditing(_ textView: UITextView) {
    onBlur([:])
  }

  public func scrollViewDidScroll(_ scrollView: UIScrollView) {
    onScroll([
      "x": scrollView.contentOffset.x,
      "y": scrollView.contentOffset.y,
      "viewportW": scrollView.bounds.width,
      "viewportH": scrollView.bounds.height,
      "contentW": scrollView.contentSize.width,
      "contentH": scrollView.contentSize.height,
    ])
  }

  // MARK: - Helpers

  private func emitSelection() {
    let sel = textView.selectedRange
    if sel.location == lastReportedSelection.location
        && sel.length == lastReportedSelection.length {
      return
    }
    lastReportedSelection = sel
    onSelectionChange([
      "start": sel.location,
      "end": sel.location + sel.length,
    ])
  }

  private func reportContentSizeIfChanged() {
    let size = textView.contentSize
    if abs(size.width - lastReportedContentSize.width) < 0.5
        && abs(size.height - lastReportedContentSize.height) < 0.5 {
      return
    }
    lastReportedContentSize = size
    let lineCount = (textView.text ?? "").components(separatedBy: "\n").count
    onContentSizeChange([
      "width": size.width,
      "height": size.height,
      "lineCount": lineCount,
    ])
  }
}
