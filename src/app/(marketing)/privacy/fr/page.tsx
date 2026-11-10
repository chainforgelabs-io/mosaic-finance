import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Mosaic Finance",
  description:
    "Comment Mosaic Finance traite vos renseignements. Nous ne demandons pas votre NAS, vos identifiants bancaires ni une pièce d'identité.",
};

export default function PrivacyFrPage() {
  return (
    <main>
      <Nav hideAuth />

      <section className="bg-slate-950 px-6 pb-16 pt-32">
        <div className="mx-auto max-w-[760px]">
          <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.1em] text-emerald">
            Politique de confidentialité
          </p>
          <h1 className="font-display text-[32px] font-bold leading-tight text-text-inverse sm:text-[42px]">
            Vos données restent les vôtres.
          </h1>
          <p className="mt-4 font-body text-base leading-relaxed text-text-inverse/60">
            En vigueur le 10 novembre 2026 &middot; Dernière mise à jour le 10 novembre 2026
          </p>
          <p className="mt-3">
            <a
              href="/privacy"
              className="font-body text-sm text-emerald underline underline-offset-2 hover:text-emerald-dark"
            >
              English
            </a>
          </p>
        </div>
      </section>

      <section className="bg-warm-50 px-6 py-16">
        <div className="mx-auto max-w-[760px] space-y-12">
          <Block title="Qui est responsable">
            <p>
              Mosaic Finance est exploité par ChainForge Labs, à Saskatoon, en
              Saskatchewan, au Canada. La personne responsable de la protection
              des renseignements personnels est l&rsquo;exploitant, joignable à{" "}
              <a
                href="mailto:hello@mosaicfinance.ai"
                className="text-emerald underline underline-offset-2 hover:text-emerald-dark"
              >
                hello@mosaicfinance.ai
              </a>
              .
            </p>
            <p>
              Nous recueillons seulement ce qui sert au suivi et au rapport
              éducatif. Nous ne vendons pas, ne louons pas et ne partageons pas
              vos renseignements à des fins de publicité.
            </p>
          </Block>

          <Block title="Ce que nous ne demandons pas">
            <ul>
              <li>
                Un nom légal saisi dans Mosaic. Si vous vous connectez avec
                Google, Google peut envoyer un nom d&rsquo;affichage et une
                photo au système de connexion. Nous nous en servons seulement
                pour vous connecter, et nous ne les mettons pas sur votre
                rapport Progress.
              </li>
              <li>Une pièce d&rsquo;identité gouvernementale</li>
              <li>Le numéro d&rsquo;assurance sociale</li>
              <li>Un numéro de compte bancaire, un mot de passe bancaire ou un jeton d&rsquo;accès bancaire</li>
              <li>Le numéro de carte de crédit (Stripe le traite; nous ne le voyons pas)</li>
              <li>L&rsquo;adresse domiciliaire exacte</li>
              <li>Le nom de l&rsquo;employeur</li>
            </ul>
          </Block>

          <Block title="Ce que nous recueillons">
            <ul>
              <li>
                <strong>Profil :</strong> alias, province, tranche d&rsquo;âge,
                type d&rsquo;emploi, structure familiale
              </li>
              <li>
                <strong>Finances que vous entrez :</strong> revenus, dépenses,
                dettes, objectifs, comptes et valeurs approximatives, tolérance
                au risque
              </li>
              <li>
                <strong>Suivi :</strong> opérations, budgets, objectifs,
                portraits de valeur nette, placements, et relevés ou reçus si
                vous les téléversez
              </li>
              <li>
                <strong>Conversations</strong> avec Charlie, le guide éducatif
              </li>
              <li>
                <strong>Compte :</strong> courriel et mot de passe, ou connexion
                Google
              </li>
              <li>
                <strong>Pointage</strong> de santé financière et son historique
              </li>
            </ul>
          </Block>

          <Block title="Pourquoi">
            <ul>
              <li>Produire le rapport Progress et répondre dans Charlie</li>
              <li>Afficher le suivi, les budgets, la valeur nette et le pointage</li>
              <li>Envoyer les courriels de service que vous avez demandés, et les courriels de marketing seulement si vous y avez consenti séparément</li>
            </ul>
            <p>
              Le consentement au traitement des renseignements financiers est
              distinct du consentement aux courriels de marketing. Vous pouvez
              retirer le second sans fermer le compte.
            </p>
          </Block>

          <Block title="Où les données se trouvent">
            <ul>
              <li>
                Les dossiers du compte sont au Canada (Supabase, AWS{" "}
                <code>ca-central-1</code>, Montréal). L&rsquo;application est
                servie depuis Montréal (Vercel).
              </li>
              <li>Chiffrement en transit (TLS) et au repos.</li>
              <li>Vous ne pouvez lire que vos propres données.</li>
            </ul>
            <p>
              Certains fournisseurs traitent des renseignements à
              l&rsquo;extérieur du Canada. Le contenu d&rsquo;une conversation
              avec Charlie et les chiffres nécessaires au rapport Progress sont
              envoyés à Anthropic.
            </p>
          </Block>

          <Block title="Fournisseurs">
            <ul>
              <li><strong>Supabase</strong> — authentification, base de données et fichiers, au Canada</li>
              <li><strong>Vercel</strong> — hébergement à Montréal</li>
              <li>
                <strong>Anthropic (Claude)</strong> — aux États-Unis. Conversations
                et chiffres nécessaires au rapport ou à une réponse de Charlie.
                Ce contenu n&rsquo;est pas utilisé pour entraîner les modèles
                d&rsquo;Anthropic.
              </li>
              <li><strong>Stripe</strong> — aux États-Unis. Paiements et factures. Nous ne voyons pas le numéro de carte.</li>
              <li><strong>Resend</strong> — aux États-Unis. Courriels, y compris l&rsquo;adresse du destinataire.</li>
              <li>
                <strong>Sentry</strong> — aux États-Unis. Rapports d&rsquo;erreur
                et un échantillon de rediffusions de session pour diagnostiquer
                les pannes. Le texte de la page est masqué. Nous n&rsquo;envoyons
                pas volontairement de montants, de numéros de compte ni de
                conversations.
              </li>
              <li><strong>Upstash</strong> — compteurs de limite de débit, pas votre profil financier ni vos conversations.</li>
            </ul>
          </Block>

          <Block title="Vos droits">
            <ul>
              <li>
                <strong>Accès et exportation</strong> — un fichier JSON dans les
                paramètres : profil, finances suivies, conversations et rapports
                Progress. Pour un relevé téléversé, écrivez-nous.
              </li>
              <li><strong>Rectification</strong> — modifiez ce que vous avez entré, ou écrivez-nous.</li>
              <li>
                <strong>Suppression</strong> — supprimez le compte dans les
                paramètres. Cela retire le compte Mosaic, les dossiers de
                l&rsquo;exportation et les fichiers téléversés que nous
                conservons. Si un abonnement payant est actif, annulez-le
                d&rsquo;abord, ou écrivez-nous et nous l&rsquo;annulerons.
                Stripe peut conserver les factures.
              </li>
              <li><strong>Retrait du consentement</strong> — cessez d&rsquo;utiliser le service et demandez la suppression.</li>
              <li><strong>Courriels de marketing</strong> — distincts des reçus. Désabonnement dans le message ou dans les paramètres.</li>
              <li>
                <strong>Plainte</strong> — écrivez-nous d&rsquo;abord. Vous
                pouvez aussi joindre le Commissariat à la protection de la vie
                privée du Canada. Au Québec, la Commission d&rsquo;accès à
                l&rsquo;information du Québec.
              </li>
            </ul>
          </Block>

          <Block title="Résultats automatisés">
            <p>
              Le pointage de santé financière et le rapport Progress sont
              produits automatiquement à partir de ce que vous fournissez et de
              ce que vous suivez. Ils sont éducatifs. Ils n&rsquo;approuvent ni
              ne refusent un crédit, une assurance, une couverture ou un compte.
              Pour une question sur un résultat : hello@mosaicfinance.ai.
            </p>
          </Block>

          <Block title="Durée de conservation">
            <ul>
              <li>Renseignements du compte : jusqu&rsquo;à la suppression du compte</li>
              <li>Courriel de liste d&rsquo;attente : jusqu&rsquo;au désabonnement ou à une demande de suppression</li>
              <li>Factures : conservées par Stripe comme dossier de paiement</li>
              <li>Compteurs d&rsquo;usage de Charlie (jetons et nombre de messages, pas le texte) : supprimés avec le compte</li>
            </ul>
          </Block>

          <Block title="Incident de confidentialité">
            <p>
              Si un incident crée un risque réel de préjudice grave, nous
              avisons les personnes concernées et le Commissariat à la
              protection de la vie privée du Canada, ainsi que la Commission
              d&rsquo;accès à l&rsquo;information du Québec lorsque la loi
              québécoise l&rsquo;exige. Nous tenons un registre des incidents de
              confidentialité.
            </p>
          </Block>

          <Block title="Témoins">
            <p>
              Mosaic Finance utilise seulement les témoins nécessaires à la
              connexion et à la session. Pas de témoins publicitaires ni de
              suivi intersite.
            </p>
          </Block>

          <Block title="Mineurs">
            <p>
              Mosaic Finance s&rsquo;adresse aux adultes de 18 ans et plus. Nous
              ne recueillons pas sciemment de renseignements sur une personne
              de moins de 18 ans. Un parent qui croit qu&rsquo;un enfant a créé
              un compte peut nous écrire et nous le supprimerons.
            </p>
          </Block>

          <Block title="Modifications">
            <p>
              Un changement important est envoyé par courriel aux personnes
              inscrites. La date en haut de la page est la date de la dernière
              version.
            </p>
          </Block>

          <Block title="Contact">
            <p>
              hello@mosaicfinance.ai
            </p>
            <p className="mt-2 text-text-muted">
              ChainForge Labs &middot; Saskatoon, Saskatchewan, Canada
            </p>
          </Block>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-bold text-text-primary">{title}</h2>
      <div className="space-y-3 font-body text-[15px] leading-relaxed text-text-secondary [&_code]:rounded [&_code]:bg-warm-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_strong]:font-semibold [&_strong]:text-text-primary [&_ul]:list-none [&_ul]:space-y-2 [&_ul]:pl-0 [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[10px] [&_li]:before:h-1.5 [&_li]:before:w-1.5 [&_li]:before:rounded-full [&_li]:before:bg-emerald">
        {children}
      </div>
    </div>
  );
}
