const mongoose = require('mongoose')

// Strips the password hash from any JSON/object representation of a User
// doc, regardless of how it was fetched. This is the safety net: even if a
// query explicitly re-selects password (as login does, to compare it), the
// hash can never leak out through res.json() or JSON.stringify().
const stripPassword = (_doc, ret) => {
  delete ret.password
  return ret
}

const authSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    // select: false keeps the hash out of default find()/findOne() results;
    // auth.repository#findByEmailWithPassword opts back in with
    // .select('+password') for the one place (login) that needs to compare
    // it.
    password: {
      type: String,
      required: true,
      select: false
    },
    // Short code the user can share out-of-band so someone else can look up
    // their account by exact match (see /users/lookup) instead of the app
    // supporting open name search.
    userCode: {
      type: String,
      default: null,
      uppercase: true,
      trim: true
    },
    phone: {
      type: String,
      default: null
    },
    address: {
      type: String,
      default: null
    },
    profileImage: {
      type: String,
      default: null
    },
    role: {
      type: String,
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { transform: stripPassword },
    toObject: { transform: stripPassword }
  }
)

// Partial index (not a plain unique field) so pre-migration users with no
// userCode yet (stored as null) don't collide with each other.
authSchema.index({ userCode: 1 }, { unique: true, partialFilterExpression: { userCode: { $type: 'string' } } })

module.exports = mongoose.model('User', authSchema)
