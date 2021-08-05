import { AbstractConnectorArguments, ConnectorUpdate } from '@web3-react/types'
import { AbstractConnector } from '@web3-react/abstract-connector'
import RLogin from '@rsksmart/rlogin'

export const rLogin = new RLogin({
  cachedProvider: false,
  providerOptions: {},
  supportedChains: [30, 31]
})

export class RLoginConnector extends AbstractConnector {
  private provider: any // rLogin EIP1193 provider
  private disconnect: () => void | null

  constructor(rLoginResponse: { provider: any; disconnect: () => void | null }) {
    const kwargs: AbstractConnectorArguments = {
      supportedChainIds: [30, 31]
    }
    super(kwargs)

    this.provider = rLoginResponse.provider
    this.disconnect = rLoginResponse.disconnect

    // bind _this_ for emitEvent to be called
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this)
    this.handleNetworkChanged = this.handleNetworkChanged.bind(this)
    this.handleChainChanged = this.handleChainChanged.bind(this)

    this.logIt('constructor()')
  }

  private logIt(...params: any) {
    console.log('@jesse', ...params)
  }

  /**
   * activate()
   * User has already selected and connected with their provider using
   * the rLogin popup
   * @returns ConnectorUpdate { provider, chainId, account }
   */
  public async activate(): Promise<ConnectorUpdate> {
    this.logIt('activate()')

    // get account and chainId
    const promises: [Promise<string[]>, Promise<number>] = [
      this.provider.request({ method: 'eth_accounts' }),
      this.provider.request({ method: 'eth_chainId' })
    ]

    // setup listeners
    this.provider.on('chainChanged', this.handleChainChanged)
    this.provider.on('accountsChanged', this.handleAccountsChanged)
    this.provider.on('close', this.close)
    this.provider.on('networkChanged', this.handleNetworkChanged)

    // return this back to web3React
    return Promise.all(promises).then((results: any[]) => ({
      provider: this.provider,
      chainId: parseInt(results[1]),
      account: results[0][0]
    }))
  }

  public getProvider() {
    this.logIt('getProvider()')
    return this.provider
  }

  public getChainId(): Promise<number> {
    this.logIt('getChainId()')
    return this.provider.request({ method: 'eth_chainId' }).then((hex: string) => parseInt(hex))
  }

  public getAccount(): Promise<string> {
    this.logIt('getAccount()')
    return this.provider.request({ method: 'eth_accounts' })
  }

  public deactivate() {
    this.logIt('deactivate()')
    this.provider.removeListener('chainChanged', this.handleChainChanged)
    this.provider.removeListener('accountsChanged', this.handleAccountsChanged)
    this.provider.removeListener('close', this.close)
    this.provider.removeListener('networkChanged', this.handleNetworkChanged)
  }

  public close() {
    this.logIt('close()')
    this.disconnect()
    this.emitDeactivate()
  }

  handleChainChanged(chainId: string | number) {
    this.logIt('chainChanged()', chainId)
    this.emitUpdate({ chainId, provider: this.provider })
  }

  handleAccountsChanged(accounts: string[]) {
    this.logIt('accountsChanged()', accounts)
    if (accounts.length === 0) {
      this.emitDeactivate()
    } else {
      this.emitUpdate({ account: accounts[0] })
    }
  }

  handleNetworkChanged(networkId: string | number) {
    this.logIt('networkChange()', networkId)
    this.emitUpdate({ chainId: networkId, provider: this.provider })
  }
}
