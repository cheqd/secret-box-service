import { makeSignDoc as makeStdSignDoc, serializeSignDoc } from '@cosmjs/amino';
import { fromBase64 } from '@cosmjs/encoding';
import { DecodedTxRaw, decodePubkey, decodeTxRaw, makeAuthInfoBytes, makeSignBytes, makeSignDoc } from '@cosmjs/proto-signing';
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing';
import { ErrorHandler } from '../../error_handler';
import { PROPOSAL_MESSAGE_TITLE as TITLE, REPLY_PROTECTION_INTERVAL } from '../constants';
import { publicKeyToProto } from '../helpers/keys';
import { CheqdAminoRegistry, CheqdRegistry } from '../helpers/registry';
import { verifySignature } from '../helpers/utils';

export const handleAuthRequest = async (request: Request): Promise<Response | void> => {
	console.log('Request', JSON.stringify(request));
	const token = await getAuthToken(request);
	if (token === '') {
		return ErrorHandler.throw({ msg: "Body is empty!", statusCode: 400 })
	}

	return await handleAuthToken(token);
}

async function getAuthToken(request: Request): Promise<string> {
	const { headers } = request;
	const contentType = headers.get('content-type')
	if (contentType && contentType.includes('text/plain')) {
		return await request.text();
	}

	return ""
}

export const handleAuthToken = async (token: string): Promise<Response | void> => {
	const bz = fromBase64(token)
	const chainId = 'cheqd-mainnet-1';
	const decoded = decodeTxRaw(bz);

	// check is msg title is what we expect and the date in msg is less than 30s old (which is 30000ms in JS/TS world)
	const err = checkMsg(decoded)
	if (err) {
		return ErrorHandler.throw({ msg: err.message, statusCode: 400 })
	}

	// Get the signature from decoded message
	const signature = decoded.signatures[0];
	// Get public key
	const aminoPubkey = decodePubkey(decoded.authInfo.signerInfos[0].publicKey);
	if (!aminoPubkey) {
		return ErrorHandler.throw({ msg: AuthTokenErrorEnum.NoPubkey, statusCode: 400 })
	}
	const pubKey = fromBase64(aminoPubkey.value)

	// Get sign mode
	const signMode = decoded.authInfo.signerInfos[0].modeInfo?.single?.mode;
	if (!signMode) {
		return ErrorHandler.throw({ msg: AuthTokenErrorEnum.NoSignMode })
	}

	// Check the signature
	let ok = false;
	switch (signMode) {
		case SignMode.SIGN_MODE_DIRECT:
			const directSignedMsg = CheqdRegistry.decode(decoded.body.messages[0])
			const txBody = { messages: [directSignedMsg], memo: decoded.body.memo };

			const bodyBytes = CheqdRegistry.encode({ typeUrl: '/cosmos.tx.v1beta1.TxBody', value: txBody });
			const signDoc = makeSignDoc(
				bodyBytes,
				makeAuthInfoBytes([{ sequence: 0, pubkey: publicKeyToProto(pubKey) }], decoded.authInfo.fee!.amount, signMode),
				chainId,
				0
			)

			const signed_bytes = makeSignBytes(signDoc);
			ok = await verifySignature(signature, signed_bytes, pubKey);
			if (!ok) {
				return ErrorHandler.throw({ msg: AuthTokenErrorEnum.InvalidSignature, statusCode: 400 })
			}

			break;
		case SignMode.SIGN_MODE_LEGACY_AMINO_JSON:
			const msg = CheqdRegistry.decode(decoded.body.messages[0])
			const aminoMsg = CheqdAminoRegistry.toAmino({ typeUrl: decoded.body.messages[0].typeUrl, value: msg })
			const signDocAmino = makeStdSignDoc(
				[aminoMsg],
				{
					gas: decoded.authInfo.fee!.gasLimit.toString(),
					amount: decoded.authInfo.fee!.amount,

				},
				chainId,
				decoded.body.memo,
				"0",
				decoded.authInfo.signerInfos[0].sequence.toString(),
			)

			ok = await verifySignature(signature, serializeSignDoc(signDocAmino), pubKey)
			if (!ok) {
				return ErrorHandler.throw({ msg: AuthTokenErrorEnum.InvalidSignature })
			}

			break;
		default:
			ErrorHandler.throw({ msg: AuthTokenErrorEnum.NoSignMode, statusCode: 400 })
	}
};

function checkMsg(decoded: DecodedTxRaw): Error | void {
	const message = CheqdRegistry.decode(decoded.body.messages[0]);
	const proposalMsg = CheqdRegistry.decode(message.content);
	const description = JSON.parse(proposalMsg.description);
	if (proposalMsg.title !== TITLE) {
		return new Error(AuthTokenErrorEnum.TitleMismatch.toString())
	}

	const timeElapsed = (new Date().getTime() - new Date(description.time).getTime())
	const ok = timeElapsed <= REPLY_PROTECTION_INTERVAL
	if (!ok) {
		return new Error(AuthTokenErrorEnum.TokenIsTooOld.toString())
	}
}

export const enum AuthTokenErrorEnum {
	InvalidToken = "provided token is invalid",
	NoPubkey = "public key is not present inside the message body",
	TitleMismatch = "message title does not match",
	TokenIsTooOld = "the token provided is stale",
	NoSignMode = "sign mode is not present",
	InvalidSignature = "signature is invalid",
	UnsupportedSignMode = `sign mode is not supported`
}
