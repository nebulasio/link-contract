## link-contract

[![built-with openzeppelin](https://img.shields.io/badge/built%20with-OpenZeppelin-3677FF)](https://docs.openzeppelin.com/)

### Install

```
~/$ git clone https://github.com/nebulasio/link-contract.git
~/$ cd ./link-contract
~/link-contract$ npm install
```

And also need to install `truffle`:

```
npm install -g truffle
```

### Set config

```
~/link-contract$ mv .example.env .env
```

You need to edit the `.env` file with your local environment variables.

```
CONTRACT_OWNER: Owner account of the Nebulas staking contract.
CONTROLLER_MANAGERS: All original managers.
FEE_RECIPIENT: Account to receive fee.
INFURA_APIKEY: Infura key.
PRIVATE_KEYS: The private key of the deployer.
PROXY_ADMIN: Account of proxy administrator.
```

### Compile

```
~/link-contract$ truffle compile
```


### Deploy on the production environment.

```
~/link-contract$ truffle migrate --network rinkeby[/kovan/mainnet]
```

### Deploy on the local net

At first, just runs a local node, you can use package named `ganache-cli` or [ganache application](https://www.trufflesuite.com/ganache). At here, just use package.

```
~/$ npm install -g ganache-cli
~/$ ganache-cli --port=7545 --gasLimit=8000000 --accounts=10 --defaultBalanceEther=1000
```

*Need to open a new terminal to start the above commands.*

Go back to the original terminal:

```
~/link-contract$ truffle migrate --network development
```

### Contracts on the testnet: Ropsten/Kovan/Rinkeby(08-25)

<table>
	<tr>
        <th>Contract Name</th>
    	<th>Contract Address</th>
	</tr>
	<tr>
		<td> Nebulas Tether Token </td>
		<td> 0x53FAE6878086eA050cB0eB6322bD425C1774F675 </td>
	</tr>
	<tr>
		<td> nToken Controller </td>
		<td> 0x4357d9ae483C88a1Da6b75fa8575b99648AA2586 </td>
	</tr>
	<tr>
		<td> nToken Controller Proxy </td>
		<td> 0x7e966442c70be4376c780B76A1c053a25051bB1D </td>
	</tr>
	<tr>
		<td> Nebulas Staking </td>
		<td> 0xc8CAcEAcCD5742d394A51A0bEd2B305D4390CA8D </td>
	</tr>
	<tr>
		<td> Nebulas Staking Proxy </td>
		<td> 0x6f0116ddF2764c119e846b3292Be06Aa7Ca5522D </td>
	</tr>
</table>

<table>
    <tr>
        <th> Contract Roles </th>
    	<th> Roles Address </th>
	</tr>
    <tr>
		<td> Controller Manager </td>
		<td> 0x0293Cd26bD96AF2366cc0bF1af70B7530b377b55</td>
	</tr>
	<tr>
		<td> Proxy Admin </td>
		<td> 0xa8d60176bdcd019242Bd942bcf8E389693D0bD80</td>
	</tr>
	<tr>
		<td> Nebulas Staking Owner </td>
		<td> 0x3A40066D1dC27d14C721e4135cF02DCb20C9AFE0</td>
	</tr>
	<tr>
		<td> Nebulas Staking Fee Recipient </td>
		<td> 0x3A40066D1dC27d14C721e4135cF02DCb20C9AFE0</td>
	</tr>
</table>
