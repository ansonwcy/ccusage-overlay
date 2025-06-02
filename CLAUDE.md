# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Claude Code Usage Overlay is a macOS desktop application built with Electron that displays real-time Claude Code usage statistics. It features a menu bar integration with a dropdown summary and floating overlay windows for monitoring token usage and costs.

## Essential Commands

### Development
```bash
npm run dev          # Start application in development mode with hot reload
npm run test         # Run all unit tests  
npm run test -- --watch  # Run tests in watch mode for specific test files
npm run lint         # Lint code with Biome (includes auto-fix)
npm run format       # Format code with Biome
npm run typecheck    # Run TypeScript type checking
```

### Building & Packaging
```bash
npm run build        # Build the application for production
npm run package      # Package the application for macOS distribution
npm run make         # Create DMG installer for macOS
```

## Architecture

The application follows Electron's multi-process architecture with TypeScript throughout:

### Main Process (`src/main/`)
- **Entry Point**: `index.ts` - Sets up IPC handlers and initializes AppController
- **AppController**: Central controller managing all services and window/tray lifecycle
- **DataService**: Handles reading Claude Code usage data from local JSONL files
- **CacheManager**: Manages data caching for performance
- **SessionCalculator**: Identifies and calculates costs for coding sessions
- **TrayManager**: Manages the macOS menu bar icon and dropdown
- **WindowManager**: Controls the floating overlay window and its modes

### Renderer Process (`src/renderer/`)
- **React Components**: UI components using TypeScript and Tailwind CSS
- **State Management**: Zustand stores for settings, theme, and usage data
- **Views**: ExpandedView for the main window interface

### Shared (`src/shared/`)
- **Types**: Comprehensive TypeScript types used across processes
- **Calculate Cost**: Utilities for cost calculations and formatting
- **Data Loader**: Functions for loading and parsing Claude Code usage files

## Key Implementation Details

### Session Cost Calculation
The application uses a 5-hour sliding window to identify coding sessions. Sessions are calculated by:
1. Finding hours with non-zero costs
2. Including up to 5 consecutive hours from the first non-zero hour
3. Calculating the total cost for these hours

### Menu Bar Cost Display
The menu bar shows today's total cost, calculated by summing all hourly data for the current day. This ensures consistency between the menu bar and the main window footer.

### Data Aggregation
- Usage data is loaded from Claude Code's local JSONL files
- Data is aggregated into hourly, daily, weekly, and monthly summaries
- The DataService watches for file changes and updates automatically

### Testing Strategy
- Unit tests use Vitest with coverage thresholds (80% minimum)
- Tests mock Electron APIs and file system operations
- Run tests before committing changes to ensure code quality

## Important Patterns

### IPC Communication
All communication between main and renderer processes uses typed IPC handlers:
- `usage:request-data` - Get aggregated usage data
- `settings:get/set` - Manage application settings
- `window:*` - Control window state and modes

### File Watching
The application uses chokidar to watch Claude Code's data directory for changes, automatically refreshing the displayed data when new usage is recorded.

### Error Handling
Errors are silently caught to prevent crashes, particularly important for file system operations and data parsing.