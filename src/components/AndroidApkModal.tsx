import React from 'react';
import { InstallAppModal } from './InstallAppModal';

interface AndroidApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportBackup?: () => void;
}

export const AndroidApkModal: React.FC<AndroidApkModalProps> = ({
  isOpen,
  onClose,
  onExportBackup,
}) => {
  return (
    <InstallAppModal
      isOpen={isOpen}
      onClose={onClose}
      onExportBackup={onExportBackup}
    />
  );
};
