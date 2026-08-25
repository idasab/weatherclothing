import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Byt till ditt eget bundle-id innan du signerar i Xcode.
  appId: 'com.example.kladvadret',
  appName: 'Klädvädret',
  // Måste peka på Angulars byggmapp, se outputPath i angular.json.
  webDir: 'dist/weather-clothing',
  ios: {
    // 'never' låter webbvyn gå ända ut i kanterna så att våra egna
    // env(safe-area-inset-*) i CSS:en styr marginalerna i stället.
    contentInset: 'never',
  },
};

export default config;
