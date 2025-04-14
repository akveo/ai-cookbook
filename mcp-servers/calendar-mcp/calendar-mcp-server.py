from mcp.server.fastmcp import FastMCP
import argparse
import json

parser = argparse.ArgumentParser(description='Calendar MCP Server')
parser.add_argument('transport', nargs='?', default='stdio', choices=['stdio', 'sse'],
                    help='Transport protocol (stdio or sse)')
args = parser.parse_args()

mcp = FastMCP("Calendar MCP Server", port=3002)


@mcp.tool()
def create_event(name: str, date: str) -> str:
    """Create an event"""
    return f"Event {name} created at {date}"


@mcp.tool()
def list_events() -> str:
    """List all events"""
    return json.dumps([
        {"name": "Do groceries", "date": "2025-04-12"},
        {"name": "Pay bills", "date": "2025-04-13"},
        {"name": "Plan trip to Europe", "date": "2025-04-14"},
    ])


if __name__ == "__main__":
    print(f"Starting Calendar MCP server with transport: {args.transport}")
    mcp.run(transport=args.transport)
