const truffleAssert = require("truffle-assertions");

const Controller = artifacts.require("nTokenController");
const Proxy = artifacts.require("AdminUpgradeabilityProxy");

describe("DToken Contract", function () {
  let contractDeployer, owner, proxyAdmin, manager1, manager2, manager3, manager4;
  let newManagers;
  let controller, controller_proxy;

  before(async function () {
    [
      contractDeployer,
      owner,
      proxyAdmin,
      manager1,
      manager2,
      manager3,
      manager4,
    ] = await web3.eth.getAccounts();
  });

  async function resetContracts() {
    newManagers = [manager1, manager2, manager3];
    // Deploy nToken controller.
    controller = await Controller.new(newManagers);
    // Deploy proxy for nToken controller.
    let nToken_controller_proxy = await Proxy.new(controller.address, proxyAdmin, "0x");
    controller_proxy = await Controller.at(nToken_controller_proxy.address);
  }

  async function resetContractsTotally() {
    await resetContracts();
    newManagers = [manager1, manager2, manager3];
    await controller_proxy.initialize(newManagers);
  }

  describe("Deployment", function () {
    it("Should deploy and only initialize once", async function () {
      await resetContractsTotally();

      await truffleAssert.reverts(
        controller_proxy.initialize(newManagers, {
          from: contractDeployer,
        }),
        "initialize: Contract is already initialized!"
      );
    });

    it("Should deploy and provide more than one manager", async function () {
      await resetContracts();

      await truffleAssert.reverts(
        controller_proxy.initialize([], {
          from: contractDeployer,
        }),
        "initialize: At least one manager!"
      );
    });
  });

  describe("Managers", function () {
    before(async function () {
      await resetContractsTotally();
    });

    it("Add managers when agreement is reached", async function () {
      // Add a new manager
      assert.equal(await controller_proxy.managers(manager1), true);
      assert.equal(await controller_proxy.managers(manager2), true);
      assert.equal(await controller_proxy.managers(manager3), true);
      assert.equal(await controller_proxy.managers(manager4), false);

      await controller_proxy.addManager([manager4], { from: manager1 });
      assert.equal(await controller_proxy.managers(manager4), false);
      await controller_proxy.addManager([manager4], { from: manager2 });
      assert.equal(await controller_proxy.managers(manager4), true);
    });

    it("Repeat to add manager by the same account", async function () {
      await resetContractsTotally();

      await controller_proxy.addManager([manager4], { from: manager1 });

      await truffleAssert.reverts(
        controller_proxy.addManager([manager4], {
          from: manager1,
        }),
        "addManager: Has confirmed!"
      );
    });

    it("Manager to add new manager existed", async function () {
      await resetContractsTotally();

      let allManagersCount = parseInt((await controller_proxy.allManagers()).toString());

      await controller_proxy.addManager([manager4], { from: manager1 });
      assert.equal(await controller_proxy.managers(manager4), false);
      await controller_proxy.addManager([manager4], { from: manager2 });

      let currentAllManagersCount = parseInt((await controller_proxy.allManagers()).toString());
      assert.equal(currentAllManagersCount, allManagersCount + 1);
      await controller_proxy.addManager([manager4], { from: manager1 });
      await controller_proxy.addManager([manager4], { from: manager2 });

      await truffleAssert.reverts(
        controller_proxy.addManager([manager4], {
          from: manager4,
        }),
        "_addManager: Account already exists!"
      );
    });

    it("Repeat to remove manager by the same account", async function () {
      await resetContractsTotally();

      await controller_proxy.removeManager([manager3], { from: manager1 });

      await truffleAssert.reverts(
        controller_proxy.removeManager([manager3], {
          from: manager1,
        }),
        "removeManager: Has confirmed!"
      );
    });

    it("Manager to remove manager do not existed", async function () {
      await resetContractsTotally();

      let allManagersCount = parseInt((await controller_proxy.allManagers()).toString());

      await controller_proxy.removeManager([manager3], { from: manager1 });
      await controller_proxy.removeManager([manager3], { from: manager2 });

      let currentAllManagersCount = parseInt((await controller_proxy.allManagers()).toString());
      assert.equal(currentAllManagersCount, allManagersCount - 1);
      await controller_proxy.removeManager([manager3], { from: manager1 });

      await truffleAssert.reverts(
        controller_proxy.removeManager([manager3], {
          from: manager2,
        }),
        "_removeManager: Account does not exist!"
      );
    });

    it("Manager to remove manager do not existed", async function () {

      let allManagersCount = parseInt((await controller_proxy.allManagers()).toString());

      await controller_proxy.removeManager([manager2], { from: manager1 });
      await controller_proxy.removeManager([manager2], { from: manager2 });

      let currentAllManagersCount = parseInt((await controller_proxy.allManagers()).toString());
      assert.equal(currentAllManagersCount, allManagersCount - 1);

      await truffleAssert.reverts(
        controller_proxy.removeManager([manager1], {
          from: manager1,
        }),
        "_removeManager: At least one manager!"
      );
    });
  });

});
