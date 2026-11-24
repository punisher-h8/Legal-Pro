"""Build on Windows with: python build.py"""
from pathlib import Path
import os
import subprocess
import sys

root = Path(__file__).resolve().parent
if os.name != 'nt':
    raise SystemExit('Build the Windows EXE on Windows or use GitHub Actions.')
subprocess.run([sys.executable, '-m', 'PyInstaller', '--noconfirm', '--clean',
                '--onefile', '--windowed', '--noupx', '--name', 'LegalVault-Pro',
                '--add-data', f'{root / "web"}:web', str(root / 'app.py')],
               cwd=root, check=True)
print(root / 'dist' / 'LegalVault-Pro.exe')
