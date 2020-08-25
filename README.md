## link-contract

### Install

```
~/$ git clone https://github.com/nebulasio/link-contract.git
~/$ cd ./link-contract
~/link-contract$ npm install
```

### Set config

```
~/link-contract$ mv .env.example .env
```

You need to edit the `.env` file with your local environment variables.


### Deploy

```
~/link-contract$ truffle migrate --network rinkeby[ropsten/kovan/mainnet/development]
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
		<td> 0x51253444A60aB482d800E759Bb2E8D37032F9298 </td>
	</tr>
	<tr>
		<td> nToken Controller Proxy </td>
		<td> 0x6364e47802AA278313c9Cb9BdF074d624b516bb9 </td>
	</tr>
	<tr>
		<td> Nebulas Staking </td>
		<td> 0xC903569CAF5c064b95a4230A8AfCc956d3563FFf </td>
	</tr>
	<tr>
		<td> Nebulas Staking Proxy </td>
		<td> 0x8F3dDFc523d56911BEDE3A10Dc3581E1238bFAca </td>
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
</table>
