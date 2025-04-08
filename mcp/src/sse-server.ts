import express from "express";
import type { Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "./booking-mcp-server.js";

const app = express();
const port = 3000;

// Store active SSE connections
const activeConnections = new Map<string, SSEServerTransport>();

app.use(express.json());

// SSE endpoint for clients to connect
app.get("/sse", async (req: Request, res: Response) => {

  const transport = new SSEServerTransport("/messages", res);
  const sessionId = transport.sessionId;

  activeConnections.set(sessionId, transport);

  req.on("close", () => {
    console.log(`Client disconnected: ${sessionId}`);
    activeConnections.delete(sessionId);
  });

  const server = createServer();
  await server.connect(transport).catch(error => {
    console.error(`Error connecting server to transport ${sessionId}:`, error);
    activeConnections.delete(sessionId);
  });
});

// Endpoint for clients to send messages
app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).json({ error: "Missing sessionId or message" });
    return;
  }

  const transport = activeConnections.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: "No active connection found for this sessionId" });
    return;
  }

  // Handle the message
  await transport.handlePostMessage(req, res, req.body)
});

// Start the server
app.listen(port, () => {
  console.log(`Booking MCP Server with SSE transport listening on port ${port}`);
}); 