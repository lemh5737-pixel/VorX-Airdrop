import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { database, ref, set, onValue, get, update } from '../lib/firebase';
import { generateDeviceId } from '../utils/generateId';

export default function Home() {
  const [deviceId, setDeviceId] = useState('');
  const [username, setUsername] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [targetUserId, setTargetUserId] = useState(''); // State untuk ID target
  const [searchStatus, setSearchStatus] = useState(''); // State untuk status pencarian
  const router = useRouter();

  useEffect(() => {
    const id = generateDeviceId();
    setDeviceId(id);
    
    const userRef = ref(database, `users/${id}`);
    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUsername(userData.username || `User-${id.substring(0, 5)}`);
        setIsRegistered(true);
      } else {
        setIsRegistered(false);
      }
    });

    // Fungsi untuk update status online dan lastSeen
    const updateOnlineStatus = () => {
      set(ref(database, `users/${id}`), {
        username: username || `User-${id.substring(0, 5)}`,
        online: true,
        lastSeen: Date.now() // Simpan timestamp
      });
    };

    // Update status saat pertama kali load
    updateOnlineStatus();

    // Update status setiap 30 detik
    const interval = setInterval(updateOnlineStatus, 30000);
    
    return () => {
      clearInterval(interval);
      // Tandai user offline saat komponen unmount
      if (id) {
        update(ref(database, `users/${id}`), { online: false });
      }
    };
  }, [deviceId, username]);

  useEffect(() => {
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const users = [];
        const now = Date.now();
        const OFFLINE_THRESHOLD = 60000; // 60 detik

        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          const userId = childSnapshot.key;

          // Anggap offline jika lastSeen sudah lebih lama dari threshold
          const isActuallyOnline = userData.online && (now - userData.lastSeen < OFFLINE_THRESHOLD);

          if (isActuallyOnline && userId !== deviceId) {
            users.push({
              id: userId,
              ...userData
            });
          }
        });
        setOnlineUsers(users);
      } else {
        setOnlineUsers([]);
      }
    });
  }, [deviceId]);

  const handleRegister = (e) => {
    e.preventDefault();
    if (username.trim()) {
      set(ref(database, `users/${deviceId}`), {
        username: username.trim(),
        online: true,
        lastSeen: Date.now()
      });
      setIsRegistered(true);
    }
  };

  const handleLogout = () => {
    update(ref(database, `users/${deviceId}`), { online: false });
    setIsRegistered(false);
  };

  const handleSelectUser = (userId) => {
    router.push({
      pathname: '/send',
      query: { receiverId: userId }
    });
  };

  // *** FUNGSI BARU UNTUK KIRIM VIA ID ***
  const handleSendById = async () => {
    if (!targetUserId.trim()) {
      showNotification('ID Pengguna tidak boleh kosong', 'error');
      return;
    }
    setSearchStatus('Mencari pengguna...');
    
    try {
      const userRef = ref(database, `users/${targetUserId.trim()}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const now = Date.now();
        const OFFLINE_THRESHOLD = 60000;
        const isActuallyOnline = userData.online && (now - userData.lastSeen < OFFLINE_THRESHOLD);

        if (isActuallyOnline) {
          showNotification(`Pengguna ${userData.username} ditemukan!`, 'success');
          router.push({
            pathname: '/send',
            query: { receiverId: targetUserId.trim() }
          });
        } else {
          showNotification('Pengguna ditemukan tetapi sedang offline.', 'error');
        }
      } else {
        showNotification('Pengguna dengan ID tersebut tidak ditemukan.', 'error');
      }
    } catch (error) {
      console.error("Error checking user ID:", error);
      showNotification('Terjadi kesalahan saat mencari pengguna.', 'error');
    } finally {
      setSearchStatus('');
      setTargetUserId(''); // Kosongkan input setelah pencarian
    }
  };

  const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    if (type === 'error') {
      notification.style.backgroundColor = '#ea4335';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  return (
    <div className="container">
      <header>
        <div className="header-content">
          <div className="logo">VorX-Airdrop</div>
          <div className="user-info">
            {isRegistered ? (
              <>
                <span>{username}</span>
                <div className="device-id">ID: {deviceId.substring(0, 8)}...</div>
                <button className="btn" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <div className="device-id">ID: {deviceId.substring(0, 8)}...</div>
            )}
          </div>
        </div>
      </header>

      <main>
        {!isRegistered ? (
          <div className="card">
            <h2 className="card-title">Bergabung dengan VorX-Airdrop</h2>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label htmlFor="username">Nama Pengguna</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan nama Anda"
                  required
                />
              </div>
              <button type="submit" className="btn">Bergabung</button>
            </form>
          </div>
        ) : (
          <>
            <div className="card">
              <h2 className="card-title">Pengguna Online ({onlineUsers.length})</h2>
              {onlineUsers.length > 0 ? (
                <div className="user-list">
                  {onlineUsers.map((user) => (
                    <div
                      key={user.id}
                      className="user-card"
                      onClick={() => handleSelectUser(user.id)}
                    >
                      <div className="user-avatar">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-details">
                        <div className="user-name">{user.username}</div>
                        <div className="user-status">Online</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Tidak ada pengguna online saat ini.</p>
              )}
            </div>

            {/* *** FITUR BARU: KIRIM VIA ID *** */}
            <div className="card">
              <h2 className="card-title">Kirim via ID Pengguna</h2>
              <p>Jika Anda tahu ID Pengguna tujuan, masukkan di bawah ini.</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Masukkan ID Pengguna (UUID)"
                  style={{ flexGrow: 1, padding: '10px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                />
                <button className="btn" onClick={handleSendById} disabled={!targetUserId.trim()}>
                  {searchStatus ? 'Mencari...' : 'Kirim'}
                </button>
              </div>
              {searchStatus && <p style={{ marginTop: '10px', color: 'var(--primary-color)' }}>{searchStatus}</p>}
            </div>

            <div className="card">
              <h2 className="card-title">Penerimaan File</h2>
              <p>Periksa halaman penerimaan untuk melihat file yang dikirimkan kepada Anda.</p>
              <button
                className="btn"
                onClick={() => router.push('/receive')}
              >
                Buka Halaman Penerimaan
              </button>
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        <p>© 2023 VorX-Airdrop | Credit by VorXTeam</p>
      </footer>
    </div>
  );
}
