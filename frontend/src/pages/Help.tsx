import { Navigate } from "react-router-dom";

/**
 * Ancienne route d'aide. Le mode d'emploi est devenu la documentation intégrée,
 * mais les liens existants (favoris, messages) doivent continuer de fonctionner.
 */
export function Help() {
  return <Navigate to="/documentation" replace />;
}
