import WebSocket, { WebSocketServer } from "ws";
import pty from "node-pty";
import os from "os";

// Create WebSocket server
const wss = new WebSocketServer({ port: 3001 });
console.log("Terminal server running on port 3001");

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Default shell based on OS
  const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
  let ptyProcess = null;
  let cols = 80;
  let rows = 24;

  // Start shell process using node-pty
  const startShell = () => {
    console.log(`Starting ${shell} process`);
    ptyProcess = pty.spawn(shell, [], {
      name: "xterm-color",
      cols: cols,
      rows: rows,
      cwd: process.cwd(),
      env: process.env,
    });

    // Forward terminal output to client
    ptyProcess.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "output", content: data }));
        console.log(`PTY -> WS: ${data.length} bytes`);
      }
    });

    ptyProcess.onExit((exitCode) => {
      console.log(`Shell process exited with code ${exitCode}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "output",
            content: `\r\nProcess exited with code ${exitCode}. Restarting shell...\r\n`,
          })
        );
        // Restart shell
        startShell();
      }
    });
  };

  // Start the shell immediately
  startShell();

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log("Received message:", data);

      if (!ptyProcess) {
        console.log("No PTY process available, starting new one");
        startShell();
        return;
      }

      if (data.type === "key") {
        // Handle single key press
        ptyProcess.write(data.key);
        console.log(
          `WS -> PTY: Key "${data.key
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")}"`
        );
      } else if (data.type === "paste") {
        // Handle paste event
        ptyProcess.write(data.data);
        console.log(`WS -> PTY: Paste ${data.data.length} bytes`);
      } else if (data.type === "SIGINT") {
        // Handle Ctrl+C
        ptyProcess.write("\x03");
        console.log("WS -> PTY: SIGINT (Ctrl+C)");
      } else if (data.type === "resize") {
        // Handle terminal resize
        cols = data.cols;
        rows = data.rows;
        ptyProcess.resize(cols, rows);
        console.log(`Terminal resized to ${cols}x${rows}`);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    if (ptyProcess) {
      ptyProcess.kill();
      ptyProcess = null;
    }
  });
});
