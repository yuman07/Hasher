#!/bin/bash
set -e

REPO="yuman07/Hasher"
TMP_DIR=$(mktemp -d)
ZIP_FILE="$TMP_DIR/Hasher.zip"
APP_NAME="Hasher.app"
INSTALL_DIR="/Applications"

echo "Downloading Hasher..."
curl -fsSL "https://github.com/$REPO/releases/latest/download/Hasher_1.0.0_macos_aarch64.zip" -o "$ZIP_FILE"

echo "Installing to $INSTALL_DIR..."
unzip -oq "$ZIP_FILE" -d "$TMP_DIR"
cp -rf "$TMP_DIR/$APP_NAME" "$INSTALL_DIR/"
xattr -cr "$INSTALL_DIR/$APP_NAME"

rm -rf "$TMP_DIR"
echo "✅ Hasher installed to $INSTALL_DIR/$APP_NAME"
