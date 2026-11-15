// Motor de rutas del piloto Martian Map (Landing <-> Issole).
// Lee el recorte del DTM HiRISE 1 m (float32), lo agrega a la resolucion pedida,
// calcula pendiente y rugosidad, y busca la ruta de menor TIEMPO con A* (8 vecinos).
// Velocidad: funcion de Tobler escalada para traje y gravedad marciana (parametro).
using System;
using System.Collections.Generic;
using System.Text;
using System.Globalization;

public class RutaMotor
{
    public int NR, NC; public double Res, X0, Y0, R;
    public float[] Z;          // elevacion agregada
    public float[] Slope;      // pendiente en grados
    public float[] Rough;      // rugosidad (m) heredada del DTM de 1 m (maximo del bloque)
    public static double VFactor = 0.5;     // 0.5 => ~2.5 km/h en llano
    public static double SlopeBlock = 20.0; // grados: celda bloqueada
    public static double RoughRef = 0.25;   // m: cada 0.25 m de rugosidad suma +100% de tiempo
    static CultureInfo IC = CultureInfo.InvariantCulture;

    public static float[] Load(string path, int n)
    {
        byte[] b = System.IO.File.ReadAllBytes(path);
        float[] f = new float[n]; Buffer.BlockCopy(b, 0, f, 0, b.Length); return f;
    }

    public static float[] Roughness1m(float[] z, int nr, int nc)
    {
        float[] o = new float[z.Length];
        for (int r = 1; r < nr - 1; r++) for (int c = 1; c < nc - 1; c++)
        {
            double s = 0; for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) s += z[(r + i) * nc + c + j];
            o[r * nc + c] = (float)Math.Abs(z[r * nc + c] - s / 9.0);
        }
        return o;
    }

    public RutaMotor(float[] z1, float[] rough1, int nr1, int nc1, double x0, double y0, double r, int k)
    {
        Res = k; R = r; X0 = x0; Y0 = y0; NR = nr1 / k; NC = nc1 / k;
        Z = new float[NR * NC]; Rough = new float[NR * NC];
        for (int rr = 0; rr < NR; rr++) for (int cc = 0; cc < NC; cc++)
        {
            double s = 0; float mx = 0; int n = 0;
            for (int i = 0; i < k; i++) for (int j = 0; j < k; j++)
            {
                int idx = (rr * k + i) * nc1 + cc * k + j; float v = z1[idx];
                if (v > -1e6) { s += v; n++; }
                if (rough1[idx] > mx) mx = rough1[idx];
            }
            Z[rr * NC + cc] = n > 0 ? (float)(s / n) : float.NaN; Rough[rr * NC + cc] = mx;
        }
        Slope = new float[NR * NC];
        double dxm = Res * CosLat(), dym = Res;
        for (int rr = 1; rr < NR - 1; rr++) for (int cc = 1; cc < NC - 1; cc++)
        {
            double gx = (Z[rr * NC + cc + 1] - Z[rr * NC + cc - 1]) / (2 * dxm);
            double gy = (Z[(rr + 1) * NC + cc] - Z[(rr - 1) * NC + cc]) / (2 * dym);
            Slope[rr * NC + cc] = (float)(Math.Atan(Math.Sqrt(gx * gx + gy * gy)) * 180 / Math.PI);
        }
    }

    double CosLat() { double lat = (Y0 - NR * Res / 2) / R; return Math.Cos(lat); }
    public double Lon(int c) { return (X0 + (c + 0.5) * Res) / R * 180 / Math.PI; }
    public double Lat(int r) { return (Y0 - (r + 0.5) * Res) / R * 180 / Math.PI; }
    public int Col(double lon) { return (int)Math.Floor((lon * Math.PI / 180 * R - X0) / Res); }
    public int Row(double lat) { return (int)Math.Floor((Y0 - lat * Math.PI / 180 * R) / Res); }

    public static double Speed(double grade) // m/s
    {
        return VFactor * 6.0 * Math.Exp(-3.5 * Math.Abs(grade + 0.05)) / 3.6;
    }
    static double VMax() { return VFactor * 6.0 / 3.6; }

    bool Blocked(int i) { return float.IsNaN(Z[i]) || Slope[i] > SlopeBlock; }

    double EdgeTime(int a, int b, double len)
    {
        double grade = (Z[b] - Z[a]) / len;
        double pen = 1 + 0.5 * (Rough[a] + Rough[b]) / RoughRef;
        return len / Speed(grade) * pen;
    }

    public List<int> AStar(int s, int g)
    {
        int N = NR * NC; double cl = CosLat();
        double[] gs = new double[N]; int[] prev = new int[N]; bool[] closed = new bool[N];
        for (int i = 0; i < N; i++) { gs[i] = double.MaxValue; prev[i] = -1; }
        var open = new SortedSet<Tuple<double, int>>();
        int gr = g / NC, gc = g % NC;
        Func<int, double> h = (i) => { double dx = (i % NC - gc) * Res * cl, dy = (i / NC - gr) * Res; return Math.Sqrt(dx * dx + dy * dy) / VMax(); };
        gs[s] = 0; open.Add(Tuple.Create(h(s), s));
        int[] dr = { -1, -1, -1, 0, 0, 1, 1, 1 }, dc = { -1, 0, 1, -1, 1, -1, 0, 1 };
        while (open.Count > 0)
        {
            var t = open.Min; open.Remove(t); int u = t.Item2;
            if (closed[u]) continue; closed[u] = true; if (u == g) break;
            int ur = u / NC, uc = u % NC;
            for (int k = 0; k < 8; k++)
            {
                int vr = ur + dr[k], vc = uc + dc[k];
                if (vr < 1 || vc < 1 || vr >= NR - 1 || vc >= NC - 1) continue;
                int v = vr * NC + vc; if (closed[v] || Blocked(v)) continue;
                if (dr[k] != 0 && dc[k] != 0 && (Blocked(ur * NC + vc) || Blocked(vr * NC + uc))) continue; // no cortar esquinas
                double len = Math.Sqrt(Math.Pow(dc[k] * Res * cl, 2) + Math.Pow(dr[k] * Res, 2));
                double ng = gs[u] + EdgeTime(u, v, len);
                if (ng < gs[v]) { gs[v] = ng; prev[v] = u; open.Add(Tuple.Create(ng + h(v), v)); }
            }
        }
        var path = new List<int>(); for (int c = g; c != -1; c = prev[c]) path.Add(c); path.Reverse();
        return path[0] == s ? path : null;
    }

    public string Stats(List<int> p, string name)
    {
        double cl = CosLat(), L = 0, T = 0, up = 0, dn = 0, mxs = 0, sumRough = 0; int steep = 0;
        for (int i = 1; i < p.Count; i++)
        {
            int a = p[i - 1], b = p[i];
            double dx = (b % NC - a % NC) * Res * cl, dy = (b / NC - a / NC) * Res, len = Math.Sqrt(dx * dx + dy * dy);
            L += len; T += EdgeTime(a, b, len); double dz = Z[b] - Z[a]; if (dz > 0) up += dz; else dn -= dz;
            if (Slope[b] > mxs) mxs = Slope[b]; if (Slope[b] > 10) steep++; sumRough += Rough[b];
        }
        var sb = new StringBuilder();
        sb.AppendFormat(IC, "{{\"nombre\":\"{0}\",\"res_m\":{1},\"dist_m\":{2:F1},\"tiempo_min\":{3:F1},\"subida_m\":{4:F1},\"bajada_m\":{5:F1},\"pendiente_max_deg\":{6:F1},\"celdas_pend_10\":{7},\"rugosidad_media_m\":{8:F3},\"coords\":[",
            name, Res, L, T / 60, up, dn, mxs, steep, sumRough / Math.Max(1, p.Count - 1));
        for (int i = 0; i < p.Count; i++)
        {
            if (i > 0) sb.Append(',');
            sb.AppendFormat(IC, "[{0:F7},{1:F7},{2:F2}]", Lon(p[i] % NC), Lat(p[i] / NC), Z[p[i]]);
        }
        sb.Append("]}"); return sb.ToString();
    }

    public List<int> StraightLine(int s, int g)
    {
        var p = new List<int>(); int sr = s / NC, sc = s % NC, gr = g / NC, gc = g % NC;
        int n = Math.Max(Math.Abs(gr - sr), Math.Abs(gc - sc));
        for (int i = 0; i <= n; i++) { int r = (int)Math.Round(sr + (gr - sr) * (double)i / n), c = (int)Math.Round(sc + (gc - sc) * (double)i / n); int id = r * NC + c; if (p.Count == 0 || p[p.Count - 1] != id) p.Add(id); }
        return p;
    }

    public int BlockedOnPath(List<int> p) { int n = 0; foreach (int i in p) if (Blocked(i)) n++; return n; }
}
