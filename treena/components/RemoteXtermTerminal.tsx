import { useRef, useEffect, useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  Keyboard,
  Platform,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";
import {
  subscribeRemoteTerminal,
  subscribeRemoteConnection,
  sendRemoteTerminalIn,
  sendRemoteTerminalResize,
} from "@/lib/workspace/remoteWsBridge";
import { resolveTerminalBrowseUrl } from "@/lib/terminalBrowseUrl";
import {
  parseTrustedHttpUrl,
  isLikelyOAuthAuthorizeUrl,
  validateOAuthAuthorizeUrl,
} from "@/lib/terminalOAuth";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore, terminalFontSizeValues } from "@/store";
import xtermHtml from "@/assets/terminal/xterm-bundle-html";
import TerminalToolbar from "@/components/TerminalToolbar";

function openUrlInBrowserTab(rawUrl: string) {
  const st = useStore.getState();
  const { loadUrl } = resolveTerminalBrowseUrl(rawUrl, {
    cloudSessionStatus: st.cloudSessionStatus,
    cloudSessionPublicIp: st.cloudSessionPublicIp,
    cloudSessionWsUrl: st.cloudSessionWsUrl,
    remoteWorkspaceEnabled: st.remoteWorkspaceEnabled,
    remoteWorkspaceWsUrl: st.remoteWorkspaceWsUrl,
  });
  st.addBrowserTab(loadUrl);
}

function utf8ToBase64(str: string): string {
  try {
    return globalThis.btoa(unescape(encodeURIComponent(str)));
  } catch {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return globalThis.btoa(binary);
  }
}

const RESET_JS =
  "(function(){try{if(window.__treenaReset)window.__treenaReset();}catch(e){}})(true);";
const FOCUS_JS =
  "(function(){try{if(window.__treenaFocus)window.__treenaFocus();}catch(e){}})(true);";

function injectTerminalFontJs(px: number): string {
  return `(function(){try{if(window.__treenaSetFontSize)window.__treenaSetFontSize(${px});}catch(e){}})(true);`;
}

interface Props {
  terminalId?: string;
}

export default function RemoteXtermTerminal({
  terminalId = "t1",
}: Props) {
  const webRef = useRef<WebView>(null);
  const bufRef = useRef<string[]>([]);
  const rafRef = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [lastTerminalLink, setLastTerminalLink] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const terminalFontSize = useStore((s) => s.terminalFontSize);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subShow = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const subHide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const flush = useCallback(() => {
    rafRef.current = null;
    if (!webRef.current || !loaded) {
      if (loaded && bufRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(flush);
      }
      return;
    }
    const parts = bufRef.current;
    bufRef.current = [];
    if (parts.length === 0) return;
    const merged = parts.join("");
    const b64 = utf8ToBase64(merged);
    const payload = JSON.stringify(b64);
    const js = `(function(){try{if(window.__treenaWrite)window.__treenaWrite(${payload});}catch(e){}})(true);`;
    webRef.current.injectJavaScript(js);
  }, [loaded]);

  const queueWrite = useCallback(
    (d: string) => {
      bufRef.current.push(d);
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flush);
      }
    },
    [flush]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
      bufRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!loaded || !webRef.current) return;
    const px = terminalFontSizeValues[terminalFontSize];
    webRef.current.injectJavaScript(injectTerminalFontJs(px));
  }, [loaded, terminalFontSize]);

  useEffect(() => {
    const unsub = subscribeRemoteTerminal((msg) => {
      if (msg.t === "out" && typeof msg.d === "string") {
        queueWrite(msg.d);
        setErrorMsg(null);
      } else if (msg.t === "err") {
        queueWrite(`\r\n\x1b[31m[remote] ${msg.m}\x1b[0m\r\n`);
      }
    }, terminalId);
    return unsub;
  }, [queueWrite, terminalId]);

  useEffect(() => {
    const unsub = subscribeRemoteConnection((e) => {
      if (e.kind === "close" || e.kind === "error") {
        setErrorMsg("Reconnecting to remote bridge…");
        webRef.current?.injectJavaScript(RESET_JS);
      } else if (e.kind === "open") {
        setErrorMsg(null);
      }
    });
    return unsub;
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as {
          t?: string;
          d?: string;
          cols?: number;
          rows?: number;
          m?: string;
        };
        if (data.t === "ready") {
          setLoaded(true);
          setErrorMsg(null);
          webRef.current?.injectJavaScript(FOCUS_JS);
        } else if (data.t === "openUrl" && typeof (data as any).url === "string") {
          const raw = (data as any).url as string;
          if (!/^https?:\/\//i.test(raw.trim())) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const trimmed = raw.trim();
          setLastTerminalLink(trimmed);
          setPendingUrl(trimmed);
        } else if (data.t === "error" && typeof data.m === "string") {
          const msg = data.m.trim();
          if (!msg || msg === "Script error.") return;
          setErrorMsg(msg);
        } else if (data.t === "in" && typeof data.d === "string") {
          sendRemoteTerminalIn(data.d, terminalId);
        } else if (
          data.t === "resize" &&
          typeof data.cols === "number" &&
          typeof data.rows === "number"
        ) {
          const cols = Math.min(500, Math.max(2, Math.floor(data.cols)));
          const rows = Math.min(500, Math.max(1, Math.floor(data.rows)));
          sendRemoteTerminalResize(cols, rows, terminalId);
        }
      } catch {
        /* ignore */
      }
    },
    [terminalId]
  );

  const validateBeforeOpen = useCallback((raw: string): boolean => {
    const u = parseTrustedHttpUrl(raw);
    if (!u) {
      Alert.alert("Invalid link", "Could not parse this URL.");
      return false;
    }
    if (isLikelyOAuthAuthorizeUrl(u)) {
      const v = validateOAuthAuthorizeUrl(u);
      if (!v.ok) {
        Alert.alert("OAuth link", v.reason);
        return false;
      }
    }
    return true;
  }, []);

  const openPendingUrl = useCallback(async () => {
    if (!pendingUrl) return;
    if (!validateBeforeOpen(pendingUrl)) return;

    const st = useStore.getState();
    const { loadUrl } = resolveTerminalBrowseUrl(pendingUrl, {
      cloudSessionStatus: st.cloudSessionStatus,
      cloudSessionPublicIp: st.cloudSessionPublicIp,
      cloudSessionWsUrl: st.cloudSessionWsUrl,
      remoteWorkspaceEnabled: st.remoteWorkspaceEnabled,
      remoteWorkspaceWsUrl: st.remoteWorkspaceWsUrl,
    });

    setPendingUrl(null);
    setLastTerminalLink(null);
    await WebBrowser.openBrowserAsync(loadUrl);
  }, [pendingUrl, validateBeforeOpen]);

  const copyPendingUrl = useCallback(async () => {
    if (!pendingUrl) return;
    await Clipboard.setStringAsync(pendingUrl);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingUrl(null);
  }, [pendingUrl]);

  const reopenLinkSheet = useCallback(() => {
    if (lastTerminalLink) setPendingUrl(lastTerminalLink);
  }, [lastTerminalLink]);

  return (
    <View style={styles.wrap} collapsable={false}>
      {lastTerminalLink && pendingUrl == null ? (
        <View style={styles.linkChip}>
          <TouchableOpacity
            style={styles.linkChipMain}
            onPress={reopenLinkSheet}
            activeOpacity={0.7}
          >
            <Ionicons name="link-outline" size={18} color={colors.accent} />
            <Text style={styles.linkChipText} numberOfLines={1}>
              Link — tap to open or copy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLastTerminalLink(null)}
            hitSlop={12}
            style={styles.linkChipClose}
            accessibilityLabel="Dismiss link bar"
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      <WebView
        ref={webRef}
        source={{ html: xtermHtml }}
        style={styles.web}
        originWhitelist={["*"]}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={false}
        setSupportMultipleWindows={false}
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        onLoadEnd={() => {
          setLoaded(true);
          setErrorMsg(null);
          webRef.current?.injectJavaScript(FOCUS_JS);
          const px = terminalFontSizeValues[useStore.getState().terminalFontSize];
          webRef.current?.injectJavaScript(injectTerminalFontJs(px));
          if (rafRef.current == null && bufRef.current.length > 0) {
            rafRef.current = requestAnimationFrame(flush);
          }
        }}
        onError={() => {
          setErrorMsg("Terminal WebView failed to load.");
        }}
      />
      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={styles.errorBannerText} numberOfLines={2}>
            {errorMsg}
          </Text>
          <TouchableOpacity
            onPress={() => setErrorMsg(null)}
            hitSlop={12}
            style={styles.errorBannerClose}
            accessibilityLabel="Dismiss terminal error"
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {keyboardVisible ? (
        <TerminalToolbar terminalId={terminalId} />
      ) : null}

      <Modal
        visible={pendingUrl != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingUrl(null)}
      >
        <Pressable style={styles.urlSheetBackdrop} onPress={() => setPendingUrl(null)}>
          <Pressable style={styles.urlSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.urlSheetTitle}>Open link</Text>
            <ScrollView
              style={styles.urlSheetScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.urlSheetUrl} selectable>
                {pendingUrl ?? ""}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.urlSheetOpenBtn}
              onPress={() => {
                if (!pendingUrl) return;
                openUrlInBrowserTab(pendingUrl);
                setPendingUrl(null);
                setLastTerminalLink(null);
              }}
            >
              <Ionicons name="globe-outline" size={20} color={colors.accentText} />
              <Text style={styles.urlSheetOpenBtnText}>Open in Tab</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.urlSheetCopyBtn}
              onPress={() => void openPendingUrl()}
            >
              <Ionicons name="open-outline" size={20} color={colors.accent} />
              <Text style={styles.urlSheetCopyBtnText}>Open in System Browser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.urlSheetCopyBtn}
              onPress={() => void copyPendingUrl()}
            >
              <Ionicons name="copy-outline" size={20} color={colors.accent} />
              <Text style={styles.urlSheetCopyBtnText}>Copy URL</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 0,
    backgroundColor: "#0A0A0A",
  },
  linkChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 48,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 6,
  },
  linkChipMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    minHeight: 44,
  },
  linkChipText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.md,
    color: colors.text,
  },
  linkChipClose: {
    padding: 12,
  },
  web: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  errorBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    zIndex: 10,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  errorBannerClose: {
    padding: 4,
  },
  urlSheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end" as const,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  urlSheet: {
    backgroundColor: colors.surfaceLight,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: 34,
    gap: spacing.sm,
    maxHeight: "85%",
  },
  urlSheetTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  urlSheetScroll: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    padding: spacing.md,
    maxHeight: 200,
  },
  urlSheetUrl: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  urlSheetHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  urlSheetOpenBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    minHeight: 48,
    paddingVertical: spacing.md,
  },
  urlSheetOpenBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.accentText,
  },
  urlSheetCopyBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.sm,
    backgroundColor: colors.labelBg,
    borderRadius: radii.lg,
    minHeight: 48,
    paddingVertical: spacing.md,
  },
  urlSheetCopyBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.md,
    color: colors.accent,
  },
});
