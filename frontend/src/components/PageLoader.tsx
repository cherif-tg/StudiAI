/** Affiché le temps de charger une page à la demande (souvent quelques millisecondes). */
export function PageLoader() {
  return (
    <div className="page-loader" role="status">
      <span className="page-loader__bar" aria-hidden="true" />
      <span className="sr-only">Chargement de la page…</span>
    </div>
  );
}
