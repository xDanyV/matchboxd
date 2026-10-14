import { normalizeText } from '@/lib/search-params';

const TEAM_ALIASES: { when: string; aliases: string[] }[] = [
    { when: 'bayern', aliases: ['munich'] },
    { when: 'inter', aliases: ['milan', 'internazionale'] },
    { when: 'atletico', aliases: ['atleti'] },
    { when: 'barcelona', aliases: ['barca'] },
    { when: 'paris', aliases: ['psg'] },
    { when: 'sporting', aliases: ['lisboa', 'lisbon'] },
    { when: 'porto', aliases: ['oporto'] },
    { when: 'napoli', aliases: ['napoles'] },
    { when: 'brugge', aliases: ['brujas'] },
    { when: 'salzburg', aliases: ['salzburgo'] },
    { when: 'copenhagen', aliases: ['copenhague'] },
    { when: 'antwerp', aliases: ['amberes'] },
    { when: 'crvena', aliases: ['estrella', 'roja', 'red', 'star'] },
    { when: 'shakhtar', aliases: ['shajtar'] },
    { when: 'juventus', aliases: ['juve'] },
    { when: 'slavia', aliases: ['praga'] },
    { when: 'dortmund', aliases: ['bvb'] },
    { when: 'feyenoord', aliases: ['rotterdam'] },
    { when: 'young boys', aliases: ['berna'] },
];

/** Texto normalizado donde se busca un equipo: nombre, nombre corto y alias. */
export function teamSearchText(team: { name: string; shortName: string | null }): string {
    const base = normalizeText([team.name, team.shortName ?? ''].join(' '));
    const extras = TEAM_ALIASES.filter((entry) => base.includes(entry.when)).flatMap(
        (entry) => entry.aliases
    );

    return normalizeText([base, ...extras].join(' '));
}