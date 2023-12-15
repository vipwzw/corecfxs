const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

function calculateFibonacci(n) {
  if (n <= 1) {
    return n;
  }
  
  return calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
}

if (isMainThread) {
  const numbersToCalculate = [42, 43, 44, 45]; // 要计算的斐波那契数列的数字

  const threads = [];
  const results = [];

  // 创建工作线程
  var numThreads = numbersToCalculate.length
  for (let i = 0; i < numThreads; i++) {
    const worker = new Worker(__filename, {
      workerData: numbersToCalculate[i]
    });

    // 监听工作线程的消息
    worker.on('message', (result) => {
      results.push(result);
      if (results.length === numThreads) {
        console.log('所有工作线程完成:');
        console.log(results);
      }
    });
    threads.push(worker);
  }

  // 终止工作线程
  threads.forEach((worker) => {
    worker.postMessage('terminate');
  });
} else {
    // 工作线程的逻辑
    const numberToCalculate = workerData;
    if (numberToCalculate === 'terminate') {
        // 接收到终止信号，退出线程
        process.exit();
    }
    const result = calculateFibonacci(numberToCalculate);
    // 向主线程发送计算结果
    parentPort.postMessage(result);
}