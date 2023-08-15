'use client'

import { XMarkIcon } from '@heroicons/react/20/solid'
import { useLocalStorage } from '@sushiswap/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, IconButton, Switch } from '@sushiswap/ui'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import React, { FC, useCallback, useEffect, useState, useTransition } from 'react'

export const CrossChainBanner: FC = () => {
  const [minimized, setBannerMinimize] = useLocalStorage('xswap-banner-minimized', false)
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [checked, setChecked] = useState(pathname === '/swap/cross-chain')
  const { push, prefetch } = useRouter()

  useEffect(() => {
    prefetch('/swap/cross-chain')
    prefetch('/swap')
  }, [prefetch])

  const handleChange = useCallback(
    (checked: boolean) => {
      setChecked(checked)
      setTimeout(() => {
        startTransition(() => {
          if (checked) push('/swap/cross-chain')
          else push('/swap')
        })
      }, 100)
    },
    [push]
  )

  return (
    <AnimatePresence mode="popLayout">
      {!minimized ? (
        <motion.div layout layoutId="container">
          <Card>
            <CardHeader>
              <CardTitle>
                <motion.div
                  layoutId="title"
                  className="text-base flex gap-1.5 items-center bg-gradient-to-r from-blue to-pink text-transparent bg-clip-text tracking-tighter"
                >
                  Cross-chain Swap
                </motion.div>
              </CardTitle>
              <CardDescription>
                Swap your funds on one network and swap them into a token on a different network.{' '}
                <a
                  target="_blank"
                  className="text-blue hover:underline"
                  href="https://www.sushi.com/academy/articles/sushi-xswap-a-crosschain-dex"
                  rel="noreferrer"
                >
                  Learn more.
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Switch checked={checked} onCheckedChange={handleChange} />
            </CardContent>
            <div className="absolute right-2 top-2">
              <IconButton icon={XMarkIcon} name="minimize" onClick={() => setBannerMinimize(true)} size="xs" />
            </div>
          </Card>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
