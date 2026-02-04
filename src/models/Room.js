const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    unique: true,
    default: () => uuidv4().split('-')[0].toUpperCase() 
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hostUsername: {
    type: String,
    required: true
  },
  password: {
    type: String,
    select: false
  },
  isPasswordProtected: {
    type: Boolean,
    default: false
  },
  maxPlayers: {
    type: Number,
    default: 6,
    min: 2,
    max: 10
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'finished'],
    default: 'waiting'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400
  }
});

roomSchema.pre('save', async function() {
  if (!this.password || !this.isModified('password')) return;
  
  this.password = await bcrypt.hash(this.password, 10);
});

roomSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return true;
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Room', roomSchema);
