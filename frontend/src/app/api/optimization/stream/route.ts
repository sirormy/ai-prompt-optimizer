import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 });
  }

  // 创建SSE响应
  const encoder = new TextEncoder();
  let isClosed = false;
  
  const stream = new ReadableStream({
    start(controller) {
      // 模拟优化过程
      const stages = [
        { stage: 'analyzing', message: '正在分析提示词结构和内容...', percentage: 25 },
        { stage: 'optimizing', message: '正在应用优化规则...', percentage: 50 },
        { stage: 'validating', message: '正在验证优化效果...', percentage: 75 },
        { stage: 'formatting', message: '正在格式化结果...', percentage: 100 },
      ];

      let currentStage = 0;
      let timeoutId: NodeJS.Timeout;

      const sendProgress = () => {
        if (isClosed) return;
        
        try {
          if (currentStage < stages.length) {
            const stage = stages[currentStage];
            const data = {
              type: 'progress',
              data: {
                stage: stage.stage,
                percentage: stage.percentage,
                message: stage.message,
                currentStep: `${currentStage + 1}/${stages.length}`,
              },
              timestamp: Date.now(),
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );

            currentStage++;
            timeoutId = setTimeout(sendProgress, 1000 + Math.random() * 1000); // 1-2秒间隔
          } else {
            // 发送完成信号
            const completeData = {
              type: 'complete',
              data: { message: '优化完成' },
              timestamp: Date.now(),
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`)
            );

            isClosed = true;
            controller.close();
          }
        } catch (error) {
          console.error('SSE发送错误:', error);
          if (!isClosed) {
            isClosed = true;
            controller.close();
          }
        }
      };

      // 开始发送进度
      timeoutId = setTimeout(sendProgress, 500);

      // 清理函数
      return () => {
        isClosed = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    },
    
    cancel() {
      isClosed = true;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}