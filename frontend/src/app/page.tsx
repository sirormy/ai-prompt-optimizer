export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          AI提示词优化工具
        </h1>
        <p className="text-center text-lg mb-4">
          智能优化您的AI提示词，提升AI交互效果
        </p>
        <div className="text-center">
          <p className="text-sm text-gray-600">
            前端应用正在运行中...
          </p>
        </div>
      </div>
    </main>
  );
}