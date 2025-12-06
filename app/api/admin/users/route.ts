import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

// Get admin user ID
const ADMIN_EMAIL = 'rvpnrp@gmail.com';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Check if user is admin
    const adminUser = await User.findOne({ email: ADMIN_EMAIL });
    if (!adminUser || session.user.id !== adminUser._id.toString()) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users (except admin)
    const users = await User.find({ email: { $ne: ADMIN_EMAIL } }).select('-password');
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, password } = await request.json();

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user is admin
    const adminUser = await User.findOne({ email: ADMIN_EMAIL });
    if (!adminUser || session.user.id !== adminUser._id.toString()) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with maxBots = 1
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      maxBots: 1  // All users created by admin get 1 bot limit
    });

    await newUser.save();

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          maxBots: newUser.maxBots
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
