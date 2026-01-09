/**
 * Determina a qué paso del onboarding debe redirigir al usuario
 * basándose en su estado actual (wallet y username)
 */
export async function getOnboardingRedirect(): Promise<string> {
  try {
    // Verificar estado de wallet
    const walletResponse = await fetch('/api/wallet/status', { cache: 'no-store' });
    
    if (!walletResponse.ok) {
      if (walletResponse.status === 401) {
        return '/login';
      }
      return '/onboarding';
    }

    const walletData = await walletResponse.json();
    
    // Si no tiene wallet o está pendiente → /onboarding
    if (!walletData.wallet || walletData.wallet.status !== 'verified') {
      return '/onboarding';
    }
    
    // Si tiene wallet verificada, verificar si tiene username
    const userResponse = await fetch('/api/auth/me', { cache: 'no-store' });
    
    if (!userResponse.ok) {
      return '/onboarding';
    }
    
    const userData = await userResponse.json();
    
    // Si no tiene username → /onboarding/complete
    if (!userData.user?.username) {
      return '/onboarding/complete';
    }
    
    // Ya completó todo, puede acceder normalmente
    return '/dashboard';
  } catch (error) {
    console.error('Error determinando redirección de onboarding:', error);
    return '/onboarding';
  }
}
