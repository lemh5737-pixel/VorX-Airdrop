import { useEffect, useState, useRef } from 'react'; // *** useRef SUDAH DITAMBAHKAN DI SINI ***
import { useRouter } from 'next/router';
import { database, ref, set, onValue, get, update, remove } from '../lib/firebase';
import { generateDeviceId } from '../utils/generateId';
// import '../styles/global.css'; // Pastikan ini ada di _app.js

export default function Home() {
  const [deviceId, setDeviceId] = useState('');
  const [username, setUsername] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const intervalRef = useRef(null); // Ini adalah baris yang menyebabkan error

  useEffect(() => {
    const id = generateDeviceId();
    setDeviceId(id);
    
    const checkRegistrationStatus = async () => {
      setIsLoading(true);
      const userRef = ref(database, `users/${id}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUsername(userData.username || `User-${id.substring(0, 5)}`);
        setIsRegistered(true);
        if (userData.online) {
          setIsOnline(true);
        }
      } else {
        setIsRegistered(false);
        setIsOnline(false);
      }
      setIsLoading(false);
    };

    checkRegistrationStatus();
  }, []);

  useEffect(() => {
    if (isOnline) {
      intervalRef.current = setInterval(() => {
        update(ref(database, `users/${deviceId}`), {
          lastSeen: Date.now()
        });
      }, 30000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isOnline, deviceId]);

  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const users = [];
        const now = Date.now();
        const OFFLINE_THRESHOLD = 60000;

        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          const userId = childSnapshot.key;
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

    return () => unsubscribe();
  }, [deviceId]);

  const handleRegister = (e) => {
    e.preventDefault();
    if (username.trim()) {
      set(ref(database, `users/${deviceId}`), {
        username: username.trim(),
        online: false,
        lastSeen: Date.now()
      });
      setIsRegistered(true);
    }
  };

  const handleGoOnline = () => {
    setIsOnline(true);
    update(ref(database, `users/${deviceId}`), {
      online: true,
      lastSeen: Date.now()
    });
  };

  const handleGoOffline = () => {
    setIsOnline(false);
    update(ref(database, `users/${deviceId}`), {
      online: false
    });
  };
  
  const handleUnregisterDevice = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus data perangkat ini? Anda akan perlu mendaftar ulang.')) {
      await remove(ref(database, `users/${deviceId}`));
      localStorage.removeItem('vorx-device-id');
      window.location.reload();
    }
  };

  const handleSelectUser = (userId) => {
    router.push({
      pathname: '/send',
      query: { receiverId: userId }
    });
  };

  const handleSendById = async () => {
    if (!targetUserId.trim()) {
      showNotification('ID Pengguna tidak boleh kosong', 'error');
      return;
    }
    setSearchStatus('Mencari pengguna...');
    
    try {
      const userRef = ref(database, `users/${targetUserId.trim()}`);
      const snapshot = await get(userRef);
      const now = Date.now();
      const OFFLINE_THRESHOLD = 60000;
      const isActuallyOnline = snapshot.exists() && snapshot.val().online && (now - snapshot.val().lastSeen < OFFLINE_THRESHOLD);

      if (isActuallyOnline) {
        showNotification(`Pengguna ${snapshot.val().username} ditemukan!`, 'success');
        router.push({
          pathname: '/send',
          query: { receiverId: targetUserId.trim() }
        });
      } else if (snapshot.exists()) {
        showNotification('Pengguna ditemukan tetapi sedang offline.', 'error');
      } else {
        showNotification('Pengguna dengan ID tersebut tidak ditemukan.', 'error');
      }
    } catch (error) {
      console.error("Error checking user ID:", error);
      showNotification('Terjadi kesalahan saat mencari pengguna.', 'error');
    } finally {
      setSearchStatus('');
      setTargetUserId('');
    }
  };

  const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    if (type === 'error') notification.style.backgroundColor = '#ea4335';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  if (isLoading) {
    return (
      <div className="container">
        <header><div className="header-content"><div className="logo">VorX-Airdrop</div></div></header>
        <main><div className="card"><h2 className="card-title">Memeriksa status perangkat...</h2></div></main>
      </div>
    );
  }

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
                {isOnline ? (
                  <button className="btn btn-danger" onClick={handleGoOffline}>Go Offline</button>
                ) : (
                  <button className="btn" onClick={handleGoOnline}>Go Online</button>
                )}
                <button className="btn" onClick={handleUnregisterDevice} style={{backgroundColor: '#fbbc04', color: 'black'}}>Hapus Perangkat</button>
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
            <p>Perangkat ini belum terdaftar. Silakan daftar untuk melanjutkan.</p>
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
              <button type="submit" className="btn">Bergabung Sekali</button>
            </form>
          </div>
        ) : !isOnline ? (
          <div className="card">
            <h2 className="card-title">Anda Sedang Offline</h2>
            <p>Untuk mulai berbagi file atau melihat pengguna lain, silakan klik tombol "Go Online" di atas.</p>
          </div>
        ) : (
          <>
            <div className="card">
              <h2 className="card-title">Pengguna Online ({onlineUsers.length})</h2>
              {onlineUsers.length > 0 ? (
                <div className="user-list">
                  {onlineUsers.map((user) => (
                    <div key={user.id} className="user-card" onClick={() => handleSelectUser(user.id)}>
                      <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
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
              <button className="btn" onClick={() => router.push('/receive')}>Buka Halaman Penerimaan</button>
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
