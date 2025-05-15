import express, { Request, Response, NextFunction, Application } from 'express';
import axios from 'axios';
import { connectToDb, getDb } from './db'; // Import from db.ts
import NodeCache from 'node-cache';

// Import your interfaces
import { User } from './models/User'; 
import { Post } from './models/Post';
import { Comment } from './models/Comment';

// Load environment variables from .env file
import { config } from 'dotenv';
config();

// Express application
const app: Application = express();
app.use(express.json());


// Cache setup using node-cache
const cache = new NodeCache({ stdTTL: 300, checkperiod: 600 }); // Cache for 5 minutes (300 seconds)

// API Endpoints

// 1. GET /load
//getting all data related to user,posts,comments and loading the data to corresponding collection
app.get('/load', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Starting data load...');
    const db = getDb();
    const usersCollection = db.collection<User>('users');
    const postsCollection = db.collection<Post>('posts');
    const commentsCollection = db.collection<Comment>('comments');

    await usersCollection.deleteMany({});
    console.log('Users cleared.');
    await postsCollection.deleteMany({});
    console.log('Posts cleared.');
    await commentsCollection.deleteMany({});
    console.log('Comments cleared.');

    const usersResponse = await axios.get('https://jsonplaceholder.typicode.com/users');
    const users: User[] = usersResponse.data.map((user: any) => ({
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

    const postsResponse = await axios.get('https://jsonplaceholder.typicode.com/posts');
    const allPosts: Post[] = postsResponse.data.map((post: any) => ({
      id: post.id,
      userId: post.userId,
      title: post.title,
      body: post.body,
      comments: [], // Initialize comments as empty here
    }));
    console.log(`Fetched ${allPosts.length} posts.`);

    const commentsResponse = await axios.get('https://jsonplaceholder.typicode.com/comments');
    const allComments: Comment[] = commentsResponse.data.map((comment: any) => ({
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
    const usersResult = await usersCollection.insertMany(users);
    console.log('Users inserted:', usersResult?.insertedCount);

    console.log('Attempting to insert posts...');
    const postsResult = await postsCollection.insertMany(allPosts);
    console.log('Posts inserted:', postsResult?.insertedCount);

    console.log('Attempting to insert comments...');
    const commentsResult = await commentsCollection.insertMany(allComments);
    console.log('Comments inserted:', commentsResult?.insertedCount);

    res.status(200).send();
    console.log('Data load complete.');

  } catch (error: any) {
    console.error('Error loading data:', error);
    next(error);
  }
});

// 2. DELETE /users
//Delete all users from users collection if exists 
app.delete('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const usersCollection = db.collection<User>('users');
    const result = await usersCollection.deleteMany({});
    if (result.deletedCount && result.deletedCount > 0) {
      res.status(200).json({ message: 'All users deleted successfully' });
    } else {
      res.status(404).json({ message: 'No users found to delete' });
    }
  } catch (error: any) {
    console.error('Error deleting users:', error);
    next(error);
  }
});

// 3. DELETE /users/:userId
//Deleting user and user associated posts and comments
app.delete('/users/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid userId. Must be a number.' });
    }
    const db = getDb();
    const usersCollection = db.collection<User>('users');
    const postsCollection = db.collection<Post>('posts');
    const commentsCollection = db.collection<Comment>('comments');

    const userResult = await usersCollection.deleteOne({ id: userId });

    if (userResult.deletedCount === 1) {
      // Delete related posts and comments
      await postsCollection.deleteMany({ userId: userId });
      const postsToDeleteComments = await postsCollection.find({ userId: userId }).toArray();
      const postIdsToDeleteComments = postsToDeleteComments.map(post => post.id);
      await commentsCollection.deleteMany({ postId: { $in: postIdsToDeleteComments } });

      res.status(200).json({ message: 'User and related data deleted successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    console.error('Error deleting user:', error);
    next(error);
  }
});

// 4. Get /users/:userId
//getting user and user assoicated posts and comments
app.get('/users/:userId', async (req: Request, res: Response, next: NextFunction) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid userId. Must be a number.' });
  }

  try {
    const db = getDb();
    const usersCollection = db.collection<User>('users');
    const postsCollection = db.collection<Post>('posts');
    const commentsCollection = db.collection<Comment>('comments');

    // Check cache first
    const cachedUser = cache.get<User>(`user:${userId}`);
    if (cachedUser) {
      console.log(`Cache hit for user ${userId}`);
      return res.status(200).json(cachedUser);
    }

    const user = await usersCollection.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Fetch user's posts
    const posts = await postsCollection.find({ userId: userId }).toArray();

    // Fetch comments for each post
    for (const post of posts) {
      const comments = await commentsCollection.find({ postId: post.id }).toArray();
      post.comments = comments; // Attach comments to the post
    }
    const userWithPosts: User = { ...user, posts };

    // Store in cache
    cache.set(`user:${userId}`, userWithPosts);
    console.log(`User ${userId} stored in cache`);
    res.status(200).json(userWithPosts);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    next(error);
  }
});
// 5. PUT /users
//creating user document in collection if doesnot user exists
app.put('/users', async (req: Request, res: Response, next: NextFunction) => {
  const newUser: User = req.body;

  if (!newUser || !newUser.id || !newUser.name || !newUser.username || !newUser.email) {
    return res.status(400).json({ error: 'Invalid user data. Missing required fields.' });
  }

  try {
    const db = getDb();
    const usersCollection = db.collection<User>('users');
    const existingUser = await usersCollection.findOne({ id: newUser.id });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    const result = await usersCollection.insertOne(newUser);
    if (result.acknowledged) {
      res.status(201)
        .header('Link', `<${req.protocol}://${req.get('host')}${req.originalUrl}/${newUser.id}>; rel="created"`)
        .json(newUser);
    } else {
      res.status(500).json({ error: 'Failed to add user' });
    }
  } catch (error: any) {
    console.error('Error adding user:', error);
    next(error);
  }
});

// 6. GET /users (to get all users)
app.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const sortField = (req.query.sort as string) || 'name'; // Default sort field
  const sortOrder = (req.query.order === 'desc' ? -1 : 1) as 1 | -1; // Default sort order

  if (isNaN(page) || page < 1) {
    return res.status(400).json({ error: 'Invalid page number' });
  }
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'Invalid limit value' });
  }

  try {
    const db = getDb();
    const usersCollection = db.collection<User>('users');
    const skip = (page - 1) * limit;
    const sort: { [key: string]: 1 | -1 } = { [sortField]: sortOrder };

    const users = await usersCollection
      .find({}, { sort, skip, limit })
      .toArray();

    const totalUsers = await usersCollection.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      users,
      page,
      limit,
      totalPages,
      totalUsers,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    next(error);
  }
});

// Global error handler
//used for debugging also
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

// Define server listening
async function startServer() {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

// Main function
async function main() {
  await connectToDb(); // Use connectToDb from db.ts
  await startServer();
}

main();