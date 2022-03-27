import React, { Component } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Table from 'react-bootstrap/Table';
import Voting from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";
import "./App.css";

class App extends Component {
  state = { web3: null, accounts: null, status: null,
    contract: null, proposals: null, step: null, whitelist: null };

  componentWillMount = async () => {
    try {
      // Récupérer le provider web3
      const web3 = await getWeb3();
  
      // Utiliser web3 pour récupérer les comptes de l’utilisateur (MetaMask dans notre cas) 
      const accounts = await web3.eth.getAccounts();

      // Récupérer l’instance du smart contract Voting avec web3 et les informations du déploiement du fichier (client/src/contracts/Voting.json)
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Voting.networks[networkId];
  
      const instance = new web3.eth.Contract(
        Voting.abi,
        deployedNetwork.address
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.runInit);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Non-Ethereum browser detected. Can you please try to install MetaMask before starting.`,
      );
      console.error(error);
    }
  };

  runInit = async() => {
    const { contract } = this.state;
  
    // récupérer la liste des propositions
    const proposals = await contract.methods.getProposals().call();
    const status = await contract.methods.getStatus().call();
    const whitelist = await contract.methods.getWhitelist().call();
    
    let step, winningProposal;
    switch(status) {
    case '0':
      step = 'Enregistrement des utilisateurs';
      break;
    case '1':
      step = 'Début de l\'enregistrement des propositions';
      break;
    case '2':
      step = 'Fin  de l\'enregistrement des propositions';
      break;
    case '3':
      step = 'Début de la session de vote';
      break;
    case '4':
      step = 'Fin de la session de vote';
      break;
    case '5':
      if (proposals.length > 0) {
        winningProposal = await contract.methods.getWinningProposal().call();
      }
      step = 'Résultat des votes';
      break;
    default:
      return 'Status invalide';
    }
    // Mettre à jour le state 
    this.setState({ proposals, step, whitelist, status, winningProposal });
  }; 

  // Enregistrement des électeurs
  whitelist = async() => {
    const { accounts, contract } = this.state;
    const address = this.address.value;
    
    // Interaction avec le smart contract pour ajouter un compte 
    await contract.methods.whitelist(address).send({from: accounts[0]});
    // Récupérer la liste des comptes autorisés
    this.runInit();
  }

  // Enregistrement de la proposition saisie par l'utilisateur 
  proposalsRegister = async() => {
    const { accounts, contract } = this.state;
    const submitProposal = this.proposal.value;
  
    // récupérer la liste des propositions
    await contract.methods.proposalRegister(submitProposal)
      .send({from: accounts[0]});
    this.runInit();
  }

  // Enregistrement des votes des utilisateurs
  voteRegister = async(proposalIndex) => {
    const { accounts, contract } = this.state;

    // récupérer la liste des propositions
    await contract.methods.voterRegister(proposalIndex).send({from: accounts[0]});
    // Mettre à jour le state 
    this.runInit();
  }

  // Mise à jour du statut de la session
  updateStatus = async() => {
    const { accounts, contract} = this.state;
    await contract.methods.updateStatus().send({from: accounts[0]});
    const status = await contract.methods.getStatus().call();
    if (status === '0') {
      await contract.methods.proposalsReset().send({from: accounts[0]});
      await contract.methods.whitelistReset().send({from: accounts[0]});
    }
    this.runInit();
  }
 

  render() {
    const { proposals, status, step, whitelist, accounts, winningProposal } = this.state;
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    let addCard, result, proposalList;
    if (status !== '0') {
      proposalList = 
      <div style={{display: 'flex', justifyContent: 'center'}}>
      <Card style={{ width: '50rem' }}>
        <Card.Header><strong>Liste des propositions</strong></Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Nombre de vote</th>
                    <th>Voter !</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals !== null && 
                    proposals.map((prop, index) => <tr><td>{prop.description}</td>
                    <td>{prop.voteCount}</td>
                    <td><Button disabled={status !== '3'} onClick={() => this.voteRegister(index)} variant="dark" > Ajouter </Button></td></tr>)
                  }
                </tbody>
              </Table>
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>
    </div>
    }
    if (status === '1') {
      addCard =
      <div style={{display: 'flex', justifyContent: 'center'}}>
      <Card style={{ width: '50rem' }}>
        <Card.Header><strong>Ajouter des propositions</strong></Card.Header>
        <Card.Body>
          <Form.Group controlId="formProposal">
            <Form.Control type="text" id="proposal"
            ref={(input) => { this.proposal = input }}
            />
          </Form.Group>
          <Button onClick={ this.proposalsRegister } variant="dark" > Ajouter </Button>
        </Card.Body>
      </Card>
      </div>;
    } else if (status === '0') {
      addCard =
      <div style={{display: 'flex', justifyContent: 'center'}}>
      <Card style={{ width: '50rem' }}>
        <Card.Header><strong>Ajouter des utilisateurs</strong></Card.Header>
        <Card.Body>
          <Form.Group controlId="formAddress">
            <Form.Control type="text" id="address"
            ref={(input) => { this.address = input }}
            />
          </Form.Group>
          <Button onClick={ this.whitelist } variant="dark" > Autoriser </Button>
        </Card.Body>
      </Card>
      </div>;
    } else if (status === '5'){
      result =
      <div style={{display: 'flex', justifyContent: 'center'}}>
      <Card style={{ width: '50rem' }}>
        <Card.Header><strong>La proposition gagnate est : </strong></Card.Header>
        <Card.Body>
        <h3 className="text-center">{winningProposal}</h3>
        </Card.Body>
      </Card>
      </div>;
    }
    return (
      <div className="App">
        <div>
            <h2 className="text-center">Système de vote</h2>
            <hr></hr>
            <br></br>
            <h3 className="text-center">{step}</h3>
        </div>
        {result}
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <Card style={{ width: '50rem' }}>
            <Card.Header><strong>Liste des utilisateurs</strong></Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>@</th>
                      </tr>
                    </thead>
                    <tbody>
                      {whitelist !== null && 
                        whitelist.map((address) => <tr><td>{address}</td></tr>)
                      }
                    </tbody>
                  </Table>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </div>
        {proposalList}
        <br></br>
        {addCard}
          <br></br>
          <div style={{display: 'flex', justifyContent: 'center'}}>
            <Button onClick={ this.updateStatus } variant="dark" > Etape suivante </Button>
          </div>
        <br></br>
      </div>
    );
  }
}

export default App;
