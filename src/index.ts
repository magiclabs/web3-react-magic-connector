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

export interface MagicConnectConstructorArgs {
  actions: Actions
  options: MagicConnectorSDKOptions
  onError?: (error: Error) => void
}

export class MagicConnect extends Connector {
  public provider?: RPCProviderModule & AbstractProvider
  public magic?: Magic
  public chainId?: number
  private readonly options: MagicConnectorSDKOptions

  constructor({ actions, options, onError }: MagicConnectConstructorArgs) {
    super(actions, onError)
    this.options = options
    // Initializing Magic Instance in constructor otherwise it will be undefined when calling connectEagerly
    this.initializeMagicInstance()
  }

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

  private setEventListeners(): void {
    if (this.provider) {
      this.provider.on("connect", this.connectListener)
      this.provider.on("disconnect", this.disconnectListener)
      this.provider.on("chainChanged", this.chainChangedListener)
      this.provider.on("accountsChanged", this.accountsChangedListener)
    }
  }

  private removeEventListeners(): void {
    if (this.provider) {
      this.provider.off("connect", this.connectListener)
      this.provider.off("disconnect", this.disconnectListener)
      this.provider.off("chainChanged", this.chainChangedListener)
      this.provider.off("accountsChanged", this.accountsChangedListener)
    }
  }

  private initializeMagicInstance(
    desiredChainIdOrChainParameters?: AddEthereumChainParameter
  ) {
    if (typeof window !== "undefined") {
      // Extract apiKey and networkOptions from options
      const { apiKey, networkOptions } = this.options

      // Create a new Magic instance with desired ChainId for network switching
      // or with the networkOptions if no parameters were passed to the function
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

      // Get the provider from magicInstance
      this.provider = this.magic.rpcProvider

      // Set the chainId. If no chainId was passed as a parameter, use the chainId from networkOptions
      this.chainId =
        desiredChainIdOrChainParameters?.chainId || networkOptions.chainId
    }
  }

  private async checkLoggedInStatus() {
    try {
      const isLoggedIn = await this.magic?.user.isLoggedIn()
      return isLoggedIn
    } catch (error) {
      return false
    }
  }

  private async handleActivation(
    desiredChainIdOrChainParameters?: AddEthereumChainParameter
  ): Promise<void> {
    const cancelActivation = this.actions.startActivation()

    try {
      // Initialize the magic instance
      await this.initializeMagicInstance(desiredChainIdOrChainParameters)

      await this.magic?.wallet.connectWithUI()

      this.setEventListeners()

      // Get the current chainId and account from the provider
      const [chainId, accounts] = await Promise.all([
        this.provider?.request({ method: "eth_chainId" }) as Promise<string>,
        this.provider?.request({ method: "eth_accounts" }) as Promise<string[]>,
      ])

      // Update the connector state with the current chainId and account
      this.actions.update({ chainId: parseChainId(chainId), accounts })
    } catch (error) {
      cancelActivation()
    }
  }

  // "autoconnect"
  public async connectEagerly(): Promise<void> {
    const isLoggedIn = await this.checkLoggedInStatus()
    if (!isLoggedIn) return
    await this.handleActivation()
  }

  // "connect"
  public async activate(
    desiredChainIdOrChainParameters?: AddEthereumChainParameter
  ): Promise<void> {
    await this.handleActivation(desiredChainIdOrChainParameters)
  }

  // "disconnect"
  public async deactivate(): Promise<void> {
    this.actions.resetState()
    await this.magic?.wallet.disconnect()
    this.removeEventListeners()
  }
}
