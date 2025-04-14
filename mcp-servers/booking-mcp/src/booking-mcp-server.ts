import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function createServer() {
  const server = new McpServer({
    name: "BookingMCPServer",
    version: "1.0.0"
  });

  server.tool("make_reservation",
    { hotel_name: z.string(), start_date: z.string(), end_date: z.string() },
    async ({ hotel_name, start_date, end_date }) => {

      return {
        content: [{ type: "text", text: `Reservation made at ${hotel_name} from ${start_date} to ${end_date}` }]
      }
    }
  );

  server.tool("get_user_reservations",
    {},
    async () => {

      const reservations = [
        { hotel_name: "Spa Resort", start_date: new Date("2024-01-01"), end_date: new Date("2024-01-03") },
        { hotel_name: "Grand Hotel", start_date: new Date("2024-01-04"), end_date: new Date("2024-01-06") }
      ]

      return {
        content: [{ type: "text", text: `${JSON.stringify(reservations)}` }]
      }
    }
  );

  server.tool("get_hotels",
    {},
    async () => {

      const hotels = [
        { name: "Spa Resort", location: "Maldives" },
        { name: "Grand Hotel", location: "Paris" },
        { name: "Marriott", location: "New York" },
        { name: "Hilton", location: "Los Angeles" }
      ]

      return {
        content: [{ type: "text", text: `${JSON.stringify(hotels)}` }]
      }
    }
  );

  return server;
} 