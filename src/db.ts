import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const uri = process.env.MONGODB_URL || 'mongodb://localhost:27017'; // Local MongoDB URI
const client = new MongoClient(uri);

let db: Db;

export const connectToDb = async (): Promise<void> => {
  try {
    await client.connect();
    db = client.db('node_assignment');
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1); // Exit the process if connection fails
  }
};

export const getDb = (): Db => {
  if (!db) {
    throw new Error("Database not connected. Call connectToDb first.");
  }
  return db;
};

export const closeDb = async (): Promise<void> => {
  if (client) {
    await client.close();
    console.log("MongoDB connection closed.");
  }
};