pragma solidity ^0.6.0;

import "../utils/SafeERC20.sol";
import "../utils/IERC20.sol";

interface NebulasToken {
    function transferOut(IERC20 token, address recipient, uint256 amount) external returns (bool);
}

contract MultiManager {
    mapping(address => bool) public managers;
    uint256 public allManagers;

    mapping(bytes32 => address[]) public executors;
    mapping(bytes32 => mapping(address => bool)) public actions;

    event AddManager(address indexed newManager, address[] executor);
    event RemoveManager(address indexed manager, address[] executor);

    modifier isManager(address _account) {
        require(managers[_account], "isManager: Permission deny!");
        _;
    }

    function addManager(address[] memory _newManagers) external isManager(msg.sender) {
        bytes32 _flag = keccak256(abi.encodePacked(this.addManager.selector, _newManagers));
        require(!actions[_flag][msg.sender], "addManager: Has confirmed!");
        actions[_flag][msg.sender] = true;
        executors[_flag].push(msg.sender);
        if (executors[_flag].length > allManagers / 2) {
            for (uint256 _i = 0; _i < _newManagers.length; _i++) {
                _addManager(_newManagers[_i], executors[_flag]);
                for (uint256 _j = 0; _j < executors[_flag].length; _j++) {
                    actions[_flag][executors[_flag][_j]] = false;
                }
            }
            delete executors[_flag];
        }
    }

    function removeManager(address[] memory _managers) external isManager(msg.sender) {
        bytes32 _flag = keccak256(abi.encodePacked(this.removeManager.selector, _managers));
        require(!actions[_flag][msg.sender], "removeManager: Has confirmed!");
        actions[_flag][msg.sender] = true;
        executors[_flag].push(msg.sender);
        if (executors[_flag].length > allManagers / 2) {
            for (uint256 _i = 0; _i < _managers.length; _i++) {
                _removeManager(_managers[_i], executors[_flag]);
                for (uint256 _j = 0; _j < executors[_flag].length; _j++) {
                    actions[_flag][executors[_flag][_j]] = false;
                }
            }
            delete executors[_flag];
        }
    }

    function _addManager(address _newManager, address[] memory _executors) internal {
        require(!managers[_newManager], "_addManager: Account already exists!");
        managers[_newManager] = true;
        allManagers += 1;
        emit AddManager(_newManager, _executors);
    }

    function _removeManager(address _manager, address[] memory _executors) internal {
        require(allManagers > 1, "_removeManager: At least one manager!");
        require(managers[_manager], "_removeManager: Account does not exist!");
        managers[_manager] = false;
        allManagers -= 1;
        emit RemoveManager(_manager, _executors);
    }
}

contract nTokenController is MultiManager {
    using SafeERC20 for IERC20;
    bool private _initialized = false;

    event TransferOut(NebulasToken indexed nToken, address indexed recipient, uint256 indexed amount, IERC20 token);

    constructor(
        address[] memory _newManagers
    ) public {
        initialize(_newManagers);
    }

    /**
     * @dev For proxy.
     */
    function initialize(
        address[] memory _newManagers
    ) public {
        require(!_initialized, "initialize: Contract is already initialized!");
        require(_newManagers.length!=0, "initialize: At least one manager!");
        address[] memory _temp;
        for (uint256 _index = 0; _index < _newManagers.length; _index++) {
            _addManager(_newManagers[_index], _temp);
        }
        _initialized = true;
    }

    function transferOut(NebulasToken _nToken, IERC20 _token, address _recipient, uint256 _amount) external isManager(msg.sender) {
        bytes32 _flag = keccak256(abi.encodePacked(this.transferOut.selector, _recipient, _amount));
        require(!actions[_flag][msg.sender], "transferOut: Has confirmed!");
        actions[_flag][msg.sender] = true;
        executors[_flag].push(msg.sender);
        if (executors[_flag].length > allManagers / 2) {
            require(_nToken.transferOut(_token, _recipient, _amount), "transferOut: Multi control transfer out failed!");
            for (uint256 index = 0; index < executors[_flag].length; index++) {
                actions[_flag][executors[_flag][index]] = false;
            }
            delete executors[_flag];
        }

        emit TransferOut(_nToken, _recipient, _amount, _token);
    }
}

