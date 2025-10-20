const db = require('../config/database');

(async () => {
  try {
    console.log('Fixing fixed_deposit -> account foreign key...');

    // Drop old FK if it exists
    await db.query(`
      DO $$
      DECLARE
        fk_name text;
      BEGIN
        SELECT constraint_name INTO fk_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'fixed_deposit'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name = 'fk_fd_account';

        IF fk_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE public.fixed_deposit DROP CONSTRAINT ' || fk_name || ';';
        END IF;
      END$$;
    `);

    // Ensure column type matches target
    await db.query(`
      ALTER TABLE public.fixed_deposit
      ALTER COLUMN account_number TYPE VARCHAR(20);
    `);

    // Create correct FK to account(account_number)
    await db.query(`
      ALTER TABLE public.fixed_deposit
      ADD CONSTRAINT fk_fd_account
      FOREIGN KEY (account_number)
      REFERENCES public.account(account_number)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
    `);

    console.log('Foreign key fixed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to fix foreign key:', err);
    process.exit(1);
  }
})();
























