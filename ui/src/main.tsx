import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import "mantine-datatable/styles.layer.css";
import "mantine-contextmenu/styles.layer.css";
import './index.css'
import { Root } from './root'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)