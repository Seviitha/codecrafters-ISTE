const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ['citizen', 'officer'],
      default: 'citizen',
    },
    // Only relevant when role === 'officer'
    department: {
      type: String,
      enum: [
        'Roads & Potholes',
        'Water Leakage & Sewage',
        'Streetlight & Electrical',
        'Garbage & Sanitation',
        'Public Transport & Stops',
        'Parks & Green Spaces',
        'Traffic Signals & Signage',
        'Illegal Encroachment',
        null,
      ],
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    role: this.role,
    department: this.department,
  };
};

module.exports = mongoose.model('User', userSchema);
