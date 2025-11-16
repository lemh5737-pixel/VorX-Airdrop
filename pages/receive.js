import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { database, ref, onValue, update, remove } from '../lib/firebase';
import { generateDeviceId } from '../utils/generateId';
// import '../styles/global.css'; // Pastikan ini ada di _app.js

export default function Receive() {
  const [deviceId, setDeviceId] = useState('');
  const [transferRequest, setTransferRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [senderName, setSenderName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const id = generateDeviceId();
    setDeviceId(id);
    
    const transferRef = ref(database, `transfers/${id}`);
    onValue(transferRef, (snapshot) => {
      if (snapshot.exists()) {
        const transferData = snapshot.val();
        
        if (transferData.status === 'pending') {
          const senderRef = ref(database, `users/${transferData.from}`);
          onValue(senderRef, (senderSnapshot) => {
            if (senderSnapshot.exists()) {
              setSenderName(senderSnapshot.val().username);
            }
          });
          
          setTransferRequest(transferData);
          setShowModal(true);
        } else if (transferData.status === 'accepted') {
          setTransferRequest(transferData);
          setShowModal(false);
          setShowPreview(true);
        }
      } else {
        setTransferRequest(null);
        setShowModal(false);
        setShowPreview(false);
      }
    });
  }, []);

  const handleAccept = () => {
    if (!transferRequest) return;
    
    update(ref(database, `transfers/${deviceId}`), {
      status: 'accepted'
    });
    
    setShowModal(false);
    setShowPreview(true);
  };

  const handleReject = () => {
    if (!transferRequest) return;
    
    remove(ref(database, `transfers/${deviceId}`));
    
    setShowModal(false);
    setTransferRequest(null);
  };

  // *** FUNGSI DOWNLOAD YANG MENGGUNAKAN API PROXY ***
  const handleDownload = async () => {
    if (!transferRequest || !transferRequest.url) return;
    
    try {
      showNotification('Memulai download...');

      // Panggil API proxy kita dengan URL file dan nama file
      const response = await fetch(`/api/download?url=${encodeURIComponent(transferRequest.url)}&filename=${encodeURIComponent(transferRequest.filename)}`);

      if (!response.ok) {
        throw new Error('Gagal memulai download dari server.');
      }

      // Konversi respons ke Blob
      const blob = await response.blob();

      // Buat URL sementara untuk Blob
      const downloadUrl = window.URL.createObjectURL(blob);

      // Buat elemen <a> untuk trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = transferRequest.filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Hapus URL sementara dari memory
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error('Error during download:', error);
      showNotification(error.message || 'Terjadi kesalahan saat mendownload.', 'error');
    }
  };

  const handleDone = async () => {
    if (!transferRequest) return;
    
    await remove(ref(database, `transfers/${deviceId}`));
    
    setShowPreview(false);
    setTransferRequest(null);
  };

  const handleBack = () => {
    router.push('/');
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
  
  // Cek apakah file adalah gambar berdasarkan mimetype (jika ada) atau ekstensi
  const isImage = (url) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  return (
    <div className="container">
      <header>
        <div className="header-content">
          <div className="logo">VorX-Airdrop</div>
          <button className="btn" onClick={handleBack}>Kembali</button>
        </div>
      </header>

      <main>
        <div className="card">
          <h2 className="card-title">Penerimaan File</h2>
          <p>Halaman ini akan menampilkan notifikasi jika ada file yang dikirimkan kepada Anda.</p>
          
          {!transferRequest && (
            <p>Menunggu file masuk...</p>
          )}
        </div>
      </main>

      {/* Modal untuk konfirmasi penerimaan */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3 className="modal-title">Permintaan Transfer File</h3>
            <div className="modal-body">
              <p>{senderName} ingin mengirim file kepada Anda:</p>
              <p>Nama File: {transferRequest?.filename}</p>
              <p>Ukuran: {(transferRequest?.filesize / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleReject}>Tolak</button>
              <button className="btn btn-success" onClick={handleAccept}>Terima</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview file */}
      {showPreview && (
        <div className="modal">
          <div className="modal-content">
            <h3 className="modal-title">Preview File</h3>
            <div className="modal-body">
              <p>Dari: {senderName}</p>
              <p>Nama File: {transferRequest?.filename}</p>
              
              {isImage(transferRequest?.url) ? (
                <div className="file-preview">
                  <img src={transferRequest?.url} alt={transferRequest?.filename} />
                </div>
              ) : (
                <div className="file-info">
                  <p>File tidak dapat dipreview. Silakan download untuk melihat konten.</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={handleDownload}>Download</button>
              <button className="btn btn-success" onClick={handleDone}>Selesai</button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>© 2023 VorX-Airdrop | Credit by VorXTeam</p>
      </footer>
    </div>
  );
    }
