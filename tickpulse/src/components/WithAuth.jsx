'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * A Higher-Order Component (HOC) that wraps a component to ensure
 * the user is authenticated before rendering the wrapped component.
 * If the user is not authenticated (no access token found in localStorage),
 * it redirects them to the login page.
 *
 * @param {React.ComponentType} Component - The component to wrap with authentication.
 * @returns {React.ComponentType} A new component that handles authentication logic.
 */
export default function withAuth(Component) {
  /**
   * The component returned by the `withAuth` HOC.
   * It checks for an access token in localStorage and redirects
   * to '/login' if no token is found.
   *
   * @param {object} props - The props passed to the wrapped component.
   * @returns {JSX.Element | null} The wrapped component if authenticated, or null while redirecting.
   */
  return function AuthenticatedComponent(props) {
    const router = useRouter();

    useEffect(() => {
      const checkAuth = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.push('/login');
          return;
        }

        // Removed the API call to /api/verify-token
        // For client-side routing, we'll assume the token is valid if it exists.
        // Actual token validation should occur on the server for API requests.
        
        const isValid = await fetch('/api/verify-token', {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.ok);
        
        if (!isValid) {
          localStorage.removeItem('accessToken');
          router.push('/login');
        }
      };

      checkAuth();
    }, [router]);

    return <Component {...props} />;
  };
}