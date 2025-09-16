// backend/src/utils/multerConfig.js
import multer from 'multer';

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Only allow images
  if (file.mimetype && file.mimetype.startsWith('image/')) {
   return cb(null, true);
  }
    cb(new Error('Only image files are allowed!'), false);
    
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

export default upload;
