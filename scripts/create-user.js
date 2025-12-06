require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User schema (same as in your models)
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
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

async function createUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatbotdb';
    await mongoose.connect(mongoUri);
    console.log('🔌 Connecting to MongoDB...');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'nirzaripatel26@gmail.com' });
    
    if (existingUser) {
      console.log('⚠️  User already exists!');
      console.log(`📧 Email: ${existingUser.email}`);
      await mongoose.connection.close();
      return;
    }

    // Create new user
    const newUser = new User({
      name: 'Nirzari Patel',
      email: 'nirzaripatel26@gmail.com',
      password: 'nirzari1'
    });

    await newUser.save();
    console.log('✅ User created successfully!');
    console.log(`📧 Email: nirzaripatel26@gmail.com`);
    console.log(`🔑 Password: nirzari1`);
    console.log(`🌐 Login at: https://your-vercel-domain.vercel.app/login`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    process.exit(1);
  }
}

createUser();
