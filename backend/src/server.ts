import dotenv from 'dotenv';
import app from './app';
import connectDB from './config/db';

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT || 5000;

// Initialize Server
const startServer = async () => {
  // Connect to Database first
  await connectDB();

  // Start listening for requests
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
};

startServer();