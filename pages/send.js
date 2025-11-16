import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { database, ref, set, onValue } from '../lib/firebase';
import { generateDeviceId } from '../utils/generateId';

export default function Send() {
  const [deviceId, setDeviceId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  // State uploadProgress dihapus karena tidak lagi digunakan dengan fetch
  const [fileUrl, setFileUrl] = useState('');
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
      setFileUrl('');
      setTransferStatus('');
    }
  };

  // FUNGSI UPLOAD YANG SUDAH DIPERBAIKI
  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('fileToUpload', file);
      formData.append('reqtype', 'fileupload');

      // Kirim file ke API route kita sendiri
      const response = await fetch('/api/upload-catbox', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengunggah file');
      }

      const result = await response.json();

      if (result.success || result.fileurl) {
        const catboxURL = result.fileurl;
        setFileUrl(catboxURL);
        sendTransferRequest(catboxURL);
      } else {
        showNotification('Gagal mengunggah file', 'error');
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
          
          {/* Progress Bar dihapus */}
          
          {fileUrl && !uploading && (
            <div className="transfer-status">
              <p>File berhasil diunggah!</p>
              <p>Status transfer: {transferStatus === 'accepted' ? 'Diterima' : 'Menunggu respons...'}</p>
            </div>
          )}
          
          <button
            className="btn"
            onClick={handleUpload}
            disabled={!file || uploading || transferStatus === 'accepted'}
          >
            {uploading ? 'Mengunggah...' : (transferStatus === 'accepted' ? 'File Diterima' : 'Kirim File')}
          </button>
        </div>
      </main>

      <footer className="footer">
        <p>© 2023 VorX-Airdrop | Credit by VorXTeam</p>
      </footer>
    </div>
  );
}
