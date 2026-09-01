import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export const uploadFile = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};

export const uploadProductImage = async (file: File, shopId: string): Promise<string> => {
  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const path = `products/${shopId}/${fileName}`;
  return uploadFile(file, path);
};

export const uploadShopImage = async (file: File, shopId: string, type: 'logo' | 'cover'): Promise<string> => {
  const timestamp = Date.now();
  const fileName = `${type}-${timestamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const path = `shops/${shopId}/${fileName}`;
  return uploadFile(file, path);
};

export const uploadVerificationDoc = async (file: File, userId: string): Promise<string> => {
  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const path = `verifications/${userId}/${fileName}`;
  return uploadFile(file, path);
};

export const deleteFile = async (url: string): Promise<void> => {
  const storageRef = ref(storage, url);
  await deleteObject(storageRef);
};
