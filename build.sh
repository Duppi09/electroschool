#!/bin/bash
# Sestaví ElectroSchool.app (univerzální binárka pro Intel i Apple Silicon).
# Použití: ./build.sh            -> build/ElectroSchool.app
set -euo pipefail
cd "$(dirname "$0")"
APP="build/ElectroSchool.app"
VERSION="1.0"

python3 tools/gen_examples.py
rm -rf build && mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/app"

for arch in arm64 x86_64; do
  swiftc -O -target "$arch-apple-macos11.0" mac/main.swift -o "build/ElectroSchool-$arch" -framework Cocoa -framework WebKit 2>&1 | grep -v "warning:" || true
done
lipo -create build/ElectroSchool-arm64 build/ElectroSchool-x86_64 -output "$APP/Contents/MacOS/ElectroSchool"
rm build/ElectroSchool-arm64 build/ElectroSchool-x86_64

cp app/index.html app/style.css app/core.js app/symbols.js app/real.js app/calc.js app/ui.js app/examples.js "$APP/Contents/Resources/app/"

# ikona
swift mac/icon.swift build/icon.png
mkdir -p build/AppIcon.iconset
for s in 16 32 128 256 512; do
  sips -z $s $s build/icon.png --out "build/AppIcon.iconset/icon_${s}x${s}.png" >/dev/null
  sips -z $((s*2)) $((s*2)) build/icon.png --out "build/AppIcon.iconset/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns build/AppIcon.iconset -o "$APP/Contents/Resources/AppIcon.icns"
rm -rf build/AppIcon.iconset build/icon.png

cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>ElectroSchool</string>
  <key>CFBundleDisplayName</key><string>ElectroSchool</string>
  <key>CFBundleIdentifier</key><string>local.electroschool</string>
  <key>CFBundleExecutable</key><string>ElectroSchool</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>CFBundleDevelopmentRegion</key><string>cs</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSPrincipalClass</key><string>NSApplication</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.education</string>
  <key>NSHumanReadableCopyright</key><string>Simulátor elektrických schémat, čte a ukládá soubory .cad.</string>
  <key>CFBundleDocumentTypes</key><array><dict>
    <key>CFBundleTypeName</key><string>Schéma CADe_SIMU</string>
    <key>CFBundleTypeExtensions</key><array><string>cad</string><string>CAD</string></array>
    <key>CFBundleTypeRole</key><string>Editor</string>
    <key>LSHandlerRank</key><string>Alternate</string>
  </dict></array>
</dict></plist>
EOF

codesign --force --deep -s - "$APP" 2>/dev/null
echo "Hotovo: $APP"
