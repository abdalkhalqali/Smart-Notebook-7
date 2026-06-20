import type { CapacitorConfig } from '@capacitor/cli';

// MOBILE BUILD NOTE:
// Before building the APK/IPA, set the VITE_SERVER_URL environment variable to
// your deployed Replit server URL (e.g. https://your-app.replit.app).
// This is what the mobile app will use to reach the AI backend.
// In the Replit Secrets panel, add: VITE_SERVER_URL = https://your-app.replit.app
// Then run: npm run build && npx cap sync android

const config: CapacitorConfig = {
  appId: 'com.unnoted.smartnotebook',
  appName: 'UnNoted',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
    // Allow the app's WebView to navigate to Replit domains for API calls
    allowNavigation: ['*.replit.dev', '*.replit.app', '*.pike.replit.dev']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Permissions: {
      // Request permissions at app startup
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Use hardware-accelerated WebView for canvas performance
    overrideUserAgent: 'UnNoted-Android/1.0'
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    overrideUserAgent: 'UnNoted-iOS/1.0'
  }
};

export default config;
