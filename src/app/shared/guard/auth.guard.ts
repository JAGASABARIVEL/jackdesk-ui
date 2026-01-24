import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AppInitializationService } from '../services/init.services';

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const appInitService = inject(AppInitializationService);
  
  const profile = JSON.parse(localStorage.getItem('profile') || 'null');
  
  if (!profile?.access) {
    router.navigate(['/apps/login']);
    return false;
  }
  
  try {
    await appInitService.initializeApp(profile);
    return true;
  } catch (err) {
    console.error('Auth guard initialization failed:', err);
    return false;
  }
};