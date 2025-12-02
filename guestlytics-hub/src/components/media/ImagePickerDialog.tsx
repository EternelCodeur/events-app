import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export type ImagePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  maxFiles?: number;
  onConfirm: (images: string[]) => void; // data URLs
  onConfirmWithFiles?: (files: File[], previews: string[]) => void; // optional, original files
};

export const ImagePickerDialog: React.FC<ImagePickerDialogProps> = ({ open, onOpenChange, title = "Ajouter des photos", maxFiles = 30, onConfirm, onConfirmWithFiles }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setPreviews([]);
    }
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const urls: string[] = [];
      for (const f of files) {
        const url = await fileToDataUrl(f);
        if (!cancelled) urls.push(url);
      }
      if (!cancelled) setPreviews(urls);
    })();
    return () => { cancelled = true; };
  }, [files]);

  const countInfo = useMemo(() => `${previews.length}/${maxFiles}`, [previews.length, maxFiles]);

  const removeAt = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;
    setFiles((prev) => {
      const next = [...prev, ...list].slice(0, maxFiles);
      return next;
    });
  };

  const handleConfirm = () => {
    if (previews.length === 0) { onOpenChange(false); return; }
    onConfirm(previews);
    if (onConfirmWithFiles) {
      onConfirmWithFiles(files, previews);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="image-picker-input" className="sr-only">Sélectionner des images</label>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id="image-picker-input"
              aria-label="Sélectionner des images"
              onChange={handlePick}
            />
            <Button type="button" className="bg-primary hover:bg-primary-hover" onClick={() => inputRef.current?.click()}>Sélectionner</Button>
            <div className="text-xs text-muted-foreground">{countInfo}</div>
          </div>
          {previews.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {previews.map((src, idx) => (
                <div key={idx} className="relative group border border-border rounded-md overflow-hidden">
                  <img src={src} alt="prévisualisation" className="w-full h-32 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100"
                    aria-label="Retirer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Aucune image sélectionnée</div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="button" className="bg-primary hover:bg-primary-hover" onClick={handleConfirm}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
