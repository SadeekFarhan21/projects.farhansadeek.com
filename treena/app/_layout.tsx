import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
import * as SplashScreen from "expo-splash-screen";
import { colors } from "@/constants/theme";
import { useStore } from "@/store";
import { useUserMachine } from "@/hooks/useUserMachine";
import { useRemoteWorkspaceConnection } from "@/hooks/useRemoteWorkspaceConnection";
import { useRepoSetupListener } from "@/hooks/useRepoSetup";
import { triggerRepoOpen } from "@/lib/userMachine";
import RepoSetupDrawer from "@/components/RepoSetupDrawer";

WebBrowser.maybeCompleteAuthSession();
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  // Persistent Fly-mode hooks — mounted at the root so polling, WS bootstrap,
  // and bridge push subscriptions survive route changes (login → onboarding →
  // projects → IDE). Mounting these inside an individual screen breaks the
  // wake/connect chain because the screen unmounts before the machine reaches
  // state="started". All three early-return when EXPO_PUBLIC_USE_FLY != true.
  useUserMachine();
  useRemoteWorkspaceConnection();
  useRepoSetupListener();

  const repoSetupPhase = useStore((s) => s.repoSetupPhase);
  const repoSetupMessage = useStore((s) => s.repoSetupMessage);
  const repoSetupError = useStore((s) => s.repoSetupError);
  const repoSetupActiveRepoUrl = useStore((s) => s.repoSetupActiveRepoUrl);
  const repoSetupActiveBranch = useStore((s) => s.repoSetupActiveBranch);
  const resetRepoSetup = useStore((s) => s.resetRepoSetup);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="projects" />
        <Stack.Screen name="mcp-settings" />
      </Stack>
      <RepoSetupDrawer
        phase={repoSetupPhase}
        message={repoSetupMessage}
        error={repoSetupError}
        onDismiss={resetRepoSetup}
        onRetry={
          repoSetupActiveRepoUrl
            ? () => {
                void triggerRepoOpen(
                  repoSetupActiveRepoUrl,
                  repoSetupActiveBranch
                );
              }
            : undefined
        }
      />
    </GestureHandlerRootView>
  );
}
