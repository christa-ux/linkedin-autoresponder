# Keep the computer awake for the test window

The bot must run until the test page says "Test finished" (up to ~24 h).

- **macOS:** handled automatically (`caffeinate -dimsu` runs while the bot runs). Also: plug in the charger, and keep the lid open or use an external display.
- **Windows:** Settings → System → Power → Screen and sleep → *Never* (plugged in), or `powercfg /change standby-timeout-ac 0`.
- **Linux:** `systemd-inhibit --what=sleep:idle npm run bot:start`.

Also: stable Wi-Fi, and don't keep the bot account's chat open in another browser or the app (drafts sync and can interfere).
