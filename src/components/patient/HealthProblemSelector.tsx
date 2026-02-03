import { useState, useCallback } from 'react';
import { Volume2, Check, X, Loader2, Send, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

// Health problem images with IDs and descriptions
export const HEALTH_PROBLEMS = [
  { id: 'IMG_001', name: 'Paludisme', description: 'Fièvre, frissons, maux de tête - Paludisme', emoji: '🦟' },
  { id: 'IMG_002', name: 'Fièvre', description: 'Fièvre élevée, température corporelle haute', emoji: '🌡️' },
  { id: 'IMG_003', name: 'Toux', description: 'Toux persistante, irritation de la gorge', emoji: '🤧' },
  { id: 'IMG_004', name: 'Mal de ventre', description: 'Douleurs abdominales, mal au ventre', emoji: '🤢' },
  { id: 'IMG_005', name: 'Mal de tête', description: 'Maux de tête, migraine, céphalées', emoji: '🤕' },
  { id: 'IMG_006', name: 'Grossesse', description: 'Suivi de grossesse, consultation prénatale', emoji: '🤰' },
  { id: 'IMG_007', name: 'Enfant malade', description: 'Enfant malade, consultation pédiatrique', emoji: '👶' },
  { id: 'IMG_008', name: 'Blessure', description: 'Blessure, plaie, accident', emoji: '🩹' },
  { id: 'IMG_009', name: 'Douleur au dos', description: 'Douleurs dorsales, mal au dos', emoji: '🦴' },
  { id: 'IMG_010', name: 'Problème de peau', description: 'Problème dermatologique, éruption cutanée', emoji: '🧴' },
  { id: 'IMG_011', name: 'Problème respiratoire', description: 'Difficultés à respirer, essoufflement', emoji: '💨' },
  { id: 'IMG_012', name: 'Douleur à la poitrine', description: 'Douleur thoracique, oppression', emoji: '❤️‍🩹' },
  { id: 'IMG_013', name: 'Fatigue', description: 'Fatigue intense, épuisement général', emoji: '😴' },
  { id: 'IMG_014', name: 'Problème dentaire', description: 'Mal aux dents, problème dentaire', emoji: '🦷' },
  { id: 'IMG_015', name: 'Problème de vue', description: 'Difficultés visuelles, problème aux yeux', emoji: '👁️' },
  { id: 'IMG_016', name: 'Allergie', description: 'Réaction allergique, démangeaisons', emoji: '🤧' },
];

interface HealthProblemSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (description: string) => void;
}

export function HealthProblemSelector({ open, onClose, onSelect }: HealthProblemSelectorProps) {
  const { toast } = useToast();
  const [selectedProblem, setSelectedProblem] = useState<typeof HEALTH_PROBLEMS[0] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Text-to-speech function
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      setIsPlaying(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      
      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        variant: 'destructive',
        title: 'Non supporté',
        description: 'La lecture audio n\'est pas disponible sur votre appareil.',
      });
    }
  }, [toast]);

  const handleProblemClick = (problem: typeof HEALTH_PROBLEMS[0]) => {
    setSelectedProblem(problem);
    // Automatically speak the description
    speakText(problem.description);
    // Open confirmation dialog
    setConfirmDialogOpen(true);
  };

  const handleConfirm = () => {
    if (selectedProblem) {
      onSelect(selectedProblem.description);
      setConfirmDialogOpen(false);
      onClose();
      toast({
        title: 'Problème sélectionné',
        description: `"${selectedProblem.name}" a été ajouté à votre consultation.`,
      });
    }
  };

  const handleCancel = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setConfirmDialogOpen(false);
    setSelectedProblem(null);
  };

  const handleReplay = () => {
    if (selectedProblem) {
      speakText(selectedProblem.description);
    }
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ImageIcon className="h-5 w-5 text-primary" />
              Décrire votre problème avec des images
            </DialogTitle>
            <DialogDescription>
              Cliquez sur une image pour la sélectionner. Vous entendrez une description et pourrez confirmer.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] px-4 pb-4">
            <div className="grid grid-cols-2 gap-3 py-4">
              {HEALTH_PROBLEMS.map((problem) => (
                <Card
                  key={problem.id}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                    selectedProblem?.id === problem.id ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleProblemClick(problem)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-4xl mb-2">{problem.emoji}</div>
                    <p className="font-medium text-sm">{problem.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t bg-muted/30">
            <Button variant="outline" className="w-full" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {selectedProblem && (
                <span className="text-6xl block mb-4">{selectedProblem.emoji}</span>
              )}
              Confirmer votre choix
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              {selectedProblem?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleReplay}
              disabled={isPlaying}
              className="gap-2"
            >
              {isPlaying ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Lecture en cours...
                </>
              ) : (
                <>
                  <Volume2 className="h-5 w-5" />
                  Réécouter
                </>
              )}
            </Button>
          </div>

          <DialogFooter className="flex gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Non
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Oui, confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Button component to open the selector
interface HealthProblemButtonProps {
  onSelect: (description: string) => void;
}

export function HealthProblemButton({ onSelect }: HealthProblemButtonProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full py-6 border-dashed border-2 hover:border-primary hover:bg-primary/5"
        onClick={() => setSelectorOpen(true)}
      >
        <ImageIcon className="h-6 w-6 mr-3 text-primary" />
        <div className="text-left">
          <p className="font-medium">Décrire avec des images</p>
          <p className="text-xs text-muted-foreground">Pour personnes ne sachant pas écrire</p>
        </div>
      </Button>
      
      <HealthProblemSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={(description) => {
          onSelect(description);
          setSelectorOpen(false);
        }}
      />
    </>
  );
}
