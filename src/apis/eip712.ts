import { ethers } from 'ethers'
import {
  EIP712Signer,
  utils as zksUtils,
  types as zksTypes,
} from 'zksync-ethers'
import { PlainTransactionRequest } from '../shared/types'
import { PaymasterParamsResponse } from './zerion-api'

function serializePaymasterTx({
  transaction,
  signature,
}: {
  transaction: zksTypes.TransactionLike
  signature: string
}) {
  return zksUtils.serializeEip712({
    ...transaction,
    customData: { ...transaction.customData, customSignature: signature },
  })
}

export async function signEip712Transaction({
  transaction,
  paymasterParams,
  gasPerPubdata,
  signer,
}: {
  transaction: PlainTransactionRequest
  paymasterParams: PaymasterParamsResponse['data']['paymasterParams']
  gasPerPubdata: string
  signer: ethers.Signer
}) {
  const paymasterTx = {
    ...transaction,
    customData: { paymasterParams, gasPerPubdata },
  }
  const eip712Signer = new EIP712Signer(signer, Number(transaction.chainId))
  const signature = await eip712Signer.sign(paymasterTx)
  return serializePaymasterTx({ transaction: paymasterTx, signature })
}
