# SLEEPER — native (Godot 4)

The fully native port of SLEEPER: a real game engine (Metal/Vulkan/GL
renderers), no webview anywhere. The 3D island, the character, the sleep-driven
career sim — all built in-engine, all plain text files.

## Run it

1. Download Godot 4.3+ (free, ~50 MB): https://godotengine.org/download
2. Open Godot → **Import** → pick this folder (`sleeper_godot/project.godot`).
3. Press **▶ Play**. Move with the on-screen joystick (or arrow keys/WASD on
   desktop), walk up to a building to enter it.

## Ship it to phones

- **iOS**: Project → Export → iOS (needs Xcode + an Apple Developer account).
  Godot generates the Xcode project; build and submit like any native app.
- **Android**: Project → Export → Android (needs Android SDK). Produces an
  APK/AAB for the Play Store.
- Details: https://docs.godotengine.org/en/stable/tutorials/export/

## What's in stage 1 (this build)

- Procedural 3D island — home, gym, park, school, shop — with real engine
  lighting and shadows, portrait mobile layout, virtual joystick + keyboard.
- Walk-up building entry with sliding panels (same interaction model as the
  web build).
- The sleep-only energy economy, ported 1:1 from the web build: sleep scores
  a night (same weighted model), sets energy, and energy refills in real time
  — faster after better sleep.
- Training drills (gains scale with recovery), pickup runs, league games,
  seasons, aging youth → HS → college → pro with auto sport/position commit.
- Save/load (`user://sleeper_save.json`), persistent across launches.

## Roadmap to parity with the web build

1. Real device sleep sync (native HTTPS to the Oura/Whoop sync worker; then
   an iOS HealthKit plugin for Apple Health).
2. Onboarding (name, look, youth-sport picks) + avatar colors on the model.
3. Interiors per building, teammates/chemistry, badges, rival, standings,
   playoffs, contracts, the Feed, Hall of Legacies.
4. Sound, weather/day-night atmosphere, animations and juice.

## Code layout

- `scripts/game_data.gd` — sports, positions, drills, eras (from `data.js`)
- `scripts/sleep_model.gd` — sleep scoring + energy economy (from `sleep.js`)
- `scripts/game_state.gd` — autoloaded game state + rules (from `engine.js`)
- `scenes/world.gd` — procedural island, character, camera (from `world.js`)
- `scenes/hud.gd` / `scenes/joystick.gd` — HUD, panels, touch controls
