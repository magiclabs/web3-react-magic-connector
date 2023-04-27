import {
  Connector,
  Actions,
  ProviderConnectInfo,
  ProviderRpcError,
  AddEthereumChainParameter,
} from "@web3-react/types"

import { Magic, MagicSDKAdditionalConfiguration } from "magic-sdk"
import { RPCProviderModule } from "@magic-sdk/provider/dist/types/modules/rpc-provider"
import { AbstractProvider } from "web3-core"

function parseChainId(chainId: string | number) {
  return typeof chainId === "number"
    ? chainId
    : Number.parseInt(chainId, chainId.startsWith("0x") ? 16 : 10)
}

export interface MagicConnectorSDKOptions
  extends MagicSDKAdditionalConfiguration {
  apiKey: string
  networkOptions: {
    rpcUrl: string
    chainId: number
  }
}
/**
 * @param options - Options to pass to `magic-sdk`.
 * @param onError - Handler to report errors thrown from eventListeners.
 */
export interface MagicConnectConstructorArgs {
  actions: Actions
  options: MagicConnectorSDKOptions
  onError?: (error: Error) => void
}

export class MagicConnect extends Connector {
  public provider?: RPCProviderModule & AbstractProvider
  public magic?: Magic
  private eagerConnection?: Promise<void>
  private readonly options: MagicConnectorSDKOptions

  constructor({ actions, options, onError }: MagicConnectConstructorArgs) {
    super(actions, onError)
    this.options = options
    // this.initializeMagicInstance()
  }

  // private initializeMagicInstance(): void {
  //   const { apiKey, networkOptions } = this.options
  //   if (typeof window !== "undefined") {
  //     this.magic = new Magic(apiKey, {
  //       network: networkOptions,
  //     })
  //     this.provider = this.magic.rpcProvider
  //   }
  // }

  private connectListener = ({ chainId }: ProviderConnectInfo): void => {
    this.actions.update({ chainId: parseChainId(chainId) })
  }

  private disconnectListener = (error?: ProviderRpcError): void => {
    this.actions.resetState()
    if (error) this.onError?.(error)
  }

  private chainChangedListener = (chainId: number | string): void => {
    this.actions.update({ chainId: parseChainId(chainId) })
  }

  private accountsChangedListener = (accounts: string[]): void => {
    if (accounts.length === 0) {
      this.actions.resetState()
    } else {
      this.actions.update({ accounts })
    }
  }

  private async isomorphicInitialize(): Promise<void> {
    if (this.eagerConnection) return

    if (this.provider) {
      this.provider.on("connect", this.connectListener)
      this.provider.on("disconnect", this.disconnectListener)
      this.provider.on("chainChanged", this.chainChangedListener)
      this.provider.on("accountsChanged", this.accountsChangedListener)

      this.eagerConnection = Promise.resolve()
    }
  }

  private async handleActivation(
    desiredChainIdOrChainParameters?: AddEthereumChainParameter
  ): Promise<void> {
    const cancelActivation = this.actions.startActivation()

    try {
      const { apiKey, networkOptions } = this.options
      this.magic = new Magic(apiKey, {
        network: desiredChainIdOrChainParameters
          ? {
              rpcUrl: desiredChainIdOrChainParameters.rpcUrls[0],
              chainId: desiredChainIdOrChainParameters.chainId,
            }
          : {
              rpcUrl: networkOptions.rpcUrl,
              chainId: networkOptions.chainId,
            },
      })
      this.provider = this.magic.rpcProvider

      await this.isomorphicInitialize()
      if (!this.provider) {
        throw new Error("No existing connection")
      }

      const [chainId, accounts] = await Promise.all([
        this.provider.request({ method: "eth_chainId" }) as Promise<string>,
        this.provider.request({ method: "eth_accounts" }) as Promise<string[]>,
      ])

      this.actions.update({ chainId: parseChainId(chainId), accounts })
    } catch (error) {
      cancelActivation()
      this.eagerConnection = undefined
      throw error
    }
  }

  /** {@inheritdoc Connector.connectEagerly} */
  public async connectEagerly(): Promise<void> {
    const walletInfo = await this.magic?.wallet.getInfo()
    if (!walletInfo) {
      throw new Error("No connected wallet")
    }

    await this.handleActivation()
  }

  public async activate(
    desiredChainIdOrChainParameters?: AddEthereumChainParameter
  ): Promise<void> {
    await this.handleActivation(desiredChainIdOrChainParameters)
  }

  /** {@inheritdoc Connector.deactivate} */
  public async deactivate(): Promise<void> {
    if (this.provider) {
      this.provider.off("connect", this.connectListener)
      this.provider.off("disconnect", this.disconnectListener)
      this.provider.off("chainChanged", this.chainChangedListener)
      this.provider.off("accountsChanged", this.accountsChangedListener)

      await this.magic?.wallet.disconnect()
    }

    this.eagerConnection = undefined
    this.actions.resetState()
  }
}
