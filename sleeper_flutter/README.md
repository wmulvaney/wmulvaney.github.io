# SLEEPER — Flutter app

The native mobile app for SLEEPER. It bundles the game (served locally inside
the app, works offline) and syncs **real sleep automatically** from
**Apple Health** on iOS and **Health Connect** on Android — no manual input.
Every night your tracker records becomes the game's next night.

## Run it (from this folder)

```sh
# 1. Generate the iOS/Android platform projects (one time; keeps lib/ and pubspec)
flutter create . --org com.williammulvaney --project-name sleeper --platforms ios,android

# 2. Fetch packages
flutter pub get

# 3. Apply the platform config below, then run on a plugged-in phone
flutter run
```

## One-time platform config

### iOS (`ios/`)

1. In Xcode (`open ios/Runner.xcworkspace`): Runner target →
   **Signing & Capabilities → + Capability → HealthKit**.
2. Add to `ios/Runner/Info.plist`:

```xml
<key>NSHealthShareUsageDescription</key>
<string>SLEEPER reads your sleep so your real nights power your athlete.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>SLEEPER does not write health data.</string>
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

### Android (`android/`)

1. In `android/app/build.gradle`, set `minSdk = 28`.
2. In `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- next to the other top-level elements -->
<uses-permission android:name="android.permission.health.READ_SLEEP"/>

<!-- on the <application> tag (the game is served from localhost inside the app) -->
android:usesCleartextTraffic="true"

<!-- inside <application>, Health Connect's permission-rationale hook -->
<activity-alias
    android:name="ViewPermissionUsageActivity"
    android:exported="true"
    android:targetActivity=".MainActivity"
    android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
  <intent-filter>
    <action android:name="android.intent.action.VIEW_PERMISSION_USAGE"/>
    <category android:name="android.intent.category.HEALTH_PERMISSIONS"/>
  </intent-filter>
</activity-alias>
```

## How it works

- `lib/main.dart` starts a localhost server over the bundled game
  (`assets/www/`, a copy of `public/athlete/`) and shows it in a full-screen
  webview. On launch and every time the app returns to the foreground it reads
  the last 14 days of sleep and injects new nights into the game through
  `window.__sleeperNative.pushNights(...)` (defined in the game's `ui.js`).
- `lib/health_sync.dart` aggregates raw Health sleep segments (deep/REM/light/
  awake/in-bed) into per-night summaries; the game scores them with its own
  sleep-score model and de-dupes by date, so re-syncing is always safe.
- The game itself is unchanged web code — update it by editing
  `public/athlete/` and running `scripts/sync-game.sh`.

## Updating the bundled game

```sh
./scripts/sync-game.sh   # copies public/athlete/ → assets/www/
flutter run              # or build
```

## Ship it

- iOS: `flutter build ipa` (needs an Apple Developer account), upload with
  Xcode/Transporter, submit for review.
- Android: `flutter build appbundle`, upload in Play Console.
