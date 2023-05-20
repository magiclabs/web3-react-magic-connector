"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MagicConnect = void 0;
const types_1 = require("@web3-react/types");
const magic_sdk_1 = require("magic-sdk");
function parseChainId(chainId) {
    return typeof chainId === "number"
        ? chainId
        : Number.parseInt(chainId, chainId.startsWith("0x") ? 16 : 10);
}
class MagicConnect extends types_1.Connector {
    constructor({ actions, options, onError }) {
        super(actions, onError);
        this.connectListener = ({ chainId }) => {
            this.actions.update({ chainId: parseChainId(chainId) });
        };
        this.disconnectListener = (error) => {
            var _a;
            this.actions.resetState();
            if (error)
                (_a = this.onError) === null || _a === void 0 ? void 0 : _a.call(this, error);
        };
        this.chainChangedListener = (chainId) => {
            this.actions.update({ chainId: parseChainId(chainId) });
        };
        this.accountsChangedListener = (accounts) => {
            if (accounts.length === 0) {
                this.actions.resetState();
            }
            else {
                this.actions.update({ accounts });
            }
        };
        this.options = options;
        this.initializeMagicInstance();
    }
    setEventListeners() {
        if (this.provider) {
            this.provider.on("connect", this.connectListener);
            this.provider.on("disconnect", this.disconnectListener);
            this.provider.on("chainChanged", this.chainChangedListener);
            this.provider.on("accountsChanged", this.accountsChangedListener);
        }
    }
    removeEventListeners() {
        if (this.provider) {
            this.provider.off("connect", this.connectListener);
            this.provider.off("disconnect", this.disconnectListener);
            this.provider.off("chainChanged", this.chainChangedListener);
            this.provider.off("accountsChanged", this.accountsChangedListener);
        }
    }
    initializeMagicInstance(desiredChainIdOrChainParameters) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("initializeMagicInstance");
            // Extract apiKey and networkOptions from options
            const { apiKey, networkOptions } = this.options;
            // Create a new Magic instance with either the desired ChainId or ChainParameters
            // or with the networkOptions if no parameters were passed to the function
            this.magic = new magic_sdk_1.Magic(apiKey, {
                network: desiredChainIdOrChainParameters
                    ? {
                        rpcUrl: desiredChainIdOrChainParameters.rpcUrls[0],
                        chainId: desiredChainIdOrChainParameters.chainId,
                    }
                    : {
                        rpcUrl: networkOptions.rpcUrl,
                        chainId: networkOptions.chainId,
                    },
            });
            // Set the chainId. If no chainId was passed as a parameter, use the chainId from networkOptions
            this.chainId =
                (desiredChainIdOrChainParameters === null || desiredChainIdOrChainParameters === void 0 ? void 0 : desiredChainIdOrChainParameters.chainId) || networkOptions.chainId;
            // Set the provider to the rpcProvider of the new Magic instance
            this.provider = this.magic.rpcProvider;
        });
    }
    handleActivation(desiredChainIdOrChainParameters) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            console.log("handleActivation");
            const cancelActivation = this.actions.startActivation();
            try {
                // Initialize Magic if necessary
                if (this.chainId === undefined ||
                    this.chainId !== (desiredChainIdOrChainParameters === null || desiredChainIdOrChainParameters === void 0 ? void 0 : desiredChainIdOrChainParameters.chainId)) {
                    yield this.initializeMagicInstance(desiredChainIdOrChainParameters);
                }
                // Check if the user is logged in
                const isLoggedIn = yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.user.isLoggedIn());
                console.log("handleActivation isLoggedIn: ", isLoggedIn);
                // If the user is not logged in, connect with the Magic UI
                if (!isLoggedIn) {
                    yield ((_b = this.magic) === null || _b === void 0 ? void 0 : _b.wallet.connectWithUI());
                }
                // Get the provider and set up event listeners (metamask)
                // Without this step, connecting to metamask will not work
                this.provider = yield ((_c = this.magic) === null || _c === void 0 ? void 0 : _c.wallet.getProvider());
                // Handle network switch for metamask because it uses different provider
                // This throws error when connected with Magic because "wallet_switchEthereumChain" does not exist on magic provider
                // Calling any magic.user or magic.wallet method will throw error "User denied account access" when connected with metamask
                // const wallet = await this.magic?.wallet.getInfo()
                // if (wallet?.walletType === "metamask") {
                try {
                    const desiredChainIdHex = `0x${desiredChainIdOrChainParameters.chainId.toString(16)}`;
                    this.provider.request({
                        method: "wallet_switchEthereumChain",
                        params: [{ chainId: desiredChainIdHex }],
                    });
                }
                catch (error) {
                    console.log("wallet_switchEthereumChain: ", error);
                }
                this.setEventListeners();
                console.log("handleActivation provider", this.provider);
                // Get the current chainId and accounts
                const [chainId, accounts] = yield Promise.all([
                    this.provider.request({ method: "eth_chainId" }),
                    this.provider.request({ method: "eth_accounts" }),
                ]);
                console.log("chainId: ", parseChainId(chainId));
                console.log("accounts: ", accounts);
                // Update the state with the current chainId and accounts
                this.actions.update({ chainId: parseChainId(chainId), accounts });
            }
            catch (error) {
                cancelActivation();
                this.eagerConnection = undefined;
                throw error;
            }
        });
    }
    connectEagerly() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            console.log("connectEagerly");
            const isLoggedIn = yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.user.isLoggedIn());
            console.log("connectEagerly isLoggedIn: ", isLoggedIn);
            if (!isLoggedIn)
                return;
            yield this.handleActivation();
        });
    }
    activate(desiredChainIdOrChainParameters) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.handleActivation(desiredChainIdOrChainParameters);
        });
    }
    deactivate() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.user.logout());
            this.eagerConnection = undefined;
            this.actions.resetState();
            this.removeEventListeners();
        });
    }
}
exports.MagicConnect = MagicConnect;
