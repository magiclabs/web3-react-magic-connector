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
exports.MagicAuth = exports.MagicDedicatedConnector = exports.MagicConnect = exports.MagicUniversalConnector = void 0;
const types_1 = require("@web3-react/types");
const magic_sdk_1 = require("magic-sdk");
function parseChainId(chainId) {
    return typeof chainId === "number"
        ? chainId
        : Number.parseInt(chainId, chainId.startsWith("0x") ? 16 : 10);
}
class MagicUniversalConnector extends types_1.Connector {
    constructor({ actions, options, onError, }) {
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
            this.provider.off("connect", this.connectListener);
            this.provider.off("disconnect", this.disconnectListener);
            this.provider.off("chainChanged", this.chainChangedListener);
            this.provider.off("accountsChanged", this.accountsChangedListener);
        }
    }
    initializeMagicInstance(desiredChainIdOrChainParameters) {
        if (typeof window !== "undefined") {
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
            // Get the provider from magicInstance
            this.provider = this.magic.rpcProvider;
            // Set the chainId. If no chainId was passed as a parameter, use the chainId from networkOptions
            this.chainId =
                (desiredChainIdOrChainParameters === null || desiredChainIdOrChainParameters === void 0 ? void 0 : desiredChainIdOrChainParameters.chainId) || networkOptions.chainId;
        }
    }
    checkLoggedInStatus() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const isLoggedIn = yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.user.isLoggedIn());
                return isLoggedIn;
            }
            catch (error) {
                return false;
            }
        });
    }
    handleActivation(desiredChainIdOrChainParameters) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const cancelActivation = this.actions.startActivation();
            try {
                // Initialize the magic instance
                yield this.initializeMagicInstance(desiredChainIdOrChainParameters);
                yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.wallet.connectWithUI());
                this.setEventListeners();
                // Get the current chainId and account from the provider
                const [chainId, accounts] = yield Promise.all([
                    (_b = this.provider) === null || _b === void 0 ? void 0 : _b.request({
                        method: "eth_chainId",
                    }),
                    (_c = this.provider) === null || _c === void 0 ? void 0 : _c.request({ method: "eth_accounts" }),
                ]);
                // Update the connector state with the current chainId and account
                this.actions.update({ chainId: parseChainId(chainId), accounts });
            }
            catch (error) {
                cancelActivation();
            }
        });
    }
    // "autoconnect"
    connectEagerly() {
        return __awaiter(this, void 0, void 0, function* () {
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
            yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.user.logout());
            this.removeEventListeners();
        });
    }
}
exports.MagicUniversalConnector = MagicUniversalConnector;
class MagicConnect extends MagicUniversalConnector {
}
exports.MagicConnect = MagicConnect;
class MagicDedicatedConnector extends MagicUniversalConnector {
}
exports.MagicDedicatedConnector = MagicDedicatedConnector;
class MagicAuth extends MagicUniversalConnector {
}
exports.MagicAuth = MagicAuth;
