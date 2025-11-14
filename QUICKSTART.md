# Quick Start Guide

Get your scrcpy VSCode extension up and running in 5 minutes!

## Prerequisites Checklist

Before you start, make sure you have:

- [ ] **Node.js 18+** installed (`node --version`)
- [ ] **VSCode** installed (`code --version`)
- [ ] **scrcpy** installed (`scrcpy --version`)
- [ ] **ADB** installed (`adb version`)
- [ ] **Android device** with USB debugging enabled

## Step 1: Install scrcpy and ADB

### macOS
```bash
brew install scrcpy android-platform-tools
```

### Linux (Ubuntu/Debian)
```bash
sudo apt install scrcpy android-tools-adb
```

### Windows
Download from:
- scrcpy: https://github.com/Genymobile/scrcpy/releases
- ADB: https://developer.android.com/studio/releases/platform-tools

## Step 2: Enable USB Debugging on Android

1. Go to **Settings** > **About Phone**
2. Tap **Build Number** 7 times
3. Go to **Settings** > **Developer Options**
4. Enable **USB Debugging**
5. Connect device via USB
6. Authorize the computer on your device

Verify connection:
```bash
adb devices
```

You should see your device listed.

## Step 3: Setup the Extension

```bash
# Clone or navigate to the project
cd scrcpy-extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile
```

## Step 4: Run the Extension

### Option A: Debug Mode (Recommended for Development)

1. Open the project in VSCode:
   ```bash
   code .
   ```

2. Press `F5` or go to **Run** → **Start Debugging**

3. A new VSCode window opens (Extension Development Host)

4. In the new window, click the **phone icon** in the Activity Bar (left sidebar)

5. Click **Start** button in the Scrcpy Device panel

6. Your device screen should appear!

### Option B: Package and Install

1. Package the extension:
   ```bash
   npm install -g @vscode/vsce
   npm run package
   ```

2. Install the `.vsix` file:
   - Open VSCode
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Install from VSIX"
   - Select the generated `.vsix` file

3. Restart VSCode

4. Click the phone icon in the Activity Bar

## Step 5: Test Basic Functionality

1. **Video Stream**: You should see your device screen (or placeholder frames)
2. **Tap**: Click on the canvas
3. **Swipe**: Click and drag on the canvas
4. **Status**: Check the status bar at the top of the panel

## Troubleshooting

### "scrcpy is not installed"
```bash
# Verify scrcpy is in PATH
which scrcpy

# If not found, install it:
brew install scrcpy  # macOS
```

### "Device not found"
```bash
# Check device connection
adb devices

# If no devices listed:
# 1. Check USB cable
# 2. Enable USB debugging on device
# 3. Authorize computer on device

# Restart ADB if needed
adb kill-server
adb start-server
```

### "Black screen" or "Placeholder frames"
This is expected! The extension includes a stub decoder. To get actual video:

1. Read the [DECODER_GUIDE.md](./DECODER_GUIDE.md)
2. Install Broadway.js or another H.264 decoder
3. Replace `webview/h264/decoder.js`

### Extension won't compile
```bash
# Clean build
rm -rf out/
npm run compile

# Check for TypeScript errors
npx tsc --noEmit
```

### Canvas not responding to touch
- Check the Output panel (View → Output → Select "Scrcpy")
- Verify ADB is working: `adb shell input tap 100 100`
- Check console in DevTools (Help → Toggle Developer Tools)

## Next Steps

### 1. Integrate a Real Decoder

The stub decoder shows placeholder frames. For actual video:

**Quick option (Broadway.js):**
```bash
npm install broadway-player
```

Follow the instructions in [DECODER_GUIDE.md](./DECODER_GUIDE.md)

### 2. Customize scrcpy Settings

Edit `src/ScrcpyRunner.ts` to modify scrcpy parameters:

```typescript
const args = [
    '--max-size=720',        // Lower resolution
    '--max-fps=15',          // Lower frame rate
    '--video-bit-rate=2M',   // Lower bitrate
    // ... other settings
];
```

### 3. Explore Commands

Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux) and type "Scrcpy":

- **Scrcpy: Start Device Mirror**
- **Scrcpy: Stop Device Mirror**
- **Scrcpy: Restart Device Mirror**

### 4. Check the Logs

View → Output → Select "Scrcpy" to see:
- scrcpy process output
- Connection status
- Error messages

### 5. Read the Documentation

- [README.md](./README.md) - Full documentation
- [DECODER_GUIDE.md](./DECODER_GUIDE.md) - H.264 decoder integration
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide

## Common Use Cases

### Multiple Devices

To specify a device:
```bash
adb devices  # Get device serial
```

Modify `ScrcpyRunner.ts`:
```typescript
const args = [
    '-s', 'YOUR_DEVICE_SERIAL',
    // ... other args
];
```

### Wireless Connection

```bash
# Connect device to same WiFi network
# Get device IP address from Settings → About → Status

# Enable wireless debugging
adb tcpip 5555

# Connect via IP
adb connect 192.168.1.XXX:5555

# Now use the extension normally
```

### Screen Recording

Add to `ScrcpyRunner.ts`:
```typescript
const args = [
    '--record=recording.mp4',  // Add this
    // ... other args
];
```

## Performance Tips

For smoother performance:

1. **Lower resolution:**
   ```typescript
   '--max-size=720'  // or 480
   ```

2. **Reduce frame rate:**
   ```typescript
   '--max-fps=15'
   ```

3. **Use hardware encoder:**
   ```typescript
   '--encoder-name=OMX.google.h264.encoder'
   ```

4. **Close other apps** on your device

## Getting Help

1. Check the [README.md](./README.md)
2. Review [DEVELOPMENT.md](./DEVELOPMENT.md)
3. Check scrcpy docs: https://github.com/Genymobile/scrcpy
4. Open an issue on GitHub

## Success! 🎉

If you see your device screen in VSCode, congratulations! You've successfully set up the extension.

### What's Working:
- ✅ Extension activated
- ✅ scrcpy process running
- ✅ Video stream (placeholder or real)
- ✅ Touch input via ADB

### What's Next:
- 🎯 Integrate real H.264 decoder
- 🎯 Customize settings
- 🎯 Add features (keyboard, etc.)

Happy developing! 🚀
