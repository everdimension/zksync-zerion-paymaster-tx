import { ethers } from 'ethers'

type HexString = string

export type PlainTransactionRequest = Omit<
  ethers.TransactionRequest,
  'to' | 'from'
> & {
  to?: string | null
  from?: string | null
} & {
  maxFeePerGas?: HexString | null
  maxPriorityFeePerGas?: HexString | null
  gasLimit?: HexString | null
}
