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
  // public provider?: RPCProviderModule & AbstractProvider
  public provider?: any
  public magic?: Magic
  public chainId?: number
  private eagerConnection?: Promise<void>
  private readonly options: MagicConnectorSDKOptions

  constructor({ actions, options, onError }: MagicConnectConstructorArgs) {
    super(actions, onError)
    this.options = options
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

  private async initializeMagicInstance(
    desiredChainIdOrChainParameters?: AddEthereumChainParameter
  ): Promise<void> {
    console.log("initializeMagicInstance")
    // Extract apiKey and networkOptions from options
    const { apiKey, networkOptions } = this.options

    // Create a new Magic instance with either the desired ChainId or ChainParameters
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

    // Set the provider to the rpcProvider of the new Magic instance
    this.provider = this.magic.rpcProvider
  }

  private async handleActivation(
    desiredChainIdOrChainParameters?: AddEthereumChainParameter
  ): Promise<void> {
    console.log("handleActivation")
    const cancelActivation = this.actions.startActivation()

    try {
      // Initialize Magic if necessary
      if (
        this.chainId === undefined ||
        this.chainId !== desiredChainIdOrChainParameters?.chainId
      ) {
        await this.initializeMagicInstance(desiredChainIdOrChainParameters)
      }

      // Check if the user is logged in
      const isLoggedIn = await this.magic?.user.isLoggedIn()
      console.log("handleActivation isLoggedIn: ", isLoggedIn)

      // If the user is not logged in, connect with the Magic UI
      if (!isLoggedIn) {
        await this.magic?.wallet.connectWithUI()
      }

      // Get the provider and set up event listeners (metamask)
      // Without this step, connecting to metamask will not work
      this.provider = await this.magic?.wallet.getProvider()

      // Handle network switch for metamask because it uses different provider
      // This throws error when connected with Magic because "wallet_switchEthereumChain" does not exist on magic provider

      // Calling any magic.user or magic.wallet method will throw error "User denied account access" when connected with metamask
      // const wallet = await this.magic?.wallet.getInfo()
      // if (wallet?.walletType === "metamask") {
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

      this.setEventListeners()
      console.log("handleActivation provider", this.provider)

      // Get the current chainId and accounts
      const [chainId, accounts] = await Promise.all([
        this.provider.request({ method: "eth_chainId" }) as Promise<string>,
        this.provider.request({ method: "eth_accounts" }) as Promise<string[]>,
      ])

      console.log("chainId: ", parseChainId(chainId))
      console.log("accounts: ", accounts)

      // Update the state with the current chainId and accounts
      this.actions.update({ chainId: parseChainId(chainId), accounts })
    } catch (error) {
      cancelActivation()
      this.eagerConnection = undefined
      throw error
    }
  }

  public async connectEagerly(): Promise<void> {
    console.log("connectEagerly")
    const isLoggedIn = await this.magic?.user.isLoggedIn()
    console.log("connectEagerly isLoggedIn: ", isLoggedIn)
    if (!isLoggedIn) return
    await this.handleActivation()
  }

  public async activate(
    desiredChainIdOrChainParameters?: AddEthereumChainParameter
  ): Promise<void> {
    await this.handleActivation(desiredChainIdOrChainParameters)
  }

  public async deactivate(): Promise<void> {
    await this.magic?.user.logout()
    this.eagerConnection = undefined
    this.actions.resetState()
    this.removeEventListeners()
  }
}
