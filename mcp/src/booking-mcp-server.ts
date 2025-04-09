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

      // Simulate API or database calls to make a reservation
      await new Promise(resolve => setTimeout(resolve, 500))

      return {
        content: [{ type: "text", text: `Reservation made at ${hotel_name} from ${start_date} to ${end_date}` }]
      }
    }
  );

  server.tool("get_user_reservations",
    { user_id: z.string() },
    async ({ user_id }) => {
      // Simulate API or database calls to get the reservations for the user
      await new Promise(resolve => setTimeout(resolve, 500))

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
      // Simulate API or database calls to get the hotels
      await new Promise(resolve => setTimeout(resolve, 300))

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