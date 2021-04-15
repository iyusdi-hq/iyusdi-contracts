require('dotenv').config();

module.exports = function(accounts, network) {
  const isProduction = network === 'mainnet';
  const isDev = !isProduction;
  let curator;
  let deployer = accounts[0]
  switch (network) {
    case 'mainnet':
      curator = process.env.MAINNET_CURATOR;
      break;
    default:
      curator = accounts[0];
  }

  return {
    curator,
    deployer,
  };
}
