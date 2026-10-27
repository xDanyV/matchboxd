// ImageResponse solo trae Geist Regular: se cargan Regular y ExtraBold de Google Fonts para los títulos.
// Si la descarga falla, la imagen se genera igual con la fuente por defecto.

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 800; style: 'normal' };

let cached: Promise<OgFont[]> | null = null;

async function fetchGeist(): Promise<OgFont[]> {
    try {
        const css = await fetch('https://fonts.googleapis.com/css2?family=Geist:wght@400;800').then((res) => res.text());
        const faces = [...css.matchAll(/font-weight: (\d+);\s*src: url\((.+?)\) format\('(?:opentype|truetype)'\)/g)];

        const fonts = await Promise.all(
            faces.map(async ([, weight, url]) => {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`No se pudo descargar Geist ${weight}`);
                return { name: 'Geist', data: await res.arrayBuffer(), weight: Number(weight) as 400 | 800, style: 'normal' as const };
            })
        );

        return fonts.length === 2 ? fonts : [];
    } catch {
        return [];
    }
}

export async function getOgFonts() {
    cached ??= fetchGeist();
    const fonts = await cached;
    // No se memoiza un fallo: el siguiente intento vuelve a probar
    if (fonts.length === 0) cached = null;
    return fonts;
}
