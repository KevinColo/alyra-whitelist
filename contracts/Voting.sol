// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Voting is Ownable {
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    struct Proposal {
        string description;
        uint voteCount;
    }
   
    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }
   
    uint proposalId = 1;
    mapping(address => Voter) private _whitelist;
    address[] public addressUsed;
    Proposal[] public proposals;
    WorkflowStatus public status = WorkflowStatus.RegisteringVoters;
    uint public winningProposalId;
   
    event VoterRegistered(address voterAddress);
    event ProposalRegistered(uint proposalId);
    event Voted(address voter, uint proposalId);
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
   
    //modifier
    modifier isRegisteringVotersStatus() {
        require (status == WorkflowStatus.RegisteringVoters);
        _;
    }

    modifier isRegisteredUser(address _address) {
        require (_whitelist[_address].isRegistered);
        _;
    }
   
    //functions  
    function whitelist(address _address) public onlyOwner isRegisteringVotersStatus {      
        _whitelist[_address] = Voter(true, false, 0);
        addressUsed.push(_address);

        emit VoterRegistered(_address);
    }

    // ajout migrate pour deploy
    function getWhitelist() public view returns(address[] memory) {
       return addressUsed;
    }

    function proposalsReset() public onlyOwner isRegisteringVotersStatus{
        delete proposals;
    }

    function whitelistReset() public onlyOwner isRegisteringVotersStatus{
        for(uint i=0; i<addressUsed.length; i++){
            _whitelist[addressUsed[i]] = Voter(false, false, 0);
        }
        delete addressUsed;
    }
   
    function voterRegister(uint _proposalId) public isRegisteredUser(msg.sender) {
        require (status == WorkflowStatus.VotingSessionStarted
            && !_whitelist[msg.sender].hasVoted);
        _whitelist[msg.sender].hasVoted = true;
        _whitelist[msg.sender].votedProposalId = _proposalId;
       
        proposals[_proposalId].voteCount++;
       
        if (proposals[_proposalId].voteCount > proposals[winningProposalId].voteCount) {
            winningProposalId = _proposalId;
        }
        emit Voted(msg.sender, _proposalId);
    }

    function getWinningProposal() public view returns(string memory) {
        return proposals[winningProposalId].description;
    }
   
    // Registering proposals of voters 
    function proposalRegister(string memory _description) public isRegisteredUser(msg.sender) {
        require (status == WorkflowStatus.ProposalsRegistrationStarted);
        require (proposals.length < 10000);
        proposals.push(Proposal(_description, 0));
        emit ProposalRegistered(proposals.length);
    }

    function getProposals() public view returns(Proposal[] memory) {
       return proposals;
    }
   
   // update status 
    function updateStatus() public onlyOwner {
        status = uint8(status) == 5 ? WorkflowStatus.RegisteringVoters : WorkflowStatus(uint8(status)+1);
        uint8 idPreviousStatus = uint(status) == 0 ? 5 : (uint8(status)-1);
        if (uint8(status) == 0) {
            proposalsReset();
            whitelistReset();
        }
        emit WorkflowStatusChange(WorkflowStatus(idPreviousStatus), status);
    }

    function getStatus() public view returns(WorkflowStatus) {
       return status;
    }
}