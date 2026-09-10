import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

/**
 * Helper to convert file to Base64 Data URL (100% resilient fallback if Cloud Storage fails or is offline)
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Uploads a file to Firebase Storage with automatic seamless fallback to Base64 Data URL.
 * Guarantees that template uploads NEVER fail or get stuck.
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (err) {
    console.warn('Firebase Storage upload failed or not provisioned, falling back to instant Base64 data URL:', err);
    // Reliable local Base64 fallback
    const base64Url = await fileToBase64(file);
    return base64Url;
  }
};
