import { GeneratedType, Registry } from '@cosmjs/proto-signing/build/registry';
import {
	createGovAminoConverters,
} from '@cosmjs/stargate/build/modules/gov/aminomessages';
import {
	AminoConverters,
	AminoTypes,
} from '@cosmjs/stargate/build/aminotypes';
import { TextProposal } from 'cosmjs-types/cosmos/gov/v1beta1/gov';
import { MsgSubmitProposal } from 'cosmjs-types/cosmos/gov/v1beta1/tx';
import { Tx } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

const registryTypes: Iterable<[string, GeneratedType]> = [
	['/cosmos.gov.v1beta1.MsgSubmitProposal', MsgSubmitProposal],
	['/cosmos.gov.v1beta1.TextProposal', TextProposal],
];


class ExtendedRegistry extends Registry {
	decodeTx = (tx: Uint8Array): Tx => {
		return Tx.decode(tx);
	};
}

function createDefaultTypes(prefix: string): AminoConverters {
	return {
		...createGovAminoConverters(),
	};
}

export const CheqdAminoRegistry = new AminoTypes(createDefaultTypes("cheq"));
export const CheqdRegistry = new ExtendedRegistry(registryTypes);
