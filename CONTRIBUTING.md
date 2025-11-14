# Contributing to Scrcpy VSCode Extension

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Be respectful, constructive, and professional. We want to foster an inclusive and welcoming community.

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check if the issue already exists
2. Verify you're using the latest version
3. Ensure scrcpy and ADB are properly installed

When reporting a bug, include:
- VSCode version
- Extension version
- Operating system
- scrcpy version (`scrcpy --version`)
- ADB version (`adb version`)
- Steps to reproduce
- Expected behavior
- Actual behavior
- Logs from Output panel (Scrcpy channel)
- Screenshots if applicable

### Suggesting Features

Feature requests are welcome! Please:
1. Check if it's already suggested
2. Explain the use case
3. Describe the expected behavior
4. Consider implementation complexity

### Pull Requests

1. **Fork the repository**

2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes:**
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation if needed

4. **Test your changes:**
   - Manual testing in Extension Development Host
   - Verify no regressions
   - Test with real devices

5. **Commit with clear messages:**
   ```bash
   git commit -m "feat: add keyboard input support"
   ```

   Use conventional commits:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation
   - `refactor:` - Code refactoring
   - `test:` - Tests
   - `chore:` - Maintenance

6. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create Pull Request:**
   - Describe what changed and why
   - Reference related issues
   - Include screenshots/videos if UI changed

## Development Setup

### Prerequisites
```bash
node --version  # 18+
npm --version
code --version
```

### Setup
```bash
git clone https://github.com/yourusername/scrcpy-extension.git
cd scrcpy-extension
npm install
npm run compile
```

### Development Workflow
```bash
# Watch mode for TypeScript
npm run watch

# Run extension
# Press F5 in VSCode

# Lint
npm run lint

# Package
npm run package
```

## Project Structure

```
src/
  extension.ts           - Entry point
  ScrcpyViewProvider.ts  - WebView management
  ScrcpyRunner.ts        - Process management
  types/
    messages.ts          - Type definitions

webview/
  view.js               - WebView logic
  style.css             - Styling
  h264/
    decoder.js          - H.264 decoder

package.json            - Extension manifest
tsconfig.json          - TypeScript config
```

## Coding Guidelines

### TypeScript

- Use strict mode
- Add type annotations
- Avoid `any` type
- Use meaningful variable names

**Good:**
```typescript
public async tap(x: number, y: number): Promise<void> {
    await this.executeAdbCommand(`input tap ${Math.round(x)} ${Math.round(y)}`);
}
```

**Bad:**
```typescript
public async tap(x: any, y: any): Promise<any> {
    await this.executeAdbCommand(`input tap ${x} ${y}`);
}
```

### Documentation

Add JSDoc comments for public methods:

```typescript
/**
 * Send tap event to device
 * @param x X coordinate in device pixels
 * @param y Y coordinate in device pixels
 */
public async tap(x: number, y: number): Promise<void> {
    // ...
}
```

### Error Handling

Always handle errors gracefully:

```typescript
try {
    await this.scrcpyRunner.start();
} catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to start: ${message}`);
}
```

### Resource Cleanup

Always dispose resources:

```typescript
export function deactivate() {
    // Clean up all resources
    if (provider) {
        provider.dispose();
    }
}
```

## Testing Checklist

Before submitting a PR, verify:

- [ ] Extension activates without errors
- [ ] All commands work
- [ ] Video stream works (or stub displays correctly)
- [ ] Touch input works
- [ ] Error handling works
- [ ] No console errors
- [ ] No memory leaks
- [ ] Documentation updated
- [ ] CHANGELOG.md updated

## Areas That Need Contributions

### High Priority
- Real H.264 decoder integration (Broadway.js/ffmpeg.wasm)
- Better error messages
- Unit tests

### Medium Priority
- Keyboard input support
- Device selection UI
- Configuration settings
- Performance optimization

### Low Priority
- Multi-touch support
- Screen recording
- Screenshot feature
- Wireless ADB

## Review Process

1. Maintainer reviews code
2. Feedback provided if changes needed
3. Once approved, PR is merged
4. Changes included in next release

## Questions?

- Open a Discussion on GitHub
- Check existing issues
- Read the documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## Recognition

Contributors will be acknowledged in:
- README.md
- Release notes
- Project documentation

Thank you for contributing! 🎉
