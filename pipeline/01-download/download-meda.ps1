# Downloads MEDA derived products (TIRS, WS, PS, RHS) for the rover sols at Landing and at Issole (NASA PDS Atmospheres).
# Existing files are skipped. Some early sols have no derived products in the PDS; they are reported, not treated as errors.
# AI-assisted (Claude). Reviewed by the MARS+ team.
param([string]$OutDir, [int[]]$Sols)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\common\config.ps1')
$cfg = Get-MarsConfig
$src = $cfg.Site.sources
$out = if ($OutDir) { $OutDir } else { Resolve-RepoPath $cfg.Root $cfg.Site.rawData.medaDir }
New-Item -ItemType Directory -Force $out | Out-Null
if (-not $Sols) { $Sols = @($src.medaSols.landing[0]..$src.medaSols.landing[1]) + @($src.medaSols.issole[0]..$src.medaSols.issole[1]) }
$pattern = '_DER_(' + ($src.medaProducts -join '|') + ')_.*\.CSV$'

function Get-SolFolder([int]$sol) {
  foreach ($range in @(@(0, 89), @(90, 179), @(180, 299), @(300, 419), @(420, 539))) {
    if ($sol -ge $range[0] -and $sol -le $range[1]) { return ('sol_{0:D4}_{1:D4}/sol_{2:D4}/' -f $range[0], $range[1], $sol) }
  }
  throw "Sol $sol outside the supported range"
}

$downloaded = 0; $missing = @()
foreach ($sol in $Sols) {
  $dir = $src.medaBase + (Get-SolFolder $sol)
  try { $listing = Invoke-WebRequest $dir -UseBasicParsing -TimeoutSec 60 -UserAgent 'mars-plus-pipeline' } catch { $missing += $sol; continue }
  $files = @($listing.Links | ForEach-Object { $_.href } | Where-Object { $_ -match $pattern })
  if ($files.Count -eq 0) { $missing += $sol; continue }
  foreach ($f in $files) { if (Save-Url ($dir + $f) (Join-Path $out $f)) { $downloaded++ } }
}
Write-Step ("MEDA: {0} new files; sols without derived products: {1}" -f $downloaded, ($(if ($missing) { $missing -join ',' } else { 'none' })))
