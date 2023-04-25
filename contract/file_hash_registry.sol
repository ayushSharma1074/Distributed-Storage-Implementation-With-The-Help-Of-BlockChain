// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

contract file {
    address private immutable _owner;
    uint128 public userCounter;

    modifier _OwnerOnly() {
        require(msg.sender == _owner, "you are not the owner of this contract");
        _;
    }

    mapping(address => userFileInfo) public files;

    struct userFileInfo {
        uint256 merkleHash;
        bool hasFile;
        bool reg;
    }

    struct signature {
        bytes32 hashedMessage;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    constructor() {
        _owner = msg.sender;
        userCounter = 0;
    }

    function VerifyMessage(bytes32 hashedMessage, uint8 v, bytes32 r, bytes32 s) public pure returns (address) {
        return ecrecover(hashedMessage, v, r, s);
    }

    function addUser(address userAddr, uint256 merkleHash, bool hasFile, signature memory signArr) external _OwnerOnly returns (uint) {
        require(VerifyMessage(signArr.hashedMessage, signArr.v, signArr.r, signArr.s) == userAddr, "Invalid Signature");
        require(files[userAddr].reg == false, "This user already exist");
        files[userAddr] = userFileInfo(merkleHash, hasFile, true);
        require(files[userAddr].reg == true, "failed to add user");
        userCounter++;
        return 0;
    }

    function removeUser(address userAddr, signature memory signArr) external _OwnerOnly returns (uint) {
        require(VerifyMessage(signArr.hashedMessage, signArr.v, signArr.r, signArr.s) == userAddr, "Invalid Signature");
        require(files[userAddr].reg == true, "This user hasn't registered in the system");
        files[userAddr] = userFileInfo(0x0, false, false);
        require(files[userAddr].reg == false, "failed to remove user");
        userCounter--;
        return 0;
    }

    function changeHaveFileStatus(address userAddr, bool hasFile, signature memory signArr) external _OwnerOnly returns (uint) {
        require(VerifyMessage(signArr.hashedMessage, signArr.v, signArr.r, signArr.s) == userAddr, "Invalid Signature");
        files[userAddr].hasFile = hasFile;
        require(files[userAddr].hasFile == hasFile, "failed to update user file's status");
        return 0;
    }

    function updateHash(address userAddr, uint256 merkleHash, signature memory signArr) public _OwnerOnly returns (uint) {
        require(VerifyMessage(signArr.hashedMessage, signArr.v, signArr.r, signArr.s) == userAddr, "Invalid Signature");
        require(files[userAddr].reg != true, "This user hasn't registered in the system");
        files[userAddr].merkleHash = merkleHash;
        require(files[userAddr].merkleHash == merkleHash, "failed to update file merkle hash");
        return 0;
    }
}