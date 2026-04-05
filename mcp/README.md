# AstroSprite MCP Server

Gives Claude (and any MCP-compatible AI) direct access to the AstroSprite pixel art API.

## Install in Claude Desktop

1. **Clone or download this repo**, then inside the `mcp/` folder run:
   ```bash
   npm install
   npm run build
   ```

2. **Find your Claude Desktop config file:**
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

3. **Add this to the config** (replace the path with your actual path):
   ```json
   {
     "mcpServers": {
       "astrosprite": {
         "command": "node",
         "args": ["C:/Users/YOUR_NAME/sprite-forge/mcp/dist/index.js"]
       }
     }
   }
   ```

4. **Restart Claude Desktop.** You should see AstroSprite tools available.

## Available tools

| Tool | What it does |
|------|-------------|
| `generate_sprite` | Generate a new pixel art sprite with style, colors, animations, weapons |
| `draw_on_sprite` | Paint pixels on a sprite using pencil, fill, line, rect, circle |
| `import_image` | Import a PNG as a sprite (base64) |
| `export_sprite` | Render sprite to PNG data URIs + sprite sheet |
| `manage_layers` | Add, delete, merge, reorder, rename layers |
| `manage_frames` | Add, delete, duplicate, reorder animation frames |
| `resize_canvas` | Change the canvas dimensions |

## Example prompts

Once installed, you can say things like:

- *"Generate me a knight with a sword and walk animation"*
- *"Make a neon robot mech, complex, size 48"*
- *"Draw red eyes on that sprite at pixels (14,8) and (18,8)"*
- *"Export that sprite at 4x scale"*
- *"Generate a campfire object sprite"*

## Point to a different API

Set the `ASTROSPRITE_API_URL` environment variable to use a local or staging server:

```json
{
  "mcpServers": {
    "astrosprite": {
      "command": "node",
      "args": ["C:/path/to/mcp/dist/index.js"],
      "env": {
        "ASTROSPRITE_API_URL": "http://localhost:3001"
      }
    }
  }
}
```
