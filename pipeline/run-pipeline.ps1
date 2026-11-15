# MARS+ pipeline orchestrator (PowerShell 5.1 + C#). All inputs come from config/.
#   -Step download   01-download: terrain window (DTM + ortho), MEDA, RAD, references (geology, thermal, waypoints)
#   -Step process    02-process: geology clip + raster, MEDA summaries, RAD extraction, rover traverse
#   -Step export     04-export: app/data/sites/<site>/ + manifest (uses 03-model/RouteEngine.cs)
#   -Step all        download -> process -> export (downloads skip files that already exist)
#   -IncludeRoverImages   also index and download the curated rover images (slow; not needed by the app)
# AI-assisted (Claude). Reviewed by the MARS+ team.
param([ValidateSet('download', 'process', 'export', 'all')][string]$Step = 'export', [switch]$IncludeRoverImages)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$steps = @{
  download = @('01-download\download-references.ps1', '01-download\download-terrain.ps1', '01-download\download-meda.ps1', '01-download\download-rad.ps1')
  process  = @('02-process\process-geology.ps1', '02-process\summarize-meda.ps1', '02-process\extract-rad.ps1', '02-process\build-traverse.ps1')
  export   = @('04-export\export-web-data.ps1')
}
$order = if ($Step -eq 'all') { 'download', 'process', 'export' } else { , $Step }
$sw = [Diagnostics.Stopwatch]::StartNew()
foreach ($s in $order) {
  $scripts = $steps[$s]
  if ($s -eq 'download' -and $IncludeRoverImages) { $scripts += '01-download\download-rover-images.ps1' }
  foreach ($script in $scripts) {
    Write-Host "=== $s :: $script" -ForegroundColor Cyan
    & (Join-Path $here $script)
  }
}
Write-Host ("Pipeline '{0}' finished in {1:N0} s" -f $Step, $sw.Elapsed.TotalSeconds) -ForegroundColor Green
