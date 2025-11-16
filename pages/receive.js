import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { database, ref, onValue, update, remove } from '../lib/firebase';
import { generateDeviceId } from '../utils/generateId';

export default function Receive() {
  const [deviceId, setDeviceId] = useState('');
  const [incomingTransfers, setIncomingTransfers] = useState([]);
  const [senders, setSenders] = useState({});
  const router = useRouter();

  useEffect(() => {
    const id = generateDeviceId();
    setDeviceId(id);
    
    const transfersRef = ref(database, `transfers/${id}`);
    const unsubscribe = onValue(transfersRef, (snapshot) => {
      if (snapshot.exists()) {
        const transfersData = snapshot.val();
        const transferList = [];
        const senderIds = new Set();

        Object.keys(transfersData).forEach(key => {
          const transfer = transfersData[key];
          transferList.push({ key, ...transfer });
          senderIds.add(transfer.from);
        });

        transferList.sort((a, b) => b.timestamp - a.timestamp);
        setIncomingTransfers(transferList);

        senderIds.forEach(senderId => {
          if (!senders[senderId]) {
            const senderRef = ref(database, `users/${senderId}`);
            onValue(senderRef, (senderSnapshot) => {
              if (senderSnapshot.exists()) {
                setSenders(prev => ({ ...prev, [senderId]: senderSnapshot.val().username }));
              }
            }, { onlyOnce: true });
          }
        });
      } else {
        setIncomingTransfers([]);
      }
    });

    return () => unsubscribe();
  }, [deviceId, senders]);

  const handleAccept = (transferKey) => {
    update(ref(database, `transfers/${deviceId}/${transferKey}`), {
      status: 'accepted'
    });
  };

  // *** SISTEM TOLAK MEDIA: HAPUS PERMANENT DARI DATABASE ***
  const handleReject = async (transferKey) => {
    await remove(ref(database, `transfers/${deviceId}/${transferKey}`));
    // Tidak perlu notifikasi karena UI akan otomatis terupdate
  };

  const handleDownload = async (transfer) => {
    try {
      showNotification('Memulai download...');
      const response = await fetch(`/api/download?url=${encodeURIComponent(transfer.url)}&filename=${encodeURIComponent(transfer.filename)}`);
      if (!response.ok) throw new Error('Gagal memulai download dari server.');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = transfer.filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error during download:', error);
      showNotification(error.message || 'Terjadi kesalahan saat mendownload.', 'error');
    }
  };

  const handleDone = async (transferKey) => {
    await remove(ref(database, `transfers/${deviceId}/${transferKey}`));
  };

  const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    if (type === 'error') notification.style.backgroundColor = '#ea4335';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };
  
  const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  return (
    <div className="container">
      <header>
        <div className="header-content">
          <div className="logo">VorX-Airdrop</div>
          <button className="btn" onClick={() => router.push('/')}>Kembali</button>
        </div>
      </header>

      <main>
        <div className="card">
          <h2 className="card-title">Daftar File Masuk</h2>
          {incomingTransfers.length > 0 ? (
            <div className="transfer-list">
              {incomingTransfers.map(transfer => (
                <div key={transfer.key} className="transfer-item" style={{ border: '1px solid var(--border-color)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                  <p><strong>Dari:</strong> {senders[transfer.from] || 'Memuat...'}</p>
                  <p><strong>Nama File:</strong> {transfer.filename}</p>
                  <p><strong>Ukuran:</strong> {(transfer.filesize / 1024 / 1024).toFixed(2)} MB</p>
                  
                  {isImage(transfer.url) && transfer.status === 'accepted' && (
                    <img src={transfer.url} alt={transfer.filename} style={{ maxWidth: '200px', maxHeight: '150px', marginTop: '10px', borderRadius: '4px' }} />
                  )}
                  
                  <div className="transfer-actions" style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                    {transfer.status === 'pending' && (
                      <>
                        <button className="btn btn-success" onClick={() => handleAccept(transfer.key)}>Terima</button>
                        <button className="btn btn-danger" onClick={() => handleReject(transfer.key)}>Tolak</button>
                      </>
                    )}
                    {transfer.status === 'accepted' && (
                      <>
                        <button className="btn" onClick={() => handleDownload(transfer)}>Download</button>
                        <button className="btn btn-success" onClick={() => handleDone(transfer.key)}>Selesai</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>Tidak ada file masuk. Menunggu pengiriman...</p>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>© 2023 VorX-Airdrop | Credit by VorXTeam</p>
      </footer>
    </div>
  );
    }
