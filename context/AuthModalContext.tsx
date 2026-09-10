import React, { createContext, useContext, useState, useCallback } from 'react';
import { AuthModal } from '../components/auth/AuthModal';

interface AuthModalContextType {
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openAuthModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal, isAuthModalOpen: isOpen }}>
      {children}
      <AuthModal visible={isOpen} onClose={closeAuthModal} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextType {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}
