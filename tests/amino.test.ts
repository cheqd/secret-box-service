import { signAminoTransaction } from '../src/api/controllers/authentication';
import makeServiceWorkerEnv from 'service-worker-mock'
import { verifySignature } from '../src/api/helpers/utils';
import { decodeSignature, serializeSignDoc } from '@cosmjs/amino';

declare const global: ServiceWorkerGlobalScope

describe('Generate Amino Signature', () => {
	it('should create & verify signature', async () => {
		const fee = {
			amount: [
				{
					amount: "5000000",
					denom: "ncheq",
				},
			],
			gas: "200000",
		}
		const aminoSign = await signAminoTransaction(
			"<cosmos_mnemonic>",
			[{
				typeUrl: "/cosmos.bank.v1beta1.MsgSend",
				value: {
					fromAddress: "cheqd1rnr5jrt4exl0samwj0yegv99jeskl0hsxmcz96",
					toAddress: "cheqd12248whff96tpfyqm2vyvf9k4wda9h2dhdkf2e4",
					amount: [
						{
							amount: "400000",
							denom: "ncheq",
						},
					],
				},
			}],
			fee,
			"cheqd-testnet-4",
			""
		)
		expect(aminoSign).toBeTruthy()

		const secp256k1Signature = decodeSignature(aminoSign.signature)
		expect(await verifySignature(secp256k1Signature.signature, serializeSignDoc(aminoSign.signed), secp256k1Signature.pubkey)).toBe(true)
	}, 10000)
})
