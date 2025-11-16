// /pages/api/cleanup.js
import { database, ref, get, remove } from '../../../lib/firebase';

// Kunci rahasia untuk mencegah akses tidak sah. GANTI dengan kunci yang unik!
const CLEANUP_SECRET_KEY = 'vorx-cleanup-2023-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret } = req.body;
  if (secret !== CLEANUP_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = Date.now();
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
  const twelveHoursAgo = now - (12 * 60 * 60 * 1000); // Ambang batas baru untuk transfer

  let usersDeleted = 0;
  let transfersDeleted = 0;

  try {
    // --- BAGIAN 1: Hapus pengguna yang tidak aktif (logika lama) ---
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);

    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      const deletionPromises = [];

      for (const userId in users) {
        const user = users[userId];
        if (user.lastSeen && user.lastSeen < twentyFourHoursAgo) {
          console.log(`Deleting inactive user: ${userId}`);
          deletionPromises.push(remove(ref(database, `users/${userId}`)));
          deletionPromises.push(remove(ref(database, `transfers/${userId}`))); // Hapus juga transfer mereka
          usersDeleted++;
        }
      }
      await Promise.all(deletionPromises);
    }

    // --- BAGIAN 2: Hapus transfer lama (LOGIKA BARU) ---
    const transfersRef = ref(database, 'transfers');
    const transfersSnapshot = await get(transfersRef);

    if (transfersSnapshot.exists()) {
      const allUserTransfers = transfersSnapshot.val();
      const transferDeletionPromises = [];

      for (const userId in allUserTransfers) {
        const userTransfers = allUserTransfers[userId];
        for (const transferKey in userTransfers) {
          const transfer = userTransfers[transferKey];
          // Hapus transfer yang lebih lama dari 12 jam
          if (transfer.timestamp && transfer.timestamp < twelveHoursAgo) {
            console.log(`Deleting old transfer: ${transferKey} for user: ${userId}`);
            transferDeletionPromises.push(remove(ref(database, `transfers/${userId}/${transferKey}`)));
            transfersDeleted++;
          }
        }
      }
      await Promise.all(transferDeletionPromises);
    }

    res.status(200).json({ message: 'Cleanup successful.', usersDeleted, transfersDeleted });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Internal server error during cleanup.' });
  }
}
