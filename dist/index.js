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
    }
    isomorphicInitialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.eagerConnection)
                return;
            if (this.provider) {
                this.provider.on("connect", this.connectListener);
                this.provider.on("disconnect", this.disconnectListener);
                this.provider.on("chainChanged", this.chainChangedListener);
                this.provider.on("accountsChanged", this.accountsChangedListener);
                this.eagerConnection = Promise.resolve();
            }
        });
    }
    initializeMagicInstance(desiredChainIdOrChainParameters) {
        const { apiKey, networkOptions } = this.options;
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
        this.provider = this.magic.rpcProvider;
        this.chainId =
            (desiredChainIdOrChainParameters === null || desiredChainIdOrChainParameters === void 0 ? void 0 : desiredChainIdOrChainParameters.chainId) || networkOptions.chainId;
    }
    handleActivation(desiredChainIdOrChainParameters) {
        return __awaiter(this, void 0, void 0, function* () {
            const cancelActivation = this.actions.startActivation();
            try {
                if (this.chainId !== (desiredChainIdOrChainParameters === null || desiredChainIdOrChainParameters === void 0 ? void 0 : desiredChainIdOrChainParameters.chainId)) {
                    this.initializeMagicInstance(desiredChainIdOrChainParameters);
                }
                yield this.isomorphicInitialize();
                if (!this.provider) {
                    throw new Error("No existing connection");
                }
                const [chainId, accounts] = yield Promise.all([
                    this.provider.request({ method: "eth_chainId" }),
                    this.provider.request({ method: "eth_accounts" }),
                ]);
                this.actions.update({ chainId: parseChainId(chainId), accounts });
            }
            catch (error) {
                cancelActivation();
                this.eagerConnection = undefined;
                throw error;
            }
        });
    }
    /** {@inheritdoc Connector.connectEagerly} */
    connectEagerly() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const walletInfo = yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.wallet.getInfo());
            if (!walletInfo) {
                throw new Error("No connected wallet");
            }
            yield this.handleActivation();
        });
    }
    activate(desiredChainIdOrChainParameters) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.handleActivation(desiredChainIdOrChainParameters);
        });
    }
    /** {@inheritdoc Connector.deactivate} */
    deactivate() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.provider) {
                this.provider.off("connect", this.connectListener);
                this.provider.off("disconnect", this.disconnectListener);
                this.provider.off("chainChanged", this.chainChangedListener);
                this.provider.off("accountsChanged", this.accountsChangedListener);
                yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.wallet.disconnect());
            }
            this.eagerConnection = undefined;
            this.actions.resetState();
        });
    }
}
exports.MagicConnect = MagicConnect;
