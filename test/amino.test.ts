import { signAminoTransaction } from '../src/api/controllers/authentication';
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx'

import makeServiceWorkerEnv from 'service-worker-mock'

declare const global: ServiceWorkerGlobalScope
describe('Generate Amino Signature', () => {
	jest.setTimeout(60000)
	test('create signature', async () => {
		const fee = {
			amount: [
				{
					amount: "5000000",
					denom: "ncheq",
				},
			],
			gas: "200000",
		}
		const resp = await signAminoTransaction(
			"<add-mnemonic-here>",
			[{
				typeUrl: "/cosmos.bank.v1beta1.MsgSend",
				value: {
					fromAddress: "cheqd17cuxaeqdvgt5cv9maxu94gnllscgy4wfxrkslc",
					toAddress: "cheqd1ed04uq0x3lfc8mhyau209pfgua2r4vhw5yygcn",
					amount: [
						{
							amount: "400000",
							denom: "ncheq",
						},
					],
				},
			}],
			fee,
			"cheqd-mainnet-1",
			""
		)
	})
})
