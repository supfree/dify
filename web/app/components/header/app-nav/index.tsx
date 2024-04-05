'use client'

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, usePathname } from 'next/navigation'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { flatten } from 'lodash-es'
import Nav from '../nav'
import { Robot, RobotActive } from '../../base/icons/src/public/header-nav/studio'
import { fetchAppDetail, fetchAppList } from '@/service/apps'
import NewAppDialog from '@/app/(commonLayout)/apps/NewAppDialog'
import type { AppListResponse } from '@/models/app'
import { useAppContext } from '@/context/app-context'

const getKey = (pageIndex: number, previousPageData: AppListResponse) => {
  if (!pageIndex || previousPageData.has_more)
    return { url: 'apps', params: { page: pageIndex + 1, limit: 30 } }
  return null
}

const AppNav = () => {
  const { t } = useTranslation()
  const { isCurrentWorkspaceManager } = useAppContext()

  const [showNewAppDialog, setShowNewAppDialog] = useState(false)
  const { appId } = useParams()
  const isAppDetailPage = usePathname().split('/').includes('app')
  const { data: currentApp } = useSWR((appId && isAppDetailPage) ? { url: '/apps', id: appId } : null, fetchAppDetail)
  const { data: appsData, setSize } = useSWRInfinite(appId ? getKey : () => null, fetchAppList, { revalidateFirstPage: false })
  const appItems = flatten(appsData?.map(appData => appData.data))

  const handleLoadmore = useCallback(() => {
    setSize(size => size + 1)
  }, [setSize])

  return (
    <>
      <Nav
        icon={<Robot className='w-4 h-4' />}
        activeIcon={<RobotActive className='w-4 h-4' />}
        text={t('common.menus.apps')}
        activeSegment={['apps', 'app']}
        link='/apps'
        curNav={currentApp}
        navs={appItems.map(item => ({
          id: item.id,
          name: item.name,
          link: `/app/${item.id}/${isCurrentWorkspaceManager ? 'configuration' : 'overview'}`,
          icon: item.icon,
          icon_background: item.icon_background,
        }))}
        createText={t('common.menus.newApp')}
        onCreate={() => setShowNewAppDialog(true)}
        onLoadmore={handleLoadmore}
      />
      <NewAppDialog show={showNewAppDialog} onClose={() => setShowNewAppDialog(false)} />
    </>
  )
}

export default AppNav
