import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { PinPad } from '@/components/ui/PinPad';

interface ProfileSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'current' | 'new' | 'confirm';

export function ProfileSettingsModal({ open, onOpenChange }: ProfileSettingsModalProps) {
  const { profile, changePin } = useAuth();
  const [step, setStep] = useState<Step>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorSignal, setErrorSignal] = useState(0);

  const reset = () => {
    setStep('current');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const advanceFromCurrent = (pin: string) => {
    setCurrentPin(pin);
    setStep('new');
  };

  const advanceFromNew = (pin: string) => {
    setNewPin(pin);
    setStep('confirm');
  };

  const handleConfirm = async (pin: string) => {
    setConfirmPin(pin);
    if (pin !== newPin) {
      setErrorSignal((n) => n + 1);
      setConfirmPin('');
      toast.error('Los PINs no coinciden');
      return;
    }
    setSubmitting(true);
    try {
      await changePin(currentPin, newPin);
      toast.success('PIN actualizado');
      handleOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar el PIN';
      toast.error(msg);
      setErrorSignal((n) => n + 1);
      setCurrentPin('');
      setConfirmPin('');
      setStep('current');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[color:var(--color-overlay)] backdrop-blur-sm"
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed left-1/2 top-1/2 z-50 flex w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-6 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-8 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <Dialog.Title className="font-display text-xl font-semibold text-[color:var(--color-fg)]">
                  Cambiar PIN
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-[color:var(--color-fg-muted)]">
                  {profile?.full_name || profile?.email}
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="cursor-pointer rounded-lg p-1 text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-fg)]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
              >
                <X size={20} />
              </Dialog.Close>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-4"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
                  {step === 'current' && 'PIN actual'}
                  {step === 'new' && 'Nuevo PIN'}
                  {step === 'confirm' && 'Confirmar PIN'}
                </p>
                {step === 'current' && (
                  <PinPad
                    value={currentPin}
                    onChange={setCurrentPin}
                    onComplete={advanceFromCurrent}
                    errorSignal={errorSignal}
                    disabled={submitting}
                  />
                )}
                {step === 'new' && (
                  <PinPad
                    value={newPin}
                    onChange={setNewPin}
                    onComplete={advanceFromNew}
                    disabled={submitting}
                  />
                )}
                {step === 'confirm' && (
                  <PinPad
                    value={confirmPin}
                    onChange={setConfirmPin}
                    onComplete={handleConfirm}
                    errorSignal={errorSignal}
                    disabled={submitting}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
