import { Connector, Actions, AddEthereumChainParameter } from '@web3-react/types';
import { Magic, MagicSDKAdditionalConfiguration } from 'magic-sdk';
import { RPCProviderModule } from '@magic-sdk/provider/dist/types/modules/rpc-provider';
import { AbstractProvider } from 'web3-core';
export interface MagicConnectorSDKOptions extends MagicSDKAdditionalConfiguration {
    apiKey: string;
    networkOptions: {
        rpcUrl: string;
        chainId: number;
    };
}
export interface MagicUniversalConstructorArgs {
    actions: Actions;
    options: MagicConnectorSDKOptions;
    onError?: (error: Error) => void;
}
export declare class MagicUniversal extends Connector {
    provider?: RPCProviderModule & AbstractProvider;
    magic?: Magic;
    chainId?: number;
    private readonly options;
    constructor({ actions, options, onError }: MagicUniversalConstructorArgs);
    private connectListener;
    private disconnectListener;
    private chainChangedListener;
    private accountsChangedListener;
    private setEventListeners;
    private removeEventListeners;
    private initializeMagicInstance;
    private checkLoggedInStatus;
    private handleActivation;
    connectEagerly(): Promise<void>;
    activate(desiredChainIdOrChainParameters?: AddEthereumChainParameter): Promise<void>;
    deactivate(): Promise<void>;
}
