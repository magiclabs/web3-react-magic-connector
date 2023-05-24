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
        // Initializing Magic Instance in constructor otherwise it will be undefined when calling connectEagerly
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
            this.provider.removeListener("connect", this.connectListener);
            this.provider.removeListener("disconnect", this.disconnectListener);
            this.provider.removeListener("chainChanged", this.chainChangedListener);
            this.provider.removeListener("accountsChanged", this.accountsChangedListener);
        }
    }
    initializeMagicInstance(desiredChainIdOrChainParameters) {
        if (typeof window !== "undefined") {
            console.log("INITIALIZE MAGIC INSTANCE");
            // Extract apiKey and networkOptions from options
            const { apiKey, networkOptions } = this.options;
            // Create a new Magic instance with desired ChainId for network switching
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
        }
    }
    // Get the provider from magicInstance
    getProvider(magicInstance) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = yield magicInstance.wallet.getProvider();
            console.log("provider", provider);
            return provider;
        });
    }
    // Check if the user is logged to determine whether to
    // display magic connect login ui
    checkLoggedInStatus() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Not sure if this is supposed to be used with Magic Connect
                const isLoggedIn = yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.user.isLoggedIn());
                console.log("isLoggedIn: ", isLoggedIn);
                return isLoggedIn;
            }
            catch (error) {
                console.error("Error checking logged in status:", error);
                return false;
            }
        });
    }
    handleActivation(desiredChainIdOrChainParameters) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            console.log("HANDLE ACTIVATION");
            const cancelActivation = this.actions.startActivation();
            try {
                // Check if the user is logged in
                const isLoggedIn = yield this.checkLoggedInStatus();
                // Initialize the magic instance
                yield this.initializeMagicInstance(desiredChainIdOrChainParameters);
                // If the user is not logged in, connect with the Magic UI
                if (!isLoggedIn) {
                    yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.wallet.connectWithUI());
                }
                // Get the provider (metamask) and set up event listeners
                // Without this step, connecting to metamask will not work
                this.provider = yield this.getProvider(this.magic);
                this.setEventListeners();
                // Handle for metamask
                // Calling any magic.user or magic.wallet method will throw error "User denied account access" when connected with metamask
                // const wallet = await this.magic?.wallet.getInfo()
                if (this.provider &&
                    "isMetaMask" in this.provider &&
                    desiredChainIdOrChainParameters) {
                    try {
                        const desiredChainIdHex = `0x${desiredChainIdOrChainParameters.chainId.toString(16)}`;
                        yield this.provider.request({
                            method: "wallet_switchEthereumChain",
                            params: [{ chainId: desiredChainIdHex }],
                        });
                    }
                    catch (error) {
                        console.log("wallet_switchEthereumChain: ", error);
                    }
                }
                // Get the current chainId and account from the provider
                const [chainId, accounts] = yield Promise.all([
                    (_b = this.provider) === null || _b === void 0 ? void 0 : _b.request({ method: "eth_chainId" }),
                    (_c = this.provider) === null || _c === void 0 ? void 0 : _c.request({ method: "eth_accounts" }),
                ]);
                console.log("chainId: ", parseChainId(chainId));
                console.log("accounts: ", accounts);
                // Update the connector state with the current chainId and account
                this.actions.update({ chainId: parseChainId(chainId), accounts });
            }
            catch (error) {
                cancelActivation();
                throw error;
            }
        });
    }
    // "autoconnect"
    connectEagerly() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("CONNECT EAGERLY");
            const isLoggedIn = yield this.checkLoggedInStatus();
            if (!isLoggedIn)
                return;
            yield this.handleActivation();
        });
    }
    // "connect"
    activate(desiredChainIdOrChainParameters) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.handleActivation(desiredChainIdOrChainParameters);
        });
    }
    // "disconnect"
    deactivate() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            this.actions.resetState();
            yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.wallet.disconnect());
            this.removeEventListeners();
            if (this.magic) {
                this.provider = yield this.getProvider(this.magic);
            }
        });
    }
}
exports.MagicConnect = MagicConnect;
