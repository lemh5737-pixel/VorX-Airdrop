// /pages/api/upload.js
import multiparty from 'multiparty';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Matikan body parser bawaan Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

// --- FUNGSI-FUNGSI UPLOADER ---

// Uploader ke Catbox
async function uploadToCatbox(filePath) {
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', fs.createReadStream(filePath));

  const response = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });

  if (!response.ok) throw new Error('Catbox upload failed');
  const url = await response.text();
  return url.trim();
}

// Uploader ke Transfer.sh (sangat sederhana)
async function uploadToTransferSh(filePath, originalFilename) {
  const fileStream = fs.createReadStream(filePath);
  const response = await fetch(`https://transfer.sh/${encodeURIComponent(originalFilename)}`, {
    method: 'PUT',
    body: fileStream,
    headers: {
      'Content-Type': 'application/octet-stream',
    },
  });

  if (!response.ok) throw new Error('Transfer.sh upload failed');
  return response.url;
}

// --- HANDLER UTAMA API ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let filePath;
  try {
    const form = new multiparty.Form();
    const { files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const uploadedFile = files.file[0];
    filePath = uploadedFile.path;
    const originalFilename = uploadedFile.originalFilename;
    const fileExt = path.extname(originalFilename).toLowerCase();

    // Daftar uploader, mirip seperti di bot
    const uploaders = [
      { name: 'Catbox', func: uploadToCatbox, exts: ['.jpg', '.jpeg', '.png', '.gif', '.zip', '.js', '.mp4', '.webm', '.pdf'] },
      { name: 'Transfer.sh', func: uploadToTransferSh, exts: [] }, // Menerima semua file
    ];

    const results = [];
    const errors = [];

    // Loop upload ke semua service
    for (const uploader of uploaders) {
      if (uploader.exts.length > 0 && !uploader.exts.includes(fileExt)) {
        continue; // Lewati jika ekstensi tidak didukung
      }

      try {
        const result = await uploader.func(filePath, originalFilename);
        results.push({ service: uploader.name, status: 'success', url: result });
      } catch (e) {
        errors.push({ service: uploader.name, status: 'failed', error: e.message });
        results.push({ service: uploader.name, status: 'failed', error: e.message });
      }
    }

    // Log error internal (opsional)
    if (errors.length > 0) {
      console.error('[UPLOAD ERRORS]', JSON.stringify(errors, null, 2));
    }

    res.status(200).json({ results });

  } catch (error) {
    console.error('Error in upload API:', error);
    res.status(500).json({ error: 'Internal server error during upload.' });
  } finally {
    // HAPUS FILE TEMPORARY SETELAH SEMUA PROSES SELESAI
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
