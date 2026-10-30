/**
 * remote-terminal.ts — WebSocket client for remote command execution.
 * Connects to the FastAPI backend's /ws/terminal endpoint and streams
 * command output back to the mobile app.
 */

type OutputCallback = (line: string) => void;
type ExitCallback = (code: number) => void;
type ErrorCallback = (error: string) => void;
type ConnectionChangeCallback = (connected: boolean) => void;

interface PendingCommand {
  onOutput: OutputCallback;
  onExit: ExitCallback;
  onError: ErrorCallback;
}

class RemoteTerminal {
  private ws: WebSocket | null = null;
  private url = "";
  private apiKey = "";
  private pendingCommands: Map<string, PendingCommand> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _isConnected = false;
  private onConnectionChange: ConnectionChangeCallback | null = null;
  private commandCounter = 0;

  get isConnected(): boolean {
    return this._isConnected;
  }

  configure(url: string, apiKey: string): void {
    this.url = url;
    this.apiKey = apiKey;
  }

  setOnConnectionChange(cb: ConnectionChangeCallback | null): void {
    this.onConnectionChange = cb;
  }

  connect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (!this.url || !this.apiKey) return;

    // Convert http(s):// to ws(s)://
    let wsUrl = this.url.replace(/^http/, "ws");
    // Ensure it ends with the WebSocket path
    if (!wsUrl.endsWith("/ws/terminal")) {
      wsUrl = wsUrl.replace(/\/+$/, "") + "/ws/terminal";
    }
    wsUrl += `?token=${encodeURIComponent(this.apiKey)}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this._isConnected = true;
      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const pending = this.pendingCommands.get(msg.id);
        if (!pending) return;

        switch (msg.type) {
          case "stdout":
          case "stderr":
            pending.onOutput(msg.data);
            break;
          case "exit":
            pending.onExit(msg.code);
            this.pendingCommands.delete(msg.id);
            break;
          case "error":
            pending.onError(msg.data);
            this.pendingCommands.delete(msg.id);
            break;
        }
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this._isConnected = false;
      this.onConnectionChange?.(false);
      // Reject all pending commands
      for (const [id, pending] of this.pendingCommands) {
        pending.onError("Connection lost");
        this.pendingCommands.delete(id);
      }
      this._tryReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // prevent reconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._isConnected = false;
    this.onConnectionChange?.(false);
  }

  executeRemote(
    command: string,
    onOutput: OutputCallback,
    onExit: ExitCallback,
    onError: ErrorCallback
  ): string {
    const id = `cmd-${++this.commandCounter}`;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      onError("Not connected to remote server");
      return id;
    }

    this.pendingCommands.set(id, { onOutput, onExit, onError });
    this.ws.send(JSON.stringify({ type: "exec", id, command }));
    return id;
  }

  killCommand(id: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "kill", id }));
    }
  }

  private _tryReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }
}

export const remoteTerminal = new RemoteTerminal();
