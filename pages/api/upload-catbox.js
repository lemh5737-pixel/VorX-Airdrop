// /pages/api/upload-catbox.js
import multiparty from 'multiparty';
import fetch from 'node-fetch';

// Matikan body parser bawaan Next.js agar kita bisa membaca data form (file) secara manual
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new multiparty.Form();

    // Parsing data form yang dikirim dari klien
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const fileToUpload = files.fileToUpload[0];
    const reqtype = fields.reqtype[0];

    // Buat FormData baru untuk dikirim ke server Catbox
    const catboxFormData = new FormData();
    catboxFormData.append('reqtype', reqtype);
    catboxFormData.append('fileToUpload', fileToUpload, {
      filename: fileToUpload.originalFilename,
      contentType: fileToUpload.headers['content-type'],
    });

    // Kirim request ke Catbox dari server (tanpa masalah CORS)
    const catboxResponse = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: catboxFormData,
      headers: catboxFormData.getHeaders(),
    });

    const responseText = await catboxResponse.text();

    if (!catboxResponse.ok) {
      console.error('Catbox API error:', responseText);
      return res.status(catboxResponse.status).json({ error: 'Failed to upload to Catbox', details: responseText });
    }

    // Response dari Catbox biasanya berupa teks URL, bukan JSON
    // Kita akan memformatnya menjadi JSON yang konsisten
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      // Jika bukan JSON, anggap response adalah URL langsung
      result = { success: true, fileurl: responseText.trim() };
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Error in upload proxy:', error);
    res.status(500).json({ error: 'Internal server error during upload.' });
  }
        }
