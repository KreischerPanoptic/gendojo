import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/code-highlight/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/nprogress/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/dates/styles.css';
import "mantine-datatable/styles.layer.css";
import "mantine-contextmenu/styles.layer.css";
import '@gfazioli/mantine-compare/styles.css';
import '@gfazioli/mantine-split-pane/styles.css';
import './index.css'
import { Root } from './root'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)