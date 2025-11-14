# Development Guide

This guide covers development workflows, architecture decisions, and extension points.

## Development Setup

### Prerequisites

```bash
# Node.js 18+ and npm
node --version  # Should be 18.x or higher
npm --version

# Visual Studio Code
code --version
```

### Initial Setup

```bash
# Clone and install
git clone <repo-url>
cd scrcpy-extension
npm install

# Start TypeScript compiler in watch mode
npm run watch
```

### VS Code Launch Configuration

The project includes `.vscode/launch.json` (create if missing):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "${defaultBuildTask}"
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
      ],
      "outFiles": [
        "${workspaceFolder}/out/test/**/*.js"
      ]
    }
  ]
}
```

### Debug Workflow

1. Open project in VS Code
2. Press `F5` or Run → Start Debugging
3. New VS Code window opens (Extension Development Host)
4. Open Scrcpy panel from Activity Bar
5. Set breakpoints in TypeScript files
6. Interact with extension to trigger breakpoints

## Architecture Overview

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code Extension                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐      ┌─────────────────────────┐   │
│  │ extension.ts │─────▶│ ScrcpyViewProvider      │   │
│  └──────────────┘      │                         │   │
│                        │ - Manages WebView       │   │
│                        │ - Routes messages       │   │
│                        │ - Lifecycle management  │   │
│                        └────────┬────────────────┘   │
│                                 │                     │
│                                 ▼                     │
│                        ┌─────────────────────────┐   │
│                        │ ScrcpyRunner            │   │
│                        │                         │   │
│                        │ - Process management    │   │
│                        │ - Stream handling       │   │
│                        │ - ADB integration       │   │
│                        └────────┬────────────────┘   │
│                                 │                     │
└─────────────────────────────────┼─────────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  scrcpy process  │
                         │  (H.264 output)  │
                         └─────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Android Device  │
                         └─────────────────┘
```

### Data Flow

**Video Stream:**
```
Device → scrcpy → stdout → ScrcpyRunner → postMessage → WebView → Decoder → Canvas
```

**Input Events:**
```
User → Canvas → WebView → postMessage → ScrcpyRunner → ADB → Device
```

### Message Protocol

See `src/types/messages.ts` for complete definitions.

**Extension → WebView:**
- `FrameMessage`: H.264 video data
- `StatusMessage`: Connection status updates
- `DeviceInfoMessage`: Device dimensions

**WebView → Extension:**
- `TapInputMessage`: Single tap
- `SwipeInputMessage`: Drag gesture
- `LongPressInputMessage`: Press and hold
- `StartMessage`: Start scrcpy
- `StopMessage`: Stop scrcpy

## Key Components

### 1. extension.ts

**Responsibility:** Extension lifecycle and command registration

**Key Functions:**
```typescript
activate(context: ExtensionContext): void
  - Register view provider
  - Register commands
  - Setup subscriptions

deactivate(): void
  - Cleanup resources
```

**Extension Points:**
- Add new commands in `activate()`
- Register additional providers
- Setup configuration listeners

### 2. ScrcpyViewProvider.ts

**Responsibility:** WebView management and message routing

**Key Methods:**
```typescript
resolveWebviewView(webviewView: WebviewView): void
  - Create WebView HTML
  - Setup message handlers
  - Initialize UI

handleWebViewMessage(message: WebViewMessage): Promise<void>
  - Route input events
  - Handle control commands

start(): Promise<void>
  - Start scrcpy process

stop(): void
  - Stop scrcpy process
```

**Extension Points:**
- Modify WebView HTML in `_getHtmlForWebview()`
- Add message handlers in `handleWebViewMessage()`
- Implement device discovery

### 3. ScrcpyRunner.ts

**Responsibility:** Process management and ADB integration

**Key Methods:**
```typescript
start(): Promise<void>
  - Spawn scrcpy process
  - Setup stream handlers
  - Error handling

stop(): void
  - Kill process
  - Cleanup resources

tap(x: number, y: number): Promise<void>
  - Send tap via ADB

swipe(x1, y1, x2, y2, duration): Promise<void>
  - Send swipe via ADB
```

**Extension Points:**
- Modify scrcpy arguments
- Add keyboard input support
- Implement clipboard sync
- Add file transfer

### 4. WebView (view.js)

**Responsibility:** UI rendering and user interaction

**Key Functions:**
```typescript
init(): void
  - Initialize decoder
  - Setup canvas
  - Register event listeners

handleMessage(event): void
  - Process frame data
  - Update status

handleMouseDown/Up/Move(event): void
  - Capture user gestures
  - Calculate device coordinates
  - Send input messages
```

**Extension Points:**
- Add keyboard handling
- Implement multi-touch
- Add screenshot capability
- Custom gesture recognition

## Adding New Features

### Example: Keyboard Input

**1. Update Message Types:**

```typescript
// src/types/messages.ts
export interface KeyInputMessage {
  type: 'input';
  action: 'key';
  payload: {
    keyCode: number;
    keyEvent: 'down' | 'up' | 'press';
  };
}

export type WebViewMessage = ... | KeyInputMessage;
```

**2. Add Handler in ScrcpyRunner:**

```typescript
// src/ScrcpyRunner.ts
public async pressKey(keyCode: number, event: 'down' | 'up'): Promise<void> {
    const action = event === 'down' ? 'keyevent --longpress' : 'keyevent';
    await this.executeAdbCommand(`input ${action} ${keyCode}`);
}
```

**3. Add Handler in ScrcpyViewProvider:**

```typescript
// src/ScrcpyViewProvider.ts
private async handleInputMessage(message): Promise<void> {
    switch (message.action) {
        // ... existing cases
        case 'key':
            await this.scrcpyRunner.pressKey(
                message.payload.keyCode,
                message.payload.keyEvent
            );
            break;
    }
}
```

**4. Add UI in WebView:**

```javascript
// webview/view.js
document.addEventListener('keydown', (event) => {
    event.preventDefault();
    vscode.postMessage({
        type: 'input',
        action: 'key',
        payload: {
            keyCode: mapToAndroidKeyCode(event.keyCode),
            keyEvent: 'down'
        }
    });
});
```

### Example: Device Selection

**1. Add Device Discovery:**

```typescript
// src/ScrcpyRunner.ts
public async getDevices(): Promise<Device[]> {
    return new Promise((resolve, reject) => {
        const adb = spawn('adb', ['devices', '-l']);
        let output = '';
        
        adb.stdout?.on('data', (data) => {
            output += data.toString();
        });
        
        adb.on('exit', (code) => {
            if (code === 0) {
                const devices = this.parseDeviceList(output);
                resolve(devices);
            } else {
                reject(new Error('Failed to get devices'));
            }
        });
    });
}

private parseDeviceList(output: string): Device[] {
    const lines = output.split('\n').slice(1); // Skip header
    return lines
        .filter(line => line.trim())
        .map(line => {
            const [serial, ...rest] = line.split(/\s+/);
            return {
                serial,
                model: this.extractModel(rest.join(' '))
            };
        });
}
```

**2. Add Command:**

```typescript
// src/extension.ts
context.subscriptions.push(
    vscode.commands.registerCommand('scrcpy.selectDevice', async () => {
        const devices = await provider.getDevices();
        const selected = await vscode.window.showQuickPick(
            devices.map(d => ({
                label: d.model || d.serial,
                description: d.serial,
                device: d
            })),
            { placeHolder: 'Select a device' }
        );
        
        if (selected) {
            provider.setDevice(selected.device);
        }
    })
);
```

## Testing

### Manual Testing Checklist

- [ ] Extension activates without errors
- [ ] Scrcpy panel appears in Activity Bar
- [ ] Start/Stop/Restart commands work
- [ ] Video stream displays correctly
- [ ] Tap interaction works
- [ ] Swipe interaction works
- [ ] Long press interaction works
- [ ] Status updates correctly
- [ ] Error handling works
- [ ] Extension deactivates cleanly

### Unit Testing (Future)

Create `src/test/suite/` with:

```typescript
// extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('publisher.scrcpy-vscode'));
    });
    
    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('scrcpy.start'));
        assert.ok(commands.includes('scrcpy.stop'));
        assert.ok(commands.includes('scrcpy.restart'));
    });
});
```

## Performance Profiling

### VS Code DevTools

1. Help → Toggle Developer Tools
2. Go to Performance tab
3. Record while using extension
4. Analyze CPU/Memory usage

### Custom Metrics

Add to `view.js`:

```javascript
class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.startTime = Date.now();
        this.lastFrameTime = Date.now();
    }
    
    recordFrame() {
        this.frameCount++;
        const now = Date.now();
        const delta = now - this.lastFrameTime;
        this.lastFrameTime = now;
        
        return {
            fps: this.frameCount / ((now - this.startTime) / 1000),
            frameDelta: delta
        };
    }
    
    reset() {
        this.frameCount = 0;
        this.startTime = Date.now();
    }
}
```

## Debugging Tips

### scrcpy Not Working

```typescript
// Add verbose logging
const args = [
    '--verbosity=debug',  // Add this
    // ... other args
];

// Capture all output
this.process.stderr?.on('data', (data) => {
    console.log('[scrcpy stderr]:', data.toString());
});
```

### WebView Not Updating

```javascript
// Add message logging
window.addEventListener('message', (event) => {
    console.log('[WebView] Received:', event.data);
});

// Log all postMessage calls
const originalPostMessage = vscode.postMessage;
vscode.postMessage = function(message) {
    console.log('[WebView] Sending:', message);
    return originalPostMessage.call(this, message);
};
```

### Memory Leaks

```typescript
// Track resource cleanup
export function deactivate() {
    console.log('Deactivating extension...');
    // Check if all resources are disposed
    // Use Node.js memory profiling tools
}
```

## Publishing

### Prepare for Publication

1. **Update package.json:**
   ```json
   {
     "publisher": "your-publisher-name",
     "repository": "https://github.com/user/repo",
     "icon": "icon.png",
     "galleryBanner": {
       "color": "#1e1e1e",
       "theme": "dark"
     }
   }
   ```

2. **Create icon** (128x128 PNG)

3. **Test thoroughly**

4. **Create CHANGELOG.md**

### Package and Publish

```bash
# Install vsce
npm install -g @vscode/vsce

# Package
vsce package

# Publish (requires Azure DevOps token)
vsce publish
```

### Update Version

```bash
# Patch version (0.1.0 → 0.1.1)
npm version patch

# Minor version (0.1.0 → 0.2.0)
npm version minor

# Major version (0.1.0 → 1.0.0)
npm version major
```

## Best Practices

### Code Style

- Use TypeScript strict mode
- Add JSDoc comments for public methods
- Handle all error cases
- Clean up resources properly

### Performance

- Batch message sends when possible
- Use requestAnimationFrame for rendering
- Implement frame dropping for slow decoders
- Profile regularly

### Security

- Validate all WebView messages
- Use CSP (Content Security Policy)
- Sanitize user input
- Don't expose sensitive data

### User Experience

- Show clear status messages
- Handle errors gracefully
- Provide helpful error messages
- Add progress indicators for long operations

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [WebView API](https://code.visualstudio.com/api/extension-guides/webview)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)
- [ADB Commands](https://developer.android.com/studio/command-line/adb)
- [scrcpy Documentation](https://github.com/Genymobile/scrcpy)
