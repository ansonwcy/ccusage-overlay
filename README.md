# Claude Code Usage Overlay

A macOS desktop overlay application that displays Claude Code usage statistics in real-time.

## Features

- 📊 Real-time usage monitoring from local Claude Code data
- 🖥️ Menu bar integration with dropdown summary
- 🪟 Floating overlay window with multiple display modes
- 📈 Daily, weekly, and monthly usage tracking
- 💰 Cost calculation and budget alerts
- 🎨 Light/Dark theme support
- 🔄 Automatic file watching and updates

## Multi-Monitor Support

**Note**: Due to macOS system limitations, menu bar icons only appear on the primary display by default.

To show the menu bar (and this app's icon) on all displays:

1. Go to **System Settings > Desktop & Dock**
2. Scroll down to **Mission Control**
3. Enable **"Displays have separate Spaces"**
4. **Log out and log back in** for the change to take effect

After enabling this setting, the menu bar and all menu bar icons (including Claude Code Usage Overlay) will appear on all connected displays.

## Installation

### Download the App

[**Download Claude Usage Overlay.dmg**](https://github.com/ansonwcy/cc-project/releases/latest/download/Claude.Usage.Overlay.dmg) (macOS)

Install the app by:

1. Double-clicking the DMG file
2. Dragging the app to your Applications folder
3. Opening the app from Applications (you may need to right-click and select "Open" the first time)

## Development Setup

### Prerequisites

- Node.js 20+
- npm or yarn
- macOS 11.0 or later

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ccusage-overlay.git
cd ccusage-overlay

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Available Scripts

- `npm run dev` - Start the application in development mode with hot reload
- `npm run build` - Build the application for production
- `npm run test` - Run unit tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Lint code with Biome
- `npm run format` - Format code with Biome
- `npm run typecheck` - Run TypeScript type checking
- `npm run package` - Package the application for distribution
- `npm run make` - Create platform-specific installers

## Architecture

The application follows Electron's multi-process architecture:

- **Main Process**: Handles file system operations, window management, and system tray
- **Renderer Process**: React-based UI with real-time data visualization
- **Shared Modules**: Common utilities and types used across processes

### Key Technologies

- **Electron** - Desktop application framework
- **TypeScript** - Type-safe development
- **React** - UI components
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management
- **Vitest** - Unit testing

## Project Structure

```
ccusage-overlay/
├── src/
│   ├── main/           # Main process code
│   │   ├── index.ts    # Application entry point
│   │   └── services/   # Data and cache services
│   ├── renderer/       # Renderer process code
│   │   ├── src/        # React components
│   │   └── index.html  # HTML entry point
│   ├── preload/        # Preload scripts
│   └── shared/         # Shared utilities and types
├── resources/          # Application resources
├── tests/              # Test files
└── scripts/            # Build and utility scripts
```

## Testing

The project uses Vitest for unit testing:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test -- --watch
```

## Building for Production

```bash
# Build the application
npm run build

# Package for macOS
npm run package

# Create DMG installer
npm run make
```

The built files will be available in:
- **Packaged app**: `out/ccusage-overlay-darwin-arm64/`
- **DMG installer**: `out/make/Claude Usage Overlay.dmg`
- **ZIP archive**: `out/make/zip/`

## Contributing

Please see the main project's contributing guidelines.

## License

MIT