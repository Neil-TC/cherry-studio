import { Alert, Button, Space } from 'antd'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

const OpenClawDisabledPage: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Container>
      <Content>
        <Alert
          type="info"
          showIcon
          message={t('title.openclaw')}
          description={t('openclaw.not_installed.description')}
        />
        <Space>
          <Button type="primary" onClick={() => navigate('/settings/provider')}>
            {t('settings.provider.title')}
          </Button>
          <Button onClick={() => navigate('/')}>{t('title.assistants')}</Button>
        </Space>
      </Content>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
`

const Content = styled.div`
  width: min(680px, 90%);
  display: flex;
  flex-direction: column;
  gap: 16px;
`

export default OpenClawDisabledPage
