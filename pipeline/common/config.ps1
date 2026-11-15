# Shared configuration loader for the MARS+ pipeline.
# AI-assisted (Claude). Reviewed by the MARS+ team.
Set-StrictMode -Version Latest

function Get-MarsConfig {
  $repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
  $modelParams = Get-Content (Join-Path $repoRoot 'config\model-parameters.json') -Raw | ConvertFrom-Json
  $siteCfg = Get-Content (Join-Path $repoRoot 'config\site.jezero-issole.json') -Raw | ConvertFrom-Json
  $apiKey = $null
  $envFile = Join-Path $repoRoot '.env'
  if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) { if ($line -match '^\s*NASA_API_KEY\s*=\s*(\S+)') { $apiKey = $Matches[1] } }
  }
  [pscustomobject]@{ Root = $repoRoot; Params = $modelParams; Site = $siteCfg; ApiKey = $apiKey }
}

function Resolve-RepoPath([string]$repoRoot, [string]$relative) { Join-Path $repoRoot ($relative -replace '/', '\') }

function Write-Step([string]$text) { Write-Host ("[{0:HH:mm:ss}] {1}" -f (Get-Date), $text) }
