# Booking MCP Server (TypeScript)

This directory contains a Model Context Protocol (MCP) Booking demo server implementation with two transport protocols:

1. **stdio** - For command-line tools and direct integrations
2. **sse (server-sent events)** - For web-based applications

## Prerequisites

- Project using [Bun](https://bun.sh/) as runtime.

## Installation

```bash
bun install
```

## Running with stdio protocol

Server start is initiated by a MCP client.

## Running with sse protocol

```bash
bun run start
```