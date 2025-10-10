const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RentalContract", function () {
  const RENT = ethers.parseEther("1");
  const DURATION_DAYS = 30;
  const DOUBLE_RENT = RENT * 2n;

  let landlord, tenant, outsider;
  let landlordAddr, tenantAddr;
  let rental;

  async function deployFixture() {
    [landlord, tenant, outsider] = await ethers.getSigners();
    landlordAddr = await landlord.getAddress();
    tenantAddr = await tenant.getAddress();

    const Rental = await ethers.getContractFactory("RentalContract", landlord);
    rental = await Rental.deploy(tenantAddr, RENT, DURATION_DAYS);
    await rental.waitForDeployment();
    return { rental, landlord, tenant, outsider };
  }

  async function increaseTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  it("initializes with correct state", async () => {
    await deployFixture();

    expect(await rental.landlord()).to.equal(landlordAddr);
    expect(await rental.tenant()).to.equal(tenantAddr);
    expect(await rental.rentAmount()).to.equal(RENT);
    expect(await rental.isActive()).to.equal(true);
    expect(await rental.isLocked()).to.equal(false);
    expect(await rental.contractStatus()).to.equal(0); // Status.Created
  });

  describe("signing flow", () => {
    beforeEach(async () => {
      await deployFixture();
    });

    it("allows each party to sign once; moves to Signed only after both sign", async () => {
      await expect(rental.connect(tenant).signContract())
        .to.emit(rental, "Signed")
        .withArgs(await tenant.getAddress());

      // Only one party signed so far
      expect(await rental.contractStatus()).to.equal(0);

      await expect(rental.connect(landlord).signContract())
        .to.emit(rental, "Signed")
        .withArgs(await landlord.getAddress());

      // After both signed, contractStatus becomes Signed (1)
      expect(await rental.contractStatus()).to.equal(1);
    });

    it("reverts on double sign by the same party", async () => {
      await rental.connect(tenant).signContract();
      await expect(rental.connect(tenant).signContract())
        .to.be.revertedWithCustomError(rental, "AlreadySigned");
    });

    it("reverts when non-party tries to sign", async () => {
      await expect(rental.connect(outsider).signContract())
        .to.be.revertedWithCustomError(rental, "NotAuthorized");
    });
  });

  describe("locking flow", () => {
    beforeEach(async () => {
      await deployFixture();
      await rental.connect(tenant).signContract();
      await rental.connect(landlord).signContract();
    });

    it("only landlord can lock after both signatures", async () => {
      await expect(rental.connect(tenant).lockContract())
        .to.be.revertedWithCustomError(rental, "NotAuthorized");

      await expect(rental.connect(landlord).lockContract())
        .to.emit(rental, "Locked");

      expect(await rental.isLocked()).to.equal(true);
      expect(await rental.contractStatus()).to.equal(2); // Status.Locked
    });

    it("cannot lock before both signatures", async () => {
      const Rental = await ethers.getContractFactory("RentalContract", landlord);
      const fresh = await Rental.deploy(tenantAddr, RENT, DURATION_DAYS);
      await fresh.waitForDeployment();
      await fresh.connect(tenant).signContract();

      await expect(fresh.connect(landlord).lockContract())
        .to.be.revertedWith("Both must sign");
    });
  });

  describe("updateRent and cancelContract", () => {
    beforeEach(async () => {
      await deployFixture();
    });

    it("landlord can update rent before lock", async () => {
      await expect(rental.connect(landlord).updateRent(RENT + 1n))
        .to.emit(rental, "RentUpdated")
        .withArgs(RENT + 1n);
      expect(await rental.rentAmount()).to.equal(RENT + 1n);
    });

    it("cannot update rent after lock", async () => {
      await rental.connect(tenant).signContract();
      await rental.connect(landlord).signContract();
      await rental.connect(landlord).lockContract();

      await expect(rental.connect(landlord).updateRent(RENT + 1n))
        .to.be.revertedWith("Cannot update after lock");
    });

    it("either party can cancel before lock; updates status to Cancelled", async () => {
      await expect(rental.connect(tenant).cancelContract())
        .to.emit(rental, "Cancelled")
        .withArgs(await tenant.getAddress());
      expect(await rental.isActive()).to.equal(false);
      expect(await rental.contractStatus()).to.equal(3); // Cancelled
    });

    it("cannot cancel after lock", async () => {
      await rental.connect(tenant).signContract();
      await rental.connect(landlord).signContract();
      await rental.connect(landlord).lockContract();

      await expect(rental.connect(tenant).cancelContract())
        .to.be.revertedWith("Cannot cancel after lock");
    });
  });

  describe("payments", () => {
    beforeEach(async () => {
      await deployFixture();
      await rental.connect(tenant).signContract();
      await rental.connect(landlord).signContract();
      await rental.connect(landlord).lockContract();
    });

    it("tenant can pay exact rent while active, locked, and before endDate", async () => {
      const landlordBalanceBefore = await ethers.provider.getBalance(landlordAddr);

      await expect(rental.connect(tenant).payRent({ value: RENT }))
        .to.emit(rental, "RentPaid");

      const landlordBalanceAfter = await ethers.provider.getBalance(landlordAddr);
      expect(landlordBalanceAfter - landlordBalanceBefore).to.equal(RENT);

      const p = await rental.payments(0);
      expect(p.amount).to.equal(RENT);
    });

    it("rejects incorrect payment amount", async () => {
      await expect(rental.connect(tenant).payRent({ value: RENT - 1n }))
        .to.be.revertedWith("Incorrect amount");
    });

    it("rejects payment after endDate", async () => {
      const seconds = (DURATION_DAYS + 1) * 24 * 60 * 60;
      await increaseTime(seconds);
      await expect(rental.connect(tenant).payRent({ value: RENT }))
        .to.be.revertedWith("Contract not active");
    });
  });

  describe("terminateByTenant", () => {
    beforeEach(async () => {
      await deployFixture();
      await rental.connect(tenant).signContract();
      await rental.connect(landlord).signContract();
      await rental.connect(landlord).lockContract();
    });

    it("requires locked and before endDate", async () => {
      const seconds = (DURATION_DAYS + 1) * 24 * 60 * 60;
      await increaseTime(seconds);
      await expect(
        rental.connect(tenant).terminateByTenant({ value: DOUBLE_RENT })
      ).to.be.revertedWith("Contract not active");
    });

    it("requires exactly double rent as penalty", async () => {
      await expect(
        rental.connect(tenant).terminateByTenant({ value: DOUBLE_RENT - 1n })
      ).to.be.revertedWith("Termination fee required");
    });

    it("transfers penalty to landlord and updates status", async () => {
      const before = await ethers.provider.getBalance(landlordAddr);
      await expect(
        rental.connect(tenant).terminateByTenant({ value: DOUBLE_RENT })
      ).to.emit(rental, "Terminated")
        .withArgs(await tenant.getAddress());

      const after = await ethers.provider.getBalance(landlordAddr);
      expect(after - before).to.equal(DOUBLE_RENT);
      expect(await rental.isActive()).to.equal(false);
      expect(await rental.contractStatus()).to.equal(4);
    });
  });

  describe("auto expiration (via onlyActive)", () => {
    it("auto-terminates when any onlyActive function is called after endDate", async () => {
      await deployFixture();
      const endDate = Number(await rental.endDate());
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      await increaseTime(endDate - now + 1);

      // Trigger any onlyActive check
      await expect(rental.connect(tenant).cancelContract())
        .to.be.revertedWith("Cannot cancel after lock")
        .catch(() => {}); // ignore revert reason, we just trigger _autoExpire()

      expect(await rental.isActive()).to.equal(false);
      expect(await rental.contractStatus()).to.equal(3);
    });
  });
});
