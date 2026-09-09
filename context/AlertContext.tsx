import React, { createContext, useContext, useState, useCallback } from 'react';
import { CustomAlertModal, CustomAlertConfig } from '../components/common/CustomAlertModal';

interface AlertContextValue {
  showAlert: (config: CustomAlertConfig) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alertConfig, setAlertConfig] = useState<CustomAlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const showAlert = useCallback((config: CustomAlertConfig) => {
    setAlertConfig(config);
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <CustomAlertModal
        visible={visible}
        config={alertConfig}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
}

export function useCustomAlert(): AlertContextValue {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useCustomAlert must be used within an AlertProvider');
  }
  return context;
}
