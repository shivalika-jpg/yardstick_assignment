import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Note from '../models/Note.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-saas';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Clear existing data
    await Promise.all([
      Note.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({})
    ]);
    console.log('🗑️  Cleared existing data');

    // Create Acme tenant
    const acmeTenant = new Tenant({
      slug: 'acme',
      name: 'Acme Corporation',
      subscription: {
        plan: 'free',
        noteLimit: 3
      }
    });
    await acmeTenant.save();
    console.log('🏢 Created Acme tenant');

    // Create Globex tenant
    const globexTenant = new Tenant({
      slug: 'globex',
      name: 'Globex Corporation',
      subscription: {
        plan: 'free',
        noteLimit: 3
      }
    });
    await globexTenant.save();
    console.log('🏢 Created Globex tenant');

    // Create Acme users
    const acmeAdmin = new User({
      email: 'admin@acme.test',
      password: 'password',
      role: 'admin',
      tenantId: acmeTenant._id,
      profile: {
        firstName: 'Admin',
        lastName: 'User'
      }
    });
    await acmeAdmin.save();
    console.log('👤 Created admin@acme.test');

    const acmeUser = new User({
      email: 'user@acme.test',
      password: 'password',
      role: 'member',
      tenantId: acmeTenant._id,
      profile: {
        firstName: 'Regular',
        lastName: 'User'
      }
    });
    await acmeUser.save();
    console.log('👤 Created user@acme.test');

    // Create Globex users
    const globexAdmin = new User({
      email: 'admin@globex.test',
      password: 'password',
      role: 'admin',
      tenantId: globexTenant._id,
      profile: {
        firstName: 'Global',
        lastName: 'Admin'
      }
    });
    await globexAdmin.save();
    console.log('👤 Created admin@globex.test');

    const globexUser = new User({
      email: 'user@globex.test',
      password: 'password',
      role: 'member',
      tenantId: globexTenant._id,
      profile: {
        firstName: 'Global',
        lastName: 'Member'
      }
    });
    await globexUser.save();
    console.log('👤 Created user@globex.test');

    // Create sample notes for Acme
    const acmeNotes = [
      {
        title: 'Welcome to Acme Notes',
        content: 'This is your first note in the Acme tenant. You can create, edit, and delete notes here.',
        tenantId: acmeTenant._id,
        userId: acmeUser._id,
        tags: ['welcome', 'tutorial'],
        color: '#DFD0B8'
      },
      {
        title: 'Meeting Notes - Project Alpha',
        content: 'Discussed project timeline and milestones. Next meeting scheduled for next week.',
        tenantId: acmeTenant._id,
        userId: acmeAdmin._id,
        tags: ['meeting', 'project'],
        color: '#948979',
        isPinned: true
      }
    ];

    for (const noteData of acmeNotes) {
      const note = new Note(noteData);
      await note.save();
    }
    console.log('📝 Created sample notes for Acme');

    // Create sample notes for Globex
    const globexNotes = [
      {
        title: 'Globex Onboarding',
        content: 'Welcome to Globex Corporation notes system. Here you can manage all your important notes.',
        tenantId: globexTenant._id,
        userId: globexUser._id,
        tags: ['onboarding', 'welcome'],
        color: '#DFD0B8'
      },
      {
        title: 'Quarterly Review Notes',
        content: 'Q4 performance metrics and goals for next quarter. Revenue targets exceeded by 15%.',
        tenantId: globexTenant._id,
        userId: globexAdmin._id,
        tags: ['quarterly', 'review'],
        color: '#393E46',
        isPinned: true
      }
    ];

    for (const noteData of globexNotes) {
      const note = new Note(noteData);
      await note.save();
    }
    console.log('📝 Created sample notes for Globex');

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Test Accounts Created:');
    console.log('┌─────────────────────────┬────────┬─────────┐');
    console.log('│ Email                   │ Role   │ Tenant  │');
    console.log('├─────────────────────────┼────────┼─────────┤');
    console.log('│ admin@acme.test         │ admin  │ acme    │');
    console.log('│ user@acme.test          │ member │ acme    │');
    console.log('│ admin@globex.test       │ admin  │ globex  │');
    console.log('│ user@globex.test        │ member │ globex  │');
    console.log('└─────────────────────────┴────────┴─────────┘');
    console.log('\n🔑 All accounts use password: "password"');
    console.log('\n🏢 Tenants:');
    console.log('- Acme Corporation (slug: acme) - Free plan (3 note limit)');
    console.log('- Globex Corporation (slug: globex) - Free plan (3 note limit)');

  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

async function main() {
  await connectDB();
  await seedDatabase();
  
  // Close the connection
  await mongoose.connection.close();
  console.log('\n📋 Database connection closed');
  process.exit(0);
}

main();