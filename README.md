# Scrcpy VSCode Extension

A Visual Studio Code extension that embeds Android device screen mirroring directly in the VSCode sidebar using [scrcpy](https://github.com/Genymobile/scrcpy).

## Features

- 📱 **Embedded Device Screen**: View your Android device screen directly in VSCode's sidebar
- 🖱️ **Touch Interaction**: Tap, swipe, and long-press gestures via canvas interaction
- 🎥 **Live H.264 Streaming**: Real-time video streaming from your device
- 🔄 **Auto-restart**: Automatically recovers from connection drops
- 🎯 **Activity Bar Integration**: Dedicated icon in the activity bar for easy access
- ⚡ **Performance Optimized**: Efficient frame delivery and rendering

## Prerequisites

Before using this extension, you need to install:

### 1. scrcpy

**macOS (Homebrew):**
```bash
brew install scrcpy
```

**Linux (Ubuntu/Debian):**
```bash
apt install scrcpy
```

**Windows:**
Download from [releases page](https://github.com/Genymobile/scrcpy/releases)

### 2. Android Debug Bridge (ADB)

**macOS (Homebrew):**
```bash
brew install android-platform-tools
```

**Linux (Ubuntu/Debian):**
```bash
apt install android-tools-adb
```

**Windows:**
Download [Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools)

### 3. Enable USB Debugging on Your Android Device

1. Go to **Settings** > **About Phone**
2. Tap **Build Number** 7 times to enable Developer Options
3. Go to **Settings** > **Developer Options**
4. Enable **USB Debugging**
5. Connect your device via USB and authorize the computer

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd scrcpy-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile TypeScript:
   ```bash
   npm run compile
   ```

4. Open in VSCode:
   ```bash
   code .
   ```

5. Press `F5` to launch the Extension Development Host

### From VSIX Package

1. Package the extension:
   ```bash
   npm install -g vsce
   npm run package
   ```

2. Install the generated `.vsix` file:
   - Open VSCode
   - Go to Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
   - Click "..." menu → "Install from VSIX..."
   - Select the generated `.vsix` file

## Usage

### Starting Device Mirror

1. **Connect your Android device** via USB and ensure USB debugging is enabled
2. **Open the Scrcpy panel**:
   - Click the phone icon in the Activity Bar (left sidebar)
   - Or use Command Palette: `Scrcpy: Start Device Mirror`
3. **Click "Start"** in the panel
4. Your device screen will appear in the panel

### Interacting with the Device

- **Tap**: Single click on the canvas
- **Swipe**: Click and drag on the canvas
- **Long Press**: Click and hold for 500ms+

### Available Commands

Access via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- `Scrcpy: Start Device Mirror` - Start mirroring
- `Scrcpy: Stop Device Mirror` - Stop mirroring
- `Scrcpy: Restart Device Mirror` - Restart the connection

## Project Structure

```
scrcpy-extension/
├── src/
│   ├── extension.ts              # Extension entry point
│   ├── ScrcpyViewProvider.ts     # WebView provider for sidebar panel
│   ├── ScrcpyRunner.ts           # Process management & ADB integration
│   └── types/
│       └── messages.ts           # Message protocol definitions
├── webview/
│   ├── index.html                # WebView HTML (generated)
│   ├── view.js                   # WebView logic & touch handling
│   ├── style.css                 # WebView styling
│   └── h264/
│       ├── decoder.js            # H.264 decoder stub
│       └── decoder.wasm          # (Placeholder for WASM decoder)
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## Architecture

### Communication Flow

```
Android Device
    ↓ (USB)
scrcpy process
    ↓ (H.264 stdout)
ScrcpyRunner
    ↓ (postMessage)
WebView (decoder.js)
    ↓ (Canvas)
User sees device screen
    ↓ (Mouse/Touch events)
WebView (view.js)
    ↓ (postMessage)
ScrcpyRunner
    ↓ (ADB shell input)
Android Device
```

### Message Protocol

**Extension → WebView:**
```typescript
{
  type: 'frame',
  data: number[]  // H.264 frame data
}

{
  type: 'status',
  status: 'starting' | 'running' | 'stopped' | 'error',
  message?: string
}

{
  type: 'deviceInfo',
  width: number,
  height: number
}
```

**WebView → Extension:**
```typescript
{
  type: 'input',
  action: 'tap',
  payload: { x: number, y: number }
}

{
  type: 'input',
  action: 'swipe',
  payload: { x1: number, y1: number, x2: number, y2: number, duration: number }
}

{
  type: 'input',
  action: 'longPress',
  payload: { x: number, y: number, duration: number }
}
```

## H.264 Decoder Integration

The current implementation includes a **stub decoder** for demonstration purposes. To get actual video streaming, you need to integrate a real H.264 decoder.

### Recommended Options:

1. **Broadway.js** (Pure JavaScript)
   - GitHub: https://github.com/mbebenita/Broadway
   - Pros: Easy integration, no dependencies
   - Cons: Lower performance

2. **ffmpeg.wasm** (WebAssembly)
   - GitHub: https://github.com/ffmpegwasm/ffmpeg.wasm
   - Pros: Full-featured, good performance
   - Cons: Larger bundle size

3. **OpenH264 WASM** (WebAssembly)
   - Pros: Lightweight, fast
   - Cons: Requires manual compilation

### Integration Steps:

1. Install your chosen decoder:
   ```bash
   npm install broadway-player
   # or
   npm install @ffmpeg/ffmpeg
   ```

2. Replace `webview/h264/decoder.js` with actual decoder implementation

3. Update the `decode()` method to use the real decoder

4. Handle canvas rendering from decoded frames

## Development

### Build Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Run linter
npm run lint

# Package extension
npm run package
```

### Debugging

1. Open the project in VSCode
2. Press `F5` to start debugging
3. Extension Development Host will launch
4. Set breakpoints in TypeScript files
5. Check "Output" → "Scrcpy" for logs

### Testing with Multiple Devices

Connect multiple devices and specify device serial:

```typescript
// In ScrcpyRunner.ts, modify spawn args:
const args = [
    '-s', 'DEVICE_SERIAL',  // Add this
    '--video-codec=h264',
    // ... other args
];
```

Get device serial with:
```bash
adb devices -l
```

## Troubleshooting

### Device Not Detected

```bash
# Check if device is connected
adb devices

# If no devices, check USB debugging is enabled
# Kill and restart adb server
adb kill-server
adb start-server
```

### scrcpy Not Found

```bash
# Verify scrcpy is installed
which scrcpy

# If not found, install it
brew install scrcpy  # macOS
```

### Connection Drops Frequently

- Check USB cable quality
- Enable "Stay Awake" in Developer Options
- Reduce video quality in `ScrcpyRunner.ts`:
  ```typescript
  '--max-size=720',
  '--video-bit-rate=2M',
  ```

### Canvas Shows Black Screen

- The stub decoder shows placeholder frames
- Integrate a real H.264 decoder (see above)
- Check Output panel for scrcpy errors

### High CPU Usage

- Reduce frame rate: `--max-fps=15`
- Lower resolution: `--max-size=720`
- Use hardware encoder on device
- Optimize decoder implementation

## Performance Tips

1. **Reduce Resolution**: Lower `--max-size` value
2. **Limit Frame Rate**: Use `--max-fps=15` or `--max-fps=24`
3. **Lower Bit Rate**: Set `--video-bit-rate=2M` or lower
4. **Hardware Encoding**: Ensure device uses hardware encoder
5. **Close Other Apps**: Minimize device background processes

## Known Limitations

- **Audio**: Not currently supported (scrcpy limitation without window)
- **Keyboard Input**: Not implemented (can be added via ADB)
- **Multi-touch**: Only single-touch gestures supported
- **Clipboard**: Not synchronized
- **File Transfer**: Not supported

## Future Enhancements

- [ ] Real H.264 decoder integration (Broadway.js/ffmpeg.wasm)
- [ ] Keyboard input support via ADB
- [ ] Device rotation handling
- [ ] Multi-device support in same view
- [ ] Recording functionality
- [ ] Screenshot capture
- [ ] Performance metrics overlay
- [ ] Wireless ADB support
- [ ] Device shell access in terminal

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This extension is provided as-is for educational and development purposes.

## Credits

- **scrcpy**: https://github.com/Genymobile/scrcpy - Amazing tool by Genymobile
- **VSCode Extension API**: https://code.visualstudio.com/api
- **Android Debug Bridge**: https://developer.android.com/tools/adb

## Support

For issues and questions:
- Check the [scrcpy documentation](https://github.com/Genymobile/scrcpy)
- Review VSCode Output panel (Scrcpy channel)
- Open an issue on GitHub

---

**Note**: This extension requires an Android device with USB debugging enabled and scrcpy/ADB installed on your system.
