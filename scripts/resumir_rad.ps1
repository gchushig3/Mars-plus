# Extrae la tasa de dosis total (microGray/hora, detectores B y E) de cada observacion RAD (~16 min).
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$dir = Join-Path $root 'data\rad'
$rows = @()
foreach ($lbl in Get-ChildItem $dir -Filter '*.LBL' | Sort-Object Name) {
  $txt = [IO.Path]::ChangeExtension($lbl.FullName, '.TXT')
  if (-not (Test-Path $txt) -or (Get-Item $txt).Length -lt 1MB) { "omitido (incompleto): $($lbl.Name)"; continue }
  $c = [IO.File]::ReadAllText($lbl.FullName)
  $ptr = @{}
  foreach ($m in [regex]::Matches($c, '\^OBS(\d+)_TOT_DOSE_([BE])_ELEMENT\s*=\s*\("[^"]*",\s*(\d+)\s*<BYTES>\)')) {
    $g = $m.Groups; $ptr["$($g[1].Value)_$($g[2].Value)"] = [long]$g[3].Value }
  $fs = [IO.File]::OpenRead($txt)
  # Las horas de inicio se leen del texto (START_OBS_UTC) en orden de observacion
  $sr = New-Object IO.StreamReader($fs); $times = @(); $durs = @()
  while (($line = $sr.ReadLine()) -ne $null) {
    if ($line.StartsWith('START_OBS_UTC=')) { $times += $line.Substring(15).Trim('"') }
    elseif ($line.StartsWith('OBS_DURATION=')) { $durs += [int]$line.Substring(13) } }
  $buf = New-Object byte[] 8
  $obs = $ptr.Keys | ForEach-Object { $_.Split('_')[0] } | Sort-Object -Unique
  foreach ($o in $obs) {
    $vals = @{}
    foreach ($d in 'B', 'E') { $k = "${o}_$d"; if ($ptr.ContainsKey($k)) { $fs.Position = $ptr[$k] - 1; $null = $fs.Read($buf, 0, 8); $vals[$d] = [Text.Encoding]::ASCII.GetString($buf).Trim() } }
    $i = [int]$o
    $rows += [pscustomobject]@{ archivo = $lbl.BaseName; utc = $(if ($i -lt $times.Count) { $times[$i] } else { '' }); duracion_s = $(if ($i -lt $durs.Count) { $durs[$i] } else { '' }); dosis_B_uGy_h = $vals['B']; dosis_E_uGy_h = $vals['E'] }
  }
  $fs.Close()
  "procesado: $($lbl.Name) ($($obs.Count) obs)"
}
$rows | Export-Csv (Join-Path $root 'data\rad_dosis_oct2021.csv') -NoTypeInformation -Encoding utf8
$byDay = $rows | Where-Object { $_.dosis_B_uGy_h -match '^[0-9.]+$' } | Group-Object { $_.utc.Substring(0, 8) } | ForEach-Object {
  $b = $_.Group | ForEach-Object { [double]$_.dosis_B_uGy_h } | Measure-Object -Average -Maximum
  [pscustomobject]@{ dia = $_.Name; obs = $_.Count; B_media_uGy_h = [math]::Round($b.Average, 2); B_max_uGy_h = [math]::Round($b.Maximum, 2); B_uGy_dia = [math]::Round($b.Average * 24, 1) } }
$byDay | Format-Table -AutoSize | Out-String
$byDay | Export-Csv (Join-Path $root 'data\rad_dosis_diaria_oct2021.csv') -NoTypeInformation -Encoding utf8
