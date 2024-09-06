import { V2Pool, getV2Pool } from '@sushiswap/graph-client/data-api'
import { Container, SidebarAwareContainer } from '@sushiswap/ui'
import { unstable_cache } from 'next/cache'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import React from 'react'
import { PoolHeader } from 'src/ui/pool/PoolHeader'
import { ChainId, ChainKey } from 'sushi'
import { isSushiSwapV2ChainId } from 'sushi/config'
import { isAddress } from 'viem'

export const metadata = {
  title: 'Pool 💦',
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { chainId: string; address: string }
}) {
  const { chainId: _chainId, address } = params
  const chainId = +_chainId as ChainId

  if (
    !isSushiSwapV2ChainId(chainId) ||
    !isAddress(address, { strict: false })
  ) {
    return notFound()
  }

  const pool = (await unstable_cache(
    async () => getV2Pool({ chainId, address }),
    ['pool', `${chainId}:${address}`],
    {
      revalidate: 60 * 15,
    },
  )()) as V2Pool

  const headersList = headers()
  const referer = headersList.get('referer')
  return (
    <>
      <SidebarAwareContainer>
        <Container maxWidth="5xl" className="pt-10 px-4">
          <PoolHeader
            backUrl={
              referer?.includes('/pool?')
                ? referer?.toString()
                : `/${ChainKey[chainId]}/explore/pools`
            }
            address={pool.address}
            pool={pool}
            apy={{ rewards: pool?.incentiveApr, fees: pool?.feeApr1d }}
          />
        </Container>
      </SidebarAwareContainer>
      <section className="flex flex-col flex-1 mt-4">
        <div className="bg-gray-50 dark:bg-white/[0.02] border-t border-accent pt-10 pb-20 h-full">
          <SidebarAwareContainer>{children}</SidebarAwareContainer>
        </div>
      </section>
    </>
  )
}
