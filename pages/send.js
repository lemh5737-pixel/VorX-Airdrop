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
  const [uploadResults, setUploadResults] = useState([]); // State untuk menyimpan semua hasil upload
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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResults([]); // Reset hasil upload saat file baru dipilih
      setTransferStatus('');
    }
  };

  // FUNGSI UPLOAD YANG SUDAH DIPERBAIKI UNTUK MULTI-UPLOADER
  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setUploadResults([]); // Reset hasil
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengunggah file');
      }

      const data = await response.json();
      setUploadResults(data.results);

      // Cari upload yang pertama kali berhasil untuk dikirim
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
          <h2 className="card-title">Kirim File ke {receiverName || '...'}</h2>
          
          <div className="form-group">
            <label htmlFor="file">Pilih File</label>
            <input
              type="file"
              id="file"
              onChange={handleFileChange}
              disabled={uploading}
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
            {uploading ? 'Mengunggah...' : (transferStatus === 'accepted' ? 'File Diterima' : 'Kirim File')}
          </button>

          {/* Tampilkan semua hasil upload */}
          {uploadResults.length > 0 && (
            <div className="upload-results" style={{ marginTop: '20px' }}>
              <h4>Hasil Upload:</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {uploadResults.map((result, index) => (
                  <li key={index} style={{ marginBottom: '10px' }}>
                    {result.status === 'success' ? (
                      <span>
                        ✅ <strong>{result.service}:</strong>{' '}
                        <a href={result.url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
                          {result.url}
                        </a>
                      </span>
                    ) : (
                      <span>❌ <strong>{result.service}:</strong> Gagal</span>
                    )}
                  </li>
                ))}
              </ul>
              {transferStatus === 'accepted' && (
                 <p style={{color: 'var(--secondary-color)'}}>File yang dikirim menggunakan link dari salah satu layanan di atas.</p>
              )}
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
