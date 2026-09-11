import { Geist, Geist_Mono } from "next/font/google"; // Import Geist fonts
import "@/styles/globals.css"; // Import global styles

import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
// Initialize Geist Sans font with variable and subsets
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Initialize Geist Mono font with variable and subsets
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata for the application (e.g., for SEO and browser tab)
export const metadata = {
  title: "TickPulse", // Updated title
  description: "A task management and productivity application.", // Updated description
};

/**
 * RootLayout component for the application.
 * This component wraps all pages and provides a consistent structure.
 * @param {object} props - The properties passed to the component.
 * @param {React.ReactNode} props.children - The child components to be rendered within the layout.
 * @returns {JSX.Element} The root layout structure.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW" className="dark" suppressHydrationWarning>
      <body>
        {/* 🎯 關鍵：所有的 Providers 必須塞在最外層，這樣全站所有頁面與子 Layout 才能調用 useAuth */}
        <ToastProvider>

            <AuthProvider>
              <ThemeProvider>
                {children}
              </ThemeProvider>
            
    </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
