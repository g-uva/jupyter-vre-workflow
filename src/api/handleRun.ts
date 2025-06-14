import React from 'react';
import { IHandleRunApi } from '../helpers/types';

interface IUseHandleRunProps {
  onRunScript: ({ script }: IHandleRunApi) => Promise<void>;
}

export default async function useHandleRun({
  onRunScript
}: IUseHandleRunProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleRun = async (script: string) => {
    setIsProcessing(true);
    try {
      await onRunScript({ script });
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };
  return {
    handleRun,
    isProcessing,
    setIsProcessing
  };
}
