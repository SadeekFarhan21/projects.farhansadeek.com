import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Keyboard } from "react-native";
import Constants from "expo-constants";
import { normalizeGitFetchUrlKey } from "@/lib/gitFetchUrlKey";
import { getMcpPolicyRepoKey } from "@/lib/mcpRepoKey";
import { Model, defaultModel } from "@/constants/models";

const CLOUD_API_URL =
  (Constants.expoConfig?.extra?.cloudApiUrl as string) ?? "";

export type GitFileStatus = 'modified' | 'untracked' | 'staged' | 'deleted' | 'clean';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  depth: number;
  isExpanded?: boolean;
  gitStatus?: GitFileStatus;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  isStreaming?: boolean;
  thinking?: string;
  isPlan?: boolean;
  planApproved?: boolean;
  toolName?: string;
  toolDiff?: {
    filename: string;
    addedCount: number;
    removedCount: number;
    lines: { type: "added" | "removed"; content: string }[];
    oldContent?: string;
    newContent?: string;
  };
  toolOutput?: string;
  toolPreview?: {
    type: "write_file" | "apply_patch";
    path: string;
    language: string;
    addedCount: number;
    removedCount: number;
    diffLines: { type: "added" | "removed"; content: string }[];
  };
}

export type AgentMode = "plan" | "agent";

export type ActiveTabType = "file" | "browser";

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

interface UISlice {
  fileTreeOpen: boolean;
  toggleFileTree: () => void;
  setFileTreeOpen: (open: boolean) => void;
  terminalPanelOpen: boolean;
  setTerminalPanelOpen: (open: boolean) => void;
  terminalExpanded: boolean;
  setTerminalExpanded: (expanded: boolean) => void;
  modelPickerOpen: boolean;
  setModelPickerOpen: (open: boolean) => void;
  isAgentChatOpen: boolean;
  setAgentChatOpen: (open: boolean) => void;
  isEditingCode: boolean;
  setIsEditingCode: (editing: boolean) => void;
  contextMenuTarget: FileNode | null;
  setContextMenuTarget: (node: FileNode | null) => void;
  agentMode: AgentMode;
  setAgentMode: (mode: AgentMode) => void;
  activeTabType: ActiveTabType;
  setActiveTabType: (type: ActiveTabType) => void;
  floatingPillHeight: number;
  setFloatingPillHeight: (h: number) => void;
  agentBarHeight: number;
  setAgentBarHeight: (h: number) => void;
  pillKeyboardActive: boolean;
  setPillKeyboardActive: (v: boolean) => void;
  markdownPreviewOpen: boolean;
  setMarkdownPreviewOpen: (open: boolean) => void;
  toggleMarkdownPreview: () => void;
}

interface BrowserSlice {
  browserTabs: BrowserTab[];
  activeBrowserTabId: string | null;
  addBrowserTab: (url: string) => void;
  removeBrowserTab: (id: string) => void;
  setActiveBrowserTab: (id: string) => void;
  patchBrowserTab: (id: string, patch: Partial<BrowserTab>) => void;
  clearBrowserTabs: () => void;
}

interface FileSlice {
  currentFilePath: string | null;
  currentFileName: string;
  currentFileContent: string;
  /** Open editor tabs (paths); order preserved. */
  openTabPaths: string[];
  fileTree: FileNode[];
  projectRoot: string;
  setCurrentFile: (path: string, name: string, content: string) => void;
  removeOpenTabPath: (path: string) => void;
  clearCurrentFile: () => void;
  updateContent: (content: string) => void;
  setFileTree: (tree: FileNode[]) => void;
  setProjectRoot: (root: string) => void;
  editBuffer: string;
  setEditBuffer: (content: string) => void;
  expandedFolders: string[];
  toggleFolderExpanded: (path: string) => void;
  setAllFoldersCollapsed: () => void;
  inlineEditPath: string | null;
  setInlineEditPath: (path: string | null) => void;
  inlineCreateParent: string | null;
  inlineCreateType: 'file' | 'directory' | null;
  setInlineCreate: (parent: string | null, type: 'file' | 'directory' | null) => void;
  /** In-memory content cache keyed by path — makes tab switches instant. */
  tabContents: Record<string, string>;
  setTabContent: (path: string, content: string) => void;
  clearTabContent: (path: string) => void;
}

export type EditorDiagnostic = {
  line: number;
  col: number;
  message: string;
  severity: "error" | "warning";
};

interface AgentSlice {
  selectedModel: Model;
  setSelectedModel: (model: Model) => void;
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  setMessageStreaming: (id: string, streaming: boolean) => void;
  patchMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  agentInputText: string;
  setAgentInputText: (text: string) => void;
  agentStatus: string | null;
  setAgentStatus: (status: string | null) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  activeAgentFile: string | null;
  setActiveAgentFile: (path: string | null) => void;
  agentStepCount: number;
  setAgentStepCount: (n: number) => void;
  agentThinkingStartedAt: number | null;
  setAgentThinkingStartedAt: (ts: number | null) => void;
  contextTokensUsed: number;
  setContextTokensUsed: (n: number) => void;
}

interface GitSlice {
  currentBranch: string;
  setCurrentBranch: (branch: string) => void;
  gitStatus: string[];
  setGitStatus: (status: string[]) => void;
  repoName: string;
  setRepoName: (name: string) => void;
  gitFileStatuses: Record<string, GitFileStatus>;
  setGitFileStatuses: (statuses: Record<string, GitFileStatus>) => void;
}

export interface TerminalTab {
  id: string;
  label: string;
}

interface TerminalSlice {
  terminalOutput: string[];
  appendTerminalOutput: (line: string, id?: string) => void;
  clearTerminal: (id?: string) => void;
  terminalTabs: TerminalTab[];
  activeTerminalId: string;
  terminalOutputs: Record<string, string[]>;
  addTerminalTab: () => void;
  removeTerminalTab: (id: string) => void;
  setActiveTerminalId: (id: string) => void;
}

interface OnboardingSlice {
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
}

interface DiffSlice {
  currentDiff: Record<number, 'added' | 'removed'>;
  setDiff: (diff: Record<number, 'added' | 'removed'>) => void;
  clearDiff: () => void;
}

export type CodeFontSizeOption = 'small' | 'medium' | 'large';

export const codeFontSizeValues: Record<CodeFontSizeOption, number> = {
  small: 12,
  medium: 14,
  large: 18,
};

export type TerminalFontSizeOption = "small" | "medium" | "large";

export const terminalFontSizeValues: Record<TerminalFontSizeOption, number> = {
  small: 12,
  medium: 14,
  large: 16,
};

interface PreferencesSlice {
  codeFontSize: CodeFontSizeOption;
  setCodeFontSize: (size: CodeFontSizeOption) => void;
  terminalFontSize: TerminalFontSizeOption;
  setTerminalFontSize: (size: TerminalFontSizeOption) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  /** Cloud: before session ends, commit+push to `treena/<date>-<session>` (opt-in). */
  autoSaveBranchOnSessionEnd: boolean;
  setAutoSaveBranchOnSessionEnd: (value: boolean) => void;
  /** Use the custom native code editor (UITextView/EditText) instead of the TextInput-overlay editor. */
  experimentalNativeEditor: boolean;
  setExperimentalNativeEditor: (value: boolean) => void;
}

/** Cloud workspace (Phase 0): flags + stub transport; Phase 1+: real WebSocket. */
interface RemoteDiagnosticsSlice {
  remoteDiagnosticsByPath: Record<string, EditorDiagnostic[]>;
  setRemoteDiagnosticsForPath: (relPath: string, diags: EditorDiagnostic[]) => void;
}

export type CloudSessionStatus = "idle" | "provisioning" | "ready" | "stopping" | "stopped" | "failed";

interface CloudSessionSlice {
  cloudSessionId: string | null;
  cloudSessionStatus: CloudSessionStatus;
  cloudSessionError: string | null;
  cloudSessionRepoUrl: string | null;
  /** GitHub REST `repository.id` when resolved (rename-safe MCP policy key). */
  cloudSessionGithubRepoId: number | null;
  cloudSessionBridgeToken: string | null;
  cloudSessionWsUrl: string | null;
  /** Fargate task public IP; used to open http://localhost:PORT from terminal in-app browser. */
  cloudSessionPublicIp: string | null;
  cloudApiBaseUrl: string;
  setCloudSession: (partial: Partial<Pick<CloudSessionSlice,
    'cloudSessionId' | 'cloudSessionStatus' | 'cloudSessionError' |
    'cloudSessionRepoUrl' | 'cloudSessionGithubRepoId' |
    'cloudSessionBridgeToken' | 'cloudSessionWsUrl' |
    'cloudSessionPublicIp'
  >>) => void;
  clearCloudSession: () => void;
  setCloudApiBaseUrl: (url: string) => void;
}

/** Fly Machines per-user runtime (post-migration). Persisted across app kill. */
export type UserMachineState =
  | "creating"
  | "starting"
  | "started"
  | "stopping"
  | "stopped"
  | "hibernated"
  | "destroyed"
  | "failed";

interface UserMachineSlice {
  userMachineId: string | null;
  userMachineState: UserMachineState | null;
  /** wss://treena-bridge.fly.dev?machine=<id>&token=<bridgeToken> */
  userMachineWsUrl: string | null;
  userMachineBridgeToken: string | null;
  userMachineRegion: string | null;
  /** Sent on the WS upgrade as `fly-force-instance-id` to pin routing. */
  userMachineFlyForceInstanceId: string | null;
  setUserMachine: (partial: Partial<Pick<UserMachineSlice,
    'userMachineId' | 'userMachineState' | 'userMachineWsUrl' |
    'userMachineBridgeToken' | 'userMachineRegion' | 'userMachineFlyForceInstanceId'
  >>) => void;
  clearUserMachine: () => void;
}

/** Day 6.2 — runtime prep state for the Fly-path repo-open flow. Driven by
 *  triggerRepoOpen (lib/userMachine.ts) and useRepoSetupListener (hooks).
 *  Read by RepoSetupDrawer in app/index.tsx. NOT persisted across app kill —
 *  on rehydrate, the bridge will resume any in-flight setup and re-emit
 *  pushes; the listener picks up from there. */
export type RepoSetupPhase =
  | "idle"
  | "unset"
  | "cloning"
  | "installing"
  | "ready"
  | "failed";

interface RepoSetupSlice {
  repoSetupPhase: RepoSetupPhase;
  repoSetupMessage: string;
  repoSetupError: string | null;
  repoSetupActiveRepoUrl: string | null;
  repoSetupActiveBranch: string | null;
  /** True when "ready" reached but at least one ecosystem installer failed. */
  repoSetupPartial: boolean;
  setRepoSetup: (partial: Partial<Pick<RepoSetupSlice,
    'repoSetupPhase' | 'repoSetupMessage' | 'repoSetupError' |
    'repoSetupActiveRepoUrl' | 'repoSetupActiveBranch' | 'repoSetupPartial'
  >>) => void;
  resetRepoSetup: () => void;
}

export interface McpToolInfo {
  name: string;
  description: string;
  namespacedName: string;
  parameters: object;
}

export interface McpServerInfo {
  name: string;
  status: "connected" | "error" | "starting";
  tools: McpToolInfo[];
  error?: string;
}

interface McpSlice {
  mcpServers: Record<string, McpServerInfo>;
  setMcpServers: (servers: Record<string, McpServerInfo>) => void;
  /** Cursor-shaped `mcp.json` body as a string (default `{ "mcpServers": {} }`). */
  mcpCatalogJson: string;
  setMcpCatalogJson: (json: string) => void;
  /** Per stable repo key: enabled MCP server names. Missing key => no servers enabled for that repo. */
  mcpRepoPolicy: Record<string, string[]>;
  setMcpRepoPolicy: (policy: Record<string, string[]>) => void;
  setMcpServerEnabledForCurrentRepo: (serverName: string, enabled: boolean) => void;
}

interface WorkspaceSlice {
  remoteWorkspaceEnabled: boolean;
  setRemoteWorkspaceEnabled: (enabled: boolean) => void;
  remoteWorkspaceWsUrl: string;
  setRemoteWorkspaceWsUrl: (url: string) => void;
  /** Phase 6: optional shared secret; appended as `?token=` (not stored inside URL field). */
  workspaceBridgeToken: string;
  setWorkspaceBridgeToken: (token: string) => void;
  /** Phase 6: HS256 JWT for `session.auth` when bridge sets JWT_SECRET. */
  workspaceSessionJwt: string;
  setWorkspaceSessionJwt: (jwt: string) => void;
  /** Phase 7+: PAT keyed by normalized git remote fetch URL (see gitRemotePat). */
  remoteGithubPatByFetchUrl: Record<string, string>;
  setRemoteGithubPatByFetchUrlFromLines: (lines: string) => void;
  /** Phase 7a: GitHub PAT per bridge (key from workspaceAuthKey). */
  remoteGithubPatByKey: Record<string, string>;
  setRemoteGithubPatForBridgeKey: (key: string, pat: string) => void;
  /** Bridge-first boot: clone progress for cloud sessions. Set by the bridge via workspace.status push. */
  workspaceStatus: "empty" | "cloning" | "ready" | "error";
  workspaceCloneError: string | null;
  setWorkspaceStatus: (
    status: "empty" | "cloning" | "ready" | "error",
    error?: string | null
  ) => void;
  /**
   * Day 6.5: per-machine active repo dir name (e.g. "carbonIQ-vercel"). When
   * set, mobile appends `?activeRepoDir=<name>` to the WS connect URL so the
   * bridge scopes path ops, pty cwd, LSP, file watcher, and agent tools to
   * `/workspace/<name>`. When null, mobile doesn't send the param → bridge
   * uses legacy fallback (volume-root scope; bug 1 visible). Persisted via
   * `partialize` so the value survives iOS app kill.
   *
   * Source: bridge sends `repoName` in every `repo.setup` push (single source
   * of truth via `server/cloud/repoNames.mjs`); mobile also reads it from the
   * `/repos/open` API response. Mobile never derives it locally.
   */
  currentRepoDir: string | null;
  setCurrentRepoDir: (name: string | null) => void;
}

type AppState = UISlice &
  FileSlice &
  AgentSlice &
  GitSlice &
  TerminalSlice &
  OnboardingSlice &
  DiffSlice &
  PreferencesSlice &
  RemoteDiagnosticsSlice &
  WorkspaceSlice &
  CloudSessionSlice &
  UserMachineSlice &
  RepoSetupSlice &
  BrowserSlice &
  McpSlice;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
  // UI
  fileTreeOpen: false,
  toggleFileTree: () => {
    const opening = !get().fileTreeOpen;
    if (opening) Keyboard.dismiss();
    set({
      fileTreeOpen: opening,
      ...(opening
        ? { terminalPanelOpen: false, terminalExpanded: false, isAgentChatOpen: false }
        : {}),
    });
  },
  setFileTreeOpen: (open) => {
    if (open) Keyboard.dismiss();
    set({
      fileTreeOpen: open,
      ...(open
        ? { terminalPanelOpen: false, terminalExpanded: false, isAgentChatOpen: false }
        : {}),
    });
  },
  terminalPanelOpen: false,
  setTerminalPanelOpen: (open) => {
    if (open) Keyboard.dismiss();
    set({
      terminalPanelOpen: open,
      ...(open ? {} : { terminalExpanded: false }),
      ...(open ? { isAgentChatOpen: false, fileTreeOpen: false } : {}),
    });
  },
  terminalExpanded: false,
  setTerminalExpanded: (expanded) => set({ terminalExpanded: expanded }),
  modelPickerOpen: false,
  setModelPickerOpen: (open) => set({ modelPickerOpen: open }),
  isAgentChatOpen: false,
  setAgentChatOpen: (open) => {
    if (open) Keyboard.dismiss();
    set({
      isAgentChatOpen: open,
      ...(open
        ? { terminalPanelOpen: false, terminalExpanded: false, fileTreeOpen: false }
        : {}),
    });
  },
  isEditingCode: false,
  setIsEditingCode: (editing) => set({ isEditingCode: editing }),
  contextMenuTarget: null,
  setContextMenuTarget: (node) => set({ contextMenuTarget: node }),
  agentMode: "agent",
  setAgentMode: (mode) => set({ agentMode: mode }),
  activeTabType: "file",
  setActiveTabType: (type) => set({ activeTabType: type }),
  floatingPillHeight: 90,
  setFloatingPillHeight: (h) =>
    set((s) => (s.floatingPillHeight === h ? s : { floatingPillHeight: h })),
  agentBarHeight: 0,
  setAgentBarHeight: (h) =>
    set((s) => (s.agentBarHeight === h ? s : { agentBarHeight: h })),
  pillKeyboardActive: false,
  setPillKeyboardActive: (v) =>
    set((s) => (s.pillKeyboardActive === v ? s : { pillKeyboardActive: v })),
  markdownPreviewOpen: false,
  setMarkdownPreviewOpen: (open) => set({ markdownPreviewOpen: open }),
  toggleMarkdownPreview: () =>
    set((s) => ({ markdownPreviewOpen: !s.markdownPreviewOpen })),

  // Files
  currentFilePath: null,
  currentFileName: "untitled.ts",
  currentFileContent: "",
  openTabPaths: [],
  fileTree: [],
  projectRoot: "",
  setCurrentFile: (path, name, content) =>
    set((s) => ({
      currentFilePath: path,
      currentFileName: name,
      currentFileContent: content,
      activeTabType: "file" as const,
      openTabPaths: s.openTabPaths.includes(path)
        ? s.openTabPaths
        : [...s.openTabPaths, path],
    })),
  removeOpenTabPath: (path) =>
    set((s) => {
      const next = { ...s.tabContents };
      delete next[path];
      return {
        openTabPaths: s.openTabPaths.filter((p) => p !== path),
        tabContents: next,
      };
    }),
  clearCurrentFile: () =>
    set({
      currentFilePath: null,
      currentFileName: "untitled.ts",
      currentFileContent: "",
      openTabPaths: [],
      editBuffer: "",
      inlineEditPath: null,
      inlineCreateParent: null,
      inlineCreateType: null,
      currentDiff: {},
      tabContents: {},
    }),
  updateContent: (content) => set({ currentFileContent: content }),
  setFileTree: (tree) => set({ fileTree: tree }),
  setProjectRoot: (root) => set({ projectRoot: root }),
  editBuffer: "",
  setEditBuffer: (content) => set({ editBuffer: content }),
  expandedFolders: [],
  toggleFolderExpanded: (path) =>
    set((s) => ({
      expandedFolders: s.expandedFolders.includes(path)
        ? s.expandedFolders.filter((p) => p !== path)
        : [...s.expandedFolders, path],
    })),
  setAllFoldersCollapsed: () => set({ expandedFolders: [] }),
  inlineEditPath: null,
  setInlineEditPath: (path) => set({ inlineEditPath: path }),
  inlineCreateParent: null,
  inlineCreateType: null,
  setInlineCreate: (parent, type) =>
    set({ inlineCreateParent: parent, inlineCreateType: type }),
  tabContents: {},
  setTabContent: (path, content) =>
    set((s) => ({ tabContents: { ...s.tabContents, [path]: content } })),
  clearTabContent: (path) =>
    set((s) => {
      if (!(path in s.tabContents)) return s;
      const next = { ...s.tabContents };
      delete next[path];
      return { tabContents: next };
    }),

  // Agent
  selectedModel: defaultModel,
  setSelectedModel: (model) => set({ selectedModel: model }),
  messages: [],
  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),
  updateLastMessage: (content) =>
    set((s) => {
      const msgs = [...s.messages];
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
      }
      return { messages: msgs };
    }),
  setMessageStreaming: (id, streaming) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, isStreaming: streaming } : m
      ),
    })),
  patchMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  clearMessages: () => set({ messages: [] }),
  isGenerating: false,
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  agentInputText: "",
  setAgentInputText: (text) => set({ agentInputText: text }),
  agentStatus: null,
  setAgentStatus: (status) => set({ agentStatus: status }),
  apiKey: "",
  setApiKey: (key) => set({ apiKey: key }),
  githubToken: "",
  setGithubToken: (token) => set({ githubToken: token }),
  activeAgentFile: null,
  setActiveAgentFile: (path) => set({ activeAgentFile: path }),
  agentStepCount: 0,
  setAgentStepCount: (n) => set({ agentStepCount: n }),
  agentThinkingStartedAt: null,
  setAgentThinkingStartedAt: (ts) => set({ agentThinkingStartedAt: ts }),
  contextTokensUsed: 0,
  setContextTokensUsed: (n) => set({ contextTokensUsed: n }),

  // Git
  currentBranch: "main",
  setCurrentBranch: (branch) => set({ currentBranch: branch }),
  gitStatus: [],
  setGitStatus: (status) => set({ gitStatus: status }),
  repoName: "treena",
  setRepoName: (name) => set({ repoName: name }),
  gitFileStatuses: {},
  setGitFileStatuses: (statuses) => set({ gitFileStatuses: statuses }),

  // Terminal
  terminalOutput: [],
  terminalTabs: [{ id: "t1", label: "1" }],
  activeTerminalId: "t1",
  terminalOutputs: { t1: [] },
  appendTerminalOutput: (line, id) =>
    set((s) => {
      const tid = id ?? s.activeTerminalId;
      const prev = s.terminalOutputs[tid] ?? [];
      const next = [...prev, line];
      return { terminalOutputs: { ...s.terminalOutputs, [tid]: next } };
    }),
  clearTerminal: (id) =>
    set((s) => {
      const tid = id ?? s.activeTerminalId;
      return { terminalOutputs: { ...s.terminalOutputs, [tid]: [] } };
    }),
  addTerminalTab: () =>
    set((s) => {
      const ids = new Set(s.terminalTabs.map((t) => t.id));
      let n = s.terminalTabs.length + 1;
      while (ids.has(`t${n}`)) n++;
      const newId = `t${n}`;
      return {
        terminalTabs: [...s.terminalTabs, { id: newId, label: String(n) }],
        terminalOutputs: { ...s.terminalOutputs, [newId]: [] },
        activeTerminalId: newId,
      };
    }),
  removeTerminalTab: (id) =>
    set((s) => {
      if (s.terminalTabs.length <= 1) return {};
      const newTabs = s.terminalTabs.filter((t) => t.id !== id);
      const newOutputs = { ...s.terminalOutputs };
      delete newOutputs[id];
      const newActiveId =
        s.activeTerminalId === id
          ? newTabs[newTabs.length - 1]!.id
          : s.activeTerminalId;
      return {
        terminalTabs: newTabs,
        terminalOutputs: newOutputs,
        activeTerminalId: newActiveId,
      };
    }),
  setActiveTerminalId: (id) => set({ activeTerminalId: id }),

  // Onboarding
  hasCompletedOnboarding: false,
  setHasCompletedOnboarding: (completed) =>
    set({ hasCompletedOnboarding: completed }),

  // Diff
  currentDiff: {},
  setDiff: (diff) => set({ currentDiff: diff }),
  clearDiff: () => set({ currentDiff: {} }),

  // Preferences
  codeFontSize: 'medium',
  setCodeFontSize: (size) => set({ codeFontSize: size }),
  terminalFontSize: "medium",
  setTerminalFontSize: (size) => set({ terminalFontSize: size }),
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  autoSaveBranchOnSessionEnd: false,
  setAutoSaveBranchOnSessionEnd: (value) =>
    set({ autoSaveBranchOnSessionEnd: value }),
  experimentalNativeEditor: false,
  setExperimentalNativeEditor: (value) =>
    set({ experimentalNativeEditor: value }),

  // Workspace (remote engine — Phase 0)
  remoteWorkspaceEnabled: false,
  setRemoteWorkspaceEnabled: (enabled) =>
    set({ remoteWorkspaceEnabled: enabled }),
  remoteWorkspaceWsUrl: "",
  setRemoteWorkspaceWsUrl: (url) => set({ remoteWorkspaceWsUrl: url }),
  workspaceBridgeToken: "",
  setWorkspaceBridgeToken: (token) => set({ workspaceBridgeToken: token }),
  workspaceSessionJwt: "",
  setWorkspaceSessionJwt: (jwt) => set({ workspaceSessionJwt: jwt }),
  remoteGithubPatByFetchUrl: {},
  setRemoteGithubPatByFetchUrlFromLines: (text) => {
    const next: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const sp = t.split(/\s+/);
      if (sp.length < 2) continue;
      const url = sp[0];
      const pat = sp.slice(1).join(" ");
      const key = normalizeGitFetchUrlKey(url);
      if (key && pat.trim()) next[key] = pat.trim();
    }
    set({ remoteGithubPatByFetchUrl: next });
  },
  remoteGithubPatByKey: {},
  setRemoteGithubPatForBridgeKey: (key, pat) =>
    set((s) => {
      const next = { ...s.remoteGithubPatByKey };
      const k = key.trim();
      if (!k) return {};
      const p = pat.trim();
      if (p) next[k] = p;
      else delete next[k];
      return { remoteGithubPatByKey: next };
    }),
  workspaceStatus: "ready",
  workspaceCloneError: null,
  setWorkspaceStatus: (status, error = null) =>
    set({ workspaceStatus: status, workspaceCloneError: error ?? null }),
  currentRepoDir: null,
  setCurrentRepoDir: (name) => set({ currentRepoDir: name || null }),
  remoteDiagnosticsByPath: {},
  setRemoteDiagnosticsForPath: (relPath, diags) =>
    set((s) => ({
      remoteDiagnosticsByPath: { ...s.remoteDiagnosticsByPath, [relPath]: diags },
    })),

  // Browser
  browserTabs: [],
  activeBrowserTabId: null,
  addBrowserTab: (url) =>
    set((s) => {
      const existing = s.browserTabs.find((t) => t.url === url);
      if (existing) {
        return { activeBrowserTabId: existing.id, activeTabType: "browser" as const };
      }
      const id = `b_${Date.now()}`;
      let title = "";
      try { title = new URL(url).hostname; } catch { title = url; }
      const tab: BrowserTab = { id, url, title, isLoading: true, canGoBack: false, canGoForward: false };
      return {
        browserTabs: [...s.browserTabs, tab],
        activeBrowserTabId: id,
        activeTabType: "browser" as const,
      };
    }),
  removeBrowserTab: (id) =>
    set((s) => {
      const newTabs = s.browserTabs.filter((t) => t.id !== id);
      let newActiveId = s.activeBrowserTabId;
      let newTabType = s.activeTabType;
      if (s.activeBrowserTabId === id) {
        if (newTabs.length > 0) {
          newActiveId = newTabs[newTabs.length - 1]!.id;
        } else {
          newActiveId = null;
          newTabType = "file" as const;
        }
      }
      return { browserTabs: newTabs, activeBrowserTabId: newActiveId, activeTabType: newTabType };
    }),
  setActiveBrowserTab: (id) =>
    set({ activeBrowserTabId: id, activeTabType: "browser" as const }),
  patchBrowserTab: (id, patch) =>
    set((s) => ({
      browserTabs: s.browserTabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  clearBrowserTabs: () =>
    set({ browserTabs: [], activeBrowserTabId: null }),

  // Cloud Session
  cloudSessionId: null,
  cloudSessionStatus: "idle",
  cloudSessionError: null,
  cloudSessionRepoUrl: null,
  cloudSessionGithubRepoId: null,
  cloudSessionBridgeToken: null,
  cloudSessionWsUrl: null,
  cloudSessionPublicIp: null,
  cloudApiBaseUrl: CLOUD_API_URL,
  setCloudSession: (partial) => set((s) => ({ ...s, ...partial })),
  clearCloudSession: () =>
    set({
      cloudSessionId: null,
      cloudSessionStatus: "idle",
      cloudSessionError: null,
      cloudSessionRepoUrl: null,
      cloudSessionGithubRepoId: null,
      cloudSessionBridgeToken: null,
      cloudSessionWsUrl: null,
      cloudSessionPublicIp: null,
    }),
  setCloudApiBaseUrl: (url) => set({ cloudApiBaseUrl: url }),

  // User Machine (Fly path — persistent per-user machine)
  userMachineId: null,
  userMachineState: null,
  userMachineWsUrl: null,
  userMachineBridgeToken: null,
  userMachineRegion: null,
  userMachineFlyForceInstanceId: null,
  setUserMachine: (partial) => set((s) => ({ ...s, ...partial })),
  clearUserMachine: () =>
    set({
      userMachineId: null,
      userMachineState: null,
      userMachineWsUrl: null,
      userMachineBridgeToken: null,
      userMachineRegion: null,
      userMachineFlyForceInstanceId: null,
    }),

  // Repo Setup (Fly path — runtime-only, NOT persisted)
  repoSetupPhase: "idle",
  repoSetupMessage: "",
  repoSetupError: null,
  repoSetupActiveRepoUrl: null,
  repoSetupActiveBranch: null,
  repoSetupPartial: false,
  setRepoSetup: (partial) => set((s) => ({ ...s, ...partial })),
  resetRepoSetup: () =>
    set({
      repoSetupPhase: "idle",
      repoSetupMessage: "",
      repoSetupError: null,
      repoSetupActiveRepoUrl: null,
      repoSetupActiveBranch: null,
      repoSetupPartial: false,
    }),

  // MCP
  mcpServers: {},
  setMcpServers: (servers) => set({ mcpServers: servers }),
  mcpCatalogJson: '{\n  "mcpServers": {}\n}',
  setMcpCatalogJson: (json) => set({ mcpCatalogJson: json }),
  mcpRepoPolicy: {},
  setMcpRepoPolicy: (policy) => set({ mcpRepoPolicy: policy }),
  setMcpServerEnabledForCurrentRepo: (serverName, enabled) => {
    const s = get();
    let parsed: { mcpServers?: Record<string, unknown> };
    try {
      parsed = JSON.parse(s.mcpCatalogJson || "{}") as {
        mcpServers?: Record<string, unknown>;
      };
    } catch {
      return;
    }
    const repoKey = getMcpPolicyRepoKey({
      cloudSessionRepoUrl: s.cloudSessionRepoUrl,
      cloudSessionGithubRepoId: s.cloudSessionGithubRepoId,
      repoName: s.repoName,
      remoteWorkspaceEnabled: s.remoteWorkspaceEnabled,
      remoteWorkspaceWsUrl: s.remoteWorkspaceWsUrl,
    });
    const next = { ...s.mcpRepoPolicy };
    let cur =
      next[repoKey] !== undefined ? [...next[repoKey]!] : [];
    if (enabled) {
      if (!cur.includes(serverName)) cur.push(serverName);
    } else {
      cur = cur.filter((x) => x !== serverName);
    }
    next[repoKey] = cur;
    set({ mcpRepoPolicy: next });
  },
    }),
    {
      // Phase 3C: persist a curated subset of state across app launches so the
      // user's chat history, preferences, and onboarding flag survive a
      // force-close. Live-session state (cloud session ID, ws URL, file tree,
      // git status, etc.) is intentionally excluded — it's re-fetched on
      // reconnect so persisting it would just stale-rehydrate.
      name: "treena-store-v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (s) => ({
        // Chat — strip transient streaming flag while persisting.
        messages: s.messages.map((m) => ({ ...m, isStreaming: false })),
        agentMode: s.agentMode,
        agentStepCount: s.agentStepCount,
        contextTokensUsed: s.contextTokensUsed,
        // Preferences
        selectedModel: s.selectedModel,
        codeFontSize: s.codeFontSize,
        terminalFontSize: s.terminalFontSize,
        autoSaveBranchOnSessionEnd: s.autoSaveBranchOnSessionEnd,
        experimentalNativeEditor: s.experimentalNativeEditor,
        // Onboarding
        hasCompletedOnboarding: s.hasCompletedOnboarding,
        // MCP
        mcpCatalogJson: s.mcpCatalogJson,
        mcpRepoPolicy: s.mcpRepoPolicy,
        // Fly per-user machine — persisted so the machine survives an iOS app kill.
        // CloudSessionSlice is intentionally NOT persisted (legacy ephemeral model).
        userMachineId: s.userMachineId,
        userMachineState: s.userMachineState,
        userMachineWsUrl: s.userMachineWsUrl,
        userMachineBridgeToken: s.userMachineBridgeToken,
        userMachineRegion: s.userMachineRegion,
        userMachineFlyForceInstanceId: s.userMachineFlyForceInstanceId,
        // Day 6.5: persist active repo dir across iOS app kill so the next
        // WS connect re-scopes to the same repo without re-prompting setup.
        currentRepoDir: s.currentRepoDir,
      }),
      // Defensive: zero any transient flags that might have slipped through.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.isGenerating) state.isGenerating = false;
        if (state.agentStatus) state.agentStatus = "";
      },
    }
  )
);
