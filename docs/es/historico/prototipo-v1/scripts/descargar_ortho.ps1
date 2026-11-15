# Descarga el recorte de la ortoimagen HiRISE 25 cm (USGS) que coincide con el recorte del DTM.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$data = Join-Path $root 'data'
Add-Type -Path (Join-Path $PSScriptRoot 'recorte_ortho.cs')
$url = 'https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first.tif'
$i = [RecorteOrtho]::Info($url).Split('|') | ForEach-Object { [double]$_ }
"escala: $($i[0]) x $($i[1]) m; origen: $($i[2]), $($i[3])"
$m = Get-Content (Join-Path $data 'dtm_1m_meta.json') -Raw | ConvertFrom-Json
$c0 = [int][math]::Round(([double]$m.x_origen_m - $i[2]) / $i[0]); $r0 = [int][math]::Round(($i[3] - [double]$m.y_origen_m) / $i[1])
$nc = [int]([double]$m.columnas / $i[0]); $nr = [int]([double]$m.filas / $i[1])
"ventana: filas $r0 (+$nr), columnas $c0 (+$nc)"
$sw = [Diagnostics.Stopwatch]::StartNew()
$img = [RecorteOrtho]::Leer($url, $r0, $nr, $c0, $nc, 16)
[IO.File]::WriteAllBytes((Join-Path $data 'ortho_25cm_uint8.bin'), $img)
[ordered]@{ fuente = $url; resolucion_m = $i[0]; filas = $nr; columnas = $nc; x_origen_m = $i[2] + $c0 * $i[0]; y_origen_m = $i[3] - $r0 * $i[1]; nota = 'uint8, 0 = sin dato; mismo origen que dtm_1m' } | ConvertTo-Json | Out-File (Join-Path $data 'ortho_25cm_meta.json') -Encoding utf8
"listo en $([int]$sw.Elapsed.TotalSeconds) s; ceros: $((($img | Where-Object { $_ -eq 0 }) | Measure-Object).Count)"
