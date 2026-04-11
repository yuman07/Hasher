#!/bin/bash
set -e

REPO="yuman07/Hasher"
APP_NAME="Hasher.app"
INSTALL_DIR="/Applications"
TMP_DIR=$(mktemp -d)

echo "Fetching latest release..."
DMG_URL=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
  | grep -o '"browser_download_url": *"[^"]*\.dmg"' \
  | head -1 \
  | sed 's/.*"browser_download_url": *"//;s/"$//')

if [ -z "$DMG_URL" ]; then
  echo "Error: No macOS .dmg asset found in the latest release."
  rm -rf "$TMP_DIR"
  exit 1
fi

DMG_FILE="$TMP_DIR/Hasher.dmg"

echo "Downloading $(basename "$DMG_URL")..."
curl -fsSL "$DMG_URL" -o "$DMG_FILE"

echo "Installing to $INSTALL_DIR..."
MOUNT_DIR=$(hdiutil attach "$DMG_FILE" -nobrowse -quiet | tail -1 | awk -F'\t' '{print $NF}')
cp -rf "$MOUNT_DIR/$APP_NAME" "$INSTALL_DIR/"
hdiutil detach "$MOUNT_DIR" -quiet
xattr -cr "$INSTALL_DIR/$APP_NAME"

rm -rf "$TMP_DIR"
echo "Hasher installed to $INSTALL_DIR/$APP_NAME"
