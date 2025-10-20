const db = require('../config/database');

(async () => {
  try {
    console.log('Starting FD schema fixes...');
    // Expand account_number length if needed
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'fixed_deposit'
            AND column_name = 'account_number'
            AND data_type = 'character'
        ) THEN
          ALTER TABLE public.fixed_deposit
          ALTER COLUMN account_number TYPE VARCHAR(20);
        END IF;
      END$$;
    `);

    // Ensure fd_type_id is at most VARCHAR(10)
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'fixed_deposit'
            AND column_name = 'fd_type_id'
            AND data_type = 'character varying'
        ) THEN
          ALTER TABLE public.fixed_deposit
          ALTER COLUMN fd_type_id TYPE VARCHAR(10);
        END IF;
      END$$;
    `);

    // Ensure fd_number can hold our generated values
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'fixed_deposit'
            AND column_name = 'fd_number'
            AND data_type = 'character'
        ) THEN
          ALTER TABLE public.fixed_deposit
          ALTER COLUMN fd_number TYPE VARCHAR(20);
        END IF;
      END$$;
    `);

    console.log('FD schema fixes completed.');
    process.exit(0);
  } catch (err) {
    console.error('FD schema fix failed:', err);
    process.exit(1);
  }
})();
























