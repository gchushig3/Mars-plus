# Descarga MEDA (derived: TIRS, WS, PS, RHS) para los sols del rover en Landing (1-13) e Issole (286-339).
$ErrorActionPreference = 'Continue'
$base = 'https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_derived_env/'
$out = Join-Path (Split-Path $PSScriptRoot -Parent) 'data\meda'
New-Item -ItemType Directory -Force $out | Out-Null
$sols = @(1..13) + @(286..339)
function Bin($s) { foreach ($r in @(@(0,89),@(90,179),@(180,299),@(300,419))) { if ($s -ge $r[0] -and $s -le $r[1]) { return 'sol_{0:D4}_{1:D4}/' -f $r[0],$r[1] } } }
$log = @()
foreach ($s in $sols) {
  $dir = $base + (Bin $s) + ('sol_{0:D4}/' -f $s)
  try { $lst = Invoke-WebRequest $dir -UseBasicParsing -TimeoutSec 60 } catch { $log += "sol $s : sin carpeta"; continue }
  $files = $lst.Links | ForEach-Object href | Where-Object { $_ -match '_DER_(TIRS|WS|PS|RHS)_.*\.CSV$' }
  if (-not $files) { $log += "sol $s : sin archivos"; continue }
  foreach ($f in $files) {
    $dst = Join-Path $out $f
    if (Test-Path $dst) { continue }
    try { Invoke-WebRequest ($dir + $f) -OutFile $dst -UseBasicParsing -TimeoutSec 300 } catch { $log += "sol $s : fallo $f" }
  }
  $log += "sol $s : $($files.Count) archivos"
}
$log | Out-File (Join-Path $out 'descarga_log.txt') -Encoding utf8
"LISTO: " + ($log | Where-Object { $_ -match 'archivos$' }).Count + " sols con datos"
