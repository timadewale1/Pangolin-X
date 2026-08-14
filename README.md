This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Yoruba speech quality

Yoruba playback is routed through a dedicated Standard Nigerian Yoruba profile in `lib/yorubaTts.ts`. It preserves tone marks and Yoruba vowels, uses a configurable compact pronunciation/prosody instruction, and keeps an in-memory server cache for repeated audio.

Optional server configuration:

```bash
YORUBA_TTS_ENABLED=true
YORUBA_TTS_VOICE=coral
YORUBA_TTS_INSTRUCTION_VERSION=sny-v1
DEFAULT_TTS_VOICE=coral
```

## SoilHive soil data

Farm soil profiles are fetched server-side from SoilHive using the OAuth client-credentials flow. Add these to your local and production environment; never expose them as `NEXT_PUBLIC_*` variables:

```bash
SOILHIVE_CLIENT_ID=your_client_id
SOILHIVE_CLIENT_SECRET=your_client_secret
# Optional short-lived token for diagnostics only; the client credentials flow is the normal path.
SOILHIVE_ACCESS_TOKEN=
```

In development, open `/api/dev/yoruba-tts` to retrieve the benchmark phrases, selected voice, and instruction version. Send a benchmark phrase to `/api/chat/speech` with `{ "language": "yo", "text": "…" }` to compare audio. The benchmark still needs native-speaker scoring before a voice is treated as production-validated.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
