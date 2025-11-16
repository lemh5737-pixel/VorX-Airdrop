import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { database, ref, set, onValue, remove } from '../lib/firebase';
import { generateDeviceId } from '../utils/generateId';
import '../styles/global.css';

export default function Home() {
  const [deviceId, setDeviceId] = useState('');
  const [username, setUsername] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const id = generateDeviceId();
    setDeviceId(id);
    
    // Cek apakah user sudah terdaftar
    const userRef = ref(database, `users/${id}`);
    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUsername(userData.username);
        setIsRegistered(true);
      } else {
        setIsRegistered(false);
      }
    });

    // Update status online
    const updateOnlineStatus = () => {
      set(ref(database, `users/${id}`), {
        username: username || `User-${id.substring(0, 5)}`,
        online: true,
        lastSeen: Date.now()
      });
    };

    // Update status setiap 30 detik
    const interval = setInterval(updateOnlineStatus, 30000);
    
    // Bersihkan saat komponen unmount
    return () => {
      clearInterval(interval);
      // Tandai user offline
      set(ref(database, `users/${id}/online`), false);
    };
  }, [deviceId, username]);

  useEffect(() => {
    // Dapatkan daftar user online
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const users = [];
        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          if (userData.online && childSnapshot.key !== deviceId) {
            users.push({
              id: childSnapshot.key,
              ...userData
            });
          }
        });
        setOnlineUsers(users);
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
    set(ref(database, `users/${deviceId}/online`), false);
    setIsRegistered(false);
  };

  const handleSelectUser = (userId) => {
    router.push({
      pathname: '/send',
      query: { receiverId: userId }
    });
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
