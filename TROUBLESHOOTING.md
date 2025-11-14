# Troubleshooting Guide

Common issues and their solutions for the Scrcpy VSCode Extension.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Build Issues](#build-issues)
3. [Runtime Issues](#runtime-issues)
4. [Device Connection Issues](#device-connection-issues)
5. [Video Stream Issues](#video-stream-issues)
6. [Touch Input Issues](#touch-input-issues)
7. [Performance Issues](#performance-issues)
8. [Extension Not Loading](#extension-not-loading)

---

## Installation Issues

### scrcpy not found

**Error:** "scrcpy is not installed"

**Solution:**
```bash
# macOS
brew install scrcpy

# Linux (Ubuntu/Debian)
sudo apt install scrcpy

# Verify installation
which scrcpy
scrcpy --version
```

### ADB not found

**Error:** "adb: command not found"

**Solution:**
```bash
# macOS
brew install android-platform-tools

# Linux
sudo apt install android-tools-adb

# Verify
which adb
adb version
```

### Node.js version too old

**Error:** "Requires Node.js 18 or higher"

**Solution:**
```bash
# Check version
node --version

# Update via Homebrew (macOS)
brew upgrade node

# Or download from nodejs.org
```

---

## Build Issues

### Cannot find module 'vscode'

**Error:**
```
Cannot find module 'vscode' or its corresponding type declarations.
```

**Solution:**
```bash
# Install dependencies
npm install

# If still failing, clear cache
rm -rf node_modules package-lock.json
npm install
```

### TypeScript compilation errors

**Error:** Multiple TypeScript errors

**Solution:**
```bash
# Check TypeScript version
npx tsc --version

# Clean rebuild
rm -rf out/
npm run compile

# Check for errors without building
npx tsc --noEmit
```

### npm install fails

**Error:** Various npm errors during install

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try with legacy peer deps
npm install --legacy-peer-deps
```

---

## Runtime Issues

### Extension won't activate

**Symptoms:** No errors, but extension doesn't appear

**Solution:**

1. Check Extension is installed:
   ```
   Extensions view → Search "scrcpy"
   ```

2. Check for activation errors:
   ```
   View → Output → Select "Extension Host"
   ```

3. Reload window:
   ```
   Cmd/Ctrl+Shift+P → "Developer: Reload Window"
   ```

4. Check extension log:
   ```
   ~/.vscode/extensions/logs/
   ```

### "Cannot read property of undefined"

**Error:** Runtime errors in Output panel

**Solution:**

1. Check all dependencies are installed:
   ```bash
   npm list
   ```

2. Rebuild:
   ```bash
   npm run compile
   ```

3. Check for missing files:
   ```bash
   ls out/
   ls webview/
   ```

### Extension crashes on start

**Symptoms:** Extension Development Host closes immediately

**Solution:**

1. Check for syntax errors:
   ```bash
   npm run lint
   ```

2. Check Debug Console for errors:
   ```
   View → Debug Console
   ```

3. Add breakpoint in extension.ts activate() and debug

---

## Device Connection Issues

### "No devices found"

**Error:** scrcpy can't find device

**Solution:**

1. Check USB connection:
   ```bash
   adb devices
   ```

2. Should see:
   ```
   List of devices attached
   ABC123456    device
   ```

3. If "unauthorized":
   - Check device screen for authorization prompt
   - Click "Allow" on device
   - Run `adb devices` again

4. If no devices listed:
   - Check USB cable (try different cable)
   - Enable USB debugging on device
   - Try different USB port
   - Restart ADB:
     ```bash
     adb kill-server
     adb start-server
     ```

### Device disconnects frequently

**Symptoms:** Connection drops after a few seconds/minutes

**Solution:**

1. Enable "Stay Awake":
   - Settings → Developer Options → Stay Awake

2. Disable battery optimization:
   - Settings → Battery → App optimization
   - Find "USB debugging" → Don't optimize

3. Use high-quality USB cable

4. Disable USB selective suspend (Windows):
   - Power Options → Advanced → USB settings

### Multiple devices connected

**Error:** "More than one device"

**Solution:**

1. Get device serial:
   ```bash
   adb devices -l
   ```

2. Modify `src/ScrcpyRunner.ts`:
   ```typescript
   const args = [
       '-s', 'YOUR_DEVICE_SERIAL',  // Add this line
       '--video-codec=h264',
       // ... rest of args
   ];
   ```

3. Or disconnect other devices

---

## Video Stream Issues

### Black screen / No video

**Symptoms:** Canvas shows black or nothing

**Expected behavior:** The stub decoder shows placeholder frames with frame size info. If you see completely black, there's an issue.

**Solution:**

1. Check Output panel for scrcpy errors:
   ```
   View → Output → Select "Scrcpy"
   ```

2. Check WebView console:
   - Help → Toggle Developer Tools
   - Console tab
   - Look for errors

3. Verify scrcpy is running:
   ```bash
   ps aux | grep scrcpy
   ```

4. Test scrcpy directly:
   ```bash
   scrcpy --no-display --video-codec=h264
   ```

5. Check decoder is initialized:
   - WebView console should show "H264 Decoder initialized"

### Only placeholder frames showing

**Symptoms:** Canvas shows colored frames with "Install real H.264 decoder"

**This is expected!** The extension includes a stub decoder.

**Solution:** To get actual video, integrate a real decoder:
1. Read [DECODER_GUIDE.md](./DECODER_GUIDE.md)
2. Install Broadway.js or ffmpeg.wasm
3. Replace `webview/h264/decoder.js`

### Video is choppy / laggy

**Symptoms:** Frame drops, stuttering

**Solution:**

1. Lower resolution in `src/ScrcpyRunner.ts`:
   ```typescript
   '--max-size=720',  // or 480
   ```

2. Reduce frame rate:
   ```typescript
   '--max-fps=15',
   ```

3. Lower bitrate:
   ```typescript
   '--video-bit-rate=2M',
   ```

4. Close other apps on device

5. Use USB 3.0 port if available

---

## Touch Input Issues

### Taps not working

**Symptoms:** Clicking canvas doesn't trigger device

**Solution:**

1. Check ADB works directly:
   ```bash
   adb shell input tap 100 100
   ```

2. Check WebView console for messages being sent:
   ```
   Help → Toggle Developer Tools → Console
   ```

3. Check Output panel for ADB errors:
   ```
   View → Output → Select "Scrcpy"
   ```

4. Verify device is unlocked

### Wrong coordinates

**Symptoms:** Taps land in wrong location

**Solution:**

1. Device resolution might be different than expected. Check device resolution:
   ```bash
   adb shell wm size
   ```

2. Update coordinate mapping in `webview/view.js` if needed

3. Check canvas dimensions match device aspect ratio

### Swipes not recognized

**Symptoms:** Drags don't work or act like taps

**Solution:**

1. Increase distance threshold in `webview/view.js`:
   ```javascript
   if (distance > 10) {  // Try increasing to 20
   ```

2. Check ADB swipe command:
   ```bash
   adb shell input swipe 100 100 200 200 300
   ```

---

## Performance Issues

### High CPU usage

**Symptoms:** 100% CPU, fans running

**Solution:**

1. Lower scrcpy settings (see [Video is choppy](#video-is-choppy--laggy))

2. Use hardware encoder on device:
   ```typescript
   '--encoder-name=OMX.google.h264.encoder',
   ```

3. Implement frame dropping in decoder

4. Close other VSCode windows/extensions

### High memory usage

**Symptoms:** Memory keeps growing

**Solution:**

1. Check for memory leaks in decoder:
   - Clear frame queue regularly
   - Dispose of canvas contexts

2. Restart extension periodically

3. Check Chrome DevTools Memory profiler:
   - Help → Toggle Developer Tools → Memory

### Slow UI responsiveness

**Symptoms:** UI freezes or is sluggish

**Solution:**

1. Move decoding to Web Worker (see [DECODER_GUIDE.md](./DECODER_GUIDE.md))

2. Reduce canvas update frequency

3. Use `requestAnimationFrame` for rendering

---

## Extension Not Loading

### Extension not in Activity Bar

**Solution:**

1. Check extension is enabled:
   - Extensions view → Search "scrcpy"
   - Ensure not disabled

2. Check Activity Bar is visible:
   - View → Appearance → Activity Bar

3. Reset Activity Bar:
   - Right-click Activity Bar → Reset Location

### Commands not appearing

**Solution:**

1. Reload window:
   ```
   Cmd/Ctrl+Shift+P → "Developer: Reload Window"
   ```

2. Check package.json contributes section

3. Reinstall extension:
   ```bash
   code --uninstall-extension publisher.scrcpy-vscode
   code --install-extension scrcpy-vscode-0.1.0.vsix
   ```

### WebView not rendering

**Symptoms:** Empty panel

**Solution:**

1. Check browser console:
   - Help → Toggle Developer Tools

2. Check CSP errors in console

3. Verify webview files exist:
   ```bash
   ls webview/
   ```

4. Check resource URIs are correct in ScrcpyViewProvider.ts

---

## Debug Tips

### Enable verbose logging

Add to `src/ScrcpyRunner.ts`:
```typescript
console.log('[ScrcpyRunner]', 'Your debug message');
```

Add to `webview/view.js`:
```javascript
console.log('[WebView]', 'Your debug message');
```

### View all messages

In `src/ScrcpyViewProvider.ts`:
```typescript
webviewView.webview.onDidReceiveMessage((message) => {
    console.log('[Message from WebView]:', message);
    // ... existing code
});
```

In `webview/view.js`:
```javascript
window.addEventListener('message', (event) => {
    console.log('[Message from Extension]:', event.data);
    // ... existing code
});
```

### Check scrcpy output

The Output panel (View → Output → "Scrcpy") shows:
- scrcpy stdout/stderr
- Connection status
- ADB command results
- Errors

### Use breakpoints

1. Set breakpoints in TypeScript files
2. Press F5 to start debugging
3. Trigger the code path
4. Inspect variables when paused

### Check process list

```bash
# Check if scrcpy is running
ps aux | grep scrcpy

# Check ADB server
ps aux | grep adb

# Kill if needed
killall scrcpy
adb kill-server
```

---

## Getting More Help

### Check Documentation
- [README.md](./README.md) - Full documentation
- [QUICKSTART.md](./QUICKSTART.md) - Setup guide
- [BUILD_AND_RUN.md](./BUILD_AND_RUN.md) - Build instructions
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Architecture guide

### Check Logs
1. VSCode Output panel (View → Output)
2. Extension Host log
3. WebView DevTools Console
4. Terminal where VSCode was launched

### Test Components Independently

**Test scrcpy:**
```bash
scrcpy
```

**Test ADB:**
```bash
adb devices
adb shell input tap 100 100
```

**Test extension compilation:**
```bash
npm run compile
npx tsc --noEmit
```

### Report Issues

When reporting issues, include:
1. VSCode version
2. Extension version
3. Operating system
4. scrcpy version
5. ADB version
6. Device model and Android version
7. Error messages from Output panel
8. Console errors from DevTools
9. Steps to reproduce

### Community Resources
- scrcpy GitHub: https://github.com/Genymobile/scrcpy
- VSCode Extension API: https://code.visualstudio.com/api
- ADB Documentation: https://developer.android.com/studio/command-line/adb

---

## Quick Diagnostic Commands

Run these to check your setup:

```bash
# Check prerequisites
node --version          # Should be 18+
npm --version          
code --version
scrcpy --version
adb version

# Check device
adb devices            # Should show your device

# Check project
cd scrcpy-extension
ls out/                # Should exist after npm run compile
ls webview/            # Should contain view.js, style.css, etc.

# Test components
adb shell input tap 100 100  # Test ADB input
scrcpy --help                 # Test scrcpy

# Check VSCode
code --list-extensions        # Should include your extension if installed
```

---

**Still having issues?** Open an issue on GitHub with the information above!
