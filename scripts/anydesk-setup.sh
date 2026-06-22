#!/bin/bash
# ============================================================
# AnyDesk Full Setup Script for Android Emulator
# Usage: bash anydesk-setup.sh
# This script installs AnyDesk + AD1 plugin and configures ALL permissions
# ============================================================

ADB="/usr/local/lib/android/sdk/platform-tools/adb"
DEVICE="emulator-5554"
STORAGE="/tmp/storage"

echo "🔧 AnyDesk Full Setup - Starting..."

# Step 1: Download APKs if not present
if [ ! -f "$STORAGE/anydesk.apk" ]; then
    echo "📥 Downloading AnyDesk..."
    wget -q -O "$STORAGE/anydesk.apk" 'https://download.anydesk.com/anydesk.apk'
fi

if [ ! -f "$STORAGE/adcontrol-ad1.apk" ]; then
    echo "📥 Downloading AD1 Plugin..."
    wget -q -O "$STORAGE/adcontrol-ad1.apk" 'https://download.anydesk.com/android/plugins/adcontrol-ad1.apk'
fi

# Step 2: Install APKs
echo "📦 Installing AnyDesk..."
$ADB -s $DEVICE install -r "$STORAGE/anydesk.apk"

echo "📦 Installing AD1 Plugin..."
$ADB -s $DEVICE install -r "$STORAGE/adcontrol-ad1.apk"

# Step 3: Grant SYSTEM_ALERT_WINDOW (Overlay)
echo "🔓 Granting overlay permission..."
$ADB -s $DEVICE shell appops set com.anydesk.anydeskandroid SYSTEM_ALERT_WINDOW allow

# Step 4: Enable Accessibility Service for AD1 Plugin
echo "🔑 Enabling accessibility service..."
$ADB -s $DEVICE shell settings put secure enabled_accessibility_services "com.anydesk.adcontrol.ad1/com.anydesk.adcontrol.AccService"
$ADB -s $DEVICE shell settings put secure accessibility_enabled 1

# Step 5: Grant app ops permissions
echo "📋 Granting app ops permissions..."
$ADB -s $DEVICE shell appops set com.anydesk.anydeskandroid SYSTEM_ALERT_WINDOW allow
$ADB -s $DEVICE shell appops set com.anydesk.anydeskandroid WRITE_CLIPBOARD allow
$ADB -s $DEVICE shell appops set com.anydesk.anydeskandroid WAKE_LOCK allow
$ADB -s $DEVICE shell appops set com.anydesk.anydeskandroid START_FOREGROUND allow
$ADB -s $DEVICE shell appops set com.anydesk.anydeskandroid PROJECT_MEDIA allow

# Step 6: Grant runtime permissions
echo "🛡️ Granting runtime permissions..."
$ADB -s $DEVICE shell pm grant com.anydesk.anydeskandroid android.permission.SYSTEM_ALERT_WINDOW 2>/dev/null
$ADB -s $DEVICE shell pm grant com.anydesk.anydeskandroid android.permission.WRITE_EXTERNAL_STORAGE 2>/dev/null
$ADB -s $DEVICE shell pm grant com.anydesk.anydeskandroid android.permission.READ_EXTERNAL_STORAGE 2>/dev/null
$ADB -s $DEVICE shell pm grant com.anydesk.anydeskandroid android.permission.RECORD_AUDIO 2>/dev/null
$ADB -s $DEVICE shell pm grant com.anydesk.anydeskandroid android.permission.CAMERA 2>/dev/null
$ADB -s $DEVICE shell pm grant com.anydesk.anydeskandroid android.permission.POST_NOTIFICATIONS 2>/dev/null

# Step 7: Disable battery optimization for AnyDesk
echo "🔋 Disabling battery optimization..."
$ADB -s $DEVICE shell dumpsys deviceidle whitelist +com.anydesk.anydeskandroid 2>/dev/null

# Step 8: Launch AnyDesk
echo "🚀 Launching AnyDesk..."
$ADB -s $DEVICE shell am start -n com.anydesk.anydeskandroid/.MainActivity

echo ""
echo "✅ AnyDesk setup complete!"
echo "📱 AnyDesk ID will be shown on screen"
echo "🔗 Connect from your PC using that ID"
echo ""
echo "When connection request comes, you need to manually:"
echo "  1. Accept security warnings (2 dialogs)"
echo "  2. Accept connection request"  
echo "  3. Click 'Start now' for screen capture"
echo "  4. Open permissions (3-dot menu) and enable all checkboxes"
