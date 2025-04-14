# Calendar MCP Server (Python)

This directory contains a Model Context Protocol (MCP) Calendar demo server implementation with two transport protocols:

1. **stdio** - For command-line tools and direct integrations
2. **sse (server-sent events)** - For web-based applications

## Prerequisites

- Python 3.13 or higher
- [uv](https://github.com/astral-sh/uv) for dependency management

## Installation

```bash
uv sync
```

## Running with stdio protocol

Server start is initiated by a MCP client.


## Running with sse protocol

```bash
uv run python calendar-mcp-server.py sse
```
