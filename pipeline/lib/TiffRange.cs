// Reads a pixel window from a remote, uncompressed, one-row-per-strip GeoTIFF (classic or BigTIFF)
// using HTTP range requests in parallel, so only the needed rows are downloaded.
// Used for the USGS Mars 2020 TRN HiRISE DTM (float32) and orthomosaic (uint8).
// AI-assisted (Claude). Reviewed by the MARS+ team.
using System;
using System.IO;
using System.Net;
using System.Threading.Tasks;

public class TiffInfo
{
    public string Url; public bool Big; public int Width, Height, BytesPerSample;
    public long StripOffsetsPos; public int StripOffsetSize;
    public double ScaleX, ScaleY, TieX, TieY;
}

public static class TiffRange
{
    static byte[] Range(string url, long a, long b)
    {
        var req = (HttpWebRequest)WebRequest.Create(url); req.AddRange(a, b); req.Timeout = 120000; req.UserAgent = "mars-plus-pipeline";
        using (var resp = req.GetResponse()) using (var s = resp.GetResponseStream()) using (var ms = new MemoryStream()) { s.CopyTo(ms); return ms.ToArray(); }
    }

    public static TiffInfo Open(string url)
    {
        byte[] h = Range(url, 0, 15);
        if (h[0] != 'I' || h[1] != 'I') throw new Exception("Only little-endian TIFF is supported");
        var info = new TiffInfo { Url = url, Big = BitConverter.ToUInt16(h, 2) == 43 };
        long ifd = info.Big ? (long)BitConverter.ToUInt64(h, 8) : BitConverter.ToUInt32(h, 4);
        int entrySize = info.Big ? 20 : 12, countSize = info.Big ? 8 : 2;
        byte[] cnt = Range(url, ifd, ifd + countSize - 1);
        long n = info.Big ? (long)BitConverter.ToUInt64(cnt, 0) : BitConverter.ToUInt16(cnt, 0);
        byte[] e = Range(url, ifd + countSize, ifd + countSize + n * entrySize - 1);
        long scalePos = -1, tiePos = -1; int compression = 1, rowsPerStrip = 1, spp = 1;
        for (int i = 0; i < n; i++)
        {
            int o = i * entrySize; int tag = BitConverter.ToUInt16(e, o), type = BitConverter.ToUInt16(e, o + 2);
            long count = info.Big ? (long)BitConverter.ToUInt64(e, o + 4) : BitConverter.ToUInt32(e, o + 4);
            int vo = o + (info.Big ? 12 : 8);
            long val = type == 3 ? BitConverter.ToUInt16(e, vo) : (info.Big ? (long)BitConverter.ToUInt64(e, vo) : BitConverter.ToUInt32(e, vo));
            switch (tag)
            {
                case 256: info.Width = (int)val; break;
                case 257: info.Height = (int)val; break;
                case 258: info.BytesPerSample = (int)val / 8; break;
                case 259: compression = (int)val; break;
                case 273: info.StripOffsetsPos = val; info.StripOffsetSize = type == 16 ? 8 : 4; break;
                case 277: spp = (int)val; break;
                case 278: rowsPerStrip = (int)val; break;
                case 33550: scalePos = val; break;
                case 33922: tiePos = val; break;
            }
        }
        if (compression != 1 || rowsPerStrip != 1 || spp != 1) throw new Exception("Expected uncompressed, single-band, one row per strip");
        byte[] sc = Range(url, scalePos, scalePos + 15); info.ScaleX = BitConverter.ToDouble(sc, 0); info.ScaleY = BitConverter.ToDouble(sc, 8);
        byte[] tp = Range(url, tiePos, tiePos + 47); info.TieX = BitConverter.ToDouble(tp, 24); info.TieY = BitConverter.ToDouble(tp, 32);
        return info;
    }

    /// Reads rows [r0, r0+nr) and columns [c0, c0+nc) as raw little-endian bytes.
    public static byte[] ReadWindow(TiffInfo t, int r0, int nr, int c0, int nc, int threads)
    {
        ServicePointManager.DefaultConnectionLimit = Math.Max(ServicePointManager.DefaultConnectionLimit, threads * 2);
        byte[] offs = Range(t.Url, t.StripOffsetsPos + (long)t.StripOffsetSize * r0, t.StripOffsetsPos + (long)t.StripOffsetSize * (r0 + nr) - 1);
        int rowBytes = nc * t.BytesPerSample; byte[] img = new byte[(long)nr * rowBytes]; int failed = 0;
        Parallel.For(0, nr, new ParallelOptions { MaxDegreeOfParallelism = threads }, r =>
        {
            long start = (t.StripOffsetSize == 8 ? (long)BitConverter.ToUInt64(offs, 8 * r) : BitConverter.ToUInt32(offs, 4 * r)) + (long)c0 * t.BytesPerSample;
            byte[] row = null;
            for (int attempt = 0; attempt < 4 && row == null; attempt++) { try { row = Range(t.Url, start, start + rowBytes - 1); } catch { System.Threading.Thread.Sleep(1000 * (attempt + 1)); } }
            if (row == null) { System.Threading.Interlocked.Increment(ref failed); return; }
            Buffer.BlockCopy(row, 0, img, r * rowBytes, Math.Min(rowBytes, row.Length));
        });
        if (failed > 0) throw new Exception(failed + " rows could not be downloaded");
        return img;
    }
}
