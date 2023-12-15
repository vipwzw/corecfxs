const { Conflux, Drip } = require('js-conflux-sdk');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
/*
1. privateKey 变成一个数组
2. 系统自动读取多个private key, 然后运行。
*/
const conflux = new Conflux({
    url: 'https://main.confluxrpc.com',
    //url: 'https://www.confluxscan.net',
    //url: "http://122.112.224.133:12537",
    networkId: 1029,
});

const CrossSpaceCall = conflux.InternalContract('CrossSpaceCall');

const privateKeys = require('./config.json').privateKeys;
var accounts = []
for ( var i = 0; i < privateKeys.length; i++) {
    const account = conflux.wallet.addPrivateKey(privateKeys[i]);
    accounts.push(account)
}
const gasPrice = require('./config.json').gasPrice || 10.03;

if (isMainThread) {
    var numThreads = accounts.length
    var results = []
    for (let i = 0; i < numThreads; i++) {
      const worker = new Worker(__filename, {
        workerData: accounts[i]
      });
        worker.on('message', (result) => {
        results.push(result);
        if (results.length === numThreads) {
          console.log('所有工作线程完成启动:');
          console.log(results);
        }
      });
    }
} else {
    main(workerData).catch(err => {
        console.error(err);
        process.exit(1);
    });
    parentPort.postMessage(0);
}

async function main(account) {
    console.log("runing: ", account.address)
    while(true) {
        try {
            await oneRound(account);
            console.log('One round finished: ', account.address);
        } catch(err) {
            console.error(err);
        }
        await waitMilliseconds(10000);
    }
}

async function waitMilliseconds(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function oneRound(account) {
    let hash;
    let batch = 5;
    let nonce = await conflux.getNextNonce(account.address);
    for(let i = 0; i < batch; i++) {
        try {
            hash = await CrossSpaceCall.transferEVM('0xc6e865c213c89ca42a622c5572d19f00d84d7a16').sendTransaction({
                from: account.address,
                nonce: nonce + BigInt(i),
                gasPrice: Drip.fromGDrip(gasPrice),  // call also specify the gasPrice
            });
            console.log(`Sending ${i}`, account.address, hash);
        } catch(err) {
            if (err.data.includes("Transaction Pool is full")) {
                console.log(err.data)
                await waitMilliseconds(1000);
                i--;
                continue;
            } else {
                console.log(err.data)
                break;
            }
        }
    }

    for(let i = 0; i < 30; i++) {
        try {
            if (!hash) break;
            let receipt = await conflux.getTransactionReceipt(hash);
            if (receipt){
                console.log(".......waiting......succ.....", account.address, hash)
                break;
            }
            await waitMilliseconds(3000);
        } catch(err) {
            console.error(err);
        }
    }
}
