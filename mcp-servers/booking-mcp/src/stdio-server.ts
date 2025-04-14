import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./booking-mcp-server.js";

async function main() {
  const server = createServer();

  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(error => {
  console.error("Error starting Booking MCP server:", error);
  process.exit(1);
}); 