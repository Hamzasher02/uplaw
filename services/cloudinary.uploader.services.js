import cloudinary from "cloudinary"
import { INTERNAL_SERVER_ERROR } from "../error/error.js"

const v2 = cloudinary.v2
v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploader = v2.uploader

async function uploadToCloud(path) {
    try {
        console.log("Uploading to Cloudinary:", path);
        console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "MISSING!");
        console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "Set" : "MISSING!");
        console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "Set" : "MISSING!");
        
        const { public_id, secure_url } = await uploader.upload(path, { 
            folder: "uplaw_uploads",
            resource_type: "auto"
        });
        return { publicId: public_id, secureUrl: secure_url };
    } catch (err) {
        console.error("Cloudinary upload failed:", err.message);
        console.error("Full error:", err);
        throw new INTERNAL_SERVER_ERROR("Failed to upload file to cloud storage");
    } 
}
 function deleteFromCloud(publicId) {
    return uploader.destroy(publicId)
    
}

async function uploadPaymentScreenshot(path) {
    try {
        const { public_id, secure_url } = await uploader.upload(path, { folder: "steammindpayments" })
        return { publicId: public_id, secureUrl: secure_url }
    } catch (err) {
        console.error("Cloudinary upload failed:", err.message)
        throw new INTERNAL_SERVER_ERROR("Failed to upload payment screenshot to cloud storage")
    } 
}

//  Uploads large video files to Cloudinary in chunks.
//  Uses Cloudinary's `upload_large` method to upload files in 5MB chunks to the "steammindlectures" folder. 
//  Added by Hamza Hanif on November 6, 2025
async function uploadLargeFiles(localFilePath) {
    return new Promise((resolve, reject) => {
        uploader.upload_large(
            localFilePath,
            {
                resource_type: "video",
                chunk_size: 5 * 1024 * 1024, //chunk size must be 5 or > 5
                folder: "steammindlectures",
                use_filename: true,
                unique_filename: true,
            },
            (err, result) => {
                if (err) {
                    console.error("Cloudinary upload_large failed:", err);
                    return reject(new INTERNAL_SERVER_ERROR("Failed to upload large file to Cloudinary"));
                }
                resolve({
                    publicId: result.public_id,
                    secureUrl: result.secure_url,
                    bytes: result.bytes,
                    width: result.width,
                    height: result.height,
                    duration: result.duration,
                    resource_type: result.resource_type,
                });
            }
        );
    });
}

export { uploadToCloud, deleteFromCloud, uploadLargeFiles, uploadPaymentScreenshot }
