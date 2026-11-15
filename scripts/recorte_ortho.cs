// Lee un recorte de la ortoimagen HiRISE 25 cm (USGS, BigTIFF sin compresion, 1 fila por bloque)
// usando peticiones HTTP parciales en paralelo, sin descargar los 7 GB.
using System;
using System.Net;
using System.IO;
using System.Threading.Tasks;

public static class RecorteOrtho
{
    static byte[] Range(string url, long a, long b)
    {
        var req = (HttpWebRequest)WebRequest.Create(url); req.AddRange(a, b); req.Timeout = 120000;
        using (var resp = req.GetResponse()) using (var s = resp.GetResponseStream()) using (var ms = new MemoryStream()) { s.CopyTo(ms); return ms.ToArray(); }
    }

    public static string Info(string url)
    {
        byte[] h = Range(url, 1031796, 1031796 + 8 * 9 - 1);
        double sx = BitConverter.ToDouble(h, 0), sy = BitConverter.ToDouble(h, 8);
        double tx = BitConverter.ToDouble(h, 24 + 24), ty = BitConverter.ToDouble(h, 24 + 32);
        return sx + "|" + sy + "|" + tx + "|" + ty;
    }

    public static byte[] Leer(string url, int r0, int nr, int c0, int nc, int hilos)
    {
        ServicePointManager.DefaultConnectionLimit = hilos * 2;
        byte[] offs = Range(url, 344180 + 8L * r0, 344180 + 8L * (r0 + nr) - 1);
        byte[] img = new byte[(long)nr * nc];
        int hechos = 0;
        Parallel.For(0, nr, new ParallelOptions { MaxDegreeOfParallelism = hilos }, r =>
        {
            long off = (long)BitConverter.ToUInt64(offs, 8 * r) + c0;
            byte[] fila = null;
            for (int intento = 0; intento < 4 && fila == null; intento++) { try { fila = Range(url, off, off + nc - 1); } catch { System.Threading.Thread.Sleep(1000); } }
            if (fila != null) Buffer.BlockCopy(fila, 0, img, r * nc, Math.Min(nc, fila.Length));
            System.Threading.Interlocked.Increment(ref hechos);
        });
        return img;
    }
}
