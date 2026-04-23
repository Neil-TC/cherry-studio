import { McpLogo } from '@renderer/components/Icons'
import ListItem from '@renderer/components/ListItem'
import Scrollbar from '@renderer/components/Scrollbar'
import { Flex } from 'antd'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import styled from 'styled-components'

import { SettingContainer } from '..'
import InstallNpxUv from './InstallNpxUv'
import McpServersList from './McpServersList'
import McpSettings from './McpSettings'

const MCPSettings: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const isServersView =
    location.pathname === '/settings/mcp' ||
    location.pathname === '/settings/mcp/servers' ||
    location.pathname.startsWith('/settings/mcp/settings/')

  return (
    <Container>
      <MainContainer>
        <MenuList>
          <ListItem
            title={t('settings.mcp.servers', 'MCP Servers')}
            active={isServersView}
            onClick={() => navigate('/settings/mcp/servers')}
            icon={<McpLogo width={18} height={18} style={{ opacity: 0.8 }} />}
            titleStyle={{ fontWeight: 500 }}
          />
        </MenuList>
        <RightContainer>
          <Routes>
            <Route index element={<Navigate to="servers" replace />} />
            <Route path="servers" element={<McpServersList />} />
            <Route path="settings/:serverId" element={<McpSettings />} />
            <Route
              path="mcp-install"
              element={
                <SettingContainer style={{ backgroundColor: 'inherit' }}>
                  <InstallNpxUv />
                </SettingContainer>
              }
            />
            <Route path="*" element={<Navigate to="servers" replace />} />
          </Routes>
        </RightContainer>
      </MainContainer>
    </Container>
  )
}

const Container = styled(Flex)`
  flex: 1;
`

const MainContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  width: 100%;
  height: calc(100vh - var(--navbar-height) - 6px);
  overflow: hidden;
`

const MenuList = styled(Scrollbar)`
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: var(--settings-width);
  padding: 12px;
  padding-bottom: 48px;
  border-right: 0.5px solid var(--color-border);
  height: calc(100vh - var(--navbar-height));
`

const RightContainer = styled.div`
  flex: 1;
  position: relative;
`

export default MCPSettings
