import { Connector, Actions } from "@web3-react/types";
import type { MagicSDKAdditionalConfiguration } from "magic-sdk";
import { Magic } from "magic-sdk";
import { Eip1193Bridge } from "@ethersproject/experimental";
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
    provider: Eip1193Bridge | undefined;
    magic?: Magic;
    private eagerConnection?;
    private readonly options;
    constructor({ actions, options, onError }: MagicConnectConstructorArgs);
    private initializeMagicInstance;
    private connectListener;
    private disconnectListener;
    private chainChangedListener;
    private accountsChangedListener;
    private isomorphicInitialize;
    /** {@inheritdoc Connector.connectEagerly} */
    connectEagerly(): Promise<void>;
    activate(): Promise<void>;
    /** {@inheritdoc Connector.deactivate} */
    deactivate(): Promise<void>;
}
