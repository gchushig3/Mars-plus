// Motor de rutas v2 del piloto Martian Map (Landing <-> Issole).
// Mapa de costo = tiempo para cruzar cada celda, combinando:
//   pendiente direccional (DTM 1 m, Tobler escalado), rugosidad (DTM),
//   arena (unidades eolicas de Stack et al. 2020) y rocas (sombras en HiRISE 25 cm).
// Celdas bloqueadas: pendiente > SlopeBlock o densidad de rocas > RockBlock.
using System;
using System.Collections.Generic;
using System.Text;
using System.Globalization;

public class RutaMotorV2
{
    public int NR, NC; public double Res, X0, Y0, R;
    public float[] Z, Slope, Rough, Rock, DunaG, DunaP;
    public static double VFactor = 0.5, SlopeBlock = 20.0, RoughRef = 0.25;
    // Arena: caminar sobre arena cuesta ~2,1-2,7 veces la energia de suelo firme (Lejeune et al. 1998, J. Exp. Biol. 201:2071).
    // Escenario: el doble de tiempo en dunas grandes, +30% en ondulaciones pequenas.
    public static double DunaGrandeMult = 1.0;
    public static double DunaPequenaMult = 0.3;
    public static double RockMult = 6.0;         // +6% por cada 1% de sombras de rocas
    public static double RockBlock = 0.12;       // >12% de la celda en sombras de rocas = obstaculo
    static CultureInfo IC = CultureInfo.InvariantCulture;

    public static float[] LoadF(string path, int n) { byte[] b = System.IO.File.ReadAllBytes(path); float[] f = new float[n]; Buffer.BlockCopy(b, 0, f, 0, b.Length); return f; }

    // Fraccion de pixeles de sombra (25 cm) por celda de 1 m: pixel mucho mas oscuro que la media local (~5 m)
    public static float[] RocasDesdeOrtho(byte[] img, int H, int W, int ventana, double umbral, int pxPorM)
    {
        double[] I = new double[(W + 1) * (H + 1)]; int[] N = new int[(W + 1) * (H + 1)];
        for (int y = 0; y < H; y++) { double s = 0; int n = 0; for (int x = 0; x < W; x++) { byte v = img[y * W + x]; if (v > 0) { s += v; n++; } I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + s; N[(y + 1) * (W + 1) + x + 1] = N[y * (W + 1) + x + 1] + n; } }
        int nr = H / pxPorM, nc = W / pxPorM, h = ventana / 2; float[] cnt = new float[nr * nc], sh = new float[nr * nc];
        for (int y = 0; y < nr * pxPorM; y++) for (int x = 0; x < nc * pxPorM; x++)
        {
            byte v = img[y * W + x]; if (v == 0) continue;
            int xa = Math.Max(0, x - h), xb = Math.Min(W, x + h + 1), ya = Math.Max(0, y - h), yb = Math.Min(H, y + h + 1);
            double s = I[yb * (W + 1) + xb] - I[ya * (W + 1) + xb] - I[yb * (W + 1) + xa] + I[ya * (W + 1) + xa];
            int n = N[yb * (W + 1) + xb] - N[ya * (W + 1) + xb] - N[yb * (W + 1) + xa] + N[ya * (W + 1) + xa];
            int c = (y / pxPorM) * nc + x / pxPorM; cnt[c]++; if (n > 0 && v < umbral * s / n) sh[c]++;
        }
        for (int i = 0; i < sh.Length; i++) sh[i] = cnt[i] > 0 ? sh[i] / cnt[i] : 0f;
        return sh;
    }

    public static float[] Roughness1m(float[] z, int nr, int nc)
    {
        float[] o = new float[z.Length];
        for (int r = 1; r < nr - 1; r++) for (int c = 1; c < nc - 1; c++)
        { double s = 0; for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) s += z[(r + i) * nc + c + j]; o[r * nc + c] = (float)Math.Abs(z[r * nc + c] - s / 9.0); }
        return o;
    }

    public RutaMotorV2(float[] z1, float[] rough1, float[] rock1, byte[] geo1, int nr1, int nc1, double x0, double y0, double r, int k)
    {
        Res = k; R = r; X0 = x0; Y0 = y0; NR = nr1 / k; NC = nc1 / k; int N = NR * NC;
        Z = new float[N]; Rough = new float[N]; Rock = new float[N]; DunaG = new float[N]; DunaP = new float[N];
        for (int rr = 0; rr < NR; rr++) for (int cc = 0; cc < NC; cc++)
        {
            double s = 0, rk = 0; float mx = 0, rkmax = 0; int n = 0, dg = 0, dp = 0;
            for (int i = 0; i < k; i++) for (int j = 0; j < k; j++)
            {
                int idx = (rr * k + i) * nc1 + cc * k + j; float v = z1[idx];
                if (v > -1e6) { s += v; n++; }
                if (rough1[idx] > mx) mx = rough1[idx];
                rk += rock1[idx]; if (rock1[idx] > rkmax) rkmax = rock1[idx];
                if (geo1[idx] == 1) dg++; else if (geo1[idx] == 2) dp++;
            }
            int o = rr * NC + cc; double kk = k * k;
            Z[o] = n > 0 ? (float)(s / n) : float.NaN; Rough[o] = mx;
            // rocas: se conserva el maximo del bloque para no "promediar" un obstaculo y hacerlo desaparecer
            Rock[o] = (float)Math.Max(rk / kk, 0.5 * rkmax);
            DunaG[o] = (float)(dg / kk); DunaP[o] = (float)(dp / kk);
        }
        Slope = new float[N]; double dxm = Res * CosLat(), dym = Res;
        for (int rr = 1; rr < NR - 1; rr++) for (int cc = 1; cc < NC - 1; cc++)
        {
            double gx = (Z[rr * NC + cc + 1] - Z[rr * NC + cc - 1]) / (2 * dxm), gy = (Z[(rr + 1) * NC + cc] - Z[(rr - 1) * NC + cc]) / (2 * dym);
            Slope[rr * NC + cc] = (float)(Math.Atan(Math.Sqrt(gx * gx + gy * gy)) * 180 / Math.PI);
        }
    }

    public double CosLat() { return Math.Cos((Y0 - NR * Res / 2) / R); }
    public double Lon(int c) { return (X0 + (c + 0.5) * Res) / R * 180 / Math.PI; }
    public double Lat(int r) { return (Y0 - (r + 0.5) * Res) / R * 180 / Math.PI; }
    public int Col(double lon) { return (int)Math.Floor((lon * Math.PI / 180 * R - X0) / Res); }
    public int Row(double lat) { return (int)Math.Floor((Y0 - lat * Math.PI / 180 * R) / Res); }
    public static double Speed(double grade) { return VFactor * 6.0 * Math.Exp(-3.5 * Math.Abs(grade + 0.05)) / 3.6; }
    static double VMax() { return VFactor * 6.0 / 3.6; }

    public bool Blocked(int i) { return float.IsNaN(Z[i]) || Slope[i] > SlopeBlock || Rock[i] > RockBlock; }
    public double Mult(int i) { return (1 + Rough[i] / RoughRef) * (1 + DunaGrandeMult * DunaG[i] + DunaPequenaMult * DunaP[i]) * (1 + RockMult * Rock[i]); }

    double EdgeTime(int a, int b, double len) { double grade = (Z[b] - Z[a]) / len; return len / Speed(grade) * 0.5 * (Mult(a) + Mult(b)); }

    // Dijkstra desde un origen: tiempo minimo (s) a todas las celdas. Sirve para muchas paradas a la vez.
    public double[] TiempoDesde(int s, out int[] prev)
    {
        int N = NR * NC; double cl = CosLat(); double[] gs = new double[N]; prev = new int[N]; bool[] closed = new bool[N];
        for (int i = 0; i < N; i++) { gs[i] = double.MaxValue; prev[i] = -1; }
        var open = new SortedSet<Tuple<double, int>>(); gs[s] = 0; open.Add(Tuple.Create(0.0, s));
        int[] dr = { -1, -1, -1, 0, 0, 1, 1, 1 }, dc = { -1, 0, 1, -1, 1, -1, 0, 1 };
        while (open.Count > 0)
        {
            var t = open.Min; open.Remove(t); int u = t.Item2; if (closed[u]) continue; closed[u] = true;
            int ur = u / NC, uc = u % NC;
            for (int q = 0; q < 8; q++)
            {
                int vr = ur + dr[q], vc = uc + dc[q]; if (vr < 1 || vc < 1 || vr >= NR - 1 || vc >= NC - 1) continue;
                int v = vr * NC + vc; if (closed[v] || Blocked(v)) continue;
                if (dr[q] != 0 && dc[q] != 0 && (Blocked(ur * NC + vc) || Blocked(vr * NC + uc))) continue;
                double len = Math.Sqrt(Math.Pow(dc[q] * Res * cl, 2) + Math.Pow(dr[q] * Res, 2));
                double ng = gs[u] + EdgeTime(u, v, len); if (ng < gs[v]) { gs[v] = ng; prev[v] = u; open.Add(Tuple.Create(ng, v)); }
            }
        }
        return gs;
    }

    // Tiempo minimo hacia un destino desde todas las celdas (para la vuelta): Dijkstra en el grafo invertido.
    public double[] TiempoHacia(int g, out int[] next)
    {
        int N = NR * NC; double cl = CosLat(); double[] gs = new double[N]; next = new int[N]; bool[] closed = new bool[N];
        for (int i = 0; i < N; i++) { gs[i] = double.MaxValue; next[i] = -1; }
        var open = new SortedSet<Tuple<double, int>>(); gs[g] = 0; open.Add(Tuple.Create(0.0, g));
        int[] dr = { -1, -1, -1, 0, 0, 1, 1, 1 }, dc = { -1, 0, 1, -1, 1, -1, 0, 1 };
        while (open.Count > 0)
        {
            var t = open.Min; open.Remove(t); int v = t.Item2; if (closed[v]) continue; closed[v] = true;
            int vr = v / NC, vc = v % NC;
            for (int q = 0; q < 8; q++)
            {
                int ur = vr + dr[q], uc = vc + dc[q]; if (ur < 1 || uc < 1 || ur >= NR - 1 || uc >= NC - 1) continue;
                int u = ur * NC + uc; if (closed[u] || Blocked(u)) continue;
                if (dr[q] != 0 && dc[q] != 0 && (Blocked(ur * NC + vc) || Blocked(vr * NC + uc))) continue;
                double len = Math.Sqrt(Math.Pow(dc[q] * Res * cl, 2) + Math.Pow(dr[q] * Res, 2));
                double ng = gs[v] + EdgeTime(u, v, len); if (ng < gs[u]) { gs[u] = ng; next[u] = v; open.Add(Tuple.Create(ng, u)); }
            }
        }
        return gs;
    }

    public static List<int> Camino(int[] prev, int destino) { var p = new List<int>(); for (int c = destino; c != -1; c = prev[c]) p.Add(c); p.Reverse(); return p; }
    public static List<int> CaminoHacia(int[] next, int origen) { var p = new List<int>(); for (int c = origen; c != -1; c = next[c]) p.Add(c); return p; }

    public List<int> StraightLine(int s, int g)
    {
        var p = new List<int>(); int sr = s / NC, sc = s % NC, gr = g / NC, gc = g % NC, n = Math.Max(Math.Abs(gr - sr), Math.Abs(gc - sc));
        for (int i = 0; i <= n; i++) { int id = (int)Math.Round(sr + (gr - sr) * (double)i / n) * NC + (int)Math.Round(sc + (gc - sc) * (double)i / n); if (p.Count == 0 || p[p.Count - 1] != id) p.Add(id); }
        return p;
    }

    // Busca el mejor punto de trabajo cerca de (lat,lon): plano, sin rocas, sin dunas grandes, en un radio dado.
    public int MejorEspacioTrabajo(double lat, double lon, double radio, double radioPlataforma, out string motivo)
    {
        int r0 = Row(lat), c0 = Col(lon), rad = (int)Math.Ceiling(radio / Res), pr = Math.Max(1, (int)Math.Ceiling(radioPlataforma / Res));
        int best = -1; double bestScore = double.MaxValue; motivo = "";
        for (int r = r0 - rad; r <= r0 + rad; r++) for (int c = c0 - rad; c <= c0 + rad; c++)
        {
            if (r < pr || c < pr || r >= NR - pr || c >= NC - pr) continue;
            double d = Math.Sqrt(Math.Pow((r - r0) * Res, 2) + Math.Pow((c - c0) * Res * CosLat(), 2)); if (d > radio) continue;
            double smax = 0, rk = 0, dg = 0; bool ok = true;
            for (int i = -pr; i <= pr && ok; i++) for (int j = -pr; j <= pr; j++) { int q = (r + i) * NC + c + j; if (Blocked(q)) { ok = false; break; } smax = Math.Max(smax, Slope[q]); rk = Math.Max(rk, Rock[q]); dg = Math.Max(dg, DunaG[q]); }
            if (!ok || smax > 10 || dg > 0.5) continue;
            double score = smax + 50 * rk + 0.5 * d; // plano, sin rocas y cerca del objetivo
            if (score < bestScore) { bestScore = score; best = r * NC + c; motivo = string.Format(IC, "pendiente max {0:F1} deg, rocas {1:P0}, a {2:F1} m del objetivo", smax, rk, d); }
        }
        return best;
    }

    public string Stats(List<int> p, string name, string extra)
    {
        double cl = CosLat(), L = 0, T = 0, up = 0, dn = 0, mxs = 0, dgm = 0, rkm = 0, rkmax = 0;
        for (int i = 1; i < p.Count; i++)
        {
            int a = p[i - 1], b = p[i]; double dx = (b % NC - a % NC) * Res * cl, dy = (b / NC - a / NC) * Res, len = Math.Sqrt(dx * dx + dy * dy);
            L += len; T += EdgeTime(a, b, len); double dz = Z[b] - Z[a]; if (dz > 0) up += dz; else dn -= dz;
            mxs = Math.Max(mxs, Slope[b]); dgm += len * DunaG[b]; rkm += len * Rock[b]; rkmax = Math.Max(rkmax, Rock[b]);
        }
        var sb = new StringBuilder();
        sb.AppendFormat(IC, "{{\"nombre\":\"{0}\",\"res_m\":{1},\"dist_m\":{2:F1},\"tiempo_min\":{3:F1},\"subida_m\":{4:F1},\"bajada_m\":{5:F1},\"pendiente_max_deg\":{6:F1},\"metros_en_dunas_grandes\":{7:F0},\"rocas_media\":{8:F4},\"rocas_max\":{9:F3}{10},\"coords\":[",
            name, Res, L, T / 60, up, dn, mxs, dgm, L > 0 ? rkm / L : 0, rkmax, extra);
        for (int i = 0; i < p.Count; i++) { if (i > 0) sb.Append(','); sb.AppendFormat(IC, "[{0:F7},{1:F7},{2:F2}]", Lon(p[i] % NC), Lat(p[i] / NC), Z[p[i]]); }
        sb.Append("]}"); return sb.ToString();
    }
}
