// MongoDB初始化脚本
db = db.getSiblingDB('ai_prompt_optimizer');

// 创建用户集合索引
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: 1 });

// 创建提示词集合索引
db.prompts.createIndex({ userId: 1 });
db.prompts.createIndex({ createdAt: -1 });
db.prompts.createIndex({ targetModel: 1 });

// 创建优化规则集合索引
db.optimization_rules.createIndex({ category: 1 });
db.optimization_rules.createIndex({ applicableModels: 1 });
db.optimization_rules.createIndex({ priority: -1 });

print('数据库初始化完成！');