const db = require('./config/database');

async function checkFDData() {
  try {
    console.log('=== FD TYPES ===');
    const fdTypes = await db.query(`SELECT * FROM fd_type`);
    fdTypes.rows.forEach(type => {
      console.log(`- ${type.fd_type_id}: ${type.type_name} (Interest: ${type.interest_rate}%, Cycle: ${type.interest_calc_cycle})`);
    });

    console.log('\n=== SAMPLE FD ACCOUNTS ===');
    const fdAccounts = await db.query(`
      SELECT
        a.account_number,
        a.acc_type_id,
        at.type_name,
        a.current_balance,
        at.interest_rate,
        a.opening_date,
        fd.fd_number,
        fd.start_date,
        fd.maturity_date,
        fd.interest_calc_cycle,
        fd.last_interest_credit_date,
        fdt.interest_calc_cycle as fd_type_cycle,
        fdt.interest_rate as fd_type_rate
      FROM account a
      LEFT JOIN account_type at ON a.acc_type_id = at.acc_type_id
      LEFT JOIN fixed_deposit fd ON a.account_number = fd.account_number
      LEFT JOIN fd_type fdt ON fd.fd_type_id = fdt.fd_type_id
      WHERE a.acc_type_id LIKE 'FD%'
      LIMIT 2
    `);

    fdAccounts.rows.forEach((fd, i) => {
      console.log(`\nFD #${i + 1}: ${fd.fd_number}`);
      console.log(`  Account: ${fd.account_number}`);
      console.log(`  Balance: LKR ${fd.current_balance}`);
      console.log(`  Interest Rate: ${fd.interest_rate || fd.fd_type_rate}%`);
      console.log(`  Start: ${fd.start_date?.toISOString().split('T')[0]}`);
      console.log(`  Maturity: ${fd.maturity_date?.toISOString().split('T')[0]}`);
      console.log(`  Calc Cycle: ${fd.fd_type_cycle}`);
      console.log(`  Last Interest Credit: ${fd.last_interest_credit_date || 'None'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkFDData();
