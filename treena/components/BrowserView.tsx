import { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore } from "@/store";
import { resolveTerminalBrowseUrl } from "@/lib/terminalBrowseUrl";

const CHROME_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";

/**
 * URLs that identity providers serve their login UI at. Embedded WebViews are
 * actively blocked on these (Google/Apple) or degraded (GitHub popups); we
 * delegate to the system browser, which shares cookies with our WebView on iOS.
 */
const AUTH_URL_PATTERNS: RegExp[] = [
  /^https:\/\/github\.com\/login(\/|$|\?)/i,
  /^https:\/\/github\.com\/sessions/i,
  /^https:\/\/accounts\.google\.com\//i,
  /^https:\/\/appleid\.apple\.com\/auth/i,
  /^https:\/\/login\.microsoftonline\.com\//i,
  /^https:\/\/auth0\.com\//i,
  /^https:\/\/[^/]+\.auth0\.com\//i,
  /^https:\/\/id\.atlassian\.com\//i,
  /^https:\/\/[^/]+\/oauth\/authorize/i,
];

function isAuthUrl(url: string): boolean {
  return AUTH_URL_PATTERNS.some((re) => re.test(url));
}

function resolveUrl(raw: string): string {
  const st = useStore.getState();
  const { loadUrl } = resolveTerminalBrowseUrl(raw, {
    cloudSessionStatus: st.cloudSessionStatus,
    cloudSessionPublicIp: st.cloudSessionPublicIp,
    cloudSessionWsUrl: st.cloudSessionWsUrl,
    remoteWorkspaceEnabled: st.remoteWorkspaceEnabled,
    remoteWorkspaceWsUrl: st.remoteWorkspaceWsUrl,
  });
  return loadUrl;
}

function ensureProtocol(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

interface Props {
  tabId: string;
}

export default function BrowserView({ tabId }: Props) {
  const webRef = useRef<WebView>(null);
  const addressInputRef = useRef<TextInput>(null);
  const tab = useStore((s) => s.browserTabs.find((t) => t.id === tabId));
  const patchBrowserTab = useStore((s) => s.patchBrowserTab);
  const floatingPillHeight = useStore((s) => s.floatingPillHeight);
  const agentBarHeight = useStore((s) => s.agentBarHeight);
  const bottomInset = floatingPillHeight + agentBarHeight;

  const [addressText, setAddressText] = useState(tab?.url ?? "");
  const [isEditing, setIsEditing] = useState(false);

  const progressWidth = useSharedValue(0);

  useEffect(() => {
    if (!isEditing && tab?.url) {
      setAddressText(tab.url);
    }
  }, [tab?.url, isEditing]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      patchBrowserTab(tabId, {
        url: navState.url,
        title: navState.title || new URL(navState.url).hostname,
        canGoBack: navState.canGoBack,
        canGoForward: navState.canGoForward,
        isLoading: navState.loading,
      });
      if (!navState.loading) {
        progressWidth.value = withTiming(0, { duration: 200 });
      }
    },
    [tabId, patchBrowserTab, progressWidth]
  );

  const handleLoadStart = useCallback(() => {
    patchBrowserTab(tabId, { isLoading: true });
    progressWidth.value = 0;
    progressWidth.value = withTiming(80, { duration: 3000 });
  }, [tabId, patchBrowserTab, progressWidth]);

  const handleLoadEnd = useCallback(() => {
    patchBrowserTab(tabId, { isLoading: false });
    progressWidth.value = withTiming(100, { duration: 200 });
    setTimeout(() => {
      progressWidth.value = withTiming(0, { duration: 200 });
    }, 400);
  }, [tabId, patchBrowserTab, progressWidth]);

  const handleGoBack = useCallback(() => {
    webRef.current?.goBack();
  }, []);

  const handleGoForward = useCallback(() => {
    webRef.current?.goForward();
  }, []);

  const handleRefreshOrStop = useCallback(() => {
    if (tab?.isLoading) {
      webRef.current?.stopLoading();
    } else {
      webRef.current?.reload();
    }
  }, [tab?.isLoading]);

  const handleAddressSubmit = useCallback(() => {
    setIsEditing(false);
    const url = resolveUrl(ensureProtocol(addressText));
    patchBrowserTab(tabId, { url });
    setAddressText(url);
    webRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(url)}; true;`);
  }, [addressText, tabId, patchBrowserTab]);

  const handleOpenExternal = useCallback(async () => {
    if (tab?.url) {
      await WebBrowser.openBrowserAsync(tab.url);
    }
  }, [tab?.url]);

  const handleShouldStartLoad = useCallback(
    (request: { url: string }) => {
      if (isAuthUrl(request.url)) {
        void (async () => {
          try {
            await WebBrowser.openBrowserAsync(request.url, {
              presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
            });
          } catch {
            /* ignore */
          }
          // After returning from the system browser, reload the WebView so
          // it picks up any shared auth cookies.
          webRef.current?.reload();
        })();
        return false;
      }
      return true;
    },
    []
  );

  // window.open() popups (OAuth, Clerk auth, captcha, share dialogs) — redirect
  // the main WebView to the popup URL. handleShouldStartLoad will still catch
  // known auth URLs and delegate them to the system browser.
  const handleOpenWindow = useCallback(
    (event: { nativeEvent: { targetUrl: string } }) => {
      const targetUrl = event.nativeEvent?.targetUrl;
      if (!targetUrl) return;
      webRef.current?.injectJavaScript(
        `window.location.href = ${JSON.stringify(targetUrl)}; true;`
      );
    },
    []
  );

  const handleWebViewError = useCallback(
    (event: {
      nativeEvent: {
        description?: string;
        url?: string;
        code?: number;
        statusCode?: number;
      };
    }) => {
      const { description, url, code, statusCode } = event.nativeEvent;
      console.warn(
        `[BrowserView] WebView error code=${code ?? statusCode} url=${url}: ${description}`
      );
    },
    []
  );

  const handleAddressFocus = useCallback(() => {
    setIsEditing(true);
    // Don't reset addressText here — the useEffect already syncs it when
    // not editing, and a state update during onFocus races with
    // selectTextOnFocus, leaving the text un-selected.
    // Belt-and-suspenders programmatic select-all in case selectTextOnFocus
    // misbehaves on the current platform.
    requestAnimationFrame(() => {
      addressInputRef.current?.setNativeProps?.({
        selection: { start: 0, end: addressText.length },
      });
    });
  }, [addressText.length]);

  if (!tab) return null;

  const sourceUrl = resolveUrl(tab.url);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          onPress={handleGoBack}
          disabled={!tab.canGoBack}
          style={styles.navBtn}
          activeOpacity={0.6}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={tab.canGoBack ? colors.text : colors.textMuted}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleGoForward}
          disabled={!tab.canGoForward}
          style={styles.navBtn}
          activeOpacity={0.6}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={tab.canGoForward ? colors.text : colors.textMuted}
          />
        </TouchableOpacity>

        <View style={styles.addressBarWrap}>
          <TextInput
            ref={addressInputRef}
            style={styles.addressBar}
            value={addressText}
            onChangeText={setAddressText}
            onFocus={handleAddressFocus}
            onBlur={() => setIsEditing(false)}
            onSubmitEditing={handleAddressSubmit}
            placeholder="Enter URL..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            selectTextOnFocus
          />
          {tab.isLoading && (
            <ActivityIndicator
              size="small"
              color={colors.accent}
              style={styles.addressSpinner}
            />
          )}
        </View>

        <TouchableOpacity
          onPress={handleRefreshOrStop}
          style={styles.navBtn}
          activeOpacity={0.6}
        >
          <Ionicons
            name={tab.isLoading ? "close" : "reload"}
            size={18}
            color={colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleOpenExternal}
          style={styles.navBtn}
          activeOpacity={0.6}
        >
          <Ionicons name="open-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, progressStyle]} />
      </View>

      <WebView
        ref={webRef}
        source={{ uri: sourceUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        allowsInlineMediaPlayback
        sharedCookiesEnabled
        userAgent={CHROME_USER_AGENT}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onOpenWindow={handleOpenWindow}
        onError={handleWebViewError}
        onHttpError={handleWebViewError}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        setSupportMultipleWindows
        allowsBackForwardNavigationGestures
        startInLoadingState={false}
        contentInset={{ top: 0, left: 0, right: 0, bottom: bottomInset }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
  },
  addressBarWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    height: 32,
    paddingHorizontal: spacing.sm,
  },
  addressBar: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    paddingVertical: 0,
  },
  addressSpinner: {
    marginLeft: 4,
  },
  progressTrack: {
    height: 2,
    backgroundColor: "transparent",
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.accent,
  },
  webview: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
