# Downloads small reference datasets: Stack et al. 2020 photogeologic map (shapefile, CC BY 4.0),
# THEMIS thermal inertia of Jezero (Zenodo 4931348) and Perseverance waypoints (NASA MMGIS M20).
# AI-assisted (Claude). Reviewed by the MARS+ team.
param([switch]$Force)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\common\config.ps1')
$cfg = Get-MarsConfig
$src = $cfg.Site.sources; $raw = $cfg.Site.rawData; $repo = $cfg.Root

$geoDir = Resolve-RepoPath $repo $raw.geologyDir
foreach ($f in $src.stack2020Files) {
  if (Save-Url ($src.stack2020Base + $f + '?download=1') (Join-Path $geoDir $f) -Force:$Force) { Write-Step "Stack 2020: $f" }
}
$shpDir = Join-Path $geoDir 'stack2020_shp'
$zip = Join-Path $geoDir ($src.stack2020Files | Where-Object { $_ -like '*.zip' } | Select-Object -First 1)
if (-not (Test-Path $shpDir) -or $Force) { Expand-Archive $zip -DestinationPath $shpDir -Force; Write-Step 'Stack 2020: shapefile extracted' }

if (Save-Url $src.thermal (Resolve-RepoPath $repo $raw.thermal) -Force:$Force) { Write-Step 'THEMIS thermal inertia downloaded' }
if (Save-Url $src.roverWaypoints (Resolve-RepoPath $repo $raw.roverWaypoints) -Force:$Force) { Write-Step 'Perseverance waypoints downloaded' }
Write-Step 'Reference downloads done'
