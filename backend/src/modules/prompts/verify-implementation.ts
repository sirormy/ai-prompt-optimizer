/**
 * 验证提示词数据管理实现的快速测试脚本
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PromptsService } from './prompts.service';
import { CreatePromptDto, AIModel, MessageRole } from './dto';
import { Types } from 'mongoose';

async function verifyImplementation() {
  console.log('🚀 开始验证提示词数据管理实现...\n');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const promptsService = app.get(PromptsService);
    
    const testUserId = new Types.ObjectId().toString();
    
    // 1. 测试创建提示词
    console.log('1️⃣ 测试创建提示词...');
    const createPromptDto: CreatePromptDto & { userId: string } = {
      userId: testUserId,
      title: '测试提示词',
      originalText: '写一个关于AI的故事',
      targetModel: AIModel.OPENAI_GPT4,
      messageRole: MessageRole.USER,
      description: '这是一个测试提示词',
      tags: ['测试', 'AI'],
    };
    
    const createdPrompt = await promptsService.create(createPromptDto);
    console.log('✅ 提示词创建成功:', createdPrompt.title);
    console.log('   - ID:', createdPrompt.id);
    console.log('   - 版本数:', createdPrompt.versions.length);
    console.log('   - 当前版本:', createdPrompt.currentVersion);
    
    const promptId = createdPrompt.id.toString();
    
    // 2. 测试查询提示词
    console.log('\n2️⃣ 测试查询提示词...');
    const queryResult = await promptsService.findByUserId(testUserId, {
      page: 1,
      limit: 10,
      search: '测试',
    });
    console.log('✅ 查询成功:', queryResult.total, '个结果');
    console.log('   - 找到的提示词:', queryResult.prompts.length);
    
    // 3. 测试获取单个提示词
    console.log('\n3️⃣ 测试获取单个提示词...');
    const singlePrompt = await promptsService.findOneByUserAndId(testUserId, promptId);
    console.log('✅ 获取成功:', singlePrompt.title);
    console.log('   - 查看次数:', singlePrompt.viewCount);
    
    // 4. 测试创建版本
    console.log('\n4️⃣ 测试创建版本...');
    const newVersion = await promptsService.createVersion(testUserId, promptId, {
      text: '写一个详细的关于AI助手的故事，包含情感和互动',
      changeDescription: '增加了更多细节和情感元素',
    });
    console.log('✅ 版本创建成功');
    console.log('   - 新版本号:', newVersion.currentVersion);
    console.log('   - 总版本数:', newVersion.versions.length);
    
    // 5. 测试版本对比
    console.log('\n5️⃣ 测试版本对比...');
    const comparison = await promptsService.compareVersions(testUserId, promptId, 1, 2);
    console.log('✅ 版本对比成功');
    console.log('   - 版本1长度:', comparison.comparison.textLength.v1);
    console.log('   - 版本2长度:', comparison.comparison.textLength.v2);
    console.log('   - 长度差异:', comparison.comparison.textLength.difference);
    
    // 6. 测试获取版本历史
    console.log('\n6️⃣ 测试获取版本历史...');
    const versionHistory = await promptsService.getVersionHistory(testUserId, promptId);
    console.log('✅ 版本历史获取成功');
    console.log('   - 版本数量:', versionHistory.length);
    versionHistory.forEach(v => {
      console.log(`   - 版本${v.version}: ${v.changeDescription}`);
    });
    
    // 7. 测试更新提示词
    console.log('\n7️⃣ 测试更新提示词...');
    const updatedPrompt = await promptsService.update(testUserId, promptId, {
      title: '更新后的测试提示词',
      isFavorite: true,
      tags: ['测试', 'AI', '更新'],
    });
    console.log('✅ 更新成功:', updatedPrompt.title);
    console.log('   - 收藏状态:', updatedPrompt.isFavorite);
    console.log('   - 标签:', updatedPrompt.tags);
    
    // 8. 测试用户统计
    console.log('\n8️⃣ 测试用户统计...');
    const stats = await promptsService.getUserStats(testUserId);
    console.log('✅ 统计获取成功');
    console.log('   - 总提示词数:', stats.totalPrompts);
    console.log('   - 收藏数:', stats.favoritePrompts);
    console.log('   - 总版本数:', stats.totalVersions);
    console.log('   - 模型提供商:', stats.modelProviders);
    
    // 9. 测试版本恢复
    console.log('\n9️⃣ 测试版本恢复...');
    const revertedPrompt = await promptsService.revertToVersion(testUserId, promptId, 1);
    console.log('✅ 版本恢复成功');
    console.log('   - 当前版本:', revertedPrompt.currentVersion);
    console.log('   - 总版本数:', revertedPrompt.versions.length);
    
    // 10. 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await promptsService.remove(testUserId, promptId);
    console.log('✅ 测试数据清理完成');
    
    console.log('\n🎉 所有测试通过！提示词数据管理功能实现正确。');
    
    await app.close();
    
  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行验证
if (require.main === module) {
  verifyImplementation().catch(console.error);
}

export { verifyImplementation };