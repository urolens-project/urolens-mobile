#!/usr/bin/env bash
# Builds the iOS app and deploys it to a physical device using xcrun devicectl,
# bypassing Expo CLI's LockdowndClient which does not support iOS 26+.

set -e

DEVICE_UDID="FF888CF0-B419-50CE-8566-F435BC9E9919"
BUNDLE_ID="edu.citu.urolens.mobile"
SCHEME="UroLens"
WORKSPACE="ios/UroLens.xcworkspace"
CONFIGURATION="Debug"

# ── 1. Pod install ─────────────────────────────────────────────────────────────
echo "▶ Running pod install..."
(cd ios && pod install --repo-update)

# ── 2. xcodebuild ──────────────────────────────────────────────────────────────
echo "▶ Building $SCHEME..."
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -destination "id=$DEVICE_UDID" \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=657674YRX5 \
  | xcpretty --color 2>/dev/null || cat

# ── 3. Locate the built .app ───────────────────────────────────────────────────
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "${SCHEME}.app" \
  -path "*/${CONFIGURATION}-iphoneos/*" 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
  echo "❌ Could not find built .app in DerivedData" >&2
  exit 1
fi
echo "▶ Found app: $APP_PATH"

# ── 4. Install on device ───────────────────────────────────────────────────────
echo "▶ Installing on device $DEVICE_UDID..."
xcrun devicectl device install app \
  --device "$DEVICE_UDID" \
  "$APP_PATH"

# ── 5. Launch on device ────────────────────────────────────────────────────────
echo "▶ Launching $BUNDLE_ID..."
xcrun devicectl device process launch \
  --device "$DEVICE_UDID" \
  "$BUNDLE_ID"

echo "✅ Done — make sure 'npx expo start' is running for the JS bundle."
