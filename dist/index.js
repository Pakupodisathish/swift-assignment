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
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const db_1 = require("./db"); // Import from db.ts
const node_cache_1 = __importDefault(require("node-cache"));
// Load environment variables from .env file
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
// Express application
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Cache setup using node-cache
const cache = new node_cache_1.default({ stdTTL: 300, checkperiod: 600 }); // Cache for 5 minutes (300 seconds)
// API Endpoints
// 1. GET /load
//getting all data related to user,posts,comments and loading the data to corresponding collection
app.get('/load', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Starting data load...');
        const db = (0, db_1.getDb)();
        const usersCollection = db.collection('users');
        const postsCollection = db.collection('posts');
        const commentsCollection = db.collection('comments');
        yield usersCollection.deleteMany({});
        console.log('Users cleared.');
        yield postsCollection.deleteMany({});
        console.log('Posts cleared.');
        yield commentsCollection.deleteMany({});
        console.log('Comments cleared.');
        const usersResponse = yield axios_1.default.get('https://jsonplaceholder.typicode.com/users');
        const users = usersResponse.data.map((user) => ({
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            address: user.address,
            phone: user.phone,
            website: user.website,
            company: user.company,
            posts: [], // Initialize posts as empty here
        }));
        console.log(`Fetched ${users.length} users.`);
        const postsResponse = yield axios_1.default.get('https://jsonplaceholder.typicode.com/posts');
        const allPosts = postsResponse.data.map((post) => ({
            id: post.id,
            userId: post.userId,
            title: post.title,
            body: post.body,
            comments: [], // Initialize comments as empty here
        }));
        console.log(`Fetched ${allPosts.length} posts.`);
        const commentsResponse = yield axios_1.default.get('https://jsonplaceholder.typicode.com/comments');
        const allComments = commentsResponse.data.map((comment) => ({
            id: comment.id,
            postId: comment.postId,
            name: comment.name,
            email: comment.email,
            body: comment.body,
        }));
        console.log(`Fetched ${allComments.length} comments.`);
        // Associate posts with users
        for (const user of users) {
            user.posts = allPosts.filter(post => post.userId === user.id);
            // Associate comments with posts
            for (const post of user.posts) {
                post.comments = allComments.filter(comment => comment.postId === post.id);
            }
        }
        console.log('Attempting to insert users...');
        const usersResult = yield usersCollection.insertMany(users);
        console.log('Users inserted:', usersResult === null || usersResult === void 0 ? void 0 : usersResult.insertedCount);
        console.log('Attempting to insert posts...');
        const postsResult = yield postsCollection.insertMany(allPosts);
        console.log('Posts inserted:', postsResult === null || postsResult === void 0 ? void 0 : postsResult.insertedCount);
        console.log('Attempting to insert comments...');
        const commentsResult = yield commentsCollection.insertMany(allComments);
        console.log('Comments inserted:', commentsResult === null || commentsResult === void 0 ? void 0 : commentsResult.insertedCount);
        res.status(200).send();
        console.log('Data load complete.');
    }
    catch (error) {
        console.error('Error loading data:', error);
        next(error);
    }
}));
// 2. DELETE /users
//Delete all users from users collection if exists 
app.delete('/users', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = (0, db_1.getDb)();
        const usersCollection = db.collection('users');
        const result = yield usersCollection.deleteMany({});
        if (result.deletedCount && result.deletedCount > 0) {
            res.status(200).json({ message: 'All users deleted successfully' });
        }
        else {
            res.status(404).json({ message: 'No users found to delete' });
        }
    }
    catch (error) {
        console.error('Error deleting users:', error);
        next(error);
    }
}));
// 3. DELETE /users/:userId
//Deleting user and user associated posts and comments
app.delete('/users/:userId', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Invalid userId. Must be a number.' });
        }
        const db = (0, db_1.getDb)();
        const usersCollection = db.collection('users');
        const postsCollection = db.collection('posts');
        const commentsCollection = db.collection('comments');
        const userResult = yield usersCollection.deleteOne({ id: userId });
        if (userResult.deletedCount === 1) {
            // Delete related posts and comments
            yield postsCollection.deleteMany({ userId: userId });
            const postsToDeleteComments = yield postsCollection.find({ userId: userId }).toArray();
            const postIdsToDeleteComments = postsToDeleteComments.map(post => post.id);
            yield commentsCollection.deleteMany({ postId: { $in: postIdsToDeleteComments } });
            res.status(200).json({ message: 'User and related data deleted successfully' });
        }
        else {
            res.status(404).json({ message: 'User not found' });
        }
    }
    catch (error) {
        console.error('Error deleting user:', error);
        next(error);
    }
}));
// 4. Get /users/:userId
//getting user and user assoicated posts and comments
app.get('/users/:userId', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid userId. Must be a number.' });
    }
    try {
        const db = (0, db_1.getDb)();
        const usersCollection = db.collection('users');
        const postsCollection = db.collection('posts');
        const commentsCollection = db.collection('comments');
        // Check cache first
        const cachedUser = cache.get(`user:${userId}`);
        if (cachedUser) {
            console.log(`Cache hit for user ${userId}`);
            return res.status(200).json(cachedUser);
        }
        const user = yield usersCollection.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        // Fetch user's posts
        const posts = yield postsCollection.find({ userId: userId }).toArray();
        // Fetch comments for each post
        for (const post of posts) {
            const comments = yield commentsCollection.find({ postId: post.id }).toArray();
            post.comments = comments; // Attach comments to the post
        }
        const userWithPosts = Object.assign(Object.assign({}, user), { posts });
        // Store in cache
        cache.set(`user:${userId}`, userWithPosts);
        console.log(`User ${userId} stored in cache`);
        res.status(200).json(userWithPosts);
    }
    catch (error) {
        console.error('Error fetching user:', error);
        next(error);
    }
}));
// 5. PUT /users
//creating user document in collection if doesnot user exists
app.put('/users', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const newUser = req.body;
    if (!newUser || !newUser.id || !newUser.name || !newUser.username || !newUser.email) {
        return res.status(400).json({ error: 'Invalid user data. Missing required fields.' });
    }
    try {
        const db = (0, db_1.getDb)();
        const usersCollection = db.collection('users');
        const existingUser = yield usersCollection.findOne({ id: newUser.id });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists.' });
        }
        const result = yield usersCollection.insertOne(newUser);
        if (result.acknowledged) {
            res.status(201)
                .header('Link', `<${req.protocol}://${req.get('host')}${req.originalUrl}/${newUser.id}>; rel="created"`)
                .json(newUser);
        }
        else {
            res.status(500).json({ error: 'Failed to add user' });
        }
    }
    catch (error) {
        console.error('Error adding user:', error);
        next(error);
    }
}));
// 6. GET /users (to get all users)
app.get('/users', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const sortField = req.query.sort || 'name'; // Default sort field
    const sortOrder = (req.query.order === 'desc' ? -1 : 1); // Default sort order
    if (isNaN(page) || page < 1) {
        return res.status(400).json({ error: 'Invalid page number' });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ error: 'Invalid limit value' });
    }
    try {
        const db = (0, db_1.getDb)();
        const usersCollection = db.collection('users');
        const skip = (page - 1) * limit;
        const sort = { [sortField]: sortOrder };
        const users = yield usersCollection
            .find({}, { sort, skip, limit })
            .toArray();
        const totalUsers = yield usersCollection.countDocuments();
        const totalPages = Math.ceil(totalUsers / limit);
        res.status(200).json({
            users,
            page,
            limit,
            totalPages,
            totalUsers,
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        next(error);
    }
}));
// Global error handler
//used for debugging also
app.use((err, req, res, next) => {
    console.error("Global Error Handler:", err);
    res.status(500).json({ message: "Internal Server Error" });
});
// Define server listening
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    });
}
// Main function
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, db_1.connectToDb)(); // Use connectToDb from db.ts
        yield startServer();
    });
}
main();
