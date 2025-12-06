require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// User schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  openaiApiKey: {
    type: String,
    required: false
  },
  maxBots: {
    type: Number,
    default: -1,
    required: false
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function setUserLimit() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatbotdb';
    await mongoose.connect(mongoUri);
    console.log('🔌 Connecting to MongoDB...');

    // Update user limit
    const result = await User.findOneAndUpdate(
      { email: 'nirzaripatel26@gmail.com' },
      { maxBots: 1 },
      { new: true }
    );
    
    if (!result) {
      console.log('❌ User not found!');
      await mongoose.connection.close();
      return;
    }

    console.log('✅ User bot limit set successfully!');
    console.log(`📧 Email: ${result.email}`);
    console.log(`🤖 Max Bots: ${result.maxBots}`);
    console.log(`⚠️  This user can now create maximum 1 bot at a time`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error setting user limit:', error.message);
    process.exit(1);
  }
}

setUserLimit();
