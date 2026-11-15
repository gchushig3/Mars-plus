# Calcula rutas Landing <-> Issole a 1, 2 y 5 m y genera los datos de la web.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$data = Join-Path $root 'data'
Add-Type -Path (Join-Path $PSScriptRoot 'ruta_motor.cs') -ReferencedAssemblies System.Drawing
Add-Type -AssemblyName System.Drawing

$meta = Get-Content (Join-Path $data 'dtm_1m_meta.json') -Raw | ConvertFrom-Json
$nr = [int]$meta.filas; $nc = [int]$meta.columnas
$z1 = [RutaMotor]::Load((Join-Path $data 'dtm_1m_float32.bin'), $nr * $nc)
$valid = ($z1 | Where-Object { $_ -gt -1e6 }); "celdas validas: $($valid.Count) de $($z1.Length); elev min/max: {0:F1} / {1:F1}" -f ($valid | Measure-Object -Minimum).Minimum, ($valid | Measure-Object -Maximum).Maximum
$rough1 = [RutaMotor]::Roughness1m($z1, $nr, $nc)

$L = @(77.4509, 18.4446); $I = @(77.44137302, 18.43266059)
$out = [ordered]@{ generado = (Get-Date).ToString('s'); parametros = [ordered]@{ factor_velocidad = [RutaMotor]::VFactor; pendiente_bloqueo_deg = [RutaMotor]::SlopeBlock; rugosidad_ref_m = [RutaMotor]::RoughRef }; corridas = @() }
$m2 = $null
foreach ($k in 1, 2, 5) {
  $m = New-Object RutaMotor -ArgumentList $z1, $rough1, $nr, $nc, ([double]$meta.x_origen_m), ([double]$meta.y_origen_m), ([double]$meta.radio_m), $k
  if ($k -eq 2) { $m2 = $m }
  $s = $m.Row($L[1]) * $m.NC + $m.Col($L[0]); $g = $m.Row($I[1]) * $m.NC + $m.Col($I[0])
  $sl = $m.StraightLine($s, $g)
  $ida = $m.AStar($s, $g); $vuelta = $m.AStar($g, $s)
  $runs = @(
    ($m.Stats($sl, "recta_ida") | ConvertFrom-Json),
    ($m.Stats($ida, "ida") | ConvertFrom-Json),
    ($m.Stats($vuelta, "vuelta") | ConvertFrom-Json)
  )
  $runs[0] | Add-Member celdas_bloqueadas ($m.BlockedOnPath($sl))
  foreach ($r in $runs) { "{0,4} m  {1,-10} {2,7:F1} m  {3,5:F1} min  +{4:F1}/-{5:F1} m  pend.max {6:F1}°  rug {7:F3}" -f $k, $r.nombre, $r.dist_m, $r.tiempo_min, $r.subida_m, $r.bajada_m, $r.pendiente_max_deg, $r.rugosidad_media_m }
  $out.corridas += $runs
}
$out | ConvertTo-Json -Depth 6 -Compress | Out-File (Join-Path $data 'rutas.json') -Encoding utf8
"var RUTAS = " + ($out | ConvertTo-Json -Depth 6 -Compress) + ";" | Out-File (Join-Path $root 'web\data\rutas.js') -Encoding utf8

# Capa de pendiente (2 m) como PNG transparente para la web
$m = $m2; $bmp = New-Object System.Drawing.Bitmap $m.NC, $m.NR
for ($r = 0; $r -lt $m.NR; $r++) { for ($c = 0; $c -lt $m.NC; $c++) {
  $s = $m.Slope[$r * $m.NC + $c]
  if ($s -lt 5) { $col = [System.Drawing.Color]::FromArgb(0, 0, 0, 0) }
  elseif ($s -lt 10) { $col = [System.Drawing.Color]::FromArgb(110, 250, 204, 21) }
  elseif ($s -lt 15) { $col = [System.Drawing.Color]::FromArgb(150, 249, 115, 22) }
  elseif ($s -lt 20) { $col = [System.Drawing.Color]::FromArgb(180, 220, 38, 38) }
  else { $col = [System.Drawing.Color]::FromArgb(210, 127, 29, 29) }
  $bmp.SetPixel($c, $r, $col) } }
$bmp.Save((Join-Path $root 'web\data\pendiente_2m.png'), [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
$b = [ordered]@{ sur = $m.Lat($m.NR - 1) - 1 / 3396190 * 180 / [math]::PI; norte = $m.Lat(0) + 1 / 3396190 * 180 / [math]::PI; oeste = $m.Lon(0) - 1 / 3396190 * 180 / [math]::PI; este = $m.Lon($m.NC - 1) + 1 / 3396190 * 180 / [math]::PI }
"var PENDIENTE_BOUNDS = [[{0},{1}],[{2},{3}]];" -f $b.sur, $b.oeste, $b.norte, $b.este | Out-File (Join-Path $root 'web\data\pendiente_bounds.js') -Encoding utf8
"listo"
