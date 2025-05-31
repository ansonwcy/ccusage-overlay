# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Commands

### Development
- `npm run dev` - Start Electron app in development mode with hot reload
- `npm run build` - Build the application for production
- `npm run package` - Package the application for macOS distribution
- `npm run make` - Create DMG installer

### Code Quality
- `npm run lint` - Run Biome linter with auto-fix
- `npm run format` - Format code with Biome
- `npm run typecheck` - Run TypeScript type checking

### Testing
- `npm test` - Run all tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run test -- --watch` - Run tests in watch mode
- `npm run test path/to/test.test.ts` - Run a specific test file

## Architecture Overview

This is an Electron application using a multi-process architecture with TypeScript throughout:

### Process Architecture
1. **Main Process** (`src/main/`)
   - Entry point: `index.ts` sets up IPC handlers and initializes AppController
   - `AppController` orchestrates all main process services:
     - `WindowManager`: Manages the floating overlay window states and positioning
     - `TrayManager`: Handles macOS menu bar icon and dropdown
     - `DataService`: Watches Claude's JSONL files (~/.claude/projects/*/\*.jsonl) and aggregates usage data
     - `CacheManager`: In-memory cache for aggregated data
   - Uses `electron-store` for persistent settings

2. **Preload Scripts** (`src/preload/`)
   - Exposes safe IPC channels to renderer via `window.electronAPI`
   - Bridges main and renderer processes with type-safe APIs

3. **Renderer Process** (`src/renderer/`)
   - React application with three view modes: Compact, Standard, and Expanded
   - State management using Zustand stores:
     - `useUsageStore`: Manages usage data and view modes
     - `useSettingsStore`: Syncs with main process settings
     - `useThemeStore`: Handles light/dark theme
   - Real-time updates via IPC events from DataService file watching

### Data Flow
1. Claude writes usage data to `~/.claude/projects/{project-name}/{session-id}.jsonl`
2. `DataService` watches these files using chokidar and parses them on changes
3. `data-loader.ts` aggregates raw entries into:
   - Daily summaries with cost calculations
   - Hourly breakdowns (last 24h and today)
   - Session summaries
   - Project breakdowns with percentages
4. Aggregated data is cached and broadcast to all renderer windows
5. React components update automatically via Zustand subscriptions

### Key Shared Modules (`src/shared/`)
- `types.ts`: All TypeScript interfaces shared between processes
- `data-loader.ts`: Core logic for parsing JSONL files and aggregating usage data
- `calculate-cost.ts`: Claude API pricing calculations and formatting utilities

### Build Configuration
- Uses `electron-vite` for fast builds with separate configs for main/preload/renderer
- Path aliases configured: `@main`, `@shared`, `@renderer`, `@preload`
- Vite handles renderer bundling with React Fast Refresh
- TypeScript strict mode enabled

### Window Management
- Floating overlay window with custom frame and transparency
- Three display modes: Compact (minimal bar), Standard (summary view), Expanded (detailed tables/charts)
- Window state persisted including position, size, opacity, and always-on-top
- Special handling for macOS vibrancy effects

### Testing Strategy
- Unit tests for shared utilities (data-loader, calculate-cost)
- Mocked Electron APIs in test environment
- Focus on data aggregation logic and cost calculations

## Important Patterns

### IPC Communication
- All IPC channels defined in `src/main/index.ts` setupIpcHandlers()
- Type-safe API exposed through preload script
- Request/response pattern for data fetching
- Event pattern for real-time updates

### File Watching
- Uses chokidar with debouncing to handle rapid file changes
- Processes files in batches to avoid overwhelming the system
- Validates JSONL structure before parsing

### Cost Calculation
- Pricing data embedded in `calculate-cost.ts`
- Handles different token types: input, output, cache creation, cache read
- Supports multiple Claude models with different pricing tiers

### Error Handling
- Silent failures for file parsing (logs but continues)
- Graceful degradation when Claude data directory doesn't exist
- User-friendly error states in UI components