# LegalVault Pro Windows installer

Build the executable first with `python build.py`, then compile `LegalVault-Pro.iss` with Inno Setup (`ISCC.exe`).

The installer accepts any user-selected destination through the standard Inno Setup directory page. It creates Start Menu shortcuts, an optional Desktop shortcut, an Installed Apps entry, and an uninstaller. User records remain in `%LOCALAPPDATA%\LegalVaultPro\BrowserData` and are intentionally preserved when the program is uninstalled.
