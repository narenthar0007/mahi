# GEET app — Build Android APK & Install on Phone

This guide explains how to **build** the Android app (APK), **where to find** the file on your PC, **how to copy** it to a phone, and **how to install and run** it as a standalone app.

| Item | Value |
|------|--------|
| App name on phone | **GEET app** |
| Package ID | `com.riye.posbilling` |
| Installable file | `.apk` (Android package) |

You do **not** need Expo Go after installing the APK. The app runs on its own, like WhatsApp or any normal app.

---

## Before you start

### On your PC (Windows)

1. Install **Node.js** (LTS): https://nodejs.org  
2. Open a terminal in the project folder (`mahi`) and run:

```bat
npm install
```

3. For **local builds** (Method A below), you also need:
   - **Android Studio** (includes Android SDK): https://developer.android.com/studio  
   - **JDK 17** (often bundled with Android Studio)

### On your phone

- Android phone (any brand)
- Enough free storage (~70 MB for the APK)
- Allow **Install unknown apps** for the app you use to open the APK (Files, Chrome, WhatsApp, etc.)

---

## Two ways to build the APK

| Method | Best for | Build time | Needs internet |
|--------|----------|------------|----------------|
| **A — Local build (Gradle)** | You already have Android Studio; build on your PC | ~15–25 min first time | Only for `npm install` |
| **B — Cloud build (EAS)** | No Android Studio; simpler setup | ~10–15 min in cloud | Yes (Expo account) |

---

## Method A — Local build on your PC (Gradle)

Use this if you built successfully with Gradle before (e.g. `BUILD SUCCESSFUL` in the `android` folder).

### Step 1 — Generate the `android` folder (first time only)

The `android` folder is not stored in git. Create it once with:

> **Important:** Run `prebuild` from the **project root** (`mahi`), **not** from inside the `android` folder.  
> If you see `package.json does not exist` under `...\android\`, go up one folder and try again.

```bat
cd C:\Users\Naren\OneDrive\Desktop\mahi
npx expo prebuild --platform android
```

Run `prebuild` again if you change `app.json` (icon, name, permissions, etc.).

### Step 2 — Build the release APK

**Now** change into the `android` folder and run Gradle:

```bat
cd C:\Users\Naren\OneDrive\Desktop\mahi\android
gradlew.bat assembleRelease
```

On PowerShell you can also use:

```powershell
.\gradlew.bat assembleRelease
```

Wait until you see **`BUILD SUCCESSFUL`**.

### Step 3 — Where to find the APK on your PC

Open this folder in File Explorer:

```
C:\Users\Naren\OneDrive\Desktop\mahi\android\app\build\outputs\apk\release
```

**File to copy:** `app-release.apk` (about 63 MB)

Quick open from PowerShell:

```powershell
explorer "C:\Users\Naren\OneDrive\Desktop\mahi\android\app\build\outputs\apk\release"
```

### Alternative one-command build (from project root)

```bat
npm run android -- --variant release
```

This runs Expo + Gradle and installs on a **USB-connected** phone. The APK file is still in the same `release` folder above.

---

## Method B — Cloud build (EAS / Expo)

Use the batch file at the project root:

```bat
BUILD-APK.bat
```

Or from the launcher:

```bat
START.bat
```
Choose option **4 — Build Android APK**.

Or run:

```bat
npm run build:apk
```

### First time only — Expo login

1. Create a free account: https://expo.dev  
2. In the project folder:

```bat
npm exec -- eas login
```

### Where to fetch the APK (cloud build)

When the cloud build finishes, the terminal shows a **download link**. You can also open:

https://expo.dev  

→ your project **pos-billing** → **Builds** → download the **`.apk`** file.

The APK is **not** saved in the `android\app\build` folder for cloud builds — only the link / Expo dashboard.

---

## Copy the APK to your phone

Copy **`app-release.apk`** (local build) or the downloaded **`.apk`** (cloud build).

### Option 1 — USB cable

1. Connect phone to PC with USB  
2. On the phone, choose **File transfer / MTP**  
3. Copy the APK to the phone **Downloads** folder  

### Option 2 — WhatsApp / Telegram / Email

Send the APK to yourself and download it on the phone.

### Option 3 — Google Drive / OneDrive

Upload from PC, open the link on the phone, download the APK.

### Check the copy worked

On the phone, the APK should be roughly **60–65 MB**. A much smaller file means the copy failed — copy again.

---

## Install on the phone

1. Open **Files** / **My Files** / **Downloads** on the phone  
2. Tap **`app-release.apk`** (or the name you saved)  
3. If Android asks to allow installs:
   - Tap **Settings** → enable **Allow from this source**  
   - Go back and tap the APK again  
4. Tap **Install**  
5. When done, tap **Open**  

The app appears as **GEET app** on your home screen or app drawer.

---

## Run the app (after install)

1. Find **GEET app** on the phone  
2. Tap the icon — it opens like any normal app  
3. No need to run `npm start` on the PC  
4. No need for **Expo Go**  

Data (bills, inventory, etc.) is stored **on the phone** while the app is installed.

---

## Fix: “App not installed” / package conflicts with existing package

This means an older version of **GEET app** (`com.riye.posbilling`) is already installed but was signed with a **different key** (e.g. old cloud build vs new local build).

**Fix:**

1. **Settings** → **Apps** → find **GEET app**  
2. Tap **Uninstall**  
3. Install the new APK again  

> **Warning:** Uninstalling removes app data on the phone. Export or back up anything important first if your workflow supports it.

If it still fails:

- Restart the phone  
- Delete the APK on the phone and copy it again  
- Make sure you uninstalled **all** copies of GEET app / POS billing  

---

## Development vs installed app (don’t mix them up)

| What | Purpose | How to use |
|------|---------|------------|
| **`start-mobile.bat` / Expo Go** | Testing while coding | Scan QR; PC must run `npm start` |
| **Installed APK (this guide)** | Real use on any phone | Install once; runs without PC |

Building an APK is **not** the same as running `npm start`.  
`npm start` is only for development with Expo Go.

---

## Rebuild after code changes

1. Change your code on the PC  
2. Build again (Method A or B)  
3. Copy the **new** APK to the phone  
4. Install — it replaces the old version (uninstall first if you get a package conflict)  

For local builds, you usually **do not** need to run `prebuild` again unless you changed `app.json` or native plugins.

---

## Quick reference

| Step | Location / command |
|------|---------------------|
| Local build | `cd android` → `gradlew.bat assembleRelease` |
| Local APK path | `android\app\build\outputs\apk\release\app-release.apk` |
| Cloud build | `BUILD-APK.bat` or `npm run build:apk` |
| Cloud APK | Download link in terminal or https://expo.dev |
| Install | Tap APK on phone → Allow source → Install |
| Run | Open **GEET app** from app drawer |

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| `package.json does not exist` in `android` | You ran `prebuild` in the wrong folder. Use `cd ...\mahi` first, then `npx expo prebuild` |
| `gradlew` not found | Run Gradle from the `android` folder; use `gradlew.bat` on Windows |
| Build fails — no SDK | Install Android Studio; open SDK Manager; install Android SDK Platform |
| No `android` folder | From project root (`mahi`): `npx expo prebuild --platform android` |
| Install blocked | Settings → allow install from Files / Chrome / WhatsApp |
| Parse error | Re-copy the full APK (~63 MB) |
| App not installed (conflict) | Uninstall old GEET app, then install again |

For license keys used in the app, see the **key-generator** folder (`key-generator/index.html`) on your PC.


notes:
cd android
.\gradlew assembleRelease