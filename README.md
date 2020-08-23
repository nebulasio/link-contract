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
