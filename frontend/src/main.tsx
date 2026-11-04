import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { Compare } from './pages/Compare'
import { Report } from './pages/Report'
import { Review } from './pages/Review'
import { Upload } from './pages/Upload'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Upload /> },
      { path: 'review/:scanId', element: <Review /> },
      { path: 'compare/:afterId/:beforeId', element: <Compare /> },
      { path: 'report/:scanId', element: <Report /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
