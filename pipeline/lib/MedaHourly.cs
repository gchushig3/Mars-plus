// Hourly (local true solar time) statistics of one MEDA derived CSV column: sum, sum of squares, n, min, max.
// Ground temperature is derived from TIRS upward long-wave irradiance with emissivity 0.99.
// AI-assisted (Claude). Reviewed by the MARS+ team.
using System;
using System.Globalization;
using System.IO;

public static class MedaHourly
{
    public static double[,] Compute(string path, string column, bool toGroundTempC, double maxValid)
    {
        var r = new double[24, 5];
        for (int h = 0; h < 24; h++) { r[h, 3] = double.MaxValue; r[h, 4] = double.MinValue; }
        using (var sr = new StreamReader(path))
        {
            string[] hdr = sr.ReadLine().Split(',');
            int ci = Array.IndexOf(hdr, column), lt = Array.IndexOf(hdr, "LTST");
            if (ci < 0) return r;
            string line;
            while ((line = sr.ReadLine()) != null)
            {
                string[] p = line.Split(',');
                if (p.Length <= ci || p[ci] == "") continue;
                double v;
                if (!double.TryParse(p[ci], NumberStyles.Float, CultureInfo.InvariantCulture, out v) || v >= maxValid) continue;
                if (toGroundTempC) v = Math.Pow(v / (0.99 * 5.670374e-8), 0.25) - 273.15;
                int h = int.Parse(p[lt].Split(' ')[1].Substring(0, 2));
                r[h, 0] += v; r[h, 1] += v * v; r[h, 2]++;
                if (v < r[h, 3]) r[h, 3] = v;
                if (v > r[h, 4]) r[h, 4] = v;
            }
        }
        return r;
    }
}
