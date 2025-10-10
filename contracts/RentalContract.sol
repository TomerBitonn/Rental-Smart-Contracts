// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RentalContract {
    // Contract parameters
    address public landlord;
    address public tenant;
    uint256 public rentAmount;
    uint256 public startDate;
    uint256 public endDate;

    // Contract states
    bool public isSignedByLandlord;
    bool public isSignedByTenant;
    bool public isLocked;
    bool public isActive;

    enum Status { Created, Signed, Locked, Cancelled, Terminated }
    Status public contractStatus;

    // Payment record
    struct Payment {
        uint256 amount;
        uint256 timestamp;
    }
    Payment[] public payments;

    // Events
    event ContractCreated(address landlord, address tenant, uint256 rentAmount, uint256 startDate, uint256 endDate);
    event Signed(address signer);
    event Locked();
    event RentUpdated(uint256 newRent);
    event RentPaid(address from, uint256 amount, uint256 timestamp);
    event Cancelled(address by);
    event Terminated(address by);

    // Custom errors (gas efficient)
    error NotAuthorized();
    error InvalidState();
    error AlreadySigned();

    // Modifiers for access control and state validation
    modifier onlyLandlord() {
        if (msg.sender != landlord) revert NotAuthorized();
        _;
    }

    modifier onlyTenant() {
        if (msg.sender != tenant) revert NotAuthorized();
        _;
    }

    modifier onlyParties() {
        if (msg.sender != landlord && msg.sender != tenant) revert NotAuthorized();
        _;
    }

    modifier beforeLock() {
        if (isLocked) revert InvalidState();
        _;
    }

    modifier notExpired() {
        if (block.timestamp > endDate) revert("Contract expired");
        _;
    }

    modifier onlyActive() {
        _autoExpire();
        require(isActive, "Contract not active");
        _;
    }

    // Automatically expire contract when endDate passes
    function _autoExpire() internal {
        if (isActive && block.timestamp > endDate) {
            isActive = false;
            isLocked = false;
            contractStatus = Status.Terminated;
            emit Terminated(address(0)); 
        }
    }

    // Constructor initializes main contract details
    constructor(address _tenant, uint256 _rentAmount, uint256 _durationDays) {
        landlord = msg.sender;
        tenant = _tenant;
        rentAmount = _rentAmount;
        startDate = block.timestamp;
        endDate = block.timestamp + (_durationDays * 1 days);
        isActive = true;
        contractStatus = Status.Created;
        emit ContractCreated(landlord, tenant, rentAmount, startDate, endDate);
    }

    // Both parties can sign once; contract becomes "Signed" only after both sign
    function signContract() external onlyParties onlyActive beforeLock {
        if (msg.sender == landlord) {
            if (isSignedByLandlord) revert AlreadySigned();
            isSignedByLandlord = true;
        } else {
            if (isSignedByTenant) revert AlreadySigned();
            isSignedByTenant = true;
        }

        if (isSignedByLandlord && isSignedByTenant) {
            contractStatus = Status.Signed;
        }

        emit Signed(msg.sender);
    }

    // Only landlord can lock the contract after both signatures
    function lockContract() external onlyLandlord onlyActive beforeLock {
        require(isSignedByLandlord && isSignedByTenant, "Both must sign");
        isLocked = true;
        contractStatus = Status.Locked;
        emit Locked();
    }

    // Landlord can update rent before locking
    function updateRent(uint256 _newRent) external {
        require(msg.sender == landlord, "Only landlord can update");
        require(!isLocked, "Cannot update after lock");
        rentAmount = _newRent;
        emit RentUpdated(_newRent);
    }

    // Either party can cancel before locking
    function cancelContract() external {
        require(msg.sender == landlord || msg.sender == tenant, "Not authorized");
        require(!isLocked, "Cannot cancel after lock");
        isActive = false;
        contractStatus = Status.Cancelled;
        emit Cancelled(msg.sender);
    }

    // Tenant pays rent only when contract is locked and active
    function payRent() external payable onlyTenant onlyActive notExpired {
        require(isLocked, "Contract not locked");
        require(msg.value == rentAmount, "Incorrect amount");

        payments.push(Payment(msg.value, block.timestamp));
        payable(landlord).transfer(msg.value);

        emit RentPaid(msg.sender, msg.value, block.timestamp);
    }

    // Tenant can terminate early by paying double rent as a penalty
    function terminateByTenant() external payable onlyTenant onlyActive {
        require(isLocked, "Contract not locked");
        require(block.timestamp < endDate, "Use normal termination after end date");

        uint256 terminationFee = rentAmount * 2; 
        require(msg.value == terminationFee, "Termination fee required");

        payable(landlord).transfer(msg.value);

        isLocked = false;
        isActive = false;
        contractStatus = Status.Terminated;
        emit Terminated(msg.sender);
    }

    // Return all payments made by tenant
    function getPayments() external view returns (Payment[] memory) {
        return payments;
    }

    // Return main contract information in a single call
    function getContractInfo() external view returns (
        address, address, uint256, uint256, uint256, bool, bool, bool, bool, Status
    ) {
        return (landlord, tenant, rentAmount, startDate, endDate, isSignedByLandlord, isSignedByTenant, isLocked, isActive, contractStatus);
    }
}
