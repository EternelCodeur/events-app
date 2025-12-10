import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getEventImages, getImageBlobUrl, deleteEventImage } from "@/lib/eventImages";
import { ChevronLeft, ChevronRight, Download, RefreshCcw, X, CheckSquare, Square } from "lucide-react";

export type AlbumImage = {
  id: string;
  name: string;
  blobUrl: string;
};

const EventAlbum: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const anySelected = useMemo(() => Object.values(selected).some(Boolean), [selected]);
  const allSelected = useMemo(() => images.length > 0 && images.every(img => selected[img.id]), [images, selected]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const list = await getEventImages(id);
        const urls = await Promise.all(list.map(async (it) => ({
          id: it.id,
          name: it.originalName || `image-${it.id}`,
          blobUrl: await getImageBlobUrl(it.id),
        })));
        if (!cancelled) {
          setImages(urls);
          // preserve selection for ids still present
          setSelected((prev) => {
            const next: Record<string, boolean> = {};
            urls.forEach(u => { next[u.id] = Boolean(prev[u.id]); });
            return next;
          });
        }
      } catch (e) {
        if (!cancelled) setError((e as { message?: string })?.message || "Erreur de chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    return () => {
      // Cleanup blob URLs
      images.forEach(img => URL.revokeObjectURL(img.blobUrl));
    };
  }, [images]);

  const toggleSelect = (img: AlbumImage) => {
    setSelected((prev) => ({ ...prev, [img.id]: !prev[img.id] }));
  };
  const selectAll = () => setSelected(images.reduce((acc, it) => ({ ...acc, [it.id]: true }), {} as Record<string, boolean>));
  const clearSelection = () => setSelected({});

  const openAt = (idx: number) => { setCurrentIndex(idx); setLightboxOpen(true); };
  const prev = () => setCurrentIndex((i) => (images.length ? (i - 1 + images.length) % images.length : 0));
  const next = () => setCurrentIndex((i) => (images.length ? (i + 1) % images.length : 0));

  async function downloadBlobUrl(url: string, filename: string) {
    try {
      const a = document.createElement("a");
      a.href = url; // direct blob URL; ne pas révoquer ici car utilisé par l'UI
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch { /* noop */ }
  }

  const downloadOne = async (img: AlbumImage) => {
    await downloadBlobUrl(img.blobUrl, img.name || `image-${img.id}`);
  };

  const deleteOne = async (img: AlbumImage) => {
    try {
      await deleteEventImage(img.id);
      URL.revokeObjectURL(img.blobUrl);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      setSelected((prev) => {
        const { [img.id]: _omit, ...rest } = prev;
        return rest;
      });
    } catch (e) {
      setError((e as { message?: string })?.message || "Échec de suppression");
    }
  };

  const downloadSelected = async () => {
    const sel = images.filter(it => selected[it.id]);
    for (const it of sel) {
      // séquentiel pour éviter les blocages navigateurs
      await downloadBlobUrl(it.blobUrl, it.name || `image-${it.id}`);
    }
  };

  const refresh = () => {
    // trigger reload by resetting deps
    (async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const list = await getEventImages(id);
        const urls = await Promise.all(list.map(async (it) => ({
          id: it.id,
          name: it.originalName || `image-${it.id}`,
          blobUrl: await getImageBlobUrl(it.id),
        })));
        setImages(urls);
        setSelected({});
      } catch (e) {
        setError((e as { message?: string })?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Album de l'événement</h1>
          {error && <div className="text-destructive text-sm">{error}</div>}
          {loading && <div className="text-sm text-muted-foreground">Chargement...</div>}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Retour</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={refresh}>
          <RefreshCcw className="w-4 h-4 mr-1" /> Rafraîchir
        </Button>
        <Button type="button" variant="outline" onClick={selectAll} disabled={images.length === 0 || allSelected}>
          <CheckSquare className="w-4 h-4 mr-1" /> Tout sélectionner
        </Button>
        <Button type="button" variant="outline" onClick={clearSelection} disabled={!anySelected}>
          <Square className="w-4 h-4 mr-1" /> Tout désélectionner
        </Button>
        <Button type="button" className="bg-primary hover:bg-primary-hover text-white" onClick={downloadSelected} disabled={!anySelected}>
          <Download className="w-4 h-4 mr-1" /> Télécharger sélectionnées
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
        {images.map((img, idx) => (
          <div key={img.id} className="relative group border border-border rounded-md overflow-hidden">
            <div
              className="absolute top-2 left-2 z-10 rounded bg-black/50 p-1"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={!!selected[img.id]}
                onCheckedChange={(checked) => setSelected((prev) => ({ ...prev, [img.id]: Boolean(checked) }))}
                aria-label={selected[img.id] ? "Désélectionner" : "Sélectionner"}
              />
            </div>
            <button
              type="button"
              className="absolute top-2 right-10 z-10 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100"
              aria-label="Supprimer"
              onClick={() => deleteOne(img)}
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100"
              aria-label="Télécharger"
              onClick={() => downloadOne(img)}
            >
              <Download className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => openAt(idx)} className="block focus:outline-none">
              <img src={img.blobUrl} alt={img.name} loading="lazy" className="block max-w-full h-auto mx-auto object-contain" />
            </button>
          </div>
        ))}
        {images.length === 0 && !loading && (
          <div className="text-sm text-muted-foreground">Aucune image</div>
        )}
      </div>

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
                src={images[currentIndex]?.blobUrl}
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
    </div>
  );
};

export default EventAlbum;
