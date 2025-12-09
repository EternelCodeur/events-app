import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarDays, Building2, Users, Briefcase, BarChart3, Shield, ClipboardCheck, Wallet, ArrowRight } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 5);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="min-h-screen relative text-foreground flex flex-col bg-landing-gradient">
      <header className={`fixed top-0 left-0 right-0 z-20 w-full text-white border-b border-blue-800 transition-colors duration-300 ${scrolled ? 'bg-blue-900/80 backdrop-blur-sm shadow-md' : 'bg-blue-900 shadow-sm'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/ng-events.png" alt="Logo" className="h-16 w-16 bg-white/80 p-2 rounded-full shadow" />
          <div className="text-xl font-bold">OKOUME EVENTS</div>
          </div>
          <div className="space-x-3">
            <Button className="bg-white text-blue-900 hover:bg-white/90" onClick={() => navigate("/login")}>Se connecter</Button>
          </div>
        </div>
      </header>

      <main className="relative flex-1 pt-6 md:pt-12">
        <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">La plateforme pour gérer vos évènements et vos salles</h1>
            <p className="mt-4 text-muted-foreground text-lg">Planifiez, organisez et centralisez vos évènements, invités, prestataires et médias au même endroit.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white/60 dark:bg-white/5 backdrop-blur-sm shadow-md overflow-hidden p-3">
            <div className="grid grid-cols-4 grid-rows-2 gap-2 md:gap-3 h-72 md:h-[420px]">
              <img
                src="img1.jpeg"
                alt="Salle d'évènement 1"
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
              <img
                src="img2.jpeg"
                alt="Salle d'évènement 2"
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
              <img
                src="img3.jpeg"
                alt="Salle d'évènement 3"
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
              <img
                src="img4.jpeg"
                alt="Salle d'évènement 4"
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
              <img
                src="img5.jpeg"
                alt="Salle d'évènement 5"
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
              <img
                src="img6.jpeg"
                alt="Salle d'évènement 6"
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
              <img
                src="img7.jpeg"
                alt="Salle d'évènement 7"
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
              <img
                src="img8.jpeg"
                alt="Salle d'évènement 8"
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        <section className="border-y border-border/50">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <h2 className="text-2xl md:text-3xl font-bold">Modules clés</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex items-center gap-2 font-medium"><CalendarDays className="w-4 h-4" /> Évènements</div>
                <div className="text-xs text-muted-foreground mt-1">Planning, tâches, affectations</div>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex items-center gap-2 font-medium"><Building2 className="w-4 h-4" /> Salles</div>
                <div className="text-xs text-muted-foreground mt-1">Disponibilités, capacités, albums</div>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex items-center gap-2 font-medium"><Users className="w-4 h-4" /> Invités & tables</div>
                <div className="text-xs text-muted-foreground mt-1">Listes, placements, check-ins</div>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex items-center gap-2 font-medium"><ClipboardCheck className="w-4 h-4" /> Pointages</div>
                <div className="text-xs text-muted-foreground mt-1">Présences, contrôle d'accès</div>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex items-center gap-2 font-medium"><Wallet className="w-4 h-4" /> Dépenses</div>
                <div className="text-xs text-muted-foreground mt-1">Budgets, suivis, validations</div>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex items-center gap-2 font-medium"><Briefcase className="w-4 h-4" /> Prestataires & équipe</div>
                <div className="text-xs text-muted-foreground mt-1">Contrats, rôles, affectations</div>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex items-center gap-2 font-medium"><BarChart3 className="w-4 h-4" /> Rapports</div>
                <div className="text-xs text-muted-foreground mt-1">Tableaux de bord & statistiques</div>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex items-center gap-2 font-medium"><Shield className="w-4 h-4" /> Sécurité & rôles</div>
                <div className="text-xs text-muted-foreground mt-1">Accès par rôle, multi-entreprise</div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border border-border">
              <div className="text-lg font-semibold">Productivité</div>
              <div className="text-sm text-muted-foreground mt-2">Workflows simples, actions rapides et vues adaptées pour gagner du temps.</div>
            </div>
            <div className="p-6 rounded-lg border border-border">
              <div className="text-lg font-semibold">Scalabilité</div>
              <div className="text-sm text-muted-foreground mt-2">Gérez plusieurs évènements, équipes et sites sans friction.</div>
            </div>
            <div className="p-6 rounded-lg border border-border">
              <div className="text-lg font-semibold">Fiabilité</div>
              <div className="text-sm text-muted-foreground mt-2">Sécurité par rôles, contrôle d’accès et traçabilité des actions.</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative bg-black z-10 w-full border-t border-border">
        <div className="max-w-6xl flex justify-between mx-auto px-6 py-6 text-xs text-muted-foreground">
          <div className="text-white text-md font-bold">© {new Date().getFullYear()} Okoumé EVENTS — Tous droits réservés</div>
          <div className="mt-1 text-white text-md font-bold">Développé par <a href="https://eternelcodeur.vercel.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-500">EternelCodeur</a></div>
        </div>
      </footer>
    </div>
  );
}
