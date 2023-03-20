import {
  Connector,
  Actions,
  ProviderConnectInfo,
  ProviderRpcError,
} from "@web3-react/types"
import type {
  Magic as MagicInstance,
  MagicSDKAdditionalConfiguration,
} from "magic-sdk"
import type { ConnectExtension as ConnectExtensionInstance } from "@magic-ext/connect"
import { Eip1193Bridge } from "@ethersproject/experimental"
import { Web3Provider } from "@ethersproject/providers"

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
  public provider: Eip1193Bridge | undefined
  public magic?: MagicInstance<ConnectExtensionInstance[]>
  private eagerConnection?: Promise<void>
  private readonly options: MagicConnectorSDKOptions

  constructor({ actions, options, onError }: MagicConnectConstructorArgs) {
    super(actions, onError)
    this.options = options
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
      // handle this edge case by disconnecting
      this.actions.resetState()
    } else {
      this.actions.update({ accounts })
    }
  }

  private async isomorphicInitialize(): Promise<void> {
    if (this.eagerConnection) return

    const [{ ConnectExtension }, { Magic }] = await Promise.all([
      import("@magic-ext/connect"),
      import("magic-sdk"),
    ])

    const { apiKey, networkOptions } = this.options
    this.magic = new Magic(apiKey, {
      extensions: [new ConnectExtension()],
      network: networkOptions,
    })

    const provider = new Web3Provider(this.magic.rpcProvider as any)
    this.provider = new Eip1193Bridge(provider.getSigner(), provider)

    this.provider.on("connect", this.connectListener)
    this.provider.on("disconnect", this.disconnectListener)
    this.provider.on("chainChanged", this.chainChangedListener)
    this.provider.on("accountsChanged", this.accountsChangedListener)

    this.eagerConnection = Promise.resolve()
  }

  /** {@inheritdoc Connector.connectEagerly} */
  public async connectEagerly(): Promise<void> {
    const cancelActivation = this.actions.startActivation()

    try {
      await this.isomorphicInitialize()
      const walletInfo = await this.magic?.connect.getWalletInfo()
      if (!this.provider || !walletInfo) {
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

  public async activate(): Promise<void> {
    const cancelActivation = this.actions.startActivation()

    try {
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

  /** {@inheritdoc Connector.deactivate} */
  public async deactivate(): Promise<void> {
    if (this.provider) {
      this.provider.off("connect", this.connectListener)
      this.provider.off("disconnect", this.disconnectListener)
      this.provider.off("chainChanged", this.chainChangedListener)
      this.provider.off("accountsChanged", this.accountsChangedListener)

      await this.magic?.connect.disconnect()
      this.provider = undefined
    }

    this.eagerConnection = undefined
    this.actions.resetState()
  }
}
