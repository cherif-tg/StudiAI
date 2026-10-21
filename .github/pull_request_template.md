## Ce que fait cette PR

<!-- Une phrase : ce qui change pour l'utilisateur, pas la liste des fichiers. -->

## Pourquoi

<!-- Le problème, le besoin, ou le ticket. Ce qui a motivé le choix. -->

## Comment vérifier

<!-- Commandes exactes, parcours à l'écran, cas limites à tester. -->

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q --timeout=90
```

## Points d'attention

<!-- Ce que le relecteur doit regarder en priorité : migration, sécurité, performance, invariant. -->

## Checklist

- [ ] `pytest` passe (37 tests, sans réseau)
- [ ] `npm run typecheck` et `npm run build` passent
- [ ] Aucun fichier de `data/`, `.env`, `node_modules` ou `dist/` dans le diff
- [ ] Documentation mise à jour si le comportement change
      (`frontend/src/content/` pour l'utilisateur, `docs/` pour l'équipe)
- [ ] Capture d'écran pour tout changement visuel
