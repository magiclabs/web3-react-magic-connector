import { Connector, Actions, AddEthereumChainParameter } from "@web3-react/types";
import { Magic, MagicSDKAdditionalConfiguration } from "magic-sdk";
import { RPCProviderModule } from "@magic-sdk/provider/dist/types/modules/rpc-provider";
import { AbstractProvider } from "web3-core";
export interface MagicConnectorSDKOptions extends MagicSDKAdditionalConfiguration {
    apiKey: string;
    networkOptions: {
        rpcUrl: string;
        chainId: number;
    };
}
/**
 * @param options - Options to pass to `magic-sdk`.
 * @param onError - Handler to report errors thrown from eventListeners.
 */
export interface MagicConnectConstructorArgs {
    actions: Actions;
    options: MagicConnectorSDKOptions;
    onError?: (error: Error) => void;
}
export declare class MagicConnect extends Connector {
    provider?: RPCProviderModule & AbstractProvider;
    magic?: Magic;
    chainId?: number;
    private eagerConnection?;
    private readonly options;
    constructor({ actions, options, onError }: MagicConnectConstructorArgs);
    private connectListener;
    private disconnectListener;
    private chainChangedListener;
    private accountsChangedListener;
    private isomorphicInitialize;
    private initializeMagicInstance;
    private handleActivation;
    /** {@inheritdoc Connector.connectEagerly} */
    connectEagerly(): Promise<void>;
    activate(desiredChainIdOrChainParameters?: AddEthereumChainParameter): Promise<void>;
    /** {@inheritdoc Connector.deactivate} */
    deactivate(): Promise<void>;
}
