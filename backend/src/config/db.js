import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set in environment');
  }
  // Basic validation: must start with mongodb:// or mongodb+srv://
  const isMongoLike = /^(mongodb(\+srv)?):\/\//i.test(uri);
  if (!isMongoLike) {
    throw new Error(
      `MONGO_URI looks invalid. Expected it to start with "mongodb://" or "mongodb+srv://" but got: ${uri}`
    );
  }
  try {
    await mongoose.connect(uri, {
      // Mongoose 8 has sensible defaults; options left empty intentionally
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};
