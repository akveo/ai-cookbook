# MCP Server Implementation

This directory contains a Model Context Protocol (MCP) server implementation with two transport protocols:

1. **stdio** - For command-line tools and direct integrations
2. **SSE (Server-Sent Events)** - For web-based applications

## Prerequisites

- [Bun](https://bun.sh/) runtime
- Node.js dependencies (installed via Bun)

## Installation

```bash
# Install dependencies
bun install
```

## Running the Server

### stdio Transport

The stdio transport is suitable for command-line tools and direct integrations. It communicates via standard input and output.

```bash
# Start the server with stdio transport
bun run start:stdio
```

### SSE Transport

The SSE transport is suitable for web-based applications. It provides an HTTP server with Server-Sent Events (SSE) endpoints.

```bash
# Start the server with SSE transport
bun run start:sse
```