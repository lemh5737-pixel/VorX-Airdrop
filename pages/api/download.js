// /pages/api/download.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { url, filename } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Fetch file dari URL eksternal (server-to-server, tidak ada masalah CORS)
    const response = await fetch(url);

    if (!response.ok) {
      // Jika gagal mengambil file, kirim error
      console.error(`Failed to fetch file: ${url} - Status: ${response.status}`);
      return res.status(response.status).json({ error: 'Failed to fetch the file from the external server.' });
    }

    // Dapatkan tipe konten dari respons eksternal
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Set header untuk memberi tahu browser bahwa ini adalah file yang akan diunduh
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || 'download')}"`);

    // Alihkan (pipe) data dari URL eksternal langsung ke respons kita
    // Ini efisien karena tidak perlu menyimpan seluruh file di memori server
    response.body.pipe(res);

  } catch (error) {
    console.error('Error in download proxy:', error);
    res.status(500).json({ error: 'Internal server error during download.' });
  }
}
