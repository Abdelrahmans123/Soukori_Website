import { cloudinaryConfig } from '../../../config/cloudinaryConfig.js';

async function uploadToCloudinary(file) {
  if (!file || file.size > 10 * 1024 * 1024) throw new Error("File size must be less than 10MB");

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);
  formData.append('folder', 'soukori/products');

  const response = await fetch(cloudinaryConfig.uploadUrl, { method: 'POST', body: formData });
  if (!response.ok) throw new Error("Cloudinary upload failed");

  const data = await response.json();
  return data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
}
export { uploadToCloudinary };