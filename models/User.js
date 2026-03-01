const db = require('../database/db');
const bcrypt = require('bcrypt');

class User {
    static async findByEmail(email) {
        return db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
    }

    static async create(userData) {
        const { email, password, name, role } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        const info = db.prepare('INSERT INTO admins (email, password, name, role) VALUES (?, ?, ?, ?)')
            .run(email, hashedPassword, name, role || 'admin');
        return info.lastInsertRowid;
    }

    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    static async updateLastLogin(userId) {
        db.prepare('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
    }
}

module.exports = User;
