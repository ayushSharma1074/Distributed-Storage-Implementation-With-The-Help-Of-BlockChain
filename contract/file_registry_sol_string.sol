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

    mapping(address => string) public files;
    mapping(address => mapping(address => permInfo[])) public filesPerm;

    struct permInfo {
        address permUserAddr;
        uint256 merkleHash;
        uint8 perm;
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

    function getUserPermInfoLength(address ownerAddr, address permUserAddr) external view returns (uint) {
        return filesPerm[ownerAddr][permUserAddr].length;
    }

    function VerifyMessage(bytes32 hashedMessage, uint8 v, bytes32 r, bytes32 s) public pure returns (address) {
        return ecrecover(hashedMessage, v, r, s);
    }

    function addUser(address userAddr, string memory merkleHash, signature memory signArr) external _OwnerOnly returns (uint) {
        require(VerifyMessage(signArr.hashedMessage, signArr.v, signArr.r, signArr.s) == userAddr, "Invalid Signature");
        require(keccak256(bytes(files[userAddr])) == keccak256(bytes("")), "This user already exist");
        files[userAddr] = merkleHash;
        require(keccak256(bytes(files[userAddr])) != keccak256(bytes("")), "failed to add user");
        return 0;
    }

    function removeUser(address userAddr, signature memory signArr) external _OwnerOnly returns (uint) {
        require(VerifyMessage(signArr.hashedMessage, signArr.v, signArr.r, signArr.s) == userAddr, "Invalid Signature");
        require(keccak256(bytes(files[userAddr])) != keccak256(bytes("")), "This user hasn't registered in the system");
        files[userAddr] = "";
        require(keccak256(bytes(files[userAddr])) == keccak256(bytes("")), "failed to remove user");
        return 0;
    }

    function updateHash(address userAddr, string memory merkleHash, signature memory signArr) public _OwnerOnly returns (uint) {
        require(VerifyMessage(signArr.hashedMessage, signArr.v, signArr.r, signArr.s) == userAddr, "Invalid Signature");
        files[userAddr] = merkleHash;
        require(keccak256(bytes(files[userAddr])) == keccak256(bytes(merkleHash)), "failed to update file merkle hash");
        return 0;
    }

    function addPerm(address filesOwnerAddr, permInfo memory permInfoUser, signature memory signArr) public _OwnerOnly returns (uint) {
        require(VerifyMessage(signArr.hashedMessage, signArr.v, signArr.r, signArr.s) == filesOwnerAddr, "Invalid Signature");
        uint256 permListLength = filesPerm[filesOwnerAddr][permInfoUser.permUserAddr].length;
        filesPerm[filesOwnerAddr][permInfoUser.permUserAddr].push(permInfoUser);
        require(filesPerm[filesOwnerAddr][permInfoUser.permUserAddr].length == permListLength + 1, "failed to update add permission");
        return 0;
    }

    function addPerm(address filesOwnerAddr, permInfo[] memory permInfoUserList, signature memory signArr) public _OwnerOnly returns (uint) {
        require(VerifyMessage(signArr.hashedMessage, signArr.v, signArr.r, signArr.s) == filesOwnerAddr, "Invalid Signature");
        for(uint i=0; i<permInfoUserList.length; i++) {
            addPerm(filesOwnerAddr, permInfoUserList[i], signArr);
        }
        return permInfoUserList.length;
    }

    function removePerm(address filesOwnerAddr, permInfo memory permInfoUser, signature memory signArr) public _OwnerOnly returns (uint) {
        require(VerifyMessage(signArr.hashedMessage, signArr.v, signArr.r, signArr.s) == filesOwnerAddr, "Invalid Signature");
        uint256 permListLength = filesPerm[filesOwnerAddr][permInfoUser.permUserAddr].length;
        filesPerm[filesOwnerAddr][permInfoUser.permUserAddr].push(permInfoUser);
        require(filesPerm[filesOwnerAddr][permInfoUser.permUserAddr].length == permListLength + 1, "failed to update add permission");
        return 0;
    }

    function testSign(bytes memory strSign) external pure returns (bytes32) {
        return keccak256(strSign);
    }

    function testSign(string memory strSign) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(strSign));
    }
}
