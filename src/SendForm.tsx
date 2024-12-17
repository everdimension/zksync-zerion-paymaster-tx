import { useMutation, useQuery } from '@tanstack/react-query'
import { ethers } from 'ethers'
import { useState } from 'react'
import {
  getGasPrices,
  getPaymasterParams,
  paymasterCheckEligibility,
} from './apis/zerion-api'
import invariant from 'tiny-invariant'
import { Provider as ZksProvider } from 'zksync-ethers'
import { PlainTransactionRequest } from './shared/types'
import { signEip712Transaction } from './apis/eip712'
import { VStack } from './shared/VStack'

const PRIVATE_KEY = import.meta.env.VITE_PRIVATE_KEY
invariant(PRIVATE_KEY, 'Private key must be placed in .env')

const GAS_PER_PUBDATA_BYTE_DEFAULT = ethers.toBeHex(50000)

const wallet = new ethers.Wallet(PRIVATE_KEY)

const nodeUrl = 'https://rpc.zerion.io/v1/zero'

const provider = new ethers.JsonRpcProvider(nodeUrl)
const zksProvider = new ZksProvider(nodeUrl)

async function estimateGas(transaction: ethers.TransactionRequest) {
  return provider.estimateGas(transaction)
}

function toTx(fd: FormData): PlainTransactionRequest {
  const to = fd.get('to') as string
  const from = fd.get('from') as string
  const chainId = fd.get('chainId') as string
  const nonce = fd.get('nonce') as string
  const maxFeePerGas = fd.get('maxFeePerGas') as string
  const maxPriorityFeePerGas = fd.get('maxPriorityFeePerGas') as string
  const gasLimit = fd.get('gasLimit') as string
  const data = fd.get('data') as string
  const valueCommon = fd.get('valueCommon') as string
  const value = ethers.toBeHex(Number(valueCommon || 0) * 10 ** 18)
  return {
    chainId: chainId || undefined,
    from,
    to,
    value,
    gasLimit,
    data,
    nonce: Number(nonce || 0),
    maxFeePerGas: maxFeePerGas
      ? ethers.toBeHex(Number(maxFeePerGas))
      : undefined,
    maxPriorityFeePerGas: maxPriorityFeePerGas
      ? ethers.toBeHex(Number(maxPriorityFeePerGas))
      : undefined,
  }
}

function useGasLimit(tx: PlainTransactionRequest | null) {
  return useQuery({
    enabled: Boolean(tx),
    queryKey: ['estimateGas', tx],
    queryFn: () => {
      invariant(tx)
      return estimateGas(tx)
    },
  })
}

function useGasPrices() {
  return useQuery({
    queryKey: ['getGasPrices'],
    queryFn: () => {
      return getGasPrices({ chain: 'zero' })
    },
  })
}

function useNonce(address: string) {
  return useQuery({
    queryKey: ['getTransactionCount', address],
    queryFn: () => provider.getTransactionCount(address),
  })
}

function useChainId() {
  return useQuery({
    queryKey: ['getNetwork'],
    queryFn: async () => {
      const network = await provider.getNetwork()
      return ethers.toBeHex(network.chainId)
    },
  })
}

function toPaymasterEligibilityParam(tx: PlainTransactionRequest | null) {
  const { chainId, data, from, gasLimit, nonce, to, value } = tx || {}
  const transaction:
    | null
    | Parameters<typeof paymasterCheckEligibility>[0]['transaction'] =
    chainId && data && from && gasLimit && nonce != null && to && value
      ? {
          chainId: ethers.toBeHex(chainId),
          data,
          from,
          gas: ethers.toBeHex(gasLimit),
          gasPerPubdataByte: GAS_PER_PUBDATA_BYTE_DEFAULT,
          nonce: ethers.toBeHex(nonce),
          to,
          value: ethers.toBeHex(value),
        }
      : null
  return transaction
}

function toPaymasterParamsParam(tx: PlainTransactionRequest) {
  const transaction = toPaymasterEligibilityParam(tx)
  invariant(transaction)
  const { maxPriorityFeePerGas, maxFeePerGas } = tx
  invariant(maxPriorityFeePerGas)
  invariant(maxFeePerGas)
  return {
    ...transaction,
    maxPriorityFee: maxPriorityFeePerGas,
    maxFee: maxFeePerGas,
  }
}

function usePaymasterEligibility(tx: PlainTransactionRequest | null) {
  const transaction = toPaymasterEligibilityParam(tx)

  return useQuery({
    enabled: transaction != null,
    queryKey: ['paymasterCheckEligibility', transaction],
    queryFn: () => {
      invariant(transaction)
      return paymasterCheckEligibility({ transaction })
    },
  })
}

export function SendForm() {
  const [formData, setFormData] = useState<null | FormData>(null)
  const tx = formData ? toTx(formData) : null
  const { data: gasLimit } = useGasLimit(tx)
  const { data: chainId } = useChainId()
  const { data: nonce } = useNonce(wallet.address)
  const { data: gasPrices } = useGasPrices()
  const eligibilityQuery = usePaymasterEligibility(tx)
  const paymasterEligible = eligibilityQuery.data?.data.eligible

  const sendTxMutation = useMutation({
    mutationFn: async (tx: PlainTransactionRequest) => {
      const transaction = toPaymasterParamsParam(tx)
      const paymasterParamsResponse = await getPaymasterParams({ transaction })
      invariant(
        paymasterParamsResponse.data.eligible,
        'Not eligible for a sponsored tx',
      )
      const signedTx = await signEip712Transaction({
        transaction: tx,
        paymasterParams: paymasterParamsResponse.data.paymasterParams,
        gasPerPubdata: GAS_PER_PUBDATA_BYTE_DEFAULT,
        signer: wallet,
      })
      return zksProvider.broadcastTransaction(signedTx)
    },
  })
  return (
    <div>
      <h2>Send Form</h2>
      <form
        onChange={(event) => {
          if (event.currentTarget.checkValidity()) {
            const fd = new FormData(event.currentTarget)
            setFormData(fd)
          }
        }}
        onSubmit={(event) => {
          event.preventDefault()
          if (event.currentTarget.checkValidity() && formData) {
            const tx = toTx(new FormData(event.currentTarget))
            console.log(tx)
            sendTxMutation.mutate(tx)
          }
        }}
      >
        <input type="hidden" name="chainId" value={chainId} />
        <input type="hidden" name="from" value={wallet.address} />
        <input type="hidden" name="nonce" value={nonce} />
        <input type="hidden" name="data" value="0x" />
        <input
          type="hidden"
          name="maxFeePerGas"
          value={gasPrices?.data.fast.eip1559?.maxFee ?? ''}
        />
        <input
          type="hidden"
          name="maxPriorityFeePerGas"
          value={gasPrices?.data.fast.eip1559?.priorityFee ?? ''}
        />
        <input
          type="hidden"
          name="gasLimit"
          value={gasLimit != null ? ethers.toBeHex(gasLimit) : '0'}
        />
        <VStack gap={12}>
          <div>
            <label>
              <div>To:</div>
              <input
                type="text"
                name="to"
                placeholder="receiver address"
                pattern="0x[0-9a-fA-F]{40}"
                required={true}
              />
            </label>
          </div>
          <div>
            <label>
              <div>Amount, ETH:</div>
              <input
                type="text"
                name="valueCommon"
                placeholder="amount"
                defaultValue="0.001"
              />
            </label>
          </div>
          <div style={{ fontFamily: 'monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>Paymaster Eligible:</div>
              <div>
                {eligibilityQuery.isSuccess
                  ? String(paymasterEligible)
                  : eligibilityQuery.isLoading
                    ? '...'
                    : '—'}
              </div>
            </div>
            {gasLimit ? (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>Gas Limit</div>
                <div>{String(gasLimit)}</div>
              </div>
            ) : null}
          </div>
          <button disabled={sendTxMutation.isPending}>Send</button>
          {sendTxMutation.isSuccess ? (
            <div>Success! {sendTxMutation.data.hash}</div>
          ) : null}
          {sendTxMutation.isError ? (
            <div style={{ color: 'indianred', overflowWrap: 'break-word' }}>
              {String(sendTxMutation.error)}
            </div>
          ) : null}
        </VStack>
      </form>
    </div>
  )
}
