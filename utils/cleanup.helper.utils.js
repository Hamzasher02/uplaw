import fs from 'fs';

/**
 * Clean up uploaded files from the request
 * @param {Object} req - Express request object
 */
const cleanupUploadedFiles = (req) => {
    try {
        // Single file
        if (req.file && req.file.path) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        }

        // Multiple files
        if (req.files) {
            // Array format (from array())
            if (Array.isArray(req.files)) {
                req.files.forEach(file => {
                    if (file.path && fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            } else {
                // Object format (from fields())
                Object.values(req.files).forEach(files => {
                    if (Array.isArray(files)) {
                        files.forEach(file => {
                            if (file.path && fs.existsSync(file.path)) {
                                fs.unlinkSync(file.path);
                            }
                        });
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error cleaning up uploaded files:', error.message);
    }
};

export default cleanupUploadedFiles;