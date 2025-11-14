# MirrorDock

Mirror your Android device screen directly in VS Code's sidebar.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/misterblack0101.mirrordock)](https://marketplace.visualstudio.com/items?itemName=misterblack0101.mirrordock)
[![GitHub](https://img.shields.io/github/stars/misterblack0101/MirrorDock?style=social)](https://github.com/misterblack0101/MirrorDock)

## Features

- 📱 Live Android screen mirroring in VS Code sidebar
- 👆 Touch interaction (tap, swipe, long-press)
- 🎥 Real-time H.264 video streaming
- ⚡ Hardware-accelerated decoding via WebCodecs API
- 🔄 Auto-reconnect on device switching

## Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=misterblack0101.mirrordock) or search for "MirrorDock" in VS Code Extensions.

## Prerequisites

### Android Debug Bridge (ADB)

**macOS:**

```bash
brew install --cask android-platform-tools
```

**Linux:**

```bash
apt install android-tools-adb
```

**Windows:**
Download [Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools)

### Enable USB Debugging

1. Go to **Settings** > **About Phone**
2. Tap **Build Number** 7 times to enable Developer Options
3. Go to **Settings** > **Developer Options**
4. Enable **USB Debugging**
5. Connect device via USB and authorize your computer

## Usage

1. Connect your Android device via USB
2. Click the phone icon in the Activity Bar
3. Click "Start" in the panel
4. Your device screen appears in the panel

### Interactions

- **Tap**: Single click on screen
- **Swipe**: Click and drag
- **Long Press**: Click and hold 500ms+

### Commands

Access via Command Palette (`Cmd/Ctrl+Shift+P`):

- `MirrorDock: Start`
- `MirrorDock: Stop`
- `MirrorDock: Restart`

## Troubleshooting

**Device Not Detected:**

```bash
adb devices
adb kill-server && adb start-server
```

**Connection Issues:**

- Check USB cable quality
- Enable "Stay Awake" in Developer Options
- Verify USB debugging authorized

## Development

Want to contribute? Check out the [GitHub repository](https://github.com/misterblack0101/MirrorDock).

```bash
git clone https://github.com/misterblack0101/MirrorDock
cd MirrorDock
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

## How It Works

MirrorDock uses:

- **ADB screenrecord** for H.264 video capture
- **WebCodecs API** for hardware-accelerated decoding
- **Canvas rendering** for display
- **ADB input commands** for touch interaction

See [ARCHITECTURE.md](https://github.com/misterblack0101/MirrorDock/blob/main/ARCHITECTURE.md) for technical details.

## Contributing

Contributions welcome! Please feel free to submit a Pull Request to the [GitHub repository](https://github.com/misterblack0101/MirrorDock).

## License

MIT - see [LICENSE](https://github.com/misterblack0101/MirrorDock/blob/main/LICENSE)

---

**Links:**

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=misterblack0101.mirrordock)
- [GitHub Repository](https://github.com/misterblack0101/MirrorDock)
- [Report Issues](https://github.com/misterblack0101/MirrorDock/issues)
