import { MongoClient } from 'mongodb';

export async function up(client: MongoClient) {
  const db = client.db();

  // Users collection indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ 'usage.lastUsed': -1 });

  // Prompts collection indexes
  await db.collection('prompts').createIndex({ userId: 1, createdAt: -1 });
  await db.collection('prompts').createIndex({ 'targetModel.provider': 1 });
  await db.collection('prompts').createIndex({ messageRole: 1 });

  // Optimization rules collection indexes
  await db.collection('optimization_rules').createIndex({ category: 1, priority: -1 });
  await db.collection('optimization_rules').createIndex({ applicableModels: 1 });
  await db.collection('optimization_rules').createIndex({ isActive: 1 });

  console.log('Database indexes created successfully');
}

export async function down(client: MongoClient) {
  const db = client.db();

  try {
    // Drop indexes by name (MongoDB generates names automatically)
    await db.collection('users').dropIndex('email_1');
    await db.collection('users').dropIndex('usage.lastUsed_-1');

    await db.collection('prompts').dropIndex('userId_1_createdAt_-1');
    await db.collection('prompts').dropIndex('targetModel.provider_1');
    await db.collection('prompts').dropIndex('messageRole_1');

    await db.collection('optimization_rules').dropIndex('category_1_priority_-1');
    await db.collection('optimization_rules').dropIndex('applicableModels_1');
    await db.collection('optimization_rules').dropIndex('isActive_1');

    console.log('Database indexes dropped successfully');
  } catch (error) {
    console.log('Some indexes may not exist, continuing...', error.message);
  }
}