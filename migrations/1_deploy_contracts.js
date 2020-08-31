require('dotenv').config();

const Controller = artifacts.require("nTokenController");
const NebulasToken = artifacts.require("NebulasToken");
const Proxy = artifacts.require("AdminUpgradeabilityProxy");
const USDT = artifacts.require("ERC20Token");

let usdt;
const newManagers = JSON.parse(process.env.CONTROLLER_MANAGERS);
// Pause contract.
const owner = process.env.CONTRACT_OWNER;
// Set new implement.
const proxyAdmin = process.env.PROXY_ADMIN;
// Fee recipient
const feeRecipient = process.env.FEE_RECIPIENT;

module.exports = async function (deployer, network, accounts) {
  // Contract deployer of all the contracts, so at the same time it is also the contract owner.
  let contractDeployer = accounts[0];

  if (network == 'mainnet') {
    usdt = await USDT.at("0xdAC17F958D2ee523a2206206994597C13D831ec7");
  } else if (network != 'development') {
    usdt = await USDT.at("0x53FAE6878086eA050cB0eB6322bD425C1774F675");
  } else {
    // Deploys USDT contract.
    await deployer.deploy(USDT);
    usdt = await USDT.deployed();
  }
  // Deploy nToken controller.
  await deployer.deploy(Controller, newManagers);
  let controller = await Controller.deployed();
  // Deploy proxy for nToken controller.
  await deployer.deploy(Proxy, controller.address, proxyAdmin, "0x", {'from':contractDeployer});
  let nToken_controller_proxy = await Proxy.deployed();
  let controller_proxy = await Controller.at(nToken_controller_proxy.address);
  await controller_proxy.initialize(newManagers);

  // Deploy nToken.
  await deployer.deploy(NebulasToken, owner, usdt.address, controller_proxy.address, feeRecipient);
  let nToken = await NebulasToken.deployed();
  // Deploy proxy for nToken.
  await deployer.deploy(Proxy, nToken.address, proxyAdmin, "0x", {'from':contractDeployer});
  let nebulas_token_proxy = await Proxy.deployed();
  let nToken_proxy = await NebulasToken.at(nebulas_token_proxy.address);
  await nToken_proxy.initialize(owner, usdt.address, controller_proxy.address, feeRecipient);

  console.log("Deploy contract for Nebulas Token")
  console.log("Deployer address is:      ", contractDeployer);
  console.log("nToken contract owner is: ", owner);
  console.log("All proxy admin is:       ", proxyAdmin);
  console.log("All managers are:         ");
  console.log("------ Manager 1 is    :  ", newManagers[0]);
  console.log("------ Manager 2 is    :  ", newManagers[1]);
  console.log("------ Manager 3 is    :  ", newManagers[2], "\n");

  console.log("USDT contract address is: ", usdt.address, "\n");

  console.log("nToken controller is:     ", controller.address);
  console.log("nToken controller proxy:  ", controller_proxy.address, "\n");

  console.log("nToken address is:        ", nToken.address);
  console.log("nToken proxy is:          ", nToken_proxy.address, "\n");
}
