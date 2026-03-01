const User = require('./models/User');
const Settings = require('./models/Settings');
require('dotenv').config();

async function seed() {
    try {
        console.log('🌱 Seeding database...');

        // Seed Admin
        const adminEmail = 'admin@instagrab.com';
        const existingAdmin = await User.findByEmail(adminEmail);

        if (!existingAdmin) {
            await User.create({
                email: adminEmail,
                password: 'Admin@123456',
                name: 'InstaGrab Admin',
                role: 'admin'
            });
            console.log('✅ Default admin created: admin@instagrab.com / Admin@123456');
        } else {
            console.log('ℹ️ Admin user already exists.');
        }

        // Seed Settings
        await Settings.initializeDefaults();
        console.log('✅ Default settings initialized.');

        console.log('✨ Seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
