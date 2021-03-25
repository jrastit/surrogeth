pragma solidity ^0.5.10;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract ForwarderRegistryERC20 {
    using SafeMath for uint256;

    constructor() public {}

    function () external payable {}

    event RelayLoggedERC20(address indexed _relayer, uint256 _fee, address _erc20Address);
    event RelayerLocatorSetERC20(address indexed _relayer, address _erc20Address);

    event RelayLogged(address indexed _relayer, uint256 _fee);
    event RelayerLocatorSet(address indexed _relayer);

    /**
     * Information that allows clients to reach a relayer. Not all relayers here will have a locator
     */
    struct RelayerLocator {
        string locator;     // i.e. Tor or IP address
        string locatorType; // i.e. 'tor' or 'ip'
    }
    mapping(address => RelayerLocator) public relayerToLocator;

    struct FeeAgg {
        uint256 feeSum;
        uint256 feeCount;
    }
    mapping(address => FeeAgg) public relayerToFeeAgg;
    mapping(address => mapping(address => FeeAgg)) public relayerToFeeAggERC20;


    /**
     * Dynamic list of relayers. Client code is expected to use these lists to enumerate relayers or check for
     * their presence.
     */
    struct Relayers {
        uint256 count;
        mapping(uint256 => address) list;  // for enumeration
        mapping(address => bool) set;      // for checking membership
    }

    enum RelayersType {
        All,
        WithLocator
    }

    // TODO: rename to 'relayers'. To contrast with 'broadcasters'
    Relayers public allRelayers;
    mapping(address => Relayers) public allRelayersERC20;

    // TODO: rename to 'broadcasters'
    Relayers public locatorRelayers; // i.e. relayers with a locator. expected to be a subset of allRelayers
    mapping(address => Relayers) public locatorRelayersERC20; // i.e. relayers with a locator. expected to be a subset of allRelayers

    function _relayCallERC20(
        address _applicationContract,
        bytes memory _encodedPayload,
        address _erc20Address
    ) internal returns (uint256 fee) {
        IERC20 erc20Contract = IERC20(_erc20Address);
        // fee calculated by the increase in balance of this contract
        uint256 prevBalance = erc20Contract.balanceOf(address(this));
        (bool success,) = _applicationContract.call(_encodedPayload);
        require(success, "Forwarder ERC20: failure calling application contract");
        uint256 finalBalance = erc20Contract.balanceOf(address(this));

        if (finalBalance > prevBalance) {
            fee = finalBalance.sub(prevBalance);
        } else {
            fee = 0;
        }

        return fee;
    }

    function _relayCall(
        address _applicationContract,
        bytes memory _encodedPayload
    ) internal returns (uint256 fee) {
        // fee calculated by the increase in balance of this contract
        uint256 prevBalance = address(this).balance;
        (bool success,) = _applicationContract.call(_encodedPayload);
        require(success, "Forwarder: failure calling application contract");
        uint256 finalBalance = address(this).balance;

        if (finalBalance > prevBalance) {
            fee = finalBalance.sub(prevBalance);
        } else {
            fee = 0;
        }

        return fee;
    }

    /**
     * Calls an application contract and updates registry accordingly. It's assumed that the
     * application contract sends back any fees to this contract
     *
     * @param _applicationContract The application contract to call
     * @param _encodedPayload Payload to call _applicationContract with. Must be encoded as with
     *                        abi.encodePacked to properly work with .call
     */
    function relayCallERC20(
        address _applicationContract,
        bytes calldata _encodedPayload,
        address _erc20Address
    ) external {

        require(tx.origin == msg.sender, "Forwarder: cannot relay calls from another contract");

        uint256 fee = _relayCallERC20(_applicationContract, _encodedPayload, _erc20Address);

        address payable relayer = msg.sender;
        if (fee > 0) {
            IERC20 erc20Contract = IERC20(_erc20Address);
            erc20Contract.transfer(relayer, fee);
        }
        _logRelayERC20(relayer, fee, _erc20Address);
    }



    /**
     * Calls an application contract and updates registry accordingly. It's assumed that the
     * application contract sends back any fees to this contract
     *
     * @param _applicationContract The application contract to call
     * @param _encodedPayload Payload to call _applicationContract with. Must be encoded as with
     *                        abi.encodePacked to properly work with .call
     */
    function relayCall(
        address _applicationContract,
        bytes calldata _encodedPayload
    ) external {

        require(tx.origin == msg.sender, "Forwarder: cannot relay calls from another contract");

        uint256 fee = _relayCall(_applicationContract, _encodedPayload);

        address payable relayer = msg.sender;
        if (fee > 0) {
            relayer.transfer(fee);
        }
        _logRelay(relayer, fee);
    }





    function _getRelayersERC20(RelayersType _type, address _erc20Address) internal view returns (Relayers storage) {
        if (_type == RelayersType.WithLocator) {
            return locatorRelayersERC20[_erc20Address];
        } else {
            return allRelayersERC20[_erc20Address];
        }
    }

    function _getRelayers(RelayersType _type) internal view returns (Relayers storage) {
        if (_type == RelayersType.WithLocator) {
            return locatorRelayers;
        } else {
            return allRelayers;
        }
    }

    /**
     * Getter for num relayers of a given RelayersType
     */
     function relayersCountERC20(RelayersType _type, address _erc20Address) external view returns (uint256) {
         Relayers storage relayers = _getRelayersERC20(_type, _erc20Address);
         return relayers.count;
     }

    function relayersCount(RelayersType _type) external view returns (uint256) {
        Relayers storage relayers = _getRelayers(_type);
        return relayers.count;
    }

    /**
     * Getter for relayer address by index of a given RelayersType.
     */
    function relayerByIdxERC20(RelayersType _type, uint256 _idx, address _erc20Address) external view returns (address) {
        Relayers storage relayers = _getRelayersERC20(_type, _erc20Address);
        return relayers.list[_idx];
    }

    function relayerByIdx(RelayersType _type, uint256 _idx) external view returns (address) {
        Relayers storage relayers = _getRelayers(_type);
        return relayers.list[_idx];
    }

    /**
     * Getter for existence boolean of relayer address of a given RelayersType
     */
     function relayerExistsERC20(RelayersType _type, address _relayer, address _erc20Address) external view returns (bool) {
         Relayers storage relayers = _getRelayersERC20(_type, _erc20Address);
         return relayers.set[_relayer];
     }

    function relayerExists(RelayersType _type, address _relayer) external view returns (bool) {
        Relayers storage relayers = _getRelayers(_type);
        return relayers.set[_relayer];
    }

    function _attemptAddRelayerERC20(RelayersType _type, address _relayer, address _erc20Address) internal {
        Relayers storage relayers = _getRelayersERC20(_type, _erc20Address);
        // Don't do anything if the relayer's already been added
        if (!relayers.set[_relayer]) {
            relayers.set[_relayer] = true;
            relayers.list[relayers.count] = _relayer;
            relayers.count += 1;
        }
    }

    function _attemptAddRelayer(RelayersType _type, address _relayer) internal {
        Relayers storage relayers = _getRelayers(_type);
        // Don't do anything if the relayer's already been added
        if (!relayers.set[_relayer]) {
            relayers.set[_relayer] = true;
            relayers.list[relayers.count] = _relayer;
            relayers.count += 1;
        }
    }

    /**
     * Updates reputation maps for the specified relayer and burn value. If this is the first time we're
     * seeing the specified relayer, also adds the relayer to relevant lists.
     *
     * @param _relayer The relayer whose reputation to update
     */
     function _logRelayERC20(address _relayer, uint256 _fee, address _erc20Address) internal {
         _attemptAddRelayerERC20(RelayersType.All, _relayer, _erc20Address);

         FeeAgg memory feeAgg = relayerToFeeAggERC20[_erc20Address][_relayer];
         relayerToFeeAggERC20[_erc20Address][_relayer] = FeeAgg(
             feeAgg.feeSum + _fee,
             feeAgg.feeCount + 1
         );

         emit RelayLoggedERC20(_relayer, _fee, _erc20Address);
     }

    function _logRelay(address _relayer, uint256 _fee) internal {
        _attemptAddRelayer(RelayersType.All, _relayer);

        FeeAgg memory feeAgg = relayerToFeeAgg[_relayer];
        relayerToFeeAgg[_relayer] = FeeAgg(
            feeAgg.feeSum + _fee,
            feeAgg.feeCount + 1
        );

        emit RelayLogged(_relayer, _fee);
    }

    /**
     * Updates reputation maps for the specified relayer and burn value. If this is the first time we're
     * seeing the specified relayer, also adds the relayer to relevant lists.
     *
     * @param _relayer The relayer whose reputation to update
     */


    /**
     * Updates the locator for the specified relayer address. Can only be called from that address (to prevent
     * anyone from griefing a relayer by changing its locator). Frontrunners can use this method to broadcast
     * a locator on which they can be reached.
     *
     * @param _relayer The relayer whose locator to update
     * @param _locator The new locator to set
     * @param _locatorType The locator type to use
     */
     function setRelayerLocatorERC20(address _relayer, string calldata _locator, string calldata _locatorType, address _erc20Address) external {
         require(_relayer == msg.sender, "Registry: can only set the locator for self");

         _attemptAddRelayerERC20(RelayersType.All, _relayer, _erc20Address);
         _attemptAddRelayerERC20(RelayersType.WithLocator, _relayer, _erc20Address);

         relayerToLocator[_relayer] = RelayerLocator(
             _locator,
             _locatorType
         );

         emit RelayerLocatorSetERC20(_relayer, _erc20Address);
     }
    function setRelayerLocator(address _relayer, string calldata _locator, string calldata _locatorType) external {
        require(_relayer == msg.sender, "Registry: can only set the locator for self");

        _attemptAddRelayer(RelayersType.All, _relayer);
        _attemptAddRelayer(RelayersType.WithLocator, _relayer);

        relayerToLocator[_relayer] = RelayerLocator(
            _locator,
            _locatorType
        );

        emit RelayerLocatorSet(_relayer);
    }


}
