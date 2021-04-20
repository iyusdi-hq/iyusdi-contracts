const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

module.exports = {
  compilers: {
    solc: {
      version: "0.8.2",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8547,
      network_id: "*"
    },
    test: {
      host: "127.0.0.1",
      port: 8547,
      network_id: "*"
    },
    rinkeby: {
      provider: () => new HDWalletProvider(process.env.RINKEBY_MNEMONIC, "https://rinkeby.infura.io/v3/" + infuraProjectId),
      network_id: 4,       // Ropsten's id
      gas: 5500000,        // Ropsten has a lower block limit than mainnet
      confirmations: 2,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true,    // Skip dry run before migrations? (default: false for public nets )
    },
    mainnet: {
      provider: () => new HDWalletProvider(process.env.MAINNET_MNEMONIC, "ws://127.0.0.1:8546"),
      network_id: 1,
      timeoutBlocks: 4000,
      gasPrice: 80000000000, // 80 gwei
      gas: 3500000, //1116199
    }
  },
  plugins: ["truffle-contract-size","truffle-plugin-verify"],
  api_keys: {
    etherscan: process.env.ETHERSCAN,
  }
};
