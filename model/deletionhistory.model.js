import mongoose from 'mongoose';

const deletionHistorySchema = new mongoose.Schema({
    // Entity Info
    entityType: {
        type: String,
        required: true,
        enum: ['User', 'ClientProfile', 'LawyerProfile']
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    // Complete snapshot of deleted data
    entitySnapshot: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },

    // Deletion Info
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deletedByEmail: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },

    // Restoration Info
    isRestored: {
        type: Boolean,
        default: false
    },
    restoredAt: {
        type: Date
    },
    restoredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    restoredByEmail: {
        type: String
    },
    restorationNotes: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes
deletionHistorySchema.index({ entityType: 1, entityId: 1 });
deletionHistorySchema.index({ deletedBy: 1 });
deletionHistorySchema.index({ createdAt: -1 });
deletionHistorySchema.index({ isRestored: 1 });

// Static method to record deletion
deletionHistorySchema.statics.recordDeletion = async function({
    entityType,
    entityId,
    entitySnapshot,
    deletedBy,
    deletedByEmail,
    reason
}) {
    return await this.create({
        entityType,
        entityId,
        entitySnapshot,
        deletedBy,
        deletedByEmail,
        reason
    });
};

// Method to restore
deletionHistorySchema.methods.markRestored = async function(restoredBy, restoredByEmail, notes = '') {
    this.isRestored = true;
    this.restoredAt = new Date();
    this.restoredBy = restoredBy;
    this.restoredByEmail = restoredByEmail;
    this.restorationNotes = notes;
    return await this.save();
};

const DeletionHistory = mongoose.model('DeletionHistory', deletionHistorySchema);

export default DeletionHistory;
