import {
  Connector,
  Actions,
  Provider,
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

// type MetaMaskProvider = Provider & {
//   isMetaMask?: boolean
//   isConnected?: () => boolean
//   providers?: MetaMaskProvider[]
//   get chainId(): string
//   get accounts(): string[]
// }

export interface MagicConnectConstructorArgs {
  actions: Actions
  options: MagicConnectorSDKOptions
  onError?: (error: Error) => void
}

export class MagicConnect extends Connector {
  // public provider?: (RPCProviderModule & AbstractProvider) | Provider
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
      this.provider.removeListener("connect", this.connectListener)
      this.provider.removeListener("disconnect", this.disconnectListener)
      this.provider.removeListener("chainChanged", this.chainChangedListener)
      this.provider.removeListener(
        "accountsChanged",
        this.accountsChangedListener
      )
    }
  }

  private initializeMagicInstance(
    desiredChainIdOrChainParameters?: AddEthereumChainParameter
  ) {
    if (typeof window !== "undefined") {
      console.log("INITIALIZE MAGIC INSTANCE")

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

      // Set the chainId. If no chainId was passed as a parameter, use the chainId from networkOptions
      this.chainId =
        desiredChainIdOrChainParameters?.chainId || networkOptions.chainId
    }
  }

  // Get the provider from magicInstance
  private async getProvider(magicInstance: Magic): Promise<any> {
    const provider = await magicInstance.wallet.getProvider()
    console.log("provider", provider)
    return provider
  }

  // Check if the user is logged to determine whether to
  // display magic connect login ui
  private async checkLoggedInStatus() {
    try {
      // Not sure if this is supposed to be used with Magic Connect
      const isLoggedIn = await this.magic?.user.isLoggedIn()
      console.log("isLoggedIn: ", isLoggedIn)
      return isLoggedIn
    } catch (error) {
      console.error("Error checking logged in status:", error)
      return false
    }
  }

  private async handleActivation(
    desiredChainIdOrChainParameters?: AddEthereumChainParameter
  ): Promise<void> {
    console.log("HANDLE ACTIVATION")
    const cancelActivation = this.actions.startActivation()

    try {
      // Check if the user is logged in
      const isLoggedIn = await this.checkLoggedInStatus()

      // Initialize the magic instance
      await this.initializeMagicInstance(desiredChainIdOrChainParameters)

      // If the user is not logged in, connect with the Magic UI
      if (!isLoggedIn) {
        await this.magic?.wallet.connectWithUI()
      }

      // Get the provider (metamask) and set up event listeners
      // Without this step, connecting to metamask will not work
      this.provider = await this.getProvider(this.magic!)
      this.setEventListeners()

      // Handle for metamask
      // Calling any magic.user or magic.wallet method will throw error "User denied account access" when connected with metamask
      // const wallet = await this.magic?.wallet.getInfo()
      if (
        this.provider &&
        "isMetaMask" in this.provider &&
        desiredChainIdOrChainParameters
      ) {
        try {
          const desiredChainIdHex = `0x${desiredChainIdOrChainParameters!.chainId.toString(
            16
          )}`
          await this.provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: desiredChainIdHex }],
          })
        } catch (error) {
          console.log("wallet_switchEthereumChain: ", error)
        }
      }

      // Get the current chainId and account from the provider
      const [chainId, accounts] = await Promise.all([
        this.provider?.request({ method: "eth_chainId" }) as Promise<string>,
        this.provider?.request({ method: "eth_accounts" }) as Promise<string[]>,
      ])

      console.log("chainId: ", parseChainId(chainId))
      console.log("accounts: ", accounts)

      // Update the connector state with the current chainId and account
      this.actions.update({ chainId: parseChainId(chainId), accounts })
    } catch (error) {
      cancelActivation()
      throw error
    }
  }

  // "autoconnect"
  public async connectEagerly(): Promise<void> {
    console.log("CONNECT EAGERLY")
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
    if (this.magic) {
      this.provider = await this.getProvider(this.magic)
    }
  }
}
