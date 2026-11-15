# MARS+ pipeline orchestrator.
#   -Step export   regenerate app/data from data/ + config/ (default)
# Download/process steps still live in the legacy scripts/ folder until migrated
# (descargar_*.ps1, preparar_capas.ps1, resumir_meda.ps1, extraer_rad.ps1).
# AI-assisted (Claude). Reviewed by the MARS+ team.
param([ValidateSet('export')][string]$Step = 'export')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
switch ($Step) {
  'export' { & (Join-Path $PSScriptRoot '04-export\export-web-data.ps1') }
}
