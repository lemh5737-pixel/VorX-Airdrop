import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { database, ref, set, onValue } from '../lib/firebase';
import { generateDeviceId } from '../utils/generateId';
// import '../styles/global.css'; // Pastikan ini ada di _app.js

export default function Send() {
  const [deviceId, setDeviceId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [transferStatus, setTransferStatus] = useState('');
  const router = useRouter();

  useEffect(() => {
    const id = generateDeviceId();
    setDeviceId(id);
    
    if (router.query.receiverId) {
      setReceiverId(router.query.receiverId);
      
      const receiverRef = ref(database, `users/${router.query.receiverId}`);
      onValue(receiverRef, (snapshot) => {
        if (snapshot.exists()) {
          setReceiverName(snapshot.val().username);
        }
      });
    }
  }, [router.query.receiverId]);

  useEffect(() => {
    if (!receiverId) return;
    
    const transferRef = ref(database, `transfers/${receiverId}`);
    onValue(transferRef, (snapshot) => {
      if (snapshot.exists()) {
        const transferData = snapshot.val();
        if (transferData.from === deviceId) {
          setTransferStatus(transferData.status);
          
          if (transferData.status === 'accepted') {
            showNotification('File diterima oleh ' + receiverName);
          }
        }
      } else {
        setTransferStatus('');
      }
    });
  }, [receiverId, deviceId, receiverName]);

  // *** FUNGSI YANG SUDAH DIPERBAIKI UNTUK HANYA GAMBAR ***
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validasi: Pastikan yang dipilih adalah file gambar
      if (!selectedFile.type.startsWith('image/')) {
        showNotification('Hanya file gambar (image) yang didukung.', 'error');
        e.target.value = ''; // Kosongkan input file
        return; // Hentikan proses lebih lanjut
      }

      setFile(selectedFile);
      setTransferStatus('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Gunakan API upload multi-uploader
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengunggah file');
      }

      const data = await response.json();
      const firstSuccess = data.results.find(r => r.status === 'success');

      if (firstSuccess) {
        sendTransferRequest(firstSuccess.url);
      } else {
        showNotification('Semua layanan upload gagal. Silakan coba lagi.', 'error');
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      showNotification(error.message || 'Terjadi kesalahan saat mengunggah', 'error');
    } finally {
      setUploading(false);
    }
  };

  const sendTransferRequest = (url) => {
    set(ref(database, `transfers/${receiverId}`), {
      from: deviceId,
      url: url,
      status: 'pending',
      filename: file.name,
      filesize: file.size
    });
    
    showNotification('Permintaan pengiriman file telah dikirim');
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

  const handleBack = () => {
    router.push('/');
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
          <h2 className="card-title">Kirim Gambar ke {receiverName || '...'}</h2>
          
          <div className="form-group">
            <label htmlFor="file">Pilih Gambar</label>
            <p style={{ fontSize: '12px', color: '#5f6368', margin: '5px 0' }}>
              Hanya mendukung file dengan ekstensi .jpg, .png, .gif, .webp, dll.
            </p>
            <input
              type="file"
              id="file"
              onChange={handleFileChange}
              disabled={uploading}
              // *** TAMBAHKAN ATRIBUT INI UNTUK MEMBATASI PILIHAN FILE DI DIALOG ***
              accept="image/*"
            />
          </div>
          
          {file && (
            <div className="file-info">
              <p>Nama File: {file.name}</p>
              <p>Ukuran: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}
          
          <button
            className="btn"
            onClick={handleUpload}
            disabled={!file || uploading || transferStatus === 'accepted'}
          >
            {uploading ? 'Mengunggah...' : (transferStatus === 'accepted' ? 'Gambar Diterima' : 'Kirim Gambar')}
          </button>

          {transferStatus && (
            <div className="upload-results" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f0fe', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
              <h4 style={{ marginTop: 0 }}>Informasi Pengiriman</h4>
              <p><strong>Nama File/Media:</strong> {file?.name}</p>
              <p><strong>Penerima:</strong> {receiverName}</p>
              <p><strong>Status:</strong> {transferStatus === 'accepted' ? '✅ Telah diterima' : '⏳ Menunggu konfirmasi penerima...'}</p>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>© 2023 VorX-Airdrop | Credit by VorXTeam</p>
      </footer>
    </div>
  );
    }
