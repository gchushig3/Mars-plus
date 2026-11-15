# Recorta el mapa fotogeologico del equipo Mars 2020 (Stack et al. 2020, shapefile)
# a la zona del trayecto Landing <-> Issole y lo exporta a GeoJSON (lon/lat).
$root = Split-Path $PSScriptRoot -Parent
$p = Join-Path $root 'data\geologia\stack2020_shp\M2020_JEZ_geology_edited_equi0_allquads_v6_archive'
Add-Type -TypeDefinition @"
using System; using System.Text; using System.Globalization; using System.Collections.Generic;
public static class Shp {
  public static string Clip(string basePath, double xmin, double ymin, double xmax, double ymax, double R) {
    byte[] s = System.IO.File.ReadAllBytes(basePath + ".shp");
    byte[] d = System.IO.File.ReadAllBytes(basePath + ".dbf");
    int nrec = BitConverter.ToInt32(d, 4), hl = BitConverter.ToInt16(d, 8), rl = BitConverter.ToInt16(d, 10);
    var names = new List<string>(); var lens = new List<int>();
    for (int o = 32; d[o] != 0x0D; o += 32) { names.Add(Encoding.ASCII.GetString(d, o, 11).TrimEnd('\0')); lens.Add(d[o + 16]); }
    var ic = CultureInfo.InvariantCulture; var sb = new StringBuilder("{\"type\":\"FeatureCollection\",\"features\":[");
    int pos = 100, rec = 0, kept = 0; double k = 180.0 / Math.PI / R;
    while (pos < s.Length) {
      int clen = (s[pos + 4] << 24 | s[pos + 5] << 16 | s[pos + 6] << 8 | s[pos + 7]) * 2; int c = pos + 8;
      int type = BitConverter.ToInt32(s, c);
      if (type == 5) {
        double bx0 = BitConverter.ToDouble(s, c + 4), by0 = BitConverter.ToDouble(s, c + 12), bx1 = BitConverter.ToDouble(s, c + 20), by1 = BitConverter.ToDouble(s, c + 28);
        if (bx1 >= xmin && bx0 <= xmax && by1 >= ymin && by0 <= ymax) {
          int np = BitConverter.ToInt32(s, c + 36), npt = BitConverter.ToInt32(s, c + 40);
          int[] parts = new int[np + 1]; for (int i = 0; i < np; i++) parts[i] = BitConverter.ToInt32(s, c + 44 + 4 * i); parts[np] = npt;
          int ptBase = c + 44 + 4 * np;
          int ro = hl + rec * rl + 1; var props = new StringBuilder();
          for (int f = 0; f < names.Count; f++) { string v = Encoding.UTF8.GetString(d, ro, lens[f]).Trim().Replace("\\", "/").Replace("\"", "'"); props.AppendFormat("{0}\"{1}\":\"{2}\"", f > 0 ? "," : "", names[f], v); ro += lens[f]; }
          if (kept > 0) sb.Append(',');
          sb.Append("{\"type\":\"Feature\",\"properties\":{").Append(props).Append("},\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[");
          for (int pi = 0; pi < np; pi++) {
            if (pi > 0) sb.Append(','); sb.Append('[');
            for (int q = parts[pi]; q < parts[pi + 1]; q++) {
              double x = BitConverter.ToDouble(s, ptBase + 16 * q), y = BitConverter.ToDouble(s, ptBase + 16 * q + 8);
              if (q > parts[pi]) sb.Append(','); sb.AppendFormat(ic, "[{0:F7},{1:F7}]", x * k, y * k);
            }
            sb.Append(']');
          }
          sb.Append("]}}"); kept++;
        }
      }
      pos += 8 + clen; rec++;
    }
    sb.Append("]}"); return kept + "|" + sb.ToString();
  }
}
"@
# Zona del trayecto (metros en la misma proyeccion que el DTM), con 100 m de margen
$m = Get-Content (Join-Path $root 'data\dtm_1m_meta.json') -Raw | ConvertFrom-Json
$x0 = $m.x_origen_m - 100; $x1 = $m.x_origen_m + $m.columnas + 100; $y1 = $m.y_origen_m + 100; $y0 = $m.y_origen_m - $m.filas - 100
$r = [Shp]::Clip($p, $x0, $y0, $x1, $y1, 3396190.0).Split('|', 2)
$r[1] | Out-File (Join-Path $root 'data\geologia\geologia_trayecto.geojson') -Encoding utf8
"var GEOLOGIA = " + $r[1] + ";" | Out-File (Join-Path $root 'web\data\geologia.js') -Encoding utf8
"poligonos en la zona: $($r[0])"
($r[1] | ConvertFrom-Json).features | Group-Object { $_.properties.SurfUName + ' | ' + $_.properties.BedrkUName } | Sort-Object Count -Descending | ForEach-Object { "{0,4}  {1}" -f $_.Count, $_.Name }
