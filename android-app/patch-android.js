// Runs once after `npx cap add android`. The android/ folder is generated (not committed),
// so app-specific native settings are applied here:
//  - location permissions (GPS navigation)
//  - TTS service query (voice guidance on Android 11+)
//  - versionCode taken from the CI run number, so every build installs as an update
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, 'android', 'app');

// --- AndroidManifest.xml ---
const manifestPath = path.join(appDir, 'src', 'main', 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');
const additions = `
    <!-- added by patch-android.js -->
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
    <queries>
        <intent>
            <action android:name="android.intent.action.TTS_SERVICE" />
        </intent>
    </queries>
`;
if (!manifest.includes('ACCESS_FINE_LOCATION')) {
  if (!manifest.includes('</manifest>')) throw new Error('Unexpected AndroidManifest.xml format');
  manifest = manifest.replace('</manifest>', additions + '</manifest>');
  fs.writeFileSync(manifestPath, manifest);
  console.log('AndroidManifest.xml: permissions added');
}

// --- app/build.gradle: versionCode / versionName ---
const run = parseInt(process.env.GITHUB_RUN_NUMBER || '', 10);
if (run > 0) {
  const gradlePath = path.join(appDir, 'build.gradle');
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  const before = gradle;
  gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode ' + run)
                 .replace(/versionName\s+"[^"]*"/, 'versionName "1.0.' + run + '"');
  if (gradle === before) throw new Error('Could not set versionCode in app/build.gradle');
  fs.writeFileSync(gradlePath, gradle);
  console.log('build.gradle: version set to 1.0.' + run);
}
