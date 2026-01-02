# Troubleshooting

## Metro Bundler Cache Issues

If you're seeing module resolution errors after installing new packages:

1. **Stop the Expo server** (Ctrl+C)

2. **Clear all caches:**
   ```bash
   rm -rf .expo
   rm -rf node_modules/.cache
   watchman watch-del-all  # if you have watchman installed
   ```

3. **Restart with cache cleared:**
   ```bash
   npx expo start --clear
   ```

4. **If still having issues, reinstall node_modules:**
   ```bash
   rm -rf node_modules
   npm install
   npx expo start --clear
   ```

## Common Module Resolution Errors

### expo-status-bar or other expo packages
- Make sure the package is in `package.json`
- Run `npm install` to ensure it's in `node_modules`
- Clear Metro cache (see above)
- Restart Expo server

### react-native-safe-area-context
- This is required by expo-router
- Should be automatically installed, but if missing:
  ```bash
  npm install react-native-safe-area-context
  ```

## iOS Simulator Issues

### App won't reload
- Press `r` in the Expo terminal to reload
- Or shake the device in simulator and select "Reload"
- Or press `Cmd+R` in the simulator

### Build errors
- Make sure you're using the correct iOS simulator version
- Try: `npx expo run:ios` to rebuild native code



