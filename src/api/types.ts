import { EncodeObject } from "@cosmjs/proto-signing";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { Fee, ModeInfo } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { Any } from "cosmjs-types/google/protobuf/any";
import Long from "long";

export type ErrorResponse = {
  name: string;
  message: string;
  stack?: string;
  status: number;
};

export type CompactJWT = string;

export type IssuerType = { id: string; [x: string]: any } | string;

export type CredentialSubject = {
  id?: string;
  [x: string]: any;
};

export type CredentialStatus = {
  id?: string;
  type?: string;
  [x: string]: any;
};

export interface ProofType {
  type?: string;

  [x: string]: any;
}

export interface UnsignedCredential {
  issuer: IssuerType;
  credentialSubject: CredentialSubject;
  type?: string[] | string;
  "@context": string[] | string;
  issuanceDate: string;
  expirationDate?: string;
  credentialStatus?: CredentialStatus;
  id?: string;

  [x: string]: any;
}

export type VerifiableCredential = UnsignedCredential & { proof: ProofType };

export type W3CVerifiableCredential = VerifiableCredential | CompactJWT;

export interface UnsignedPresentation {
  holder: string;
  verifiableCredential?: W3CVerifiableCredential[];
  type?: string[] | string;
  "@context": string[] | string;
  verifier?: string[];
  issuanceDate?: string;
  expirationDate?: string;
  id?: string;

  [x: string]: any;
}

export type VerifiablePresentation = UnsignedPresentation & {
  proof: ProofType;
};

export type W3CVerifiablePresentation = VerifiablePresentation | CompactJWT;

export type DateType = string | Date;

export interface CredentialPayload {
  issuer: IssuerType;
  credentialSubject?: CredentialSubject;
  type?: string[];
  "@context"?: string[];
  issuanceDate?: DateType;
  expirationDate?: DateType;
  credentialStatus?: CredentialStatus;
  id?: string;

  [x: string]: any;
}

export interface PresentationPayload {
  holder: string;
  verifiableCredential?: W3CVerifiableCredential[];
  type?: string[];
  "@context"?: string[];
  verifier?: string[];
  issuanceDate?: DateType;
  expirationDate?: DateType;
  id?: string;

  [x: string]: any;
}

export type CredentialRequest = Request & {
  credential?: W3CVerifiableCredential;
};

/**
 * SignerInfo describes the public key and signing mode of a single top-level
 * signer.
 */
export interface SignerInfo {
  /**
   * public_key is the public key of the signer. It is optional for accounts
   * that already exist in state. If unset, the verifier can use the required \
   * signer address for this position and lookup the public key.
   */
  publicKey?: Any;
  /**
   * mode_info describes the signing mode of the signer and is a nested
   * structure to support nested multisig pubkey's
   */
  modeInfo?: ModeInfo;
  /**
   * sequence is the sequence of the account, which describes the
   * number of committed transactions signed by a given address. It is used to
   * prevent replay attacks.
   */
  sequence: Long;
}
/** ModeInfo describes the signing mode of a single or nested multisig signer. */
// export interface ModeInfo {
//     /** single represents a single signer */
//     single?: ModeInfo_Single | undefined;
//     /** multi represents a nested multisig signer */
//     multi?: ModeInfo_Multi | undefined;
// }
/**
 * Single is the mode info for a single signer. It is structured as a message
 * to allow for additional fields such as locale for SIGN_MODE_TEXTUAL in the
 * future
 */
// export interface ModeInfo_Single {
//     /** mode is the signing mode of the single signer */
//     mode: SignMode;
// }
/** Multi is the mode info for a multisig public key */
// export interface ModeInfo_Multi {
//     /** bitarray specifies which keys within the multisig are signing */
//     bitarray?: CompactBitArray;
//     /**
//      * mode_infos is the corresponding modes of the signers of the multisig
//      * which could include nested multisig public keys
//      */
//     modeInfos: ModeInfo[];
// }
/**
 * CompactBitArray is an implementation of a space efficient bit array.
 * This is used to ensure that the encoded data takes up a minimal amount of
 * space after proto encoding.
 * This is not thread safe, and is not intended for concurrent usage.
 */
// export interface CompactBitArray {
//     extraBitsStored: number;
//     elems: Uint8Array;
// }
export interface Doc {
  /**
   * chain_id is the unique identifier of the chain this transaction targets.
   * It prevents signed transactions from being used on another chain by an
   * attacker
   */
  chainId: string;
  /**
   * Transaction requested Fee
   */
  fee: Fee;
  /**
   * Transaction memo
   */
  memo?: string;
  /**
   * Transactions messages
   */
  messages: EncodeObject[];
  /**
   * Transction auth signers
   */
  signers: ReadonlyArray<{
    readonly pubkey: Uint8Array;
    readonly sequence: number;
    readonly accountNumber: number;
  }>;
}
