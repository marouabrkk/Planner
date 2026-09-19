// Quand l'inscription est validée par le backend :
if (authMode === 'register') {
  saveAuthVaultPassword(lowerEmail, password);
  setIsLoading(false);
  // Redirection IMMÉDIATE vers l'écran de paiement BaridiMob en mode "en attente"
  onLogin(lowerEmail, isOwner || approved);
  return;
}
if (authMode === 'register') {
  saveAuthVaultPassword(lowerEmail, password);
  setIsLoading(false);
  // Passe immédiatement sur la page BaridiMob
  onLogin(lowerEmail, isOwner);
  return;
}
