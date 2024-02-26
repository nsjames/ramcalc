import {Session, SessionKit, Chains} from "@wharfkit/session"
import { WebRenderer } from "@wharfkit/web-renderer"
import { WalletPluginAnchor } from "@wharfkit/wallet-plugin-anchor"
import {writable, type Writable} from "svelte/store";
import {TransactPluginResourceProvider} from "@wharfkit/transact-plugin-resource-provider";

const webRenderer = new WebRenderer()

export let account:Writable<string|null> = writable(null);
export let accountBytes:Writable<number|null> = writable(null);

export default class ChainService {
    public static sessionKit:SessionKit|null = null;
    public static session:Session|null = null;

    static async init(){
        console.log('init')
        ChainService.sessionKit = new SessionKit({
            appName: "ramutils",
            chains: [
                Chains.EOS,
                Chains.Jungle4,
            ],
            ui: webRenderer,
            walletPlugins: [new WalletPluginAnchor()],
        },
        {
            transactPlugins: [new TransactPluginResourceProvider()],
        })

        const session = await ChainService.sessionKit.restore()
        if(session) {
            ChainService.session = session
            account.set(session.actor.toString())

            setTimeout(() => ChainService.getAccountBytes());
        }
    }

    static async getAccountBytes(){
        if(!ChainService.session) return;

        const accountInfo = await ChainService.session?.client.v1.chain.get_account(ChainService.session.actor.toString()).catch(err => {
            console.error('get account error', err)
            return {
                ram_quota: 0,
                ram_usage: 0
            }
        })
        accountBytes.set(accountInfo?.ram_quota || 0 - accountInfo?.ram_usage || 0)
    }

    static async login(){
        if(!ChainService.sessionKit) await ChainService.init();
        console.log('logging in')
        ChainService.session = (x => x ? x.session : null)(await ChainService.sessionKit?.login().catch(err => {
            console.error('login error', err)
            return null;
        }))
        console.log('session', ChainService.sessionKit);
        account.set(ChainService.session ? ChainService.session.actor.toString() : null)

        setTimeout(() => ChainService.getAccountBytes());
    }

    static async logout(){
        await ChainService.sessionKit?.logout()
        account.set(null)
    }

    static async buyRam(receiver: string, value: number, isBytes: boolean, toastStore:any){
        if(!ChainService.session) return;


        const triggerError = () => {
            toastStore.trigger({
                message: `There was a problem buying RAM. Check the console for more information about what happened.`,
                autohide: true,
                timeout: 5000,
                background: 'variant-filled-warning',
            })
        }

        const buyRamBytes = () => ChainService.session?.transact({
            actions: [
                {
                    account: "eosio",
                    name: "buyrambytes",
                    authorization: [ChainService.session?.permissionLevel],
                    data: {
                        payer: ChainService.session?.actor.toString(),
                        receiver,
                        bytes: value
                    }
                }
            ]
        } as any).catch(err => {
            console.error('buy ram error', err)
            triggerError();
            return null;
        })

        const buyRamEos = () => ChainService.session?.transact({
            actions: [
                {
                    account: "eosio",
                    name: "buyram",
                    authorization: [ChainService.session?.permissionLevel],
                    data: {
                        payer: ChainService.session?.actor.toString(),
                        receiver,
                        quant: `${value.toFixed(4)} EOS`
                    }
                }
            ]
        } as any).catch(err => {
            console.error('buy ram error', err)
            triggerError();
            return null;
        })

        const buyRamSelf = () => ChainService.session?.transact({
            actions: [
                {
                    account: "eosio",
                    name: "buyramself",
                    authorization: [ChainService.session?.permissionLevel],
                    data: {
                        account: ChainService.session?.actor.toString(),
                        quant: `${value.toFixed(4)} EOS`
                    }
                }
            ]
        } as any).catch(err => {
            console.error('buy ram error', err)
            triggerError();
            return null;
        })

        const result = await (async () => {
            if(isBytes) {
                // can only use buyrambytes, even if it's for the same account
                return buyRamBytes()
            } else {
                if(receiver === ChainService.session?.actor.toString()) {
                    return buyRamSelf()
                } else {
                    return buyRamEos()
                }
            }
        })();

        if(result) {
            // TODO: Once we have return values we can update RAM that way instead of refreshing the account info
            setTimeout(() => ChainService.getAccountBytes(), 1000)
        }

        return result;
    }

    static async sellRam(value: number, toastStore:any) {
        if (!ChainService.session) return;

        const result = await ChainService.session?.transact({
            actions: [
                {
                    account: "eosio",
                    name: "sellram",
                    authorization: [ChainService.session?.permissionLevel],
                    data: {
                        account: ChainService.session?.actor.toString(),
                        bytes: value
                    }
                }
            ]
        } as any).catch(err => {
            console.error('sell ram error', err)
            toastStore.trigger({
                message: `There was a problem selling RAM. Check the console for more information about what happened.`,
                autohide: true,
                timeout: 5000,
                background: 'variant-filled-warning',
            })
            return null;
        });

        if (result) {
            setTimeout(() => ChainService.getAccountBytes(), 1000)
        }

        return result;

    }

    static async transferRam(receiver: string, value: number, memo: string, toastStore:any) {
        if (!ChainService.session) return;

        const result = await ChainService.session?.transact({
            actions: [
                {
                    account: "eosio",
                    name: "ramtransfer",
                    authorization: [ChainService.session?.permissionLevel],
                    data: {
                        from: ChainService.session?.actor.toString(),
                        to: receiver,
                        bytes: value,
                        memo
                    }
                }
            ]
        } as any).catch(err => {
            console.error('transfer ram error', err)
            toastStore.trigger({
                message: `There was a problem transferring RAM. Check the console for more information about what happened.`,
                autohide: true,
                timeout: 5000,
                background: 'variant-filled-warning',
            })
            return null;
        });

        if (result) {
            setTimeout(() => ChainService.getAccountBytes(), 1000)
        }

        return result;
    }

    static async burnRam(value: number, memo: string, toastStore:any) {
        if (!ChainService.session) return;

        const result = await ChainService.session?.transact({
            actions: [
                {
                    account: "eosio",
                    name: "ramburn",
                    authorization: [ChainService.session?.permissionLevel],
                    data: {
                        owner: ChainService.session?.actor.toString(),
                        bytes: value,
                        memo
                    }
                }
            ]
        } as any).catch(err => {
            console.error('burn ram error', err)
            toastStore.trigger({
                message: `There was a problem burning RAM. Check the console for more information about what happened.`,
                autohide: true,
                timeout: 5000,
                background: 'variant-filled-warning',
            })
            return null;
        });

        if (result) {
            setTimeout(() => ChainService.getAccountBytes(), 1000)
        }

        return result;

    }
}