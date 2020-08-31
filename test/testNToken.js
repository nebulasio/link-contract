const truffleAssert = require("truffle-assertions");

const Controller = artifacts.require("nTokenController");
const NebulasToken = artifacts.require("NebulasToken");
const Proxy = artifacts.require("AdminUpgradeabilityProxy");
const USDT = artifacts.require("ERC20Token");

const BN = require("bn.js");
const MAX_VALUE = new BN(2).pow(new BN(256)).sub(new BN(1));

describe("DToken Contract", function () {
  let contractDeployer, owner, proxyAdmin, manager1, manager2, manager3, manager4;
  let user1, user2, user3;
  let newManagers;
  let controller, controller_proxy;
  let usdt, nToken, nToken_proxy, feeRecipient;
  let nTokenAddress1 = 'n1NQtv9QgAhdGTSkxwpU8bLMeCxRAp8modW';
  let nTokenAddress2 = 'n1d7yrpTarJjQ4TzHCHWWZnntpnydNCHNK6';
  let nTokenAddress3 = 'n1F4y2U3qTyqaGydghxnRqgu6eVYaTwVk2A';
  let invalidNTokenAddress = 'a1F4y2U3qTyqaGydghxnRqgu6eVYaTwVk2A';
  let insufficientNTokenAddressLength = 'n1F4y2U3qTyqaGydghxnRqgu6eVYaTwVk2';

  before(async function () {
    [
      contractDeployer,
      owner,
      proxyAdmin,
      manager1,
      manager2,
      manager3,
      manager4,
      user1,
      user2,
      user3,
      feeRecipient,
    ] = await web3.eth.getAccounts();
  });

  async function resetContracts() {
    newManagers = [manager1, manager2, manager3];
    // Deploy nToken controller.
    controller = await Controller.new(newManagers);
    // Deploy proxy for nToken controller.
    let nToken_controller_proxy = await Proxy.new(controller.address, proxyAdmin, "0x");
    controller_proxy = await Controller.at(nToken_controller_proxy.address);
    await controller_proxy.initialize(newManagers);

    // Deploy USDT.
    usdt = await USDT.new();
    // Deploy nToken.
    nToken = await NebulasToken.new(owner, usdt.address, controller_proxy.address, feeRecipient);
    // Deploy proxy for nToken.
    let nebulas_token_proxy = await Proxy.new(nToken.address, proxyAdmin, "0x");
    nToken_proxy = await NebulasToken.at(nebulas_token_proxy.address);
    await nToken_proxy.initialize(owner, usdt.address, controller_proxy.address, feeRecipient);
  }

  describe("Deployment", function () {
    it("Should deploy and only initialize once", async function () {
      await resetContracts();

      await truffleAssert.reverts(
        nToken_proxy.initialize(owner, usdt.address, controller_proxy.address, feeRecipient, {
          from: contractDeployer,
        }),
        "initialize: Contract is already initialized!"
      );
    });
  });

  describe("Stake", function () {
    before(async function () {
      await resetContracts();
    });

    it("Stake USDT", async function () {
      let stakingAmount = 1000000;
      await usdt.allocateTo(manager1, 900 * 10 ** 6);

      await usdt.approve(nToken_proxy.address, MAX_VALUE, { from: manager1 });
      await nToken_proxy.stake(stakingAmount, nTokenAddress1, { from: manager1 });
      // No fee, so supplying amount should be equal to total supply at the first time.
      let user1StakingAmout = (await nToken_proxy.balanceOf(manager1)).toString();
      let totalStakingAmount = (await nToken_proxy.totalSupply()).toString();

      assert.equal(user1StakingAmout, totalStakingAmount);
      assert.equal(await nToken_proxy.getMappingAccount(manager1), nTokenAddress1);
      assert.equal(await nToken_proxy.convertMappingAccounts(nTokenAddress1), manager1);

      // Stake again
      await nToken_proxy.stake(stakingAmount, nTokenAddress1, { from: manager1 });
      user1StakingAmout = (await nToken_proxy.balanceOf(manager1)).toString();
      totalStakingAmount = (await nToken_proxy.totalSupply()).toString();

      assert.equal(user1StakingAmout, totalStakingAmount);
      assert.equal(await nToken_proxy.getMappingAccount(manager1), nTokenAddress1);
      assert.equal(await nToken_proxy.convertMappingAccounts(nTokenAddress1), manager1);
    });

    it("Update nebulas recipient account", async function () {
      await nToken_proxy.updateMappingAccount(nTokenAddress2, { from: manager1 });
      assert.equal(await nToken_proxy.getMappingAccount(manager1), nTokenAddress2);
      assert.equal(await nToken_proxy.convertMappingAccounts(nTokenAddress2), manager1);
    });

    it("Return staking asset to user", async function () {
      let totalAmount = (await nToken_proxy.balanceOf(manager1)).toString();
      let feeAmount = (new BN(totalAmount)).mul(new BN(3)).div(new BN(1000));
      let refundAmount = (new BN(totalAmount)).sub(feeAmount);
      let refundByNebulasAccount = await nToken_proxy.getMappingAccount(manager1);
      let refundToEthereumAccount = await nToken_proxy.convertMappingAccounts(refundByNebulasAccount);
      let manager1OriginalUSDTBalance = await usdt.balanceOf(manager1);
      let feerOriginalUSDTBalance = await usdt.balanceOf(feeRecipient);

      assert.equal((await usdt.balanceOf(feeRecipient)).toString(), "0");

      await nToken_proxy.refund(refundByNebulasAccount, refundToEthereumAccount, refundAmount, feeAmount, { from: owner });

      let user1StakingAmout = (await nToken_proxy.balanceOf(manager1)).toString();
      let totalStakingAmount = (await nToken_proxy.totalSupply()).toString();
      let manager1CurrentUSDTBalance = await usdt.balanceOf(manager1);
      let feerCurrentUSDTBalance = await usdt.balanceOf(feeRecipient);

      let manager1USDTChangingBalance = (new BN(manager1CurrentUSDTBalance)).sub(new BN(manager1OriginalUSDTBalance));
      let feerUSDTChangingBalance = (new BN(feerCurrentUSDTBalance)).sub(new BN(feerOriginalUSDTBalance));

      assert.equal(user1StakingAmout, "0");
      // TODO: Compare by changing amount!
      assert.equal(user1StakingAmout, totalStakingAmount);
      assert.equal(manager1USDTChangingBalance.toString(), refundAmount.toString());
      assert.equal(feerUSDTChangingBalance.toString(), feeAmount.toString());
    });

    it("Update fee recipient account", async function () {
      let newFeer = manager4;
      assert.equal(await nToken_proxy.feeRecipient(), feeRecipient);

      await controller_proxy.updateFeeRecipient(nToken_proxy.address, newFeer, { from: manager1 });
      assert.equal(await nToken_proxy.feeRecipient(), feeRecipient);
      await controller_proxy.updateFeeRecipient(nToken_proxy.address, newFeer, { from: manager2 });

      assert.equal(await nToken_proxy.feeRecipient(), newFeer);
    });

    it("Transfer unexpected asset out", async function () {
      let stakingAmount = 10 ** 7;
      await nToken_proxy.stake(stakingAmount, nTokenAddress1, { from: manager1 });
      await nToken_proxy.paused({ from: owner });

      assert.equal((await usdt.balanceOf(manager2)).toString(), "0");

      await controller_proxy.transferOut(nToken_proxy.address, usdt.address, manager2, stakingAmount, { from: manager1 });
      let manager2UsdtAmount = await usdt.balanceOf(manager2);

      await controller_proxy.transferOut(nToken_proxy.address, usdt.address, manager2, stakingAmount, { from: manager2 });
      manager2UsdtAmount = await usdt.balanceOf(manager2);

      assert.equal((await usdt.balanceOf(nToken_proxy.address)).toString(), "0");
      assert.equal((await usdt.balanceOf(manager2)).toString(), stakingAmount.toString());
    });
  });

  // Invalid nebulas account address
  describe("Deployment", function () {
    before(async function () {
      await resetContracts();
      await usdt.allocateTo(manager1, 999 * 10 ** 6);
      await usdt.approve(nToken_proxy.address, MAX_VALUE, { from: manager1 });
    });

    it("Invalid nebulas account address", async function () {
      let stakingAmount = '123456789';

      await truffleAssert.reverts(
        nToken_proxy.stake(stakingAmount, invalidNTokenAddress, { from: manager1 }),
        "checkNebulasAccount: Invalid nebulas account address!"
      );
    });

    it("Insufficient account address", async function () {
      let stakingAmount = '123456789';

      await truffleAssert.reverts(
        nToken_proxy.stake(stakingAmount, insufficientNTokenAddressLength, { from: manager1 }),
        "checkNebulasAccount: Invalid nebulas account length!"
      );
    });

    it("Staking amount can be 0", async function () {
      let stakingAmount = 0;

      await truffleAssert.reverts(
        nToken_proxy.stake(stakingAmount, nTokenAddress3, { from: manager1 }),
        "stake: Staking amount should be greater than 0!"
      );
    });

    it("Can not stake account when contract is paused!", async function () {
      let stakingAmount = 0;

      await nToken_proxy.paused({ from: owner });

      await truffleAssert.reverts(
        nToken_proxy.stake(stakingAmount, nTokenAddress3, { from: manager1 }),
        "Pausable: paused"
      );
    });
  });
});
