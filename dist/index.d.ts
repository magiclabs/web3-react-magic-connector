import { Connector, Actions, AddEthereumChainParameter } from "@web3-react/types";
import { Magic, MagicSDKAdditionalConfiguration } from "magic-sdk";
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
    provider?: any;
    magic?: Magic;
    chainId?: number;
    private readonly options;
    constructor({ actions, options, onError }: MagicConnectConstructorArgs);
    private initializeMagicInstance;
    private getProvider;
    private checkLoggedInStatus;
    private handleActivation;
    connectEagerly(): Promise<void>;
    activate(desiredChainIdOrChainParameters?: AddEthereumChainParameter): Promise<void>;
    deactivate(): Promise<void>;
}
