const db = require('../config/database');

(async () => {
  try {
    console.log('Updating employee_auth role check constraint to allow Admin...');
    // Drop existing check constraint if present and recreate including 'Admin'
    await db.query(`
      DO $$
      DECLARE
        conname text;
      BEGIN
        SELECT tc.constraint_name INTO conname
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'employee_auth'
          AND tc.constraint_type = 'CHECK'
          AND tc.constraint_name = 'employee_auth_role_check';
        IF conname IS NOT NULL THEN
          EXECUTE 'ALTER TABLE public.employee_auth DROP CONSTRAINT ' || conname || ';';
        END IF;
      END$$;
    `);

    await db.query(`
      ALTER TABLE public.employee_auth
      ADD CONSTRAINT employee_auth_role_check
      CHECK (role IN ('Agent','Manager','Admin'));
    `);

    console.log('Role constraint updated.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to update role constraint:', err);
    process.exit(1);
  }
})();

























