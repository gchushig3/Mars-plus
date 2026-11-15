# Indexa las imagenes en bruto de Perseverance tomadas en Issole (sols 286-339)
# usando la API de la galeria oficial (Mars Perseverance Raw Images, recurso del hackathon)
# y descarga una seleccion curada en tamano medio (800 px).
$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path $root 'data\imagenes_issole'
New-Item -ItemType Directory -Force $out | Out-Null
$idx = New-Object System.Collections.Generic.List[object]
foreach ($sol in 286..339) {
  $page = 0
  do {
    $u = "https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&sol=$sol&num=100&page=$page"
    try { $r = Invoke-RestMethod $u -TimeoutSec 90 } catch { "sol $sol pag $page fallo"; break }
    foreach ($im in $r.images) {
      $idx.Add([pscustomobject]@{ sol = $sol; imageid = $im.imageid; instrumento = $im.camera.instrument; utc = $im.date_taken_utc; titulo = $im.title; url_800 = $im.image_files.medium; url_full = $im.image_files.full_res })
    }
    $page++
  } while ($r.images.Count -eq 100 -and $page -lt 30)
}
$idx | Export-Csv (Join-Path $out 'indice_imagenes_sols_286_339.csv') -NoTypeInformation -Encoding UTF8
"indexadas: $($idx.Count)"
$idx | Group-Object instrumento | Sort-Object Count -Descending | ForEach-Object { "{0,-24} {1}" -f $_.Name, $_.Count }

# Seleccion curada: por sol, primeras imagenes de camaras de contexto y de proximidad
$cupo = @{ 'NAVCAM_LEFT' = 4; 'MCZ_LEFT' = 4; 'FRONT_HAZCAM_LEFT_A' = 1; 'SHERLOC_WATSON' = 3; 'PIXL_MCC' = 1 }
$sel = foreach ($g in ($idx | Group-Object sol)) {
  foreach ($k in $cupo.Keys) { $g.Group | Where-Object { $_.instrumento -eq $k -and $_.url_800 } | Select-Object -First $cupo[$k] }
}
$n = 0
foreach ($s in $sel) {
  $dst = Join-Path $out ("sol{0:D3}_{1}_{2}.jpg" -f $s.sol, $s.instrumento, $s.imageid.Substring(0, [math]::Min(40, $s.imageid.Length)))
  if (Test-Path $dst) { continue }
  try { Invoke-WebRequest $s.url_800 -OutFile $dst -UseBasicParsing -TimeoutSec 120; $n++ } catch { "fallo $($s.imageid)" }
}
$sel | Export-Csv (Join-Path $out 'seleccion_descargada.csv') -NoTypeInformation -Encoding UTF8
"descargadas: $n de $(@($sel).Count)"
