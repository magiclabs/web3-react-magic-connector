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
const connect_1 = require("@magic-ext/connect");
const experimental_1 = require("@ethersproject/experimental");
const providers_1 = require("@ethersproject/providers");
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
                // handle this edge case by disconnecting
                this.actions.resetState();
            }
            else {
                this.actions.update({ accounts });
            }
        };
        this.options = options;
        this.initializeMagicInstance();
    }
    initializeMagicInstance() {
        const { apiKey, networkOptions } = this.options;
        if (typeof window !== "undefined") {
            this.magic = new magic_sdk_1.Magic(apiKey, {
                extensions: [new connect_1.ConnectExtension()],
                network: networkOptions,
            });
        }
    }
    isomorphicInitialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.eagerConnection)
                return;
            if (this.magic) {
                const provider = new providers_1.Web3Provider(this.magic.rpcProvider);
                this.provider = new experimental_1.Eip1193Bridge(provider.getSigner(), provider);
                this.provider.on("connect", this.connectListener);
                this.provider.on("disconnect", this.disconnectListener);
                this.provider.on("chainChanged", this.chainChangedListener);
                this.provider.on("accountsChanged", this.accountsChangedListener);
                this.eagerConnection = Promise.resolve();
            }
        });
    }
    /** {@inheritdoc Connector.connectEagerly} */
    connectEagerly() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const cancelActivation = this.actions.startActivation();
            try {
                yield this.isomorphicInitialize();
                const walletInfo = yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.connect.getWalletInfo());
                if (!this.provider || !walletInfo) {
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
    activate() {
        return __awaiter(this, void 0, void 0, function* () {
            const cancelActivation = this.actions.startActivation();
            try {
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
    /** {@inheritdoc Connector.deactivate} */
    deactivate() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.provider) {
                this.provider.off("connect", this.connectListener);
                this.provider.off("disconnect", this.disconnectListener);
                this.provider.off("chainChanged", this.chainChangedListener);
                this.provider.off("accountsChanged", this.accountsChangedListener);
                yield ((_a = this.magic) === null || _a === void 0 ? void 0 : _a.connect.disconnect());
                this.provider = undefined;
            }
            this.eagerConnection = undefined;
            this.actions.resetState();
        });
    }
}
exports.MagicConnect = MagicConnect;
