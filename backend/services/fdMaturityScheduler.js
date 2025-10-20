const cron = require('node-cron');
const FDMaturityService = require('./services/fdMaturityService');

class FDMaturityScheduler {
  constructor() {
    this.jobs = new Map();
  }

  // Start the FD maturity scheduler
  start() {
    console.log('🕐 Starting FD Maturity Scheduler...');

    // Daily check at 9:00 AM for matured FDs
    const maturedFDJob = cron.schedule('0 9 * * *', async () => {
      try {
        console.log('🔔 Running daily FD maturity check...');
        const count = await FDMaturityService.checkMaturedFDs();
        console.log(`📧 Processed ${count} matured FDs`);
      } catch (error) {
        console.error('❌ Error in daily FD maturity check:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Colombo'
    });

    // Daily check at 10:00 AM for upcoming FD maturities
    const upcomingFDJob = cron.schedule('0 10 * * *', async () => {
      try {
        console.log('🔔 Running daily FD upcoming maturity check...');
        const count = await FDMaturityService.checkUpcomingFDMaturities();
        console.log(`📧 Processed ${count} upcoming FD maturities`);
      } catch (error) {
        console.error('❌ Error in daily FD upcoming maturity check:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Colombo'
    });

    // Store job references
    this.jobs.set('maturedFDs', maturedFDJob);
    this.jobs.set('upcomingFDs', upcomingFDJob);

    // Start the jobs
    maturedFDJob.start();
    upcomingFDJob.start();

    console.log('✅ FD Maturity Scheduler started successfully');
    console.log('📅 Jobs scheduled:');
    console.log('   • Daily matured FD check: 9:00 AM (Asia/Colombo)');
    console.log('   • Daily upcoming FD check: 10:00 AM (Asia/Colombo)');
  }

  // Stop the scheduler
  stop() {
    console.log('🛑 Stopping FD Maturity Scheduler...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`   • Stopped ${name} job`);
    });

    this.jobs.clear();
    console.log('✅ FD Maturity Scheduler stopped');
  }

  // Get scheduler status
  getStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running,
        scheduled: job.scheduled
      };
    });
    return status;
  }

  // Manual trigger for testing
  async triggerMaturedFDCheck() {
    try {
      console.log('🔔 Manual trigger: Checking matured FDs...');
      const count = await FDMaturityService.checkMaturedFDs();
      console.log(`📧 Processed ${count} matured FDs`);
      return count;
    } catch (error) {
      console.error('❌ Error in manual matured FD check:', error);
      throw error;
    }
  }

  // Manual trigger for testing
  async triggerUpcomingFDCheck() {
    try {
      console.log('🔔 Manual trigger: Checking upcoming FD maturities...');
      const count = await FDMaturityService.checkUpcomingFDMaturities();
      console.log(`📧 Processed ${count} upcoming FD maturities`);
      return count;
    } catch (error) {
      console.error('❌ Error in manual upcoming FD check:', error);
      throw error;
    }
  }
}

module.exports = FDMaturityScheduler;
