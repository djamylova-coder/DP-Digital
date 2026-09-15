import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata={title:'DP Digital — Administration',description:'Console d’administration DP Digital'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}
