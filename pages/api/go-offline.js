// /pages/api/go-offline.js
import { database, ref, update } from '../../lib/firebase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { deviceId } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: 'Device ID is required' });
  }

  try {
    await update(ref(database, `users/${deviceId}`), {
      online: false
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error setting user offline:', error);
    // Jangan kembalikan error ke klien, karena tab sudah ditutup
    res.status(200).json({ success: false }); 
  }
}
