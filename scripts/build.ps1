# Lorvium site build.
#
# Concatenates src/css/*.css (alphabetical, prefixed 01-..12-) into
# docs/assets/styles.css, copies src/js/main.js into docs/assets/main.js,
# and stamps the SHA8 hashes into the ?v= query of every <link>/<script>
# in docs/**/*.html via the __ASSET_VERSION__ placeholder.
#
# The output files in docs/ are checked in so GitHub Pages can serve them
# directly without running this script. Run it after editing src/css/ or
# src/js/, then commit both src/ and docs/ together.
#
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1

$ErrorActionPreference = "Stop"

$root      = Split-Path -Parent $PSScriptRoot
$cssSrcDir = Join-Path $root "src\css"
$jsSrcPath = Join-Path $root "src\js\main.js"
$cssOutPath = Join-Path $root "docs\assets\styles.css"
$jsOutPath  = Join-Path $root "docs\assets\main.js"
$utf8NoBom  = [System.Text.UTF8Encoding]::new($false)

function Write-FileBytes {
    param([string]$Path, [byte[]]$Bytes)
    [System.IO.File]::WriteAllBytes($Path, $Bytes)
}

function Get-Sha8 {
    param([byte[]]$Bytes)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = $sha.ComputeHash($Bytes)
    } finally { $sha.Dispose() }
    -join ($hash[0..3] | ForEach-Object { $_.ToString("x2") })
}

# --- CSS: concat in alphabetical order (01-, 02-, ..., 12-) ---
$cssFiles = Get-ChildItem -Path $cssSrcDir -Filter "*.css" | Sort-Object Name
if ($cssFiles.Count -eq 0) {
    throw "No CSS source files found in $cssSrcDir"
}

$cssBuffer = New-Object System.IO.MemoryStream
foreach ($f in $cssFiles) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $cssBuffer.Write($bytes, 0, $bytes.Length)
}
$cssBytes = $cssBuffer.ToArray()
$cssBuffer.Dispose()
Write-FileBytes -Path $cssOutPath -Bytes $cssBytes
$cssHash = Get-Sha8 -Bytes $cssBytes
Write-Output ("CSS: {0,2} files -> {1,6} bytes  ({2})" -f $cssFiles.Count, $cssBytes.Length, $cssHash)

# --- JS: copy as-is ---
$jsBytes = [System.IO.File]::ReadAllBytes($jsSrcPath)
Write-FileBytes -Path $jsOutPath -Bytes $jsBytes
$jsHash = Get-Sha8 -Bytes $jsBytes
Write-Output ("JS : 1 file  -> {0,6} bytes  ({1})" -f $jsBytes.Length, $jsHash)

$version = "$cssHash-$jsHash"
Write-Output "Version: $version"

# --- Stamp version into ?v=... across HTML ---
# Matches either the literal __ASSET_VERSION__ placeholder or a previously
# stamped hash so subsequent builds refresh the query string in place.
$htmlFiles = Get-ChildItem -Path (Join-Path $root "docs") -Recurse -Filter "*.html"
$pattern = '(?<=(?:styles\.css|main\.js)\?v=)(?:__ASSET_VERSION__|[0-9a-f]{8}-[0-9a-f]{8})'
$stamped = 0
foreach ($h in $htmlFiles) {
    $content = [System.IO.File]::ReadAllText($h.FullName, $utf8NoBom)
    $updated = [regex]::Replace($content, $pattern, $version)
    if ($updated -ne $content) {
        [System.IO.File]::WriteAllText($h.FullName, $updated, $utf8NoBom)
        $stamped++
    }
}
Write-Output "Stamped asset version in $stamped HTML file(s)"
