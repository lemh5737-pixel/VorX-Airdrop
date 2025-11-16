// /pages/api/cleanup.js
import { database, ref, get, remove } from '../../../lib/firebase';

// Kunci rahasia untuk mencegah akses tidak sah. GANTI dengan kunci yang unik!
const CLEANUP_SECRET_KEY = 'vorx-cleanup-2023-secret-key';

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verifikasi kunci rahasia
  const { secret } = req.body;
  if (secret !== CLEANUP_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = Date.now();
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
  let usersDeleted = 0;

  try {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
      const users = snapshot.val();
      const deletionPromises = [];

      for (const userId in users) {
        const user = users[userId];
        // Hapus jika lastSeen lebih lama dari 24 jam
        if (user.lastSeen && user.lastSeen < twentyFourHoursAgo) {
          console.log(`Deleting inactive user: ${userId}`);
          deletionPromises.push(remove(ref(database, `users/${userId}`)));
          deletionPromises.push(remove(ref(database, `transfers/${userId}`))); // Hapus juga transfer mereka
          usersDeleted++;
        }
      }

      await Promise.all(deletionPromises);
    }

    res.status(200).json({ message: 'Cleanup successful.', usersDeleted });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Internal server error during cleanup.' });
  }
}
