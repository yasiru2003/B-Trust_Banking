const db = require('../config/database');

(async () => {
	try {
		console.log('🔧 Ensuring employee_auth.status column exists...');

		// Check if status column exists
		const check = await db.query(`
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = 'public'
			  AND table_name = 'employee_auth'
			  AND column_name = 'status'
		`);

		if (check.rows.length === 0) {
			console.log('➡️  Adding status BOOLEAN DEFAULT true to employee_auth...');
			await db.query(`
				ALTER TABLE public.employee_auth
				ADD COLUMN status BOOLEAN DEFAULT true
			`);
			console.log('✅ Column status added.');
		} else {
			console.log('✅ Column status already exists.');
		}

		// Backfill NULLs to true, in case column existed without default
		await db.query(`
			UPDATE public.employee_auth
			SET status = true
			WHERE status IS NULL
		`);
		console.log('✅ Backfilled NULL statuses to true.');

		process.exit(0);
	} catch (err) {
		console.error('❌ Failed ensuring employee_auth.status:', err.message);
		process.exit(1);
	}
})();



