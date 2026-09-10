import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

export const uploadFile = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, `${path}/${file.name}_${Date.now()}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};
