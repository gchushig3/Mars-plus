# Genera las capas de terreno a 1 m (geologia rasterizada y sombras de rocas) y muestra estadisticas para calibrar.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$data = Join-Path $root 'data'
Add-Type -AssemblyName System.Drawing
Add-Type -Path (Join-Path $PSScriptRoot 'capas_terreno.cs') -ReferencedAssemblies System.Drawing
$m = Get-Content (Join-Path $data 'dtm_1m_meta.json') -Raw | ConvertFrom-Json
$nr = [int]$m.filas; $nc = [int]$m.columnas; $R = 3396190.0

# Geologia: clase por poligono
$geo = (Get-Content (Join-Path $data 'geologia\geologia_trayecto.geojson') -Raw | ConvertFrom-Json).features
$xs = New-Object 'System.Collections.Generic.List[double[]]'; $ys = New-Object 'System.Collections.Generic.List[double[]]'; $cl = @()
foreach ($f in $geo) {
  $ring = $f.geometry.coordinates[0]
  $xs.Add([double[]]($ring | ForEach-Object { $_[0] })); $ys.Add([double[]]($ring | ForEach-Object { $_[1] }))
  $u = $f.properties.SurfUName
  $cl += $(if ($u -match 'Aeolian bedforms, large') { 1 } elseif ($u -match 'Aeolian bedforms, small') { 2 } else { 3 })
}
$g = [CapasTerreno]::RasterGeologia($xs, $ys, [int[]]$cl, $nr, $nc, [double]$m.x_origen_m, [double]$m.y_origen_m, $R)
[IO.File]::WriteAllBytes((Join-Path $data 'geologia_1m_clase.bin'), $g)

# Sombras de rocas desde HiRISE
$tm = Get-Content (Join-Path $data 'hirise_z17\teselas_meta.json') -Raw | ConvertFrom-Json
$sh = [CapasTerreno]::SombrasHirise((Join-Path $data 'hirise_z17'), [int]$tm.col0, [int]$tm.col1, [int]$tm.fila0, [int]$tm.fila1, [int]$tm.z, $nr, $nc, [double]$m.x_origen_m, [double]$m.y_origen_m, $R, 15, 0.70)
$b = New-Object 'byte[]' (4 * $sh.Length); [Buffer]::BlockCopy($sh, 0, $b, 0, $b.Length)
[IO.File]::WriteAllBytes((Join-Path $data 'sombras_rocas_1m.bin'), $b)

# Estadisticas por clase geologica
$names = @{ 0 = 'sin unidad'; 1 = 'dunas grandes'; 2 = 'dunas pequenas'; 3 = 'otra (Maaz/Seitah)' }
foreach ($c in 0..3) {
  $v = New-Object System.Collections.Generic.List[double]
  for ($i = 0; $i -lt $g.Length; $i += 7) { if ($g[$i] -eq $c -and -not [float]::IsNaN($sh[$i])) { $v.Add($sh[$i]) } }
  if ($v.Count -eq 0) { continue }
  $a = $v.ToArray(); [Array]::Sort($a)
  "{0,-20} celdas~{1,7}  sombras: media {2:P1}  p50 {3:P1}  p90 {4:P1}  p99 {5:P1}" -f $names[$c], ($v.Count * 7), ($a | Measure-Object -Average).Average, $a[[int]($a.Length * .5)], $a[[int]($a.Length * .9)], $a[[int]($a.Length * .99)]
}
