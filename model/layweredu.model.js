import mongoose from 'mongoose';

const lawyerEducationSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    degree: {
        type: String,
        required: true,
        trim: true
    },

    university: {
        type: String,
        required: true,
        trim: true
    },

    passingYear: {
        type: Number,
        required: true,
        min: 1950,
        max: new Date().getFullYear()
    },

    degreeCertificate: {
        publicId: String,
        secureUrl: String
    }

}, { timestamps: true });

const LawyerEducation = mongoose.model('LawyerEducation', lawyerEducationSchema);

export default LawyerEducation;
