// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RentalContract {
    address public landlord;
    address public tenant;
    uint256 public rentAmount;
    uint256 public startDate;
    uint256 public endDate;

    bool public isSignedByLandlord;
    bool public isSignedByTenant;
    bool public isLocked;
    bool public isActive;

    enum Status { Created, Signed, Locked, Cancelled, Terminated }
    Status public contractStatus;

    struct Payment {
        uint256 amount;
        uint256 timestamp;
    }
    Payment[] public payments;

    event ContractCreated(address landlord, address tenant, uint256 rentAmount, uint256 startDate, uint256 endDate);
    event Signed(address signer);
    event Locked();
    event RentUpdated(uint256 newRent);
    event RentPaid(address from, uint256 amount, uint256 timestamp);
    event Cancelled(address by);
    event Terminated(address by);

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

    function signContract() external {
        require(msg.sender == landlord || msg.sender == tenant, "Not authorized");
        require(isActive, "Contract not active");
        if (msg.sender == landlord) isSignedByLandlord = true;
        if (msg.sender == tenant) isSignedByTenant = true;
        contractStatus = Status.Signed;
        emit Signed(msg.sender);
    }

    function lockContract() external {
        require(isSignedByLandlord && isSignedByTenant, "Both must sign");
        require(!isLocked, "Already locked");
        isLocked = true;
        contractStatus = Status.Locked;
        emit Locked();
    }

    function updateRent(uint256 _newRent) external {
        require(msg.sender == landlord, "Only landlord can update");
        require(!isLocked, "Cannot update after lock");
        rentAmount = _newRent;
        emit RentUpdated(_newRent);
    }

    function cancelContract() external {
        require(msg.sender == landlord || msg.sender == tenant, "Not authorized");
        require(!isLocked, "Cannot cancel after lock");
        isActive = false;
        contractStatus = Status.Cancelled;
        emit Cancelled(msg.sender);
    }

    function payRent() external payable {
        require(isLocked, "Contract not locked");
        require(msg.sender == tenant, "Only tenant pays");
        require(msg.value == rentAmount, "Incorrect amount");

        payments.push(Payment(msg.value, block.timestamp));
        payable(landlord).transfer(msg.value);

        emit RentPaid(msg.sender, msg.value, block.timestamp);
    }

    function terminateByTenant() external {
        require(msg.sender == tenant, "Only tenant can terminate");
        require(isLocked, "Contract not locked");
        isLocked = false;
        isActive = false;
        contractStatus = Status.Terminated;
        emit Terminated(msg.sender);
    }

    function getPayments() external view returns (Payment[] memory) {
        return payments;
    }

    function getContractInfo() external view returns (
        address, address, uint256, uint256, uint256, bool, bool, bool, bool, Status
    ) {
        return (landlord, tenant, rentAmount, startDate, endDate, isSignedByLandlord, isSignedByTenant, isLocked, isActive, contractStatus);
    }
}
