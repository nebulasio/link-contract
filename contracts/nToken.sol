pragma solidity 0.6.10;

import "./utils/IERC20.sol";
import "./utils/SafeMath.sol";
import "./utils/Pausable.sol";
import "./utils/SafeERC20.sol";
import "./utils/ReentrancyGuard.sol";


contract NebulasToken is Pausable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    mapping (address => uint256) private _balances;
    uint256 private _totalSupply;

    address public nTokenController;
    IERC20 public underlyingToken;
    address public feeRecipient;

    bool private _initialized = false;
    IChi public constant chi = IChi(0x0000000000004946c0e9F43F4Dee607b0eF1fA1c);

    // Record the addresses of the ethereum chain corresponding to the nebulas chain.
    // eg: account(at ethereum) => account(at nebulas).
    mapping (address => string) public mappingAccounts;
    // Record the addresses of the nebulas chain corresponding to the ethereum chain.
    // eg: account(at nebulas) => account(at ethereum).
    mapping (string => address) public convertMappingAccounts;

    event UpdateController(address indexed oldController, address indexed newController);

    event NewMappingAccount(address indexed underlyingToken, address indexed spender, string recipient);
    event UpdateMappingAccount(address indexed spender, string newRecipient,  string oldRecipient, address underlyingToken);

    event Staked(address indexed ethereumSpender, uint256 indexed amount, string nebulasRecipient);
    event Refund(address indexed ethereumRecipient, uint256 indexed amount, string nebulasSpender, uint256 fee);
    event UpdateFeeRecipient(address indexed oldFeeRecipient, address indexed newFeeRecipient);


    modifier onlyController(address _caller) {
        require(_caller == nTokenController, "onlyController: Caller is not the controller!");
        _;
    }

    modifier checkNebulasAccount(string memory _nebulasAccount) {
        bytes memory accountBytes = bytes(_nebulasAccount);
        require(
            accountBytes[0] == 0x6e && accountBytes[1] == 0x31,
            "checkNebulasAccount: Invalid nebulas account address!"
            );
        require(accountBytes.length == 35, "checkNebulasAccount: Invalid nebulas account length!");
        _;
    }

    modifier discountCHI {
        uint256 gasStart = gasleft();
        _;
        uint256 gasSpent = 21000 + gasStart - gasleft() + 16 *  msg.data.length;
        chi.freeFromUpTo(msg.sender, (gasSpent + 14154) / 41947);
    }

    /**
     * @dev Sets the values for {underlyingToken}, {nTokenController} and {_owner}.
     */
    constructor(
        address _newOwner,
        IERC20 _underlyingToken,
        address _nTokenController,
        address _feeRecipient
    ) public {
        initialize(_newOwner, _underlyingToken, _nTokenController, _feeRecipient);
    }

    /**
     * @dev For proxy.
     */
    function initialize(
        address _newOwner,
        IERC20 _underlyingToken,
        address _nTokenController,
        address _feeRecipient
    ) public {
        require(!_initialized, "initialize: Contract is already initialized!");

        require(
            _newOwner != address(0),
            "initialize: New owner is the zero address!"
        );
        require(
            _feeRecipient != address(0),
            "initialize: Fee recipient is the zero address!"
        );

        underlyingToken = _underlyingToken;
        nTokenController = _nTokenController;
        feeRecipient = _feeRecipient;
        _status = 1;

        _owner = _newOwner;
        emit OwnershipTransferred(address(0), _newOwner);

        _initialized = true;
    }

    /**
     * @dev Update controller contract.
     */
    function updateController(address _newController) external onlyOwner {
        require(_newController != nTokenController, "updateController: The same controller!");
        address _oldController = nTokenController;
        nTokenController = _newController;
        emit UpdateController(_oldController, _newController);
    }

    /**
     * @dev When stakes underlying token, recording staker on the ethereum, and recipient on the nebulas.
     * @param _recipient Account that user will get asset on the nebulas chain.
     */
    function setMappingAccount(
        string memory _recipient
    ) internal {
        if (keccak256(abi.encodePacked(mappingAccounts[msg.sender])) == keccak256(abi.encodePacked(""))) {
            mappingAccounts[msg.sender] = _recipient;
            convertMappingAccounts[_recipient] = msg.sender;
            emit NewMappingAccount(address(underlyingToken), msg.sender, _recipient);
        } else if (keccak256(abi.encodePacked(mappingAccounts[msg.sender])) != keccak256(abi.encodePacked(_recipient))){
            updateMappingAccount(_recipient);
        }
    }

    /**
     * @dev User who has staked wants to change recipient address on the nebulas chain.
     * @param _newRecipient New account that user will get asset on the nebulas chain.
     */
    function updateMappingAccount(
        string memory _newRecipient
    ) public checkNebulasAccount(_newRecipient) {
        require(
            keccak256(abi.encodePacked(mappingAccounts[msg.sender])) != keccak256(abi.encodePacked("")),
            "updateMappingAccount: Do not have staked!"
        );

        string memory _oldRecipient = mappingAccounts[msg.sender];
        mappingAccounts[msg.sender] = _newRecipient;
        delete convertMappingAccounts[_oldRecipient];
        convertMappingAccounts[_newRecipient] = msg.sender;
        emit UpdateMappingAccount(msg.sender, _oldRecipient, _newRecipient, address(underlyingToken));
    }

    /**
     * @dev Based on the underlying token and account{_spender} on the ethereum,
     *      gets recipient account on the nebulas chain.
     */
    function getMappingAccount(
        address _spender
    ) external view returns (string memory) {
        return mappingAccounts[_spender];
    }

    /**
     * @dev User stakes their assets on the ethereum, expects to get corresponding assets on the nebulas chain.
     * @param _amount Amount to stake on the ethereum.
     * @param _nebulasAccount Account address on the nubelas chain to get asset.
     */
    function stake(
        uint256 _amount,
        string memory _nebulasAccount
    ) external
        whenNotPaused
        nonReentrant
        checkNebulasAccount(_nebulasAccount)
        discountCHI
        returns (bool)
    {
        require(_amount > 0, "stake: Staking amount should be greater than 0!");
        uint256 _originalBalance = underlyingToken.balanceOf(address(this));
        underlyingToken.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _currentBalance = underlyingToken.balanceOf(address(this));
        uint256 _actualStakeAmount = _currentBalance.sub(_originalBalance);

        setMappingAccount(_nebulasAccount);
        _balances[msg.sender] = _balances[msg.sender].add(_actualStakeAmount);
        _totalSupply = _totalSupply.add(_actualStakeAmount);

        emit Staked(msg.sender, _actualStakeAmount, _nebulasAccount);
        return true;
    }

    /**
     * @dev Returns asset on the ethereum to user.
     * @param _nebulasAccount Account on the nebulas chain that requests for a refund.
     * @param _recipient Account on the ethereum to get assets returned.
     * @param _amount Amount to return to user.
     * @param _fee Charge some fee when refunding.
     */
    function refund(
        string memory _nebulasAccount,
        address _recipient,
        uint256 _amount,
        uint256 _fee
    ) external onlyOwner nonReentrant checkNebulasAccount(_nebulasAccount) discountCHI returns (bool) {
        require(
            convertMappingAccounts[_nebulasAccount] == _recipient,
            "refund: Mismatch accounts!"
        );
        require(_amount > 0, "refund: Refund amount should be greater than 0!");
        require(
            keccak256(abi.encodePacked(mappingAccounts[_recipient])) != keccak256(abi.encodePacked("")),
            "refund: Do not have staked!"
        );
        require(_balances[_recipient] >= _amount.add(_fee), "refund: Insufficient balance!");

        _balances[_recipient] = _balances[_recipient].sub(_amount).sub(_fee);
        _totalSupply = _totalSupply.sub(_amount).sub(_fee);
        underlyingToken.safeTransfer(_recipient, _amount);
        underlyingToken.safeTransfer(feeRecipient, _fee);

        emit Refund(_recipient, _amount, _nebulasAccount, _fee);

        return true;
    }

    /**
     * @dev Reset the charging fee account.
     */
    function updateFeeRecipient(
        address _newFeeRecipient
    ) external onlyController(msg.sender) returns (bool) {
        require(_newFeeRecipient != feeRecipient, "updateFeeRecipient: New fee recipient is the same!");
        address _oldFeeRecipient = feeRecipient;
        feeRecipient = _newFeeRecipient;

        emit UpdateFeeRecipient(_oldFeeRecipient, _newFeeRecipient);
        return true;
    }

    /**
     * @dev Under some unexpected cases, transfer token out.
     *     eg: Someone transfers other token rather than underlying token into this contract,
     *         The nebulas community can transfer these token out after consultation and agreement.
     */
    function transferOut(
        IERC20 _token,
        address _recipient,
        uint256 _amount
    ) external onlyController(msg.sender) nonReentrant whenPaused returns (bool) {
        uint256 _totalBalance = _token.balanceOf(address(this));
        require(_amount <= _totalBalance, "transferOut: Insufficient balance!");
        _token.safeTransfer(_recipient, _amount);

        return true;
    }

    /**
     * @dev Current totally staking.
     */
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev Returns the amount of tokens owned by `_account`.
     */
    function balanceOf(address _account) external view returns (uint256) {
        return _balances[_account];
    }
}
