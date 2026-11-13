import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Mosaic Finance",
  description:
    "Conditions d'utilisation de Mosaic Finance. Un outil de suivi et d'éducation financière — pas un conseil financier.",
};

export default function TermsFrPage() {
  return (
    <main>
      <Nav hideAuth />

      <section className="bg-slate-950 px-6 pb-16 pt-32">
        <div className="mx-auto max-w-[760px]">
          <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.1em] text-emerald">
            Conditions d&rsquo;utilisation
          </p>
          <h1 className="font-display text-[32px] font-bold leading-tight text-text-inverse sm:text-[42px]">
            Des conditions claires.
          </h1>
          <p className="mt-4 font-body text-base leading-relaxed text-text-inverse/60">
            En vigueur le 10 novembre 2026 &middot; Dernière mise à jour le 10 novembre 2026
          </p>
          <p className="mt-3">
            <a
              href="/terms"
              className="font-body text-sm text-emerald underline underline-offset-2 hover:text-emerald-dark"
            >
              English
            </a>
          </p>
        </div>
      </section>

      <section className="bg-warm-50 px-6 py-16">
        <div className="mx-auto max-w-[760px] space-y-12">
          <Block title="1. Ce qu'est Mosaic Finance">
            <p>
              Mosaic Finance (le « Service ») est un tableau de bord de suivi,
              de budget et de valeur nette, avec des outils éducatifs, exploité
              par ChainForge Labs (« nous »), établi à Saskatoon, en
              Saskatchewan, au Canada.
            </p>
            <p>
              Le Service utilise l&rsquo;intelligence artificielle pour produire
              des rapports Progress éducatifs à partir des renseignements que
              vous fournissez. Ces rapports décrivent votre trajectoire actuelle
              et des options à connaître. Ils sont livrés sans délai d&rsquo;examen.
            </p>
          </Block>

          <Block title="2. Ce que Mosaic Finance n'est pas">
            <div className="rounded-lg border border-warm-200 bg-white p-5">
              <p className="font-display text-sm font-semibold text-text-primary">
                Avertissement
              </p>
              <p className="mt-2">
                Mosaic Finance ne fournit pas de conseil financier ni de conseil
                en placement inscrit. C&rsquo;est une plateforme de suivi et
                d&rsquo;éducation. Les rapports Progress et les conversations
                avec Charlie sont éducatifs. Ils ne remplacent pas un conseiller
                financier autorisé, un fiscaliste ou un avocat.
              </p>
              <p className="mt-2">
                Il s&rsquo;agit d&rsquo;information éducative, pas d&rsquo;un
                conseil financier. Parlez à un conseiller financier autorisé
                avant de donner suite à un contenu produit par Mosaic Finance.
              </p>
            </div>
          </Block>

          <Block title="3. Admissibilité">
            <p>
              Vous devez avoir au moins 18 ans et résider au Canada. En créant
              un compte, vous confirmez que vous remplissez ces conditions.
            </p>
          </Block>

          <Block title="4. Votre compte">
            <ul>
              <li>Vous protégez vos identifiants.</li>
              <li>
                Vous utilisez un alias de votre choix. Nous ne vous demandons
                pas de saisir votre nom légal. Si vous vous connectez avec
                Google, Google peut transmettre un nom d&rsquo;affichage et une
                photo au système de connexion. Nous nous en servons seulement
                pour vous connecter.
              </li>
              <li>
                Vous fournissez des renseignements exacts dans la mesure où
                vous choisissez de les partager. La qualité du rapport Progress
                dépend de ces renseignements.
              </li>
              <li>
                Vous pouvez supprimer votre compte dans les paramètres. La
                suppression annule un abonnement payant actif. Stripe conserve
                les factures comme dossier de paiement. Les détails sont dans
                la politique de confidentialité.
              </li>
            </ul>
          </Block>

          <Block title="5. Confidentialité">
            <p>
              Nous ne demandons pas votre numéro d&rsquo;assurance sociale, vos
              identifiants bancaires ni une pièce d&rsquo;identité. Les dossiers
              du compte sont stockés au Canada. Une partie du traitement a lieu
              à l&rsquo;extérieur du Canada, comme l&rsquo;explique la politique
              de confidentialité. Nous ne vendons pas vos renseignements.
            </p>
            <p>
              Voir la{" "}
              <a
                href="/privacy/fr"
                className="text-emerald underline underline-offset-2 hover:text-emerald-dark"
              >
                politique de confidentialité
              </a>
              .
            </p>
          </Block>

          <Block title="6. Contenu produit par l'IA">
            <ul>
              <li>
                Les rapports Progress sont produits par l&rsquo;IA
                (Claude d&rsquo;Anthropic) à partir de vos renseignements.
              </li>
              <li>
                Ce contenu peut contenir des erreurs ou des options qui ne
                conviennent pas à votre situation.
              </li>
              <li>
                Mosaic Finance ne donne pas de conseil financier. Charlie est
                un guide éducatif, pas un conseiller autorisé.
              </li>
              <li>
                Vous restez responsable des décisions que vous prenez à partir
                d&rsquo;un rapport Progress.
              </li>
              <li>
                Charlie est inclus avec Progress et pendant l&rsquo;essai. Une
                utilisation raisonnable s&rsquo;applique afin que le service
                reste disponible. Nous ne publions pas de nombre de messages.
                Si vous vous en approchez, Charlie le dit dans la conversation.
                La limite se réinitialise au début du mois civil suivant (UTC).
              </li>
              <li>
                Le pointage de santé financière et le rapport Progress sont
                produits automatiquement à partir de ce que vous entrez. Ils
                n&rsquo;approuvent ni ne refusent un crédit, une assurance ou un
                compte. Les questions vont à hello@mosaicfinance.ai.
              </li>
            </ul>
          </Block>

          <Block title="7. Abonnements et paiement">
            <p>
              Les prix sont en dollars canadiens et sont montrés de nouveau au
              paiement avant que vous payiez. Pulse est gratuit. Progress coûte
              17 $ par mois ou 170 $ par année. Progress fondateur, pour les
              200 premières personnes, coûte 8 $ par mois ou 80 $ par année. Ce
              prix fondateur reste bloqué tant que cet abonnement continue.
              Mastery et Academy ne sont pas offerts sur le site public.
            </p>
            <p>
              Un nouveau compte comprend 7 jours de Progress, sans frais et
              sans carte de crédit. Au bout de ces 7 jours, le compte continue
              sur Pulse, sauf si vous vous abonnez. Pulse conserve le suivi, les
              budgets, la valeur nette, les objectifs et le pointage en direct.
            </p>
            <p>
              Les forfaits payants sont facturés chaque mois ou chaque année
              par Stripe et se renouvellent pour la même période, sauf si vous
              annulez avant la date de renouvellement. Vous pouvez annuler dans
              les paramètres de facturation. L&rsquo;accès continue jusqu&rsquo;à
              la fin de la période déjà payée. Nous ne stockons pas votre
              numéro de carte. Stripe le fait.
            </p>
            <p>
              Le premier paiement d&rsquo;un nouvel abonnement payant est
              remboursable pendant 30 jours. Écrivez à hello@mosaicfinance.ai.
              Sans questions.
            </p>
            <p>
              <strong>Garantie de constance.</strong> Inscrivez vos dépenses
              chaque semaine et faites votre portrait de valeur nette chaque
              mois pendant 90 jours. Si votre pointage de santé financière
              ne s&rsquo;est pas amélioré à la fin, nous remboursons ce
              premier prélèvement, mensuel ou annuel. Le pointage mesure la constance du suivi, pas
              le rendement des placements. Le remboursement vise seulement le
              premier paiement : un mois sur un forfait mensuel, ou le montant
              annuel sur un forfait annuel. Il ne dépend pas des rendements, de
              l&rsquo;épargne, ni du fait de suivre une liste d&rsquo;actions.
            </p>
            <p>
              Nous pouvons modifier les prix affichés avec un préavis de 30
              jours par courriel. Un prix fondateur bloqué ne change pas. Le
              préavis n&rsquo;augmente pas le prix d&rsquo;une période déjà
              payée.
            </p>
          </Block>

          <Block title="8. Utilisation acceptable">
            <p>Vous vous engagez à ne pas :</p>
            <ul>
              <li>utiliser le Service à une fin illégale ou contraire au droit canadien;</li>
              <li>tenter d&rsquo;accéder au compte ou aux données d&rsquo;une autre personne;</li>
              <li>extraire des données du Service au-delà de votre propre compte;</li>
              <li>présenter un contenu de Mosaic Finance comme un conseil financier;</li>
              <li>revendre des rapports Progress sans notre consentement écrit.</li>
            </ul>
          </Block>

          <Block title="9. Propriété intellectuelle">
            <p>
              Les rapports Progress qui vous sont destinés vous appartiennent :
              vous pouvez les télécharger et les conserver. La plateforme, la
              marque, le design et la technologie restent la propriété de
              ChainForge Labs.
            </p>
          </Block>

          <Block title="10. Limite de responsabilité">
            <p>
              Dans la mesure permise par la loi applicable, ChainForge Labs et
              son personnel ne sont pas responsables des dommages indirects,
              spéciaux, consécutifs ou punitifs, ni de la perte de profits,
              découlant de votre usage des rapports, de décisions financières
              prises à partir du Service, d&rsquo;erreurs dans un rapport, ou
              d&rsquo;une interruption. Cette limite ne s&rsquo;applique pas
              lorsqu&rsquo;une loi de protection du consommateur l&rsquo;interdit.
            </p>
            <p>
              Notre responsabilité totale pour une réclamation liée au Service
              est limitée au montant que vous nous avez payé au cours des 12
              mois précédant la réclamation, sauf si la loi impose un autre
              plancher.
            </p>
          </Block>

          <Block title="11. Fin du compte">
            <p>
              Vous pouvez mettre fin à votre compte en le supprimant dans les
              paramètres. Nous pouvons suspendre l&rsquo;accès si vous violez
              ces conditions, avec un avis lorsque c&rsquo;est raisonnablement
              possible.
            </p>
          </Block>

          <Block title="12. Droit applicable">
            <p>
              Ces conditions sont régies par les lois de la Saskatchewan et les
              lois fédérales du Canada. Si vous habitez une province dont la
              loi de protection du consommateur vous accorde des droits auxquels
              vous ne pouvez pas renoncer, ces droits demeurent, y compris le
              droit d&rsquo;intenter un recours dans votre province. Une
              personne consommatrice qui réside au Québec peut intenter un
              recours au Québec. Rien ici ne renonce au droit de participer à
              un recours collectif lorsque la loi interdit cette renonciation.
            </p>
          </Block>

          <Block title="13. Modifications">
            <p>
              Nous pouvons mettre à jour ces conditions. Un changement
              important est envoyé par courriel aux personnes inscrites au
              moins 30 jours avant son entrée en vigueur.
            </p>
          </Block>

          <Block title="14. Contact">
            <p>
              Questions :{" "}
              <a
                href="mailto:hello@mosaicfinance.ai"
                className="text-emerald underline underline-offset-2 hover:text-emerald-dark"
              >
                hello@mosaicfinance.ai
              </a>
              .
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
      <div className="space-y-3 font-body text-[15px] leading-relaxed text-text-secondary [&_strong]:font-semibold [&_strong]:text-text-primary [&_ul]:list-none [&_ul]:space-y-2 [&_ul]:pl-0 [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[10px] [&_li]:before:h-1.5 [&_li]:before:w-1.5 [&_li]:before:rounded-full [&_li]:before:bg-emerald">
        {children}
      </div>
    </div>
  );
}
