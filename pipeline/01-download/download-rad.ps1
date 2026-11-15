# Downloads Curiosity RAD RDR daily files (TXT + LBL) for the MSL sol range around the 28-Oct-2021 solar particle event
# (NASA PDS PPI, MSL-M-RAD-3-RDR-V1.0). Existing files are skipped. Each TXT is ~65 MB.
# AI-assisted (Claude). Reviewed by the MARS+ team.
param([string]$OutDir)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\common\config.ps1')
$cfg = Get-MarsConfig
$src = $cfg.Site.sources
$out = if ($OutDir) { $OutDir } else { Resolve-RepoPath $cfg.Root $cfg.Site.rawData.radDir }
New-Item -ItemType Directory -Force $out | Out-Null
$solMin = [int]$src.radMslSols[0]; $solMax = [int]$src.radMslSols[1]

$root = Invoke-WebRequest $src.radBase -UseBasicParsing -TimeoutSec 60 -UserAgent 'mars-plus-pipeline'
$folders = @($root.Links | ForEach-Object { if ($_.href -match '(SOL_(\d+)_(\d+))/?$' -and [int]$Matches[3] -ge $solMin -and [int]$Matches[2] -le $solMax) { $Matches[1] } } | Sort-Object -Unique)
$downloaded = 0
foreach ($folder in $folders) {
  $listing = Invoke-WebRequest ($src.radBase + $folder + '/') -UseBasicParsing -TimeoutSec 60 -UserAgent 'mars-plus-pipeline'
  $names = @($listing.Links | ForEach-Object { $_.href -replace '.*/', '' } | Where-Object { $_ -match '^RAD_RDR_\d{4}_\d{3}_\d{2}_\d{2}_(\d{4})_V\d+\.(TXT|LBL)$' -and [int]$Matches[1] -ge $solMin -and [int]$Matches[1] -le $solMax })
  foreach ($n in $names) { if (Save-Url ($src.radBase + $folder + '/' + $n) (Join-Path $out $n)) { $downloaded++ } }
}
Write-Step "RAD: $downloaded new files (MSL sols $solMin-$solMax)"
