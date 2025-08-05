import { NextResponse } from 'next/server';

export async function GET() {
  const packageName = "app.vercel.deckofcards.twa";
  const shaKey = process.env.ANDROID_SHA_KEY;

  if (!shaKey) {
    console.warn("ANDROID_SHA_KEY environment variable is not set.");
    return new NextResponse('Internal Server Error: App signing key is not configured.', { status: 500 });
  }

  const assetLinks = [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: packageName,
      sha256_cert_fingerprints: [shaKey]
    }
  }];

  return NextResponse.json(assetLinks);
}
