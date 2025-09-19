const { expect } = require('chai');
const { network, ethers } = require('hardhat');


describe("RentalContract", function () {
  let landlord, tenant, outsider, contract;
  const ONE_ETH = ethers.parseEther("1");
  const TWO_ETH = ethers.parseEther("2");
  const DURATION = 30;

  beforeEach(async () => {
    [landlord, tenant, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("RentalContract", landlord);
    contract = await Factory.deploy(tenant.address, ONE_ETH, DURATION);
    await contract.waitForDeployment();
  });

  it("should deploy with correct state", async () => {
    const [cLandlord, cTenant, rentAmount, , , , , isLocked, isActive, status] = await contract.getContractInfo();
    expect(cLandlord).to.equal(landlord.address);
    expect(cTenant).to.equal(tenant.address);
    expect(rentAmount).to.equal(ONE_ETH);
    expect(isLocked).to.be.false;
    expect(isActive).to.be.true;
    expect(status).to.equal(0); 
  });

  describe("signContract", () => {
    it("should allow landlord to sign", async () => {
      await expect(contract.connect(landlord).signContract())
        .to.emit(contract, "Signed")
        .withArgs(landlord.address);
      const [, , , , , isSignedByLandlord] = await contract.getContractInfo();
      expect(isSignedByLandlord).to.be.true;
    });

    it("should allow tenant to sign", async () => {
      await expect(contract.connect(tenant).signContract())
        .to.emit(contract, "Signed")
        .withArgs(tenant.address);
      const [, , , , , , isSignedByTenant] = await contract.getContractInfo();
      expect(isSignedByTenant).to.be.true;
    });

    it("should revert if outsider tries to sign", async () => {
      await expect(contract.connect(outsider).signContract())
        .to.be.revertedWith("Not authorized");
    });
  });

  describe("lockContract", () => {
    it("should lock after both parties signed", async () => {
      await contract.connect(landlord).signContract();
      await contract.connect(tenant).signContract();
      await expect(contract.connect(landlord).lockContract())
        .to.emit(contract, "Locked");

      const [, , , , , , , isLocked] = await contract.getContractInfo();
      expect(isLocked).to.be.true;
    });

    it("should revert if only one party signed", async () => {
      await contract.connect(landlord).signContract();
      await expect(contract.lockContract()).to.be.revertedWith("Both must sign");
    });
  });

  describe("updateRent", () => {
    it("should allow landlord to update rent before lock", async () => {
      await expect(contract.connect(landlord).updateRent(TWO_ETH))
        .to.emit(contract, "RentUpdated")
        .withArgs(TWO_ETH);
      expect(await contract.rentAmount()).to.equal(TWO_ETH);
    });

    it("should revert if tenant tries to update rent", async () => {
      await expect(contract.connect(tenant).updateRent(TWO_ETH))
        .to.be.revertedWith("Only landlord can update");
    });

    it("should revert after contract is locked", async () => {
      await contract.connect(landlord).signContract();
      await contract.connect(tenant).signContract();
      await contract.connect(landlord).lockContract();
      await expect(contract.connect(landlord).updateRent(ONE_ETH))
        .to.be.revertedWith("Cannot update after lock");
    });
  });

  describe("cancelContract", () => {
    it("should allow either party to cancel before lock", async () => {
      await expect(contract.connect(tenant).cancelContract())
        .to.emit(contract, "Cancelled")
        .withArgs(tenant.address);

      const [, , , , , , , , isActive] = await contract.getContractInfo();
      expect(isActive).to.be.false;
    });

    it("should revert cancel after locked", async () => {
      await contract.connect(landlord).signContract();
      await contract.connect(tenant).signContract();
      await contract.connect(landlord).lockContract();
      await expect(contract.connect(landlord).cancelContract())
        .to.be.revertedWith("Cannot cancel after lock");
    });
  });

  describe("payRent", () => {
    beforeEach(async () => {
      await contract.connect(landlord).signContract();
      await contract.connect(tenant).signContract();
      await contract.connect(landlord).lockContract();
    });

    it("should accept valid payment and log it", async () => {
      await expect(contract.connect(tenant).payRent({ value: ONE_ETH }))
        .to.emit(contract, "RentPaid");

      const payments = await contract.getPayments();
      expect(payments.length).to.equal(1);
      expect(payments[0].amount).to.equal(ONE_ETH);
    });

    it("should reject wrong amount", async () => {
      await expect(contract.connect(tenant).payRent({ value: ONE_ETH - 1n }))
        .to.be.revertedWith("Incorrect amount");
    });

    it("should reject if not tenant", async () => {
      await expect(contract.connect(landlord).payRent({ value: ONE_ETH }))
        .to.be.revertedWith("Only tenant pays");
    });

    it("should reject if contract is not locked", async () => {
      const Factory = await ethers.getContractFactory("RentalContract");
      const newContract = await Factory.deploy(tenant.address, ONE_ETH, DURATION);
      await newContract.waitForDeployment();

      await expect(newContract.connect(tenant).payRent({ value: ONE_ETH }))
        .to.be.revertedWith("Contract not locked");
    });
  });

  describe("terminateByTenant", () => {
    it("should terminate after locked by tenant", async () => {
      await contract.connect(landlord).signContract();
      await contract.connect(tenant).signContract();
      await contract.connect(landlord).lockContract();

      await expect(contract.connect(tenant).terminateByTenant())
        .to.emit(contract, "Terminated")
        .withArgs(tenant.address);

      const [, , , , , , , isLocked, isActive] = await contract.getContractInfo();
      expect(isLocked).to.be.false;
      expect(isActive).to.be.false;
    });

    it("should revert if not locked", async () => {
      await expect(contract.connect(tenant).terminateByTenant())
        .to.be.revertedWith("Contract not locked");
    });

    it("should revert if not tenant", async () => {
      await contract.connect(landlord).signContract();
      await contract.connect(tenant).signContract();
      await contract.connect(landlord).lockContract();

      await expect(contract.connect(outsider).terminateByTenant())
        .to.be.revertedWith("Only tenant can terminate");
    });
  });
});
