import { v4 as uuidv4 } from 'uuid';

export const generateDeviceId = () => {
  // Cek apakah sudah ada ID di localStorage
  let deviceId = localStorage.getItem('vorx-device-id');
  
  if (!deviceId) {
    // Generate UUID baru jika belum ada
    deviceId = uuidv4();
    localStorage.setItem('vorx-device-id', deviceId);
  }
  
  return deviceId;
};
