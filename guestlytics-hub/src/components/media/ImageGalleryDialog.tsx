import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type ImageGalleryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  images: string[];
};

export const ImageGalleryDialog: React.FC<ImageGalleryDialogProps> = ({ open, onOpenChange, title = "Galerie", images }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!lightboxOpen) setCurrentIndex(0);
  }, [lightboxOpen]);

  const openAt = (idx: number) => {
    setCurrentIndex(idx);
    setLightboxOpen(true);
  };
  const prev = () => setCurrentIndex((i) => (images.length ? (i - 1 + images.length) % images.length : 0));
  const next = () => setCurrentIndex((i) => (images.length ? (i + 1) % images.length : 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {images.length > 0 ? (
          <div className="max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="border border-border rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  onClick={() => openAt(idx)}
                >
                  <img src={src} alt={`photo ${idx + 1}`} className="w-full h-30 object-cover" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Aucune photo pour le moment</div>
        )}
      </DialogContent>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl" aria-describedby={undefined}>
          <DialogHeader className="sr-only">
            <DialogTitle>Aperçu de l'image</DialogTitle>
          </DialogHeader>
          <div
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") prev();
              if (e.key === "ArrowRight") next();
            }}
            className="relative outline-none"
          >
            <button
              type="button"
              aria-label="Fermer"
              className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            {images.length > 0 && (
              <img
                src={images[currentIndex]}
                alt={`image ${currentIndex + 1}`}
                className="mx-auto max-h-[75vh] w-auto max-w-full object-contain"
              />
            )}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Précédent"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
                  onClick={prev}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  aria-label="Suivant"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
                  onClick={next}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
