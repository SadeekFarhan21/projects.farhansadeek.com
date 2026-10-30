import { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, fontSize, radii, spacing } from "@/constants/theme";
import { useFileSystem } from "@/hooks/useFileSystem";
import { isRemoteWorkspacePath } from "@/lib/workspace/remotePaths";

const AnimatedImage = Animated.createAnimatedComponent(Image);

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
        ms
      )
    ),
  ]);
}

function mimeFromExt(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    case "ico":
      return "image/x-icon";
    case "heic":
    case "heif":
      return "image/heic";
    default:
      return "application/octet-stream";
  }
}

interface Props {
  path: string;
  filename: string;
}

export default function ImageViewer({ path, filename }: Props) {
  const { readFileBase64 } = useFileSystem();
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  useEffect(() => {
    let active = true;
    setUri(null);
    setError(null);
    setDims(null);
    scale.value = 1;
    savedScale.value = 1;
    tx.value = 0;
    ty.value = 0;
    savedTx.value = 0;
    savedTy.value = 0;

    (async () => {
      try {
        if (isRemoteWorkspacePath(path)) {
          const b64 = await withTimeout(
            readFileBase64(path),
            30_000,
            "Image load"
          );
          if (!active) return;
          setUri(`data:${mimeFromExt(filename)};base64,${b64}`);
        } else {
          setUri(path.startsWith("file://") ? path : `file://${path}`);
        }
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      active = false;
    };
  }, [path, filename, readFileBase64]);

  useEffect(() => {
    if (!uri) return;
    Image.getSize(
      uri,
      (w, h) => setDims({ w, h }),
      () => setDims(null)
    );
  }, [uri]);

  const handleReset = () => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    tx.value = withSpring(0);
    ty.value = withSpring(0);
    savedTx.value = 0;
    savedTy.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(8, Math.max(0.5, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const target = scale.value > 1.5 ? 1 : 2;
      scale.value = withSpring(target);
      savedScale.value = target;
      if (target === 1) {
        tx.value = withSpring(0);
        ty.value = withSpring(0);
        savedTx.value = 0;
        savedTy.value = 0;
      }
    });

  const composed = Gesture.Simultaneous(pan, pinch, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  if (error) {
    const isRemote = isRemoteWorkspacePath(path);
    return (
      <View style={styles.center}>
        <Ionicons
          name="alert-circle-outline"
          size={40}
          color={colors.error}
        />
        <Text style={styles.errorTitle} numberOfLines={1}>
          {filename}
        </Text>
        <Text style={styles.errorText}>{error}</Text>
        {isRemote ? (
          <Text style={styles.errorHint}>
            If this persists, the cloud bridge may need to be redeployed with
            the new binary-read handler.
          </Text>
        ) : null}
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={composed}>
        <Animated.View style={styles.imageWrap}>
          <AnimatedImage
            source={{ uri }}
            style={[styles.image, animatedStyle]}
            resizeMode="contain"
            onError={(e) => {
              const native = e?.nativeEvent as { error?: string } | undefined;
              setError(native?.error || "Image decode failed");
            }}
          />
        </Animated.View>
      </GestureDetector>

      <TouchableOpacity
        onPress={handleReset}
        style={styles.resetPill}
        accessibilityLabel="Reset zoom"
      >
        <Text style={styles.resetPillText}>1:1</Text>
      </TouchableOpacity>

      <View style={styles.footer} pointerEvents="none">
        <Text style={styles.footerText} numberOfLines={1}>
          {filename}
          {dims ? `  ·  ${dims.w} × ${dims.h}` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.editorBg,
  },
  imageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.editorBg,
    padding: spacing.lg,
  },
  errorTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: "center",
  },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  errorHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 320,
  },
  resetPill: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  resetPillText: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceElevated + "E6",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
