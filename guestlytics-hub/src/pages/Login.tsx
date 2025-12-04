import { FormEvent, useEffect, useState, type ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, UserRole } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login as apiLogin } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";
import { Eye, EyeOff, ClipboardList, ShieldCheck, Layers, CalendarDays, Users, BarChart3 } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";

const Login = () => {
  const { setRole, setUser } = useUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  type Slide = { icon: ElementType; title: string; description: string };
  const slides: Slide[] = [
    {
      icon: ClipboardList,
      title: "Pointages simplifiés",
      description:
        "Arrivées, départs et pauses centralisés; signature numérique et exports journaliers.",
    },
    {
      icon: ShieldCheck,
      title: "Sécurité et contrôle",
      description:
        "Accès par rôles (superadmin, admin, hôtesse, utilisateur), journal d’audit et confidentialité des données.",
    },
    {
      icon: Layers,
      title: "Multi‑tenant par entreprise",
      description:
        "Chaque entreprise dispose de son espace isolé; données cloisonnées et permissions dédiées.",
    },
    {
      icon: CalendarDays,
      title: "Planification d’événements",
      description:
        "Créez, planifiez et gérez événements, salles et zones; synchronisation continue.",
    },
    {
      icon: Users,
      title: "Équipes et hôtesses",
      description:
        "Affectations, suivi de présence et coordination simplifiée sur site.",
    },
    {
      icon: BarChart3,
      title: "Tableaux de bord et rapports",
      description:
        "Indicateurs du jour, historiques et exports pour piloter vos opérations.",
    },
  ];

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setSelectedIndex(carouselApi.selectedScrollSnap());
    carouselApi.on("select", onSelect);
    onSelect();
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) return;
    const id = setInterval(() => {
      if (carouselApi.canScrollNext()) carouselApi.scrollNext();
      else carouselApi.scrollTo(0);
    }, 5000);
    return () => clearInterval(id);
  }, [carouselApi]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      const user = await apiLogin(email, password, remember);
      // Hydrate immédiatement le contexte utilisateur pour que ProtectedRoute laisse passer
      setUser(user);
      const rawRole = (user.role as unknown as string) || "admin";
      const roleForNav: UserRole =
        rawRole === "user"
          ? "utilisateur"
          : (['superadmin','admin','hotesse','utilisateur'].includes(rawRole)
              ? (rawRole as UserRole)
              : "admin");
      setRole(roleForNav);
      if (roleForNav === "superadmin") navigate("/super-admin/dashboard");
      else if (roleForNav === "admin") navigate("/admin/dashboard");
      else if (roleForNav === "hotesse") navigate("/hotesse/guests");
      else navigate("/utilisateur/pointages");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connexion impossible";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gradient-to-br from-sky-500 via-white to-orange-300">
      <div className="relative m-10 hidden lg:flex items-center justify-center p-12 text-slate-900">
        <div className="max-w-xl w-full">
          <Carousel setApi={(api) => setCarouselApi(api)} opts={{ loop: true }}>
            <CarouselContent>
              {slides.map((s, i) => {
                const Icon = s.icon;
                return (
                  <CarouselItem key={i}>
                    <div className="text-center space-y-3">
                      <div className="mx-auto h-12 w-12 rounded-full bg-white/80 flex items-center justify-center shadow">
                        <Icon className="h-6 w-6 text-sky-700" />
                      </div>
                      <h2 className="text-2xl font-semibold">{s.title}</h2>
                      <p className="text-sm text-slate-700">{s.description}</p>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="bg-white/80 text-slate-900 border-white/30 hover:bg-white" />
            <CarouselNext className="bg-white/80 text-slate-900 border-white/30 hover:bg-white" />
          </Carousel>
        </div>
        <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Aller au slide ${i + 1}`}
              onClick={() => carouselApi?.scrollTo(i)}
              className={`${selectedIndex === i ? "bg-slate-900" : "bg-slate-900/40"} h-1.5 w-6 rounded-full`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <img src="/ng-events.png" alt="Logo" className="h-24 w-24 rounded-full bg-white/80 p-2 shadow" />
          </div>
          <div className="space-y-1 text-left mb-4">
            <h1 className="text-2xl font-bold text-foreground">Bienvenue</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Adresse email</label>
              <Input type="email" placeholder="votre.email@entreprise.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Masquer le code" : "Afficher le code"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-x-2 flex items-center">
                <input id="remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <label htmlFor="remember" className="text-sm text-foreground">Se souvenir de moi</label>
              </div>
            </div>

            {/* Aucun choix de rôle côté UI: l'accès dépend des identifiants en base */}

            <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 text-white hover:opacity-90">
              Se connecter
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Okoumé EVENTS . Tous droits réservés.
            <div>Développé par <a href="https://eternelcodeur.vercel.app/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900 font-bold">ETERNEL CODEUR</a></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
