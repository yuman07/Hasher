#!/bin/bash
set -e

REPO="yuman07/Hasher"
APP_NAME="Hasher.app"
INSTALL_DIR="/Applications"
TMP_DIR=$(mktemp -d)

echo "Fetching latest release..."
TAG=$(curl -fsSI -o /dev/null -w '%{redirect_url}' "https://github.com/$REPO/releases/latest" | grep -o '[^/]*$')
VERSION=${TAG#v}
DMG_NAME="Hasher_macOS15_arm64_${VERSION}.dmg"
DMG_URL="https://github.com/$REPO/releases/download/$TAG/$DMG_NAME"
DMG_FILE="$TMP_DIR/$DMG_NAME"

echo "Downloading $DMG_NAME..."
curl -fsSL -L "$DMG_URL" -o "$DMG_FILE"

echo "Installing to $INSTALL_DIR..."
MOUNT_DIR=$(hdiutil attach "$DMG_FILE" -nobrowse -noverify 2>/dev/null | tail -1 | awk -F'\t' '{print $NF}')
cp -rf "$MOUNT_DIR/$APP_NAME" "$INSTALL_DIR/"
hdiutil detach "$MOUNT_DIR" -quiet 2>/dev/null
xattr -cr "$INSTALL_DIR/$APP_NAME"

rm -rf "$TMP_DIR"
echo "Hasher installed to $INSTALL_DIR/$APP_NAME"
