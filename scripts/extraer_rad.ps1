# Extrae la tasa de dosis total (detectores B y E, microGy/h) de los RDR de RAD (Curiosity)
# y genera una serie compacta para el escenario de tormenta solar del 28-oct-2021.
$root = Split-Path $PSScriptRoot -Parent
$dir = Join-Path $root 'data\rad'
$rows = New-Object System.Collections.Generic.List[string]
$rows.Add('utc,sol_msl,duracion_s,dosis_B_uGy_h,dosis_E_uGy_h')
$reObs = [regex]'\[OBSERVATION: (\d+)\][^\[]*?START_OBS_MARS="(\d+)[^"]*"\s*START_OBS_UTC="([^"]+)"\s*OBS_DURATION=(\d+)'
$reB = [regex]'\[DOSIMETRY_TOTAL_DOSE_B: (\d+)\]\s*([-\d.Ee+]+)'
$reE = [regex]'\[DOSIMETRY_TOTAL_DOSE_E: (\d+)\]\s*([-\d.Ee+]+)'
foreach ($f in Get-ChildItem $dir -Filter 'RAD_RDR_*.TXT' | Sort-Object Name) {
  $txt = [IO.File]::ReadAllText($f.FullName)
  $obs = @{}; foreach ($m in $reObs.Matches($txt)) { $obs[$m.Groups[1].Value] = @($m.Groups[3].Value, $m.Groups[2].Value, $m.Groups[4].Value) }
  $b = @{}; foreach ($m in $reB.Matches($txt)) { $b[$m.Groups[1].Value] = $m.Groups[2].Value }
  $e = @{}; foreach ($m in $reE.Matches($txt)) { $e[$m.Groups[1].Value] = $m.Groups[2].Value }
  foreach ($k in ($obs.Keys | Sort-Object { [int]$_ })) {
    if ($b.ContainsKey($k) -and $e.ContainsKey($k)) { $o = $obs[$k]; $rows.Add("$($o[0]),$($o[1]),$($o[2]),$($b[$k]),$($e[$k])") }
  }
  "{0}: {1} observaciones" -f $f.Name, $obs.Count
}
$rows | Out-File (Join-Path $dir 'rad_dosis_oct2021.csv') -Encoding utf8
"filas: $($rows.Count - 1)"
