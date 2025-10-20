const db = require('../config/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const employeeId = 'MANAGER001';
    const email = 'manager@bt.com';
    const password = 'manager123';
    const branchId = 1;
    const role = 'Manager';
    const employeeName = 'Demo Manager';
    const phone = '0770000000';

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const hash = await bcrypt.hash(password, saltRounds);

    // Ensure branch exists
    await db.query(
      `INSERT INTO branch (branch_id, name)
       VALUES ($1, $2)
       ON CONFLICT (branch_id) DO NOTHING`,
      [branchId, 'Main Branch']
    );

    // Upsert manager in employee_auth
    await db.query(
      `INSERT INTO employee_auth (employee_id, branch_id, role, employee_name, password_hash, phone_number, email, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (employee_id) DO UPDATE SET
         branch_id = EXCLUDED.branch_id,
         role = EXCLUDED.role,
         employee_name = EXCLUDED.employee_name,
         password_hash = EXCLUDED.password_hash,
         phone_number = EXCLUDED.phone_number,
         email = EXCLUDED.email,
         status = true`,
      [employeeId, branchId, role, employeeName, hash, phone, email]
    );

    console.log('Manager ensured:', { employeeId, email, password });
    process.exit(0);
  } catch (err) {
    console.error('Failed to ensure manager:', err);
    process.exit(1);
  }
})();

























