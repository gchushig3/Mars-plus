# Descarga las teselas HiRISE 25 cm (Mars Trek WMTS, nivel 17 ~0,3 m/px) que cubren el recorte del DTM.
# Esquema geografico de Trek: nivel z -> 2^(z+1) columnas x 2^z filas, tesela de 256 px.
$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path $root 'data\hirise_z17'
New-Item -ItemType Directory -Force $out | Out-Null
$z = 17; $deg = 180.0 / [math]::Pow(2, $z)
$m = Get-Content (Join-Path $root 'data\dtm_1m_meta.json') -Raw | ConvertFrom-Json
$k = 180 / [math]::PI / 3396190
$lonMin = $m.x_origen_m * $k; $lonMax = ($m.x_origen_m + $m.columnas) * $k
$latMax = $m.y_origen_m * $k; $latMin = ($m.y_origen_m - $m.filas) * $k
$c0 = [math]::Floor(($lonMin + 180) / $deg); $c1 = [math]::Floor(($lonMax + 180) / $deg)
$r0 = [math]::Floor((90 - $latMax) / $deg); $r1 = [math]::Floor((90 - $latMin) / $deg)
"teselas: cols $c0-$c1, filas $r0-$r1 => $(($c1-$c0+1)*($r1-$r0+1))"
$url = 'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/default/default028mm/{0}/{1}/{2}.png'
$fail = 0
for ($r = $r0; $r -le $r1; $r++) { for ($c = $c0; $c -le $c1; $c++) {
  $dst = Join-Path $out ("{0}_{1}.png" -f $r, $c)
  if (Test-Path $dst) { continue }
  try { Invoke-WebRequest ($url -f $z, $r, $c) -OutFile $dst -UseBasicParsing -TimeoutSec 60 } catch { $fail++ }
} }
[ordered]@{ z = $z; grados_por_tesela = $deg; col0 = $c0; col1 = $c1; fila0 = $r0; fila1 = $r1 } | ConvertTo-Json | Out-File (Join-Path $out 'teselas_meta.json') -Encoding utf8
"fallidas: $fail"
