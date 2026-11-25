$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    python -m unittest discover -s tests -v
    python build.py
    $iscc = @(
        "$env:ProgramFiles(x86)\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $iscc) { throw 'Inno Setup 6 is not installed. Install it before building the installer.' }
    & $iscc .\installer\LegalVault-Pro.iss
    if (-not (Test-Path .\installer-output\LegalVault-Pro-Setup.exe)) { throw 'Installer output was not created.' }
    Write-Host (Resolve-Path .\installer-output\LegalVault-Pro-Setup.exe)
} finally { Pop-Location }
