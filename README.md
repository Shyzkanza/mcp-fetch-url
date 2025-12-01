# 🕷️ Scrapidou - Web Scraping Server for ChatGPT

Scrapidou is a clean, modular MCP server for web scraping and URL fetching.

[![Deploy Status](https://github.com/Shyzkanza/mcp-fetch-url/actions/workflows/deploy.yml/badge.svg)](https://github.com/Shyzkanza/mcp-fetch-url/actions/workflows/deploy.yml)
[![npm version](https://img.shields.io/badge/npm-v1.0.3-blue)](https://www.npmjs.com/package/@shyzus/mcp-scrapidou)
[![npm downloads](https://img.shields.io/npm/dm/@shyzus/mcp-scrapidou?cacheSeconds=3600)](https://www.npmjs.com/package/@shyzus/mcp-scrapidou)
[![Website Status](https://img.shields.io/website?url=https%3A%2F%2Fscrapidou.rankorr.red%2Fhealth&label=API)](https://scrapidou.rankorr.red/health)
![Node](https://img.shields.io/badge/node-20%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![MCP](https://img.shields.io/badge/MCP-2025--06--18-orange)
![ChatGPT](https://img.shields.io/badge/ChatGPT-MCP-purple)

---

## ⚠️ Disclaimer

**This project is independent and unofficial.**

- ❌ **Not affiliated** with any scraping service
- ✅ Educational and practical purpose project
- ✅ Respects robots.txt and rate limiting
- ⚠️ **Use responsibly** - respect website terms of service

---

## 🎯 What is it?

This application allows **ChatGPT** and other MCP clients to fetch and scrape web content with a **clean, modular architecture**.

### ✨ Features

- 🌐 **URL Fetching** - Retrieve content from any URL with proper headers and redirect handling
- 📄 **Flexible Extraction Modes** - Three modes: `light` (metadata + text only), `standard` (text + links + issues), `full` (HTML + all)
- 📝 **Text Content Extraction** - Clean text extraction without HTML tags for LLM consumption
- 🎨 **HTML Content Extraction** - Full HTML content preservation in `full` mode (formatting, images, citations)
- 🔍 **Issue Detection** - Automatically detect paywalls, login requirements, and partial content
- 🔗 **Related Links** - Extract relevant links (see also, related articles) while filtering ads and navigation
- 🧭 **Navigation Links** - Extract sidebar/menu links for documentation sites (optional)
- 📊 **Metadata Extraction** - Extract title, description, author, and publication date
- 🏗️ **Modular Architecture** - Clean separation of concerns, reusable for future projects
- 🔌 **Dual Mode** - Works with ChatGPT (Streamable HTTP) and IDEs (stdio)

### 💬 Usage example

In ChatGPT, simply ask:

> "Fetch the content from https://example.com"

Or:

> "Extract the main content from https://blog.example.com/article in light mode"

Or:

> "Get the full HTML content from https://docs.example.com/page"

ChatGPT will use the MCP server to fetch, extract, and return the content according to the selected mode:
- **Light mode**: Fast, minimal response (metadata + text only)
- **Standard mode**: Complete text content with related links and issues (default)
- **Full mode**: Everything including HTML for advanced use cases

---

## 🏗️ Architecture: MCP Server

### What is an MCP Server?

**MCP (Model Context Protocol)** servers allow you to extend ChatGPT and other LLMs with:
- **Custom tools** (call external APIs)
- **Real-time data** (up-to-date information)

### How does it work?

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   ChatGPT   │ ◄─────► │  MCP Server  │ ◄─────► │  Target URL  │
│             │  HTTP   │  (Node.js)   │  HTTP   │              │
└─────────────┘         └──────────────┘         └──────────────┘
```

1. **ChatGPT** connects via **Streamable HTTP** to `/mcp` (GET/POST)
2. **The MCP server** fetches data from the target URL
3. **The results** are returned to ChatGPT

### MCP Protocol

MCP (Model Context Protocol) is an open standard created by Anthropic that allows LLMs to access external data and tools securely. It is used by:
- ChatGPT (via MCP connectors)
- Claude Desktop
- Cursor
- Other MCP clients

---

## 🚀 Quick Start

### Use with Cursor / Claude Desktop / Warp

**The easiest way** - Install the npm client that connects to the remote server:

```json
{
  "mcpServers": {
    "mcp-scrapidou": {
      "command": "npx",
      "args": ["-y", "@shyzus/mcp-scrapidou"]
    }
  }
}
```

**Config file locations:**
- **Cursor**: `~/.cursor/mcp.json` (macOS/Linux) or `%APPDATA%\Cursor\mcp.json` (Windows)
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
- **Warp**: In Warp AI settings

---

### Use with ChatGPT

A production server is available and ready to use!

**Server URL**: `https://scrapidou.rankorr.red/mcp`

#### ChatGPT Configuration

1. **Have a ChatGPT account with subscription** (ChatGPT Plus, Team, or Enterprise)
2. **Open ChatGPT in your browser** → Go to **Settings** (⚙️)
3. **Go to "Apps & Connectors"**
4. **Enable developer mode**:
   - In **"Advanced Settings"**, enable **developer mode**
   - Go back
5. **Create a new application**:
   - The **"Create"** button now appears in the top right
   - Click on it
   - Fill in the form:
     - **Name**: "Scrapidou" (or another name)
     - **Image**: Add an icon/image (optional)
     - **Server URL**: `https://scrapidou.rankorr.red/mcp`
     - **Note**: The server uses **Streamable HTTP** transport (modern MCP standard)
     - **Authentication**: Select **"None"**
   - Click **"Create"**
6. **The application is now available** in ChatGPT

---

### For developers - Local installation

```bash
# 1. Clone the project
git clone https://github.com/Shyzkanza/mcp-fetch-url.git
cd mcp-fetch-url

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Use locally
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## 📂 Project Structure

```
mcp-fetch-url/
├── src/
│   ├── config.ts              # Configuration centralisée
│   ├── types.ts               # Types TypeScript partagés
│   ├── client/
│   │   └── httpClient.ts      # HTTP client avec headers, redirections, timeout
│   ├── tools/
│   │   └── fetchUrl.ts        # Tool MCP: fetch_url
│   ├── resources/             # Templates (future)
│   ├── servers/
│   │   ├── stdio.ts           # Serveur stdio (IDEs)
│   │   └── http.ts            # Serveur Streamable HTTP (ChatGPT)
│   ├── utils/
│   │   ├── errors.ts          # Gestion erreurs centralisée
│   │   ├── contentExtractor.ts # Extraction contenu (Readability + fallback) + text extraction
│   │   ├── issueDetector.ts   # Détection paywall, login, contenu partiel
│   │   ├── linkExtractor.ts   # Extraction liens pertinents (related links)
│   │   └── navigationExtractor.ts # Extraction liens navigation (sidebar/menu)
│   ├── index.ts               # Entry point stdio
│   ├── http-server.ts         # Entry point HTTP
│   └── http-client.ts         # Client npm
├── dist/                      # Compiled code (generated)
├── Dockerfile                 # Multi-stage Docker image
├── docker-compose.yml         # Stack with Traefik labels
├── .nvmrc                     # Node version (20)
├── package.json               # Server dependencies
├── tsconfig.json              # TypeScript config
└── README.md                  # This file
```

---

## 🛠️ Available Commands

> 📖 **Full documentation**: [COMMANDS.md](./COMMANDS.md)

### Quick Reference

```bash
# 🌟 Recommended for ChatGPT development (2 terminals)
npm run tunnel           # Terminal 1: ngrok (keep running)
npm run dev              # Terminal 2: Dev server with hot-reload

# Alternative: All-in-one
npm run dev:tunnel       # Dev + ngrok in parallel

# Testing
npm run inspect          # Launch MCP Inspector
npm run health           # Health check

# Build & Production
npm run build            # Compile TypeScript
npm run rebuild          # Clean + Build
npm run build:start      # Build then start

# Utilities
npm run kill             # Kill process on port 3000
npm run kill:tunnel      # Kill ngrok
```

### Cursor Commands

Available via **Cmd+Shift+P**:
- `dev-server` - Dev with hot-reload (recommended)
- `tunnel-only` - Launch ngrok (keep running)
- `mcp-inspector` - Launch MCP Inspector
- `build` / `rebuild` / `clean`
- `kill-server` / `kill-tunnel`

See [COMMANDS.md](./COMMANDS.md) for the complete list.

---

## 🔧 Advanced Configuration

### Environment variables

Create a `.env` file:

```bash
PORT=3000                          # HTTP server port
NODE_ENV=production                # Environment
CORS_ORIGIN=*                      # CORS origin (default: * in dev, https://chatgpt.com in prod)
```

---

## 🏗️ Architecture Details

This project serves as a **template/base** for future MCP servers with a clean, modular architecture:

### Separation of Concerns

- **`config.ts`**: Environment variables, constants, validation
- **`types.ts`**: Shared TypeScript interfaces
- **`client/httpClient.ts`**: HTTP client abstraction (fetch, headers, redirects, timeout)
- **`tools/fetchUrl.ts`**: Business logic (validation, extraction orchestration)
- **`utils/contentExtractor.ts`**: Content extraction (Readability + fallback)
- **`utils/issueDetector.ts`**: Issue detection (paywall, login, partial content)
- **`utils/linkExtractor.ts`**: Related links extraction and filtering
- **`servers/`**: MCP implementation (stdio/Streamable HTTP), reuses tools
- **`utils/errors.ts`**: Custom error classes, formatting

See [CONTEXT.md](CONTEXT.md) for detailed architecture documentation.

---

## 📚 Resources & Documentation

### Project Documentation

- [CONTEXT.md](./CONTEXT.md) - Project memory (status, decisions, changelog)
- [COMMANDS.md](./COMMANDS.md) - All npm scripts and Cursor commands
- [OPENAI_APPS_SDK_REFERENCE.md](./OPENAI_APPS_SDK_REFERENCE.md) - Complete SDK reference guide

### Official documentation

- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP spec
- [MCP SDK TypeScript](https://github.com/modelcontextprotocol/typescript-sdk) - Node.js SDK
- [ChatGPT Connectors](https://help.openai.com/en/articles/11487775-connectors-in-chatgpt) - How to use MCP with ChatGPT

### Community

- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers) - Official examples

---

## 🐛 Debugging & Troubleshooting

### Server won't start

```bash
# Check that Node.js is installed (requires Node 20+)
node --version  # Must be 20+

# If using nvm, switch to Node 20
nvm use 20  # or nvm install 20

# Check that dependencies are installed
npm install

# Full rebuild
npm run build
```

**Note**: This project requires Node.js 20+ due to dependencies (jsdom, @mozilla/readability). Use `.nvmrc` file or `nvm use` to ensure the correct version.

### CORS errors

The server allows all origins in dev. In production, restrict in `src/servers/http.ts`:

```typescript
res.setHeader('Access-Control-Allow-Origin', 'https://chatgpt.com');
```

---

## 🚀 Use This Project as a Template

This project is a **complete template** for creating your own MCP servers with a clean architecture.

### To create your own MCP server:

1. **Duplicate this project**
2. **Implement your tools** in `src/tools/`
3. **Customize the configuration** in `src/config.ts`
4. **Deploy**!

---

## 📝 License

MIT - Use freely for your personal or commercial projects.

---

## 🙏 Credits & Attributions

- **MCP Protocol** - [Anthropic](https://www.anthropic.com/)

---

## 📞 Support

For any questions:
- 📖 Check the [MCP documentation](https://modelcontextprotocol.io/)
- 💬 Open an issue on GitHub

---

**Have fun with your MCP server! 🕷️✨**
