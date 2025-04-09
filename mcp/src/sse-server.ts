import express from "express";
import type { Request, Response, RequestHandler } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "./booking-mcp-server.js";

const app = express();
const port = 3001;

// Store active SSE connections
const activeConnections = new Map<string, SSEServerTransport>();

app.use(express.json());

// SSE endpoint for clients to connect
app.get("/sse", async (req: Request, res: Response) => {
  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  console.log("Client is connecting");

  // Create a new SSE transport
  const transport = new SSEServerTransport("/messages", res);
  const sessionId = transport.sessionId;

  // Store the transport
  activeConnections.set(sessionId, transport);

  const server = createServer();

  // Connect the server to the transport
  await server.connect(transport).catch(error => {
    console.error(`Error connecting server to transport ${sessionId}:`, error);
    activeConnections.delete(sessionId);
  });

  // Handle client disconnect
  req.on("close", () => {
    console.log(`Client disconnected: ${sessionId}`);
    activeConnections.delete(sessionId);
  });

  // Send initial connection message
  res.write(`ok`);

  console.log(`Client connected: ${sessionId}`);
});

// Endpoint for clients to send messages
app.post("/messages", (async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId" });
  }

  const transport = activeConnections.get(sessionId);
  if (!transport) {
    return res.status(404).json({ error: "No active connection found for this sessionId" });
  }

  // Handle the message
  await transport.handlePostMessage(req, res, req.body)
    .then(() => res.status(200).json({ success: true }))
    .catch(error => {
      console.error(`Error handling message for session ${sessionId}:`, error);
      res.status(500).json({ error: "Failed to process message" });
    });
}) as RequestHandler);

// Start the server
app.listen(port, () => {
  console.log(`Booking service MCP Server with SSE transport listening on port ${port}`);
});