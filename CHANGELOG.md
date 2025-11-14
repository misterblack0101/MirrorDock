# Changelog

All notable changes to the "scrcpy-vscode" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Real H.264 decoder integration (Broadway.js/ffmpeg.wasm)
- Keyboard input support
- Device rotation handling
- Multi-device support
- Recording functionality
- Screenshot capture
- Wireless ADB support
- Device shell terminal integration

## [0.1.0] - 2025-11-14

### Added
- Initial release
- Sidebar panel with embedded device screen
- Activity Bar icon and view container
- scrcpy process management
- H.264 streaming (stub decoder included)
- Touch input support:
  - Tap gestures
  - Swipe gestures
  - Long press gestures
- ADB integration for input events
- Status updates and error handling
- Auto-restart on connection drop
- Commands:
  - Start Device Mirror
  - Stop Device Mirror
  - Restart Device Mirror
- WebView-based UI with canvas rendering
- Coordinate mapping for touch events
- Output channel for debugging

### Known Issues
- Stub decoder shows placeholder frames (not actual video)
- No keyboard input support yet
- Single device support only
- No audio support
- No clipboard synchronization

### Documentation
- Comprehensive README
- H.264 decoder integration guide
- Development guide
- Quick start guide

### Technical Details
- TypeScript-based extension
- WebView for UI rendering
- Node.js child_process for scrcpy management
- ADB shell commands for input
- Message-based communication protocol
- Modular architecture with clean separation of concerns

## Future Versions

### [0.2.0] - Planned
- Real H.264 decoder integration
- Performance improvements
- Better error messages
- Device selection UI

### [0.3.0] - Planned
- Keyboard input support
- Multiple device support
- Configuration settings

### [1.0.0] - Planned
- Stable release
- Full feature set
- Comprehensive testing
- Performance optimization
