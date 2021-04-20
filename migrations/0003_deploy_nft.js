const IyusdiNft = artifacts.require("IyusdiNft");
const IyusdiNewsletters = artifacts.require("IyusdiNewsletters");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    // this was deployed but the migration update failed so we don't want to deploy it again
    // if (addrs.isDev) {
      const newsletters = await IyusdiNewsletters.deployed()
      const operator = newsletters.address; // '0x0000000000000000000000000000000000000000'   for testing 000_TestIyusdiNft.js
      const uri = 'https://iyusdi.design/api/metadata/{id}';
      const nft = await deployer.deploy(IyusdiNft, operator, addrs.curator, uri);
      console.log(`IyusdiNft: '${nft.address}',`);
      await newsletters.setNft(nft.address);
    // }
    // Next deploy will go here, since the 0003 was not updated in migrations
    // "1": {
    //   "events": {},
    //   "links": {},
    //   "address": "0xA602072570c5161645FBa58A2FECc25061AbbdB4",
    //   "transactionHash": "0x88d45924db4f4755a7946f66ba71fc7d355b2842873e4aca284a824b669bb030"
    // }

  });
}
