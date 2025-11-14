# Android Screen for VS Code

View your Android device screen directly in VS Code's sidebar.

## Features

- Live Android screen mirroring in VS Code sidebar
- Touch interaction (tap, swipe, long-press)
- Real-time H.264 video streaming
- Hardware-accelerated decoding via WebCodecs API
- Auto-reconnect on device switching

## Prerequisites

### Android Debug Bridge (ADB)

**macOS:**
```bash
brew install android-platform-tools
```

**Linux:**
```bash
apt install android-tools-adb
```

**Windows:**
Download [Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools)

### Enable USB Debugging on Your Device

1. Go to **Settings** > **About Phone**
2. Tap **Build Number** 7 times to enable Developer Options
3. Go to **Settings** > **Developer Options**
4. Enable **USB Debugging**
5. Connect your device via USB and authorize the computer

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/android-screen
   cd android-screen
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile TypeScript:
   ```bash
   npm run compile
   ```

4. Press `F5` to launch the Extension Development Host

## Usage

1. Connect your Android device via USB
2. Click the phone icon in the Activity Bar
3. Click "Start" in the panel
4. Your device screen will appear in the panel

### Interactions

- **Tap**: Single click
- **Swipe**: Click and drag
- **Long Press**: Click and hold 500ms+

### Commands

- `Android Screen: Start`
- `Android Screen: Stop`
- `Android Screen: Restart`

## Troubleshooting

**Device Not Detected:**
```bash
adb devices
adb kill-server && adb start-server
```

**Connection Issues:**
- Check USB cable
- Enable "Stay Awake" in Developer Options
- Verify USB debugging authorized

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## License

MIT
