## Scripts (Build / Create Apps)

These scripts group app creation by platform.

### Android
- `scripts/android/build-apk.bat` (Windows)

### iOS
- `scripts/ios/build-ios.bat` (Windows/macOS via EAS cloud build)

### Desktop
- **Windows**: `scripts/windows/build-desktop-windows.bat`
- **macOS**: `scripts/mac/build-desktop-mac.sh`

Notes:
- iOS device installs require Apple Developer credentials; the default `preview` profile is set for an iOS Simulator build.
- Desktop build here means: export web to `dist/` and launch Electron in prod mode (not a signed installer).

### Presentations
- **Sales deck (customer-facing):** `npm run ppt:sales` → creates `GEET-App-Sales-Presentation.pptx` in project root
- **Internal demo deck:** `npm run ppt:demo` → creates `POS-Billing-Product-Demo.pptx`
