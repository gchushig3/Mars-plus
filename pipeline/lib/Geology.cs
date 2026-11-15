// Geology helpers: clip the Mars 2020 Science Team photogeologic map (Stack et al. 2020, shapefile in
// Mars 2000 equirectangular metres) to the pilot area, and rasterize unit classes to the 1 m DTM grid.
// AI-assisted (Claude). Reviewed by the MARS+ team.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

public static class Geology
{
    /// Returns "count|geojson" with polygons whose bounding box intersects the window (metres), coordinates in degrees.
    public static string ClipShapefile(string basePath, double xmin, double ymin, double xmax, double ymax, double R)
    {
        byte[] s = System.IO.File.ReadAllBytes(basePath + ".shp");
        byte[] d = System.IO.File.ReadAllBytes(basePath + ".dbf");
        int hl = BitConverter.ToInt16(d, 8), rl = BitConverter.ToInt16(d, 10);
        var names = new List<string>(); var lens = new List<int>();
        for (int o = 32; d[o] != 0x0D; o += 32) { names.Add(Encoding.ASCII.GetString(d, o, 11).TrimEnd('\0')); lens.Add(d[o + 16]); }
        var ic = CultureInfo.InvariantCulture; var sb = new StringBuilder("{\"type\":\"FeatureCollection\",\"features\":[");
        int pos = 100, rec = 0, kept = 0; double k = 180.0 / Math.PI / R;
        while (pos < s.Length)
        {
            int clen = (s[pos + 4] << 24 | s[pos + 5] << 16 | s[pos + 6] << 8 | s[pos + 7]) * 2; int c = pos + 8;
            if (BitConverter.ToInt32(s, c) == 5)
            {
                double bx0 = BitConverter.ToDouble(s, c + 4), by0 = BitConverter.ToDouble(s, c + 12), bx1 = BitConverter.ToDouble(s, c + 20), by1 = BitConverter.ToDouble(s, c + 28);
                if (bx1 >= xmin && bx0 <= xmax && by1 >= ymin && by0 <= ymax)
                {
                    int np = BitConverter.ToInt32(s, c + 36), npt = BitConverter.ToInt32(s, c + 40);
                    int[] parts = new int[np + 1]; for (int i = 0; i < np; i++) parts[i] = BitConverter.ToInt32(s, c + 44 + 4 * i); parts[np] = npt;
                    int ptBase = c + 44 + 4 * np, ro = hl + rec * rl + 1; var props = new StringBuilder();
                    for (int f = 0; f < names.Count; f++) { string v = Encoding.UTF8.GetString(d, ro, lens[f]).Trim().Replace("\\", "/").Replace("\"", "'"); props.AppendFormat("{0}\"{1}\":\"{2}\"", f > 0 ? "," : "", names[f], v); ro += lens[f]; }
                    if (kept > 0) sb.Append(',');
                    sb.Append("{\"type\":\"Feature\",\"properties\":{").Append(props).Append("},\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[");
                    for (int pi = 0; pi < np; pi++)
                    {
                        if (pi > 0) sb.Append(','); sb.Append('[');
                        for (int q = parts[pi]; q < parts[pi + 1]; q++) { if (q > parts[pi]) sb.Append(','); sb.AppendFormat(ic, "[{0:F7},{1:F7}]", BitConverter.ToDouble(s, ptBase + 16 * q) * k, BitConverter.ToDouble(s, ptBase + 16 * q + 8) * k); }
                        sb.Append(']');
                    }
                    sb.Append("]}}"); kept++;
                }
            }
            pos += 8 + clen; rec++;
        }
        sb.Append("]}"); return kept + "|" + sb.ToString();
    }

    /// Class per 1 m cell: 0 none, 1 large aeolian bedforms, 2 small bedforms, 3 other unit (priority 1 > 2 > 3).
    public static byte[] Rasterize(List<double[]> xs, List<double[]> ys, int[] cls, int nr, int nc, double x0m, double y0m, double R)
    {
        byte[] g = new byte[nr * nc]; double k = 180.0 / Math.PI / R; int np = xs.Count;
        double[] bx0 = new double[np], bx1 = new double[np], by0 = new double[np], by1 = new double[np];
        for (int p = 0; p < np; p++) { bx0[p] = by0[p] = double.MaxValue; bx1[p] = by1[p] = double.MinValue; for (int i = 0; i < xs[p].Length; i++) { bx0[p] = Math.Min(bx0[p], xs[p][i]); bx1[p] = Math.Max(bx1[p], xs[p][i]); by0[p] = Math.Min(by0[p], ys[p][i]); by1[p] = Math.Max(by1[p], ys[p][i]); } }
        for (int r = 0; r < nr; r++) for (int c = 0; c < nc; c++)
        {
            double lon = (x0m + c + 0.5) * k, lat = (y0m - r - 0.5) * k; byte best = 0;
            for (int p = 0; p < np; p++)
            {
                if (lon < bx0[p] || lon > bx1[p] || lat < by0[p] || lat > by1[p] || !Inside(lon, lat, xs[p], ys[p])) continue;
                byte cl = (byte)cls[p]; if (best == 0 || cl < best) best = cl;
            }
            g[r * nc + c] = best;
        }
        return g;
    }

    static bool Inside(double x, double y, double[] xs, double[] ys)
    {
        bool c = false;
        for (int i = 0, j = xs.Length - 1; i < xs.Length; j = i++)
            if (((ys[i] > y) != (ys[j] > y)) && (x < (xs[j] - xs[i]) * (y - ys[i]) / (ys[j] - ys[i]) + xs[i])) c = !c;
        return c;
    }
}
