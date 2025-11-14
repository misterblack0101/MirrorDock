# Build and Run Instructions

Complete step-by-step instructions to build and run the Scrcpy VSCode extension.

## Prerequisites Installation

### 1. Install Node.js

**macOS:**
```bash
brew install node
# or download from https://nodejs.org/
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm

# Fedora
sudo dnf install nodejs npm
```

**Windows:**
Download from https://nodejs.org/

**Verify:**
```bash
node --version  # Should be 18.x or higher
npm --version
```

### 2. Install scrcpy

**macOS:**
```bash
brew install scrcpy
```

**Linux:**
```bash
# Ubuntu/Debian (22.04+)
sudo apt install scrcpy

# Snap (any Linux)
sudo snap install scrcpy
```

**Windows:**
1. Download from https://github.com/Genymobile/scrcpy/releases
2. Extract to a folder (e.g., `C:\scrcpy`)
3. Add to PATH or use full path

**Verify:**
```bash
scrcpy --version
```

### 3. Install Android Platform Tools (ADB)

**macOS:**
```bash
brew install android-platform-tools
```

**Linux:**
```bash
sudo apt install android-tools-adb
```

**Windows:**
1. Download from https://developer.android.com/studio/releases/platform-tools
2. Extract and add to PATH

**Verify:**
```bash
adb version
```

### 4. Setup Android Device

1. **Enable Developer Options:**
   - Settings → About Phone
   - Tap "Build Number" 7 times

2. **Enable USB Debugging:**
   - Settings → Developer Options
   - Enable "USB Debugging"
   - Enable "Stay Awake" (recommended)

3. **Connect and Authorize:**
   ```bash
   adb devices
   ```
   - You should see your device
   - Authorize on device if prompted

## Build Instructions

### Step 1: Get the Source Code

```bash
# Navigate to the extension directory
cd /Users/misterblack/code/scrcpy-extension
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `@types/node` - Node.js type definitions
- `@types/vscode` - VSCode API type definitions
- `typescript` - TypeScript compiler
- `eslint` - Code linter
- Other development dependencies

**Expected output:**
```
added XXX packages in Xs
```

### Step 3: Compile TypeScript

```bash
npm run compile
```

This compiles TypeScript files from `src/` to JavaScript in `out/`.

**Expected output:**
```
> scrcpy-vscode@0.1.0 compile
> tsc -p ./
```

**Verify compilation:**
```bash
ls out/
# Should see: extension.js, ScrcpyRunner.js, ScrcpyViewProvider.js, types/
```

### Step 4: (Optional) Watch Mode

For development, run TypeScript in watch mode:
```bash
npm run watch
```

This automatically recompiles when you make changes.

## Run Instructions

### Method 1: Debug Mode (Recommended for Development)

1. **Open in VSCode:**
   ```bash
   code /Users/misterblack/code/scrcpy-extension
   ```

2. **Start Debugging:**
   - Press `F5`
   - Or: Run → Start Debugging
   - Or: Debug icon in sidebar → "Run Extension"

3. **Extension Development Host Opens:**
   - A new VSCode window opens
   - The extension is loaded in this window

4. **Open Scrcpy Panel:**
   - Click the phone icon in Activity Bar (left sidebar)
   - Or: View → Open View → "Device Screen"

5. **Start Device Mirror:**
   - Click "Start" button
   - Or: Command Palette (`Cmd+Shift+P`) → "Scrcpy: Start Device Mirror"

6. **Expected Behavior:**
   - Status shows "Starting..."
   - scrcpy process launches
   - Canvas shows placeholder frames
   - (Actual video requires real H.264 decoder)

7. **Test Touch Input:**
   - Click on canvas → Device receives tap
   - Drag on canvas → Device receives swipe
   - Hold click → Device receives long press

8. **View Logs:**
   - Original window: View → Output → Select "Scrcpy"
   - See scrcpy process output and errors

### Method 2: Package and Install

1. **Install VSCE:**
   ```bash
   npm install -g @vscode/vsce
   ```

2. **Package Extension:**
   ```bash
   npm run package
   ```
   
   This creates `scrcpy-vscode-0.1.0.vsix`

3. **Install VSIX:**
   
   **Option A - VSCode UI:**
   - Open VSCode
   - Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
   - Click "..." menu (top right)
   - "Install from VSIX..."
   - Select the `.vsix` file
   
   **Option B - Command Line:**
   ```bash
   code --install-extension scrcpy-vscode-0.1.0.vsix
   ```

4. **Restart VSCode**

5. **Use Extension:**
   - Phone icon in Activity Bar
   - Click "Start"

### Method 3: Link for Development

For development without packaging:

```bash
# Create a symlink in VSCode extensions folder
# macOS/Linux:
ln -s /Users/misterblack/code/scrcpy-extension ~/.vscode/extensions/scrcpy-vscode

# Windows:
# mklink /D "%USERPROFILE%\.vscode\extensions\scrcpy-vscode" "C:\path\to\scrcpy-extension"

# Restart VSCode
```

## Verify Installation

### Check Extension is Loaded

1. **Open Command Palette:** `Cmd+Shift+P` / `Ctrl+Shift+P`
2. **Type:** "Scrcpy"
3. **Should see:**
   - Scrcpy: Start Device Mirror
   - Scrcpy: Stop Device Mirror
   - Scrcpy: Restart Device Mirror

### Check Activity Bar

- Phone icon should appear in Activity Bar (left sidebar)

### Check Output

1. View → Output
2. Dropdown → Select "Scrcpy"
3. Should see initialization messages

## Common Build Issues

### "Cannot find module 'vscode'"

**Solution:**
```bash
npm install
npm run compile
```

### "tsc: command not found"

**Solution:**
```bash
npm install -g typescript
# or use npx:
npx tsc -p ./
```

### Compilation Errors

**View all errors:**
```bash
npx tsc --noEmit
```

**Common fixes:**
```bash
# Clean and rebuild
rm -rf out/ node_modules/
npm install
npm run compile
```

### "scrcpy: command not found" at Runtime

**Solution:**
```bash
# Verify scrcpy is installed
which scrcpy

# If not found, install it
brew install scrcpy  # macOS
```

### "Device not found" at Runtime

**Solution:**
```bash
# Check device connection
adb devices

# Should show your device, e.g.:
# List of devices attached
# ABC123456789    device

# If not found:
# 1. Check USB cable
# 2. Enable USB debugging on device
# 3. Authorize computer on device prompt
# 4. Restart ADB:
adb kill-server
adb start-server
adb devices
```

## Development Workflow

### Typical Development Cycle

1. **Start watch mode:**
   ```bash
   npm run watch
   ```

2. **Open in VSCode:**
   ```bash
   code .
   ```

3. **Press F5** to start debugging

4. **Make changes** to TypeScript files

5. **Reload Extension Development Host:**
   - Press `Cmd+R` / `Ctrl+R` in Extension Development Host
   - Or: Developer: Reload Window from Command Palette

6. **Test changes**

7. **Repeat steps 4-6**

### Debugging Tips

**Set Breakpoints:**
- Click left of line numbers in TypeScript files
- Execution pauses when breakpoint hit

**View Variables:**
- Hover over variables while paused
- Check "Variables" pane in Debug sidebar

**Console Logging:**
```typescript
console.log('Debug message:', variable);
```
- Output appears in Debug Console

**VSCode DevTools:**
- Extension Development Host: Help → Toggle Developer Tools
- Check Console, Network, Performance tabs

## Testing

### Manual Testing Checklist

- [ ] Extension activates without errors
- [ ] Activity Bar icon appears
- [ ] Panel opens
- [ ] "Start" command works
- [ ] scrcpy process starts
- [ ] Canvas renders
- [ ] Status updates correctly
- [ ] Tap on canvas works
- [ ] Swipe on canvas works
- [ ] Long press on canvas works
- [ ] "Stop" command works
- [ ] "Restart" command works
- [ ] Error handling works
- [ ] Extension deactivates cleanly

### Test with Real Device

```bash
# Verify device connected
adb devices

# Test ADB input works
adb shell input tap 100 100

# Start extension and test
```

## Performance Profiling

### Profile CPU Usage

1. Extension Development Host → Help → Toggle Developer Tools
2. Performance tab
3. Start recording
4. Use extension
5. Stop recording
6. Analyze results

### Check Memory Usage

```bash
# In Extension Development Host
# Help → Toggle Developer Tools → Memory tab
```

### Monitor Frame Rate

Add to `webview/view.js`:
```javascript
let frameCount = 0;
let lastTime = Date.now();

setInterval(() => {
    const now = Date.now();
    const fps = frameCount / ((now - lastTime) / 1000);
    console.log(`FPS: ${fps.toFixed(2)}`);
    frameCount = 0;
    lastTime = now;
}, 1000);
```

## Next Steps

### Add Real H.264 Decoder

See [DECODER_GUIDE.md](./DECODER_GUIDE.md) for instructions.

### Customize Settings

Edit `src/ScrcpyRunner.ts` to modify scrcpy parameters.

### Add Features

See [DEVELOPMENT.md](./DEVELOPMENT.md) for architecture and extension points.

### Publish Extension

See [Publishing](#publishing) in README.md

## Getting Help

- Check [README.md](./README.md)
- Review [QUICKSTART.md](./QUICKSTART.md)
- Read [DEVELOPMENT.md](./DEVELOPMENT.md)
- Check [scrcpy documentation](https://github.com/Genymobile/scrcpy)

## Success Criteria

You have successfully built and run the extension when:

✅ `npm install` completes without errors  
✅ `npm run compile` creates `out/` directory  
✅ Extension Development Host opens (F5)  
✅ Phone icon appears in Activity Bar  
✅ Panel shows UI with canvas and controls  
✅ "Start" button launches scrcpy  
✅ Status shows "Connected" or "Running"  
✅ Canvas shows frames (placeholder or real video)  
✅ Clicking canvas triggers device response  
✅ Output panel shows scrcpy logs  

Congratulations! 🎉 Your extension is working!
