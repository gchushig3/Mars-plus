# Resume MEDA (TIRS = temperatura de suelo, WS = viento, PS = presion) por sol y por hora solar local (LTST).
# Salidas: data/meda/meda_horario_por_sol.csv, data/meda/meda_dia_tipico_issole.csv y web/data/meda_issole.js
$root = Split-Path $PSScriptRoot -Parent
$dir = Join-Path $root 'data\meda'
Add-Type -TypeDefinition @"
using System; using System.IO; using System.Globalization; using System.Collections.Generic;
public static class Meda {
  // Devuelve por hora LTST: suma, suma2, n, min, max de la columna indicada (con transformacion opcional a temperatura)
  public static double[,] Hourly(string path, string col, bool toTemp, double maxValid) {
    var r = new double[24, 5]; for (int h = 0; h < 24; h++) { r[h, 3] = double.MaxValue; r[h, 4] = double.MinValue; }
    using (var sr = new StreamReader(path)) {
      string[] hdr = sr.ReadLine().Split(','); int ci = Array.IndexOf(hdr, col), lt = Array.IndexOf(hdr, "LTST"); if (ci < 0) return r;
      string line;
      while ((line = sr.ReadLine()) != null) {
        string[] p = line.Split(','); if (p.Length <= ci || p[ci] == "") continue;
        double v; if (!double.TryParse(p[ci], NumberStyles.Float, CultureInfo.InvariantCulture, out v) || v >= maxValid) continue;
        if (toTemp) v = Math.Pow(v / (0.99 * 5.670374e-8), 0.25) - 273.15;
        int h = int.Parse(p[lt].Split(' ')[1].Substring(0, 2));
        r[h, 0] += v; r[h, 1] += v * v; r[h, 2]++; if (v < r[h, 3]) r[h, 3] = v; if (v > r[h, 4]) r[h, 4] = v;
      }
    }
    return r;
  }
}
"@
$rows = New-Object System.Collections.Generic.List[object]
$sols = Get-ChildItem $dir -Filter 'WE__*_DER_TIRS_*.CSV' | ForEach-Object { [int]$_.Name.Substring(4, 4) } | Sort-Object -Unique
foreach ($s in $sols) {
  $t = Get-ChildItem $dir -Filter ("WE__{0:D4}*_DER_TIRS_*.CSV" -f $s) | Select-Object -First 1
  $w = Get-ChildItem $dir -Filter ("WE__{0:D4}*_DER_WS_*.CSV" -f $s) | Select-Object -First 1
  $p = Get-ChildItem $dir -Filter ("WE__{0:D4}*_DER_PS_*.CSV" -f $s) | Select-Object -First 1
  $T = [Meda]::Hourly($t.FullName, 'UPWARD_LW_IRRADIANCE', $true, 1e6)
  $W = if ($w) { , [Meda]::Hourly($w.FullName, 'HORIZONTAL_WIND_SPEED', $false, 100) } else { $null }
  $P = if ($p) { , [Meda]::Hourly($p.FullName, 'PRESSURE', $false, 1e6) } else { $null }
  for ($h = 0; $h -lt 24; $h++) {
    $o = [ordered]@{ sol = $s; lugar = $(if ($s -le 13) { 'Landing' } else { 'Issole' }); hora = $h; temp_suelo_media_c = ''; temp_suelo_min_c = ''; viento_medio_ms = ''; viento_max_ms = ''; presion_media_pa = '' }
    if ($T.GetValue($h, 2) -gt 0) { $o.temp_suelo_media_c = [math]::Round($T.GetValue($h, 0) / $T.GetValue($h, 2), 1); $o.temp_suelo_min_c = [math]::Round($T.GetValue($h, 3), 1) }
    if ($W -and $W.GetValue($h, 2) -gt 0) { $o.viento_medio_ms = [math]::Round($W.GetValue($h, 0) / $W.GetValue($h, 2), 1); $o.viento_max_ms = [math]::Round($W.GetValue($h, 4), 1) }
    if ($P -and $P.GetValue($h, 2) -gt 0) { $o.presion_media_pa = [math]::Round($P.GetValue($h, 0) / $P.GetValue($h, 2), 1) }
    $rows.Add([pscustomobject]$o)
  }
}
$rows | Export-Csv (Join-Path $dir 'meda_horario_por_sol.csv') -NoTypeInformation -Encoding UTF8
"sols resumidos: $($sols.Count)"

# Dia tipico en Issole: excluye la tormenta (sols 313-317) y la reporta aparte
function Stat($vals) { $v = @($vals | Where-Object { $_ -ne '' } | ForEach-Object { [double]$_ }); if ($v.Count -eq 0) { return $null }; $m = $v | Measure-Object -Average -Minimum -Maximum; return $m }
$tip = foreach ($h in 0..23) {
  $nor = $rows | Where-Object { $_.lugar -eq 'Issole' -and $_.hora -eq $h -and ($_.sol -lt 313 -or $_.sol -gt 317) }
  $tor = $rows | Where-Object { $_.lugar -eq 'Issole' -and $_.hora -eq $h -and $_.sol -ge 313 -and $_.sol -le 317 }
  $tn = Stat $nor.temp_suelo_media_c; $tm = Stat $nor.temp_suelo_min_c; $wn = Stat $nor.viento_medio_ms; $wx = Stat $nor.viento_max_ms
  $tt = Stat $tor.temp_suelo_media_c; $wt = Stat $tor.viento_medio_ms
  [pscustomobject][ordered]@{
    hora = $h
    temp_media_c = $(if ($tn) { [math]::Round($tn.Average, 1) } else { $null })
    temp_peor_c = $(if ($tm) { [math]::Round($tm.Minimum, 1) } else { $null })
    viento_medio_ms = $(if ($wn) { [math]::Round($wn.Average, 1) } else { $null })
    viento_peor_medio_ms = $(if ($wn) { [math]::Round($wn.Maximum, 1) } else { $null })
    racha_max_ms = $(if ($wx) { [math]::Round($wx.Maximum, 1) } else { $null })
    sols_con_dato = $(if ($tn) { $tn.Count } else { 0 })
    tormenta_temp_media_c = $(if ($tt) { [math]::Round($tt.Average, 1) } else { $null })
    tormenta_viento_medio_ms = $(if ($wt) { [math]::Round($wt.Average, 1) } else { $null })
  }
}
$tip | Export-Csv (Join-Path $dir 'meda_dia_tipico_issole.csv') -NoTypeInformation -Encoding UTF8
$tip | Format-Table -AutoSize | Out-String
$obj = [ordered]@{ lugar = 'Issole'; sols = "286-339 (excluye tormenta 313-317)"; fuente = 'MEDA derived TIRS/WS, PDS Atmospheres (DOI 10.17189/1522849)'; nota = 'Temperatura de suelo desde irradiancia LW ascendente (emisividad 0.99). Hora LTST. Peor caso = minimo de temperatura y maximo del viento medio horario entre sols.'; horas = $tip }
"var MEDA_TIPICO = " + ($obj | ConvertTo-Json -Depth 4 -Compress) + ";" | Out-File (Join-Path $root 'web\data\meda_tipico.js') -Encoding utf8
