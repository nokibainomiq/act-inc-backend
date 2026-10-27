import { Server } from 'http';

import app from './app';

import mongoose from 'mongoose';
import config from './app/config';
import seedAdmin from './app/DB';
import 'dotenv/config';
import { initializeSocket } from './app/utils/socket';
// import { startCronJobs } from './app/cron/syncCron';



let server: Server;

async function main() {
  try {
    await mongoose.connect(config.database_url as string);
    
 await seedAdmin(); 

    // Start scheduled cron jobs (Promotion & Banner expiry)
    // startCronJobs();

    server = app.listen(config.port, () => {
      console.log(`app is listening on port ${config.port}`);
    });

    initializeSocket(server);
  } catch (err) {
    console.log(err);
  }
}
main();

process.on('unhandledRejection', (err) => {
  console.log(`😈 unahandledRejection is detected , shutting down ...`, err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});

process.on('uncaughtException', () => {
  console.log(`😈 uncaughtException is detected , shutting down ...`);
  process.exit(1);
});


