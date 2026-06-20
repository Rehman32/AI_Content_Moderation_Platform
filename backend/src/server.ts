import { env } from './config/env.config'; // Validates and loads process.env
import app from './app';
import connectDB from './config/db';
import mongoose from 'mongoose';
import http from 'http';

// Initialize Server
const startServer = async () => {
  // Connect to Database first
  await connectDB();

  const server = http.createServer(app);

  // Start listening for requests using validated PORT
  server.listen(env.PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
  });

  // ─── Graceful Shutdown Handling ──────────────────────────────────────────────
  
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Closing server gracefully...`);
    
    server.close(async () => {
      console.log('✅ HTTP server closed.');
      try {
        await mongoose.connection.close(false); // false = wait for existing queries
        console.log('✅ MongoDB connection closed.');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error during MongoDB shutdown:', err);
        process.exit(1);
      }
    });

    // Force shutdown if it takes too long (e.g., 10 seconds)
    setTimeout(() => {
      console.error('🚨 Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED REJECTION');
  });
};

startServer();