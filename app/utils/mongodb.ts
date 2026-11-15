import {Db, MongoClient} from 'mongodb';
import {attachDatabasePool} from '@vercel/functions';

let client: MongoClient | null = null;
let dbPromise: Promise<Db> | null = null;

export function connectToDatabase(): Promise<Db> {
  // Share one in-flight connection so concurrent cold-start requests don't
  // each open their own client. Reset on failure so the next call retries.
  if (!dbPromise) {
    dbPromise = connect().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function connect(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  try {
    // Create MongoDB client
    client = new MongoClient(uri);

    // Attach the client to ensure proper cleanup on function suspension
    attachDatabasePool(client);

    await client.connect();

    // Get database
    const db = client.db();

    console.log('✅ Connected to MongoDB');

    // Create indexes
    await createIndexes(db);

    return db;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

async function createIndexes(database: Db) {
  const roomsCollection = database.collection('rooms');

  try {
    // Create unique index on room ID
    await roomsCollection.createIndex({id: 1}, {unique: true});

    // Create TTL index for automatic cleanup (2 hours)
    await roomsCollection.createIndex(
      {createdAt: 1},
      {expireAfterSeconds: 7200}
    );

    // Create index on hostId for efficient queries
    await roomsCollection.createIndex({hostId: 1});

    console.log('✅ MongoDB indexes created');
  } catch (error) {
    console.error('⚠️  Warning: Failed to create indexes:', error);
    // Don't throw - indexes might already exist
  }
}

// Graceful shutdown
export async function disconnectFromDatabase() {
  if (client) {
    await client.close();
    client = null;
    dbPromise = null;
    console.log('✅ Disconnected from MongoDB');
  }
}
