#!/usr/bin/env bash
# Builds the iOS app and deploys it to a physical device using xcrun devicectl,
# bypassing Expo CLI's LockdowndClient which does not support iOS 26+.

set -e

DEVICE_UDID="${DEVICE_UDID:-00008140-000435922184801C}"
BUNDLE_ID="edu.citu.urolens.mobile"
SCHEME="UroLens"
WORKSPACE="ios/UroLens.xcworkspace"
CONFIGURATION="${CONFIGURATION:-Debug}"

# ── 0. Strip push entitlement ──────────────────────────────────────────────────
# The personal team's provisioning profile has no Push Notifications capability,
# so signing fails if expo-notifications' aps-environment entitlement is present.
ENTITLEMENTS="ios/UroLens/UroLens.entitlements"
/usr/libexec/PlistBuddy -c "Delete :aps-environment" "$ENTITLEMENTS" 2>/dev/null || true

# ── 1. Pod install ─────────────────────────────────────────────────────────────
echo "▶ Running pod install..."
(cd ios && pod install --repo-update)

# ── 2. xcodebuild ──────────────────────────────────────────────────────────────
echo "▶ Building $SCHEME..."
set -o pipefail
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -destination "id=$DEVICE_UDID" \
  -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=657674YRX5 \
  | (command -v xcpretty >/dev/null && xcpretty --color || cat)

# ── 3. Locate the built .app ───────────────────────────────────────────────────
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "${SCHEME}.app" \
  -path "*/Build/Products/${CONFIGURATION}-iphoneos/*" -not -path "*/Index.noindex/*" 2>/dev/null | head -1)

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

if [ "$CONFIGURATION" = "Debug" ]; then
  echo "✅ Done — make sure 'npx expo start' is running for the JS bundle."
else
  echo "✅ Done — $CONFIGURATION build has the JS bundled in; no Metro needed."
fi
