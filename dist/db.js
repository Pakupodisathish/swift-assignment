"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDb = exports.getDb = exports.connectToDb = void 0;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Load environment variables from .env file
const uri = process.env.MONGODB_URL || 'mongodb://localhost:27017'; // Local MongoDB URI
const client = new mongodb_1.MongoClient(uri);
let db;
const connectToDb = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield client.connect();
        db = client.db('node_assignment');
        console.log("Connected to MongoDB");
    }
    catch (err) {
        console.error("Error connecting to MongoDB:", err);
        process.exit(1); // Exit the process if connection fails
    }
});
exports.connectToDb = connectToDb;
const getDb = () => {
    if (!db) {
        throw new Error("Database not connected. Call connectToDb first.");
    }
    return db;
};
exports.getDb = getDb;
const closeDb = () => __awaiter(void 0, void 0, void 0, function* () {
    if (client) {
        yield client.close();
        console.log("MongoDB connection closed.");
    }
});
exports.closeDb = closeDb;
