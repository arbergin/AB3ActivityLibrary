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

## Screenshot-to-editable-activity import (browser-based, free API usage)

The `/import` page includes **Import from Screenshot (Free)**. Upload a PNG/JPEG/WebP
image (up to 12 MB), then select **Generate Editable Activity**. The browser loads
OpenCV.js from `docs.opencv.org` and Tesseract.js from `cdn.jsdelivr.net`, detects
candidate round player markers and line segments, runs number OCR, and creates a
single-frame AB3 creatorState (schema v3). The existing JSON preview and Supabase
activity-save flow then allow the coach to review/import the generated activity.
The generated JSON may also be downloaded without saving.

**Limitations:** This is a heuristic computer-vision starting point, not a trained
soccer-specific AI model. It does not reliably identify arrows, pitch geometry,
balls, cones, goals, or tactical intent; those must be corrected/added in the
Activity Creator. Perspective photos, textured backgrounds, overlapping icons,
and tiny jersey numbers can produce false or missing detections. Each screenshot
is converted to one frame. The screenshot itself stays in browser memory and is
not sent to the AB3 server, but external scripts and the Tesseract language model
are downloaded from public networks. A deployment with restrictive Content
Security Policy must allow these CDN/script/worker requests, or self-host those
assets. Third-party CDN availability is a runtime dependency.

### Screenshot geometric reconstruction (November 2026)

The free Import from Screenshot workflow runs a Canvas-based geometry detector in an isolated worker. It preserves the existing player/OCR flow and now attempts to reconstruct dark rectangles as editable shape objects, dashed dark/light horizontal and vertical boundaries, and thin diagonal strokes. Arrowheads are marked only when both side branches are detected; ambiguous strokes are retained as ordinary editable lines. The animation-export preview now renders rectangle and circle line styles from opposite-corner coordinates instead of drawing a diagonal.

The detector does **not** interpret tactical meaning. Field markings, goals, faint curved strokes, labels, incomplete arrowheads, and small objects can still require manual correction. Conversion progress is stage-based, not an estimate of time remaining.
