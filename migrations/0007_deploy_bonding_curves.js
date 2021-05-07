const IyusdiBondingCurves = artifacts.require("IyusdiBondingCurves");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {

    const curves = await deployer.deploy(IyusdiBondingCurves);
    console.log(`IyusdiBondingCurves: '${curves.address}',`);

  });
}
