import {
	decodePubkey,
	decodeTxRaw,
	DecodedTxRaw,
	EncodeObject,
	AccountData,
	makeSignBytes,
} from '@cosmjs/proto-signing'
import { fromBase64 } from '@cosmjs/encoding'
import { Tendermint34Client } from "@cosmjs/tendermint-rpc"
import { LumAminoRegistry, LumRegistry } from '../helpers/registry'
import { generateSignDoc, verifySignature } from '../helpers/utils'
import { SignMode, Doc, Fee } from '../types'
import { makeSignDoc, serializeSignDoc, StdFee, Secp256k1HdWallet, AminoSignResponse } from '@cosmjs/amino'
import Long from 'long'

import { PROPOSAL_MESSAGE_TITLE as TITLE, REPLY_PROTECTION_INTERVAL } from '../constants'
import {
	Account,
	accountFromAny,
	AminoTypes,
	createBankAminoConverters,
	QueryClient,
	setupAuthExtension,
} from '@cosmjs/stargate';

export const handleAuthRequest = async (request: Request): Promise<Response> => {
	console.log('Request', JSON.stringify(request));
	const token = await getAuthToken(request);
	if (token === '') {
		return makeResponse("Body is empty!")
	}
	const res = await handleAuthToken(token);
	return makeResponse(res.toString())
}

async function getAuthToken(request: Request): Promise<string> {
	const { headers } = request;
	const contentType = headers.get('content-type') || ''
	if (contentType.includes('text/plain')) {
		return await request.text();
	} else {
		return ""
	}
}

export const handleAuthToken = async (token: string): Promise<boolean> => {
	const byte_array = fromBase64(token)
	const chainId = 'cheqd-mainnet-1';
	const decoded = decodeTxRaw(byte_array);
	// Check that TextProposal has expected title and was created not more then 30 seconds ago.
	// const isMsgValid = checkMsg(decoded);
	// if (!isMsgValid) {
	//   return makeResponse("Message inside thte token is invalid");
	// }

	// Get the signature from decoded message
	const signature = decoded.signatures[0];
	// Get public key
	const raw_pubkey = getPubkey(decoded);
	if (raw_pubkey == null) {
		return false;
	}

	// Get sign mode
	const signMode = getSignMode(decoded);
	if (signMode === undefined) {
		console.log('Sign mode is undefined')
		return false
	}
	// Get the doc
	const doc = compileDoc(decoded, chainId, raw_pubkey);
	if (doc == null) {
		return false
	}
	// Check the signature
	let ok = false;
	if (signMode === SignMode.SIGN_MODE_DIRECT) {
		const signDoc = generateSignDoc(doc, 0, signMode);
		const sortedJSON = {
			accountNumber: signDoc.accountNumber,
			authInfoBytes: signDoc.authInfoBytes,
			bodyBytes: signDoc.bodyBytes,
			chainId: signDoc.chainId,
		};
		const signed_bytes = makeSignBytes(sortedJSON);
		ok = await verifySignature(signature, signed_bytes, raw_pubkey);
	} else if (signMode === SignMode.SIGN_MODE_LEGACY_AMINO_JSON) {
		const amino_doc_bytes = serializeSignDoc({
			account_number: doc.signers[0].accountNumber.toString(),
			chain_id: doc.chainId,
			fee: doc.fee,
			memo: doc.memo || '',
			msgs: doc.messages.map((msg: EncodeObject) => LumAminoRegistry.toAmino(msg)),
			sequence: doc.signers[0].sequence.toString(),
		});
		ok = await verifySignature(signature, amino_doc_bytes, raw_pubkey);
	}

	return ok
};

// TODO: Fix this & restore to working condition @Jasdeep.

function checkMsg(decoded: DecodedTxRaw): boolean {
	const message = LumRegistry.decode(decoded.body.messages[0]);
	const proposalMsg = LumRegistry.decode(message.content);
	const description = JSON.parse(proposalMsg.description);
	if (proposalMsg.title !== TITLE) {
		return false;
	}

	return Date.now() - Date.parse(description.time) <= REPLY_PROTECTION_INTERVAL;

}

//*******************************************************************************************
// TODO: Deprecated. Remove after e2e tests with FE @Jasdeep.
//*******************************************************************************************

function getPubkey(decoded: DecodedTxRaw): Uint8Array | null {
	const pubkey = decodePubkey(decoded.authInfo.signerInfos[0].publicKey);
	if (pubkey == null) {
		return null;
	}

	return fromBase64(pubkey.value);
}

function compileDoc(decoded: DecodedTxRaw, chainId: string, raw_pubkey: Uint8Array): Doc | null {
	const message = LumRegistry.decode(decoded.body.messages[0]);
	// Compile fee object
	const fee = compileFee(decoded);
	if (fee == null) {
		return null;
	}
	// Compile docSigner
	const docSigner = {
		accountNumber: 0,
		sequence: 0,
		publicKey: raw_pubkey,
	};
	return {
		chainId: chainId,
		fee: fee,
		memo: decoded.body.memo,
		messages: [
			{
				typeUrl: decoded.body.messages[0].typeUrl,
				value: message,
			},
		],
		signers: [docSigner],
	};
}

function compileFee(decoded: DecodedTxRaw): Fee | null {
	if (decoded.authInfo.fee === undefined) {
		throw new Error('Fee is not set.');
	}
	// Get the gas value
	const _gas = new Long(
		decoded.authInfo.fee.gasLimit.low,
		decoded.authInfo.fee.gasLimit.high,
		decoded.authInfo.fee.gasLimit.unsigned,
	);
	return {
		amount: decoded.authInfo.fee.amount,
		gas: _gas.toString()
	};
}

function getSignMode(decoded: DecodedTxRaw): number | undefined {
	return decoded.authInfo.signerInfos[0].modeInfo?.single?.mode;
}

function makeResponse(result: string): Response {
	return new Response(
		JSON.stringify(
			{
				result: result
			}
		),
		{
			headers: {
				'content-type': 'application/json;charset=UTF-8',
			},
		}
	)
}

//***************************************************************************************

export async function signAminoTransaction(
	mnemonic: string,
	msgs: EncodeObject[],
	fee: StdFee,
	chainId: string,
	memo: string,
): Promise<AminoSignResponse> {
	const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
		prefix: "cheqd",
	})

	const aminoTypes = new AminoTypes(createBankAminoConverters());
	const [account] = await wallet.getAccounts()
	const baseAccount = await getAccountInfo(account)
	const signDocAmino = makeSignDoc(
		msgs.map(msg => aminoTypes.toAmino(msg)),
		fee,
		chainId,
		memo,
		baseAccount.accountNumber.toString(),
		baseAccount.sequence.toString()
	)
	return await wallet.signAmino(account.address, signDocAmino)
}

export async function getAccountInfo(account: AccountData): Promise<Account> {
	const tmClient = await Tendermint34Client.connect("https://rpc.cheqd.network")
	const qClient = QueryClient.withExtensions(tmClient)
	const authQClient = setupAuthExtension(qClient)
	const baseAccount = await authQClient.auth.account(account.address)
	if (!baseAccount) {
		throw new Error("account not found on chain")
	}

	return accountFromAny(baseAccount)
}
