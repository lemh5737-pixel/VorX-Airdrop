import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { database, ref, set, onValue } from '../lib/firebase';
import { generateDeviceId } from '../utils/generateId';
import '../styles/global.css';

export default function Send() {
  const [deviceId, setDeviceId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileUrl, setFileUrl] = useState('');
  const [transferStatus, setTransferStatus] = useState('');
  const router = useRouter();

  useEffect(() => {
    const id = generateDeviceId();
    setDeviceId(id);
    
    // Dapatkan receiver ID dari query
    if (router.query.receiverId) {
      setReceiverId(router.query.receiverId);
      
      // Dapatkan nama penerima
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
    
    // Dengarkan status transfer
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

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Upload ke Catbox
      const formData = new FormData();
      formData.append('fileToUpload', file);
      formData.append('reqtype', 'fileupload');
      
      const xhr = new XMLHttpRequest();
      
      // Track progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });
      
      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            setFileUrl(response.fileurl);
            sendTransferRequest(response.fileurl);
          } else {
            showNotification('Gagal mengunggah file', 'error');
          }
        } else {
          showNotification('Gagal mengunggah file', 'error');
        }
        setUploading(false);
      });
      
      // Handle errors
      xhr.addEventListener('error', () => {
        showNotification('Terjadi kesalahan saat mengunggah', 'error');
        setUploading(false);
      });
      
      xhr.open('POST', 'https://catbox.moe/user/api.php');
      xhr.send(formData);
    } catch (error) {
      console.error('Error uploading file:', error);
      showNotification('Terjadi kesalahan saat mengunggah', 'error');
      setUploading(false);
    }
  };

  const sendTransferRequest = (url) => {
    // Kirim permintaan transfer ke Firebase
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
          <h2 className="card-title">Kirim File ke {receiverName}</h2>
          
          <div className="form-group">
            <label htmlFor="file">Pilih File</label>
            <input
              type="file"
              id="file"
              onChange={handleFileChange}
            />
          </div>
          
          {file && (
            <div className="file-info">
              <p>Nama File: {file.name}</p>
              <p>Ukuran: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}
          
          {uploading && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <p>{uploadProgress}%</p>
            </div>
          )}
          
          {fileUrl && !uploading && (
            <div className="transfer-status">
              <p>File berhasil diunggah!</p>
              <p>Status transfer: {transferStatus || 'Menunggu respons...'}</p>
            </div>
          )}
          
          <button
            className="btn"
            onClick={handleUpload}
            disabled={!file || uploading || transferStatus === 'accepted'}
          >
            {uploading ? (
              <>
                <span className="loading"></span>
                Mengunggah...
              </>
            ) : transferStatus === 'accepted' ? 'File Diterima' : 'Kirim File'}
          </button>
        </div>
      </main>

      <footer className="footer">
        <p>© 2023 VorX-Airdrop | Credit by VorXTeam</p>
      </footer>
    </div>
  );
    }
