/**
 * Hand-authored R32 match analysis, two voices:
 *   es → relator rioplatense con humor
 *   en → tactical analyst with spark
 * Keyed by "${homeCode}-${awayCode}" in DB home-away order.
 * Pulled from prod fixtures on 2026-06-28; if a tie changes, rewrite that entry.
 *
 * Lives under src/lib (not scripts/) so the seed script and the Vitest suite can
 * both import it — matching the repo's shared-logic pattern (sync-core, etc.).
 */
export const R32_PAIRS = [
  "RSA-CAN", "BRA-JPN", "GER-PAR", "NED-MAR",
  "CIV-NOR", "FRA-SWE", "MEX-ECU", "ENG-COD",
  "BEL-SEN", "USA-BIH", "ESP-AUT", "POR-CRO",
  "SUI-ALG", "AUS-EGY", "ARG-CPV", "COL-GHA",
] as const;

export const R32_ANALYSIS: Record<string, { es: string; en: string }> = {
  "RSA-CAN": {
    es: "Sudáfrica y Canadá se cruzan en el partido que nadie tenía en la quiniela. Los Bafana Bafana vuelven a un Mundial con ganas de dar el golpe, pero Canadá juega en casa y con el envión del anfitrión. Cierre parejo, de esos que se definen por un pelotazo y un arquero inspirado: poné el mate al fuego que esto va para largo.",
    en: "South Africa against Canada is the tie the bracket-fillers quietly skipped. The Bafana Bafana arrive hungry for a statement, but Canada have home soil and host-nation momentum on their side. Expect a cagey, low-block affair decided by a single set piece or a goalkeeping howler — fine margins all the way.",
  },
  "BRA-JPN": {
    es: "Brasil contra Japón es choque de estilos: el jogo bonito frente a la prolijidad samurái que ya hizo sufrir a más de un grande. El Scratch parte de favorito y con galería para regalar, pero Japón no vino de paseo y presiona como reloj suizo. Si los nipones aguantan los primeros veinte minutos, capaz nos comemos un susto de los lindos.",
    en: "Brazil versus Japan is a clash of identities: jogo bonito against the disciplined Samurai Blue who have troubled bigger names before. The Seleção start as favorites with flair to spare, but Japan press like clockwork and won't sit back politely. If the Japanese survive the opening twenty minutes, an upset is firmly on the table.",
  },
  "GER-PAR": {
    es: "Alemania llega con su renovación táctica a cuestas y Paraguay con el cuchillo entre los dientes, fiel a la escuela guaraní de sufrir y contragolpear. Los teutones tienen el reloj y la eficiencia, pero a la Albirroja le encanta arruinarle la fiesta a los candidatos. Partido de paciencia: el que se desespere primero, paga.",
    en: "Germany bring their tactical reboot; Paraguay bring a knife between the teeth and that classic knack for defending deep and stinging on the break. The Germans have the rhythm and the efficiency, but the Albirroja love nothing more than spoiling a favorite's party. A test of patience — whoever blinks first picks up the bill.",
  },
  "NED-MAR": {
    es: "Países Bajos contra Marruecos huele a revancha del 2022, cuando los africanos pusieron a media humanidad a creer. La Naranja Mecánica tiene fútbol total y flexibilidad, pero Marruecos defiende con alma y te liquida a la contra. Si los Leones del Atlas repiten aquella versión, los holandeses van a sudar la naranja.",
    en: "Netherlands against Morocco carries the scent of 2022, when the Atlas Lions made half the planet believe. The Dutch offer total football and tactical flexibility, but Morocco defend with their souls and punish you on the counter. If they channel that World Cup run again, the Oranje will be made to sweat for every inch.",
  },
  "CIV-NOR": {
    es: "Costa de Marfil, campeona de África, contra una Noruega que tiene en su delantero a una máquina de hacer goles. Choque de potencia africana versus pegada escandinava: si a los marfileños les funciona la pierna, hay fiesta; si Noruega le da tres pelotas claras a su killer, hay drama. Imperdible para los amantes del gol.",
    en: "Reigning African champions Ivory Coast face a Norway side built around one of the planet's deadliest finishers. It's African power against Scandinavian punch: if the Ivorians find their rhythm, it's a party; if Norway feed their striker even three clear looks, it's trouble. One for the goal lovers.",
  },
  "FRA-SWE": {
    es: "Francia es Francia: un plantel que da miedo de lo profundo que es. Suecia llegó peleando desde el repechaje y va a plantarse física y ordenada, pero la diferencia de jerarquía está a la vista. Los bleus deberían pasar de largo… salvo que se relajen y los nórdicos les hagan acordar que esto es Mundial.",
    en: "France are France — a squad so deep it's almost unfair. Sweden battled through the playoffs and will set up physical and organized, but the gulf in quality is plain to see. Les Bleus should cruise… unless complacency creeps in and the Scandinavians remind them this is a World Cup.",
  },
  "MEX-ECU": {
    es: "México, anfitrión, carga con la maldición de los octavos y la presión de todo un país encima. Ecuador es joven, rápido y físico, justo el tipo de rival incómodo que históricamente le da pesadillas al Tri. Con el Azteca empujando, el local tiene con qué; pero si los ecuatorianos corren como saben, la maldición sigue rondando.",
    en: "Mexico, the co-hosts, carry both their Round-of-16 curse and the weight of an entire nation. Ecuador are young, quick and physical — exactly the awkward kind of opponent that has historically given El Tri nightmares. With the Azteca roaring, the hosts have enough; but if Ecuador run like they can, that old curse keeps circling.",
  },
  "ENG-COD": {
    es: "Inglaterra desembarca con su catálogo de cracks de la Premier y la mochila eterna de 'esta es la nuestra'. La RD Congo es pura potencia y atletismo, y viene de un repechaje intercontinental con ganas de morder. Los ingleses son amplios favoritos, pero si se ponen nerviosos —y suelen— los congoleños tienen físico para incomodarlos.",
    en: "England arrive with their Premier League catalogue of stars and the familiar weight of 'this is finally our year.' DR Congo are all power and athleticism, fresh off an intercontinental playoff and itching to bite. The Three Lions are heavy favorites, but if the nerves show — and they tend to — Congo have the physicality to make it uncomfortable.",
  },
  "BEL-SEN": {
    es: "Bélgica todavía tiene nombres, aunque la generación dorada ya peina canas. Senegal es de lo mejor de África: experiencia europea, atletismo y un equipo al que no le tiembla el pulso ante nadie. Partidazo de los que pueden ir a penales: si los Diablos Rojos no arrancan finos, los Leones de Teranga se los comen.",
    en: "Belgium still boast big names, even as their golden generation greys at the temples. Senegal are among Africa's finest — European pedigree, athleticism, and a side that fears no one. This has penalty-shootout written all over it: if the Red Devils start sloppily, the Lions of Teranga will pounce.",
  },
  "USA-BIH": {
    es: "Estados Unidos juega en casa, con un equipo joven y ambicioso y toda la grada de su lado. Bosnia llega picante tras dejar a Italia en el camino del repechaje y tiene calidad en el medio para complicar a cualquiera. El local manda en el papel y en la tribuna, pero los bosnios vinieron a aguarle la fiesta al anfitrión.",
    en: "The United States play at home with a young, ambitious side and the whole crowd behind them. Bosnia arrive dangerous after knocking Italy out in the playoffs, with the midfield quality to trouble anyone. The hosts hold the edge on paper and in the stands — but the Bosnians came to crash the party.",
  },
  "ESP-AUT": {
    es: "España, campeona de Europa, trae su tiqui-taca y uno de los planteles más profundos del torneo. Austria no es la cenicienta de antes: presiona alto, juega ordenada y se hizo respetar. La Roja es favorita clara, pero si los austríacos le cortan los circuitos de pase, el partido se le puede hacer cuesta arriba.",
    en: "Spain, the European champions, bring their tiki-taka and one of the deepest squads in the tournament. Austria are no longer the pushovers of old: they press high, stay organized and have earned their respect. La Roja are clear favorites, but if the Austrians choke off the passing lanes, this could turn into a slog.",
  },
  "POR-CRO": {
    es: "Portugal mezcla veteranos con galones y una camada nueva que mete miedo. Croacia es Croacia en los mandos: ese mediocampo que te marea y que en los partidos grandes nunca afloja. Duelo de jerarquía pura, de los que se definen por un detalle o por quién aguanta mejor los nervios cuando el reloj aprieta.",
    en: "Portugal blend decorated veterans with a thrilling new wave of talent. Croatia are, well, Croatia in midfield — that dizzying engine room that never wilts on the big stage. A heavyweight duel likely settled by a single detail, or by whoever keeps their nerve when the clock starts to bite.",
  },
  "SUI-ALG": {
    es: "Suiza es esa máquina ordenada y aburrida —en el buen sentido— que te elimina sin que te des cuenta. Argelia tiene gambeta, velocidad y técnica para romper cualquier libreto. Si los suizos imponen su orden, pasan tranquilos; si los argelinos se sueltan, le pueden arruinar el plan a los helvéticos en un pestañeo.",
    en: "Switzerland are that tidy, boringly efficient machine — in the best sense — that knocks you out before you notice. Algeria carry the dribbling, pace and technique to tear up any script. If the Swiss impose their order, they advance comfortably; if Algeria cut loose, they can wreck the plan in the blink of an eye.",
  },
  "AUS-EGY": {
    es: "Australia pone garra, físico y esa experiencia mundialista de los Socceroos que nunca regalan nada. Egipto es historia grande del fútbol africano y trae una hinchada que se hace sentir hasta por la tele. Partido trabado, de fricción y poco lujo: el que meta primero va a defender ese gol como si fuera el último tesoro.",
    en: "Australia bring grit, muscle and that Socceroos tournament savvy that never gives an inch. Egypt are African football royalty with a fanbase you can feel through the screen. Expect a scrappy, physical, low-frills affair — whoever scores first will guard that lead like buried treasure.",
  },
  "ARG-CPV": {
    es: "Argentina, campeona del mundo y con una generación dorada, contra Cabo Verde, la Cenicienta que llegó a su primer Mundial y ya hizo historia. En los papeles es palo y palo para la Albiceleste, pero los caboverdianos vinieron a disfrutar y a jugarle de igual a igual a quien sea. Que no se relajen los de Scaloni… o capaz el cuento de hadas sigue.",
    en: "World champions Argentina and their golden generation take on Cape Verde, the fairy-tale debutants who have already made history just by arriving. On paper it's all Albiceleste, but the Cape Verdeans came to enjoy the ride and trade blows with anyone. Scaloni's men had better not switch off — or the fairy tale just might roll on.",
  },
  "COL-GHA": {
    es: "Colombia es pura gambeta, ritmo y creatividad, de esos equipos que cuando se prenden son una fiesta. Ghana trae a las Estrellas Negras con su flair africano y esa actitud de no rendirse jamás. Choque vistoso y de ida y vuelta: si los cafeteros pisan el acelerador hay baile, pero los ghaneses no se asustan ni con la pólvora mojada.",
    en: "Colombia are all dribbling, rhythm and creativity — the kind of team that becomes a carnival once they click. Ghana bring the Black Stars' African flair and a never-say-die streak. A vibrant, end-to-end clash: if the Cafeteros hit top gear it's a show, but Ghana don't scare easily.",
  },
};
