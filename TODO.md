# Pendientes

## Bugs

- [x] **FOUT en Material Symbols icons:** Fixed — changed `display=swap` to `display=block` + added `preload` link.
- [x] **Logout no funciona:** Fixed — replaced manual fetch with server action using `signOut` from NextAuth v5.

## Mejoras

- [x] **Home "Torneo Activo" en 3 columnas:** Done — Leaderboard+Stats (22%) | Activity (flex-1) | Upcoming Matches (22%).
- [x] **Match detail LIVE no debe mostrar botón de predicción:** Fixed — `hasStarted` now also checks `matchStatus` (LIVE/HALFTIME/FINISHED) in addition to kickoff time.
- [x] **Sacar "World Cup 2026" del hero del match detail:** Removed from MatchHero pills. Stage + venue remain.
- [ ] **Fixture: revisar que no falten equipos:** Verificar que todos los equipos del mundial estén presentes en la página de fixture.

## Responsive pendiente

- [ ] **Standings mobile: group pills:** En mobile, la página /standings debería tener pills por grupo (no necesario en desktop) para navegar entre grupos sin scroll excesivo.
- [ ] **Activity page responsive:** Revisar que /activity se vea bien en mobile (composer, feed, filtros).
- [ ] **Match detail mobile:** Revisar que el bottom row (community predictions + probability + AI analysis) stack correctamente en mobile — actualmente es 2 columnas 50/50.
- [ ] **Bracket mobile:** BracketView usa match cells de 160px fijos con overflow-x auto. Considerar reducir tamaño de celdas en mobile o mejorar la experiencia de scroll horizontal.
- [ ] **Admin tables mobile:** UsersTable, InvitationCodesTable, MatchReviewTable tienen columnas con anchos fijos. Ocultar columnas menos importantes en mobile como se hizo en LeaderboardTable.
- [ ] **Profile page mobile:** Revisar que /profile se vea bien en mobile.
