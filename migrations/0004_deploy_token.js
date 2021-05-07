const IyusdiToken = artifacts.require("IyusdiToken");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    // IyusdiToken contract
    const iyusdiToken = await deployer.deploy(IyusdiToken, "Iyusdi", "IYU", addrs.protocol);
    console.log(`IyusdiToken: '${iyusdiToken.address}',`);
  });
};
