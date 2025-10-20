const db = require('../config/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const employeeId = 'ADMIN001';
    const email = 'admin@bt.com';
    const password = 'admin123';
    const role = 'Admin';
    const employeeName = 'System Admin';
    const phone = '0779999999';

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const hash = await bcrypt.hash(password, saltRounds);

    await db.query(
      `INSERT INTO employee_auth (employee_id, branch_id, role, employee_name, password_hash, phone_number, email, status)
       VALUES ($1, 1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (employee_id) DO UPDATE SET
         role = EXCLUDED.role,
         employee_name = EXCLUDED.employee_name,
         password_hash = EXCLUDED.password_hash,
         phone_number = EXCLUDED.phone_number,
         email = EXCLUDED.email,
         status = true`,
      [employeeId, role, employeeName, hash, phone, email]
    );

    console.log('Admin ensured:', { employeeId, email, password });
    process.exit(0);
  } catch (err) {
    console.error('Failed to ensure admin:', err);
    process.exit(1);
  }
})();

























