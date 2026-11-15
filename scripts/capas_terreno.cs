// Capas de terreno a 1 m para el motor v2:
//  - Geologia (Stack et al. 2020) rasterizada: 0 = sin unidad, 1 = dunas grandes, 2 = dunas pequenas, 3 = otra unidad
//  - Fraccion de sombras de rocas desde HiRISE 25 cm (Mars Trek z17, ~0,3 m/px):
//    un pixel es "sombra" si es mucho mas oscuro que su entorno (metodo de deteccion por sombras, como en los conteos de rocas de Golombek).
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public static class CapasTerreno
{
    public static byte[] RasterGeologia(List<double[]> xs, List<double[]> ys, int[] clase, int nr, int nc, double x0m, double y0m, double R)
    {
        byte[] g = new byte[nr * nc]; double k = 180.0 / Math.PI / R;
        // cajas envolventes para acelerar
        int np = xs.Count; double[] bx0 = new double[np], bx1 = new double[np], by0 = new double[np], by1 = new double[np];
        for (int p = 0; p < np; p++) { bx0[p] = double.MaxValue; bx1[p] = double.MinValue; by0[p] = double.MaxValue; by1[p] = double.MinValue;
            for (int i = 0; i < xs[p].Length; i++) { bx0[p] = Math.Min(bx0[p], xs[p][i]); bx1[p] = Math.Max(bx1[p], xs[p][i]); by0[p] = Math.Min(by0[p], ys[p][i]); by1[p] = Math.Max(by1[p], ys[p][i]); } }
        for (int r = 0; r < nr; r++) for (int c = 0; c < nc; c++)
        {
            double lon = (x0m + c + 0.5) * k, lat = (y0m - r - 0.5) * k; byte best = 0;
            for (int p = 0; p < np; p++)
            {
                if (lon < bx0[p] || lon > bx1[p] || lat < by0[p] || lat > by1[p]) continue;
                if (!Pip(lon, lat, xs[p], ys[p])) continue;
                byte cl = (byte)clase[p];
                if (best == 0 || cl < best) best = cl; // prioridad: dunas grandes > dunas pequenas > otra
            }
            g[r * nc + c] = best;
        }
        return g;
    }

    static bool Pip(double x, double y, double[] xs, double[] ys)
    {
        bool c = false;
        for (int i = 0, j = xs.Length - 1; i < xs.Length; j = i++)
            if (((ys[i] > y) != (ys[j] > y)) && (x < (xs[j] - xs[i]) * (y - ys[i]) / (ys[j] - ys[i]) + xs[i])) c = !c;
        return c;
    }

    // Devuelve fraccion de pixeles de sombra por celda de 1 m.
    public static float[] SombrasHirise(string dir, int col0, int col1, int fila0, int fila1, int z, int nr, int nc, double x0m, double y0m, double R, int ventana, double umbral)
    {
        int W = (col1 - col0 + 1) * 256, H = (fila1 - fila0 + 1) * 256;
        float[] img = new float[W * H];
        for (int fr = fila0; fr <= fila1; fr++) for (int fc = col0; fc <= col1; fc++)
        {
            string path = System.IO.Path.Combine(dir, fr + "_" + fc + ".png");
            if (!System.IO.File.Exists(path)) continue;
            using (var bmp = new Bitmap(path))
            {
                for (int y = 0; y < 256; y++) for (int x = 0; x < 256; x++)
                {
                    Color px = bmp.GetPixel(x, y);
                    img[((fr - fila0) * 256 + y) * W + (fc - col0) * 256 + x] = px.A == 0 ? float.NaN : (px.R + px.G + px.B) / 3f;
                }
            }
        }
        // imagen integral para la media local
        double[] I = new double[(W + 1) * (H + 1)]; int[] N = new int[(W + 1) * (H + 1)];
        for (int y = 0; y < H; y++) { double s = 0; int n = 0; for (int x = 0; x < W; x++) { float v = img[y * W + x]; if (!float.IsNaN(v)) { s += v; n++; } I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + s; N[(y + 1) * (W + 1) + x + 1] = N[y * (W + 1) + x + 1] + n; } }
        double deg = 180.0 / Math.Pow(2, z), pxDeg = deg / 256.0, k = 180.0 / Math.PI / R;
        float[] cnt = new float[nr * nc], sh = new float[nr * nc]; int h = ventana / 2;
        for (int y = 0; y < H; y++) for (int x = 0; x < W; x++)
        {
            float v = img[y * W + x]; if (float.IsNaN(v)) continue;
            double lon = (col0 * 256 + x + 0.5) * pxDeg - 180, lat = 90 - (fila0 * 256 + y + 0.5) * pxDeg;
            int c = (int)Math.Floor(lon / k - x0m), r = (int)Math.Floor(y0m - lat / k);
            if (r < 0 || c < 0 || r >= nr || c >= nc) continue;
            int xa = Math.Max(0, x - h), xb = Math.Min(W, x + h + 1), ya = Math.Max(0, y - h), yb = Math.Min(H, y + h + 1);
            double s = I[yb * (W + 1) + xb] - I[ya * (W + 1) + xb] - I[yb * (W + 1) + xa] + I[ya * (W + 1) + xa];
            int n = N[yb * (W + 1) + xb] - N[ya * (W + 1) + xb] - N[yb * (W + 1) + xa] + N[ya * (W + 1) + xa];
            cnt[r * nc + c]++;
            if (n > 0 && v < umbral * s / n) sh[r * nc + c]++;
        }
        for (int i = 0; i < sh.Length; i++) sh[i] = cnt[i] > 0 ? sh[i] / cnt[i] : float.NaN;
        return sh;
    }
}
