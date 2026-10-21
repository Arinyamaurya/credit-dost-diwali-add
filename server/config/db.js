const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('FATAL: MONGODB_URI environment variable is not defined.');
    console.error('Please configure MONGODB_URI in your .env file or server environment.');
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: true,
    });

    isConnected = true;
    console.log('✓ Successfully connected to MongoDB');
  } catch (error) {
    console.error('FATAL: Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

function getDbStatus() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}

module.exports = { connectDB, getDbStatus };
