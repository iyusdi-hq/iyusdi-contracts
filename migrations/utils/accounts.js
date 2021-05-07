require('dotenv').config();

module.exports = function(accounts, network) {
  const isProduction = network === 'mainnet';
  const isDev = !isProduction;
  let curator;
  let deployer = accounts[0]
  switch (network) {
    case 'mainnet':
      curator = process.env.MAINNET_CURATOR;
      protocol = process.env.MAINNET_PROTOCOL;
      break;
    default:
      curator = accounts[1];
      protocol = accounts[0];
  }

  return {
    isDev,
    curator,
    protocol,
    deployer,
  };
}
