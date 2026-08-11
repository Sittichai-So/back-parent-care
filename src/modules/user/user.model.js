const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      default: null
    },
    profileImage: {
      type: String,
      default: null
    },
    settings: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('UserProfile', userSchema)
